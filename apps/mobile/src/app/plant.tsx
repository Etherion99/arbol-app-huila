import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ConnectionBanner } from '@/components/connection-banner';
import { Dialog } from '@/components/ui/dialog';
import { Notice } from '@/components/ui/notice';
import { texts } from '@/constants/texts';
import { MAX_CONTENT_WIDTH, colors, spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';
import { useZones } from '@/features/map/use-zones';
import { useLocationPrimer } from '@/features/map/use-location-primer';
import { useUserLocation } from '@/features/map/use-user-location';
import { PlantingSuccess } from '@/features/planting/components/planting-success';
import { StepLocation } from '@/features/planting/components/step-location';
import { StepPhoto } from '@/features/planting/components/step-photo';
import { StepSpecies } from '@/features/planting/components/step-species';
import { StepZone } from '@/features/planting/components/step-zone';
import { WizardHeader } from '@/features/planting/components/wizard-header';
import {
  clearPlantingDraft,
  emptyDraft,
  savePlantingDraft,
  useStoredPlantingDraft,
  type PlantingDraft,
} from '@/features/planting/planting-draft';
import { useRegisterTree, type RegisterTreeResult } from '@/features/planting/use-register-tree';
import { formatShortDate, isRealCalendarDate, todayInColombia } from '@/lib/dates';

const STEP_TITLES = [
  texts.planting.locationTitle,
  texts.planting.zoneTitle,
  texts.planting.speciesTitle,
  texts.planting.photoTitle,
];

/**
 * The planting wizard: four steps, one draft, one call that writes two rows.
 *
 * Two decisions shape everything below.
 *
 * **The draft is written to disk on every change.** A guardian filling this in
 * is standing in a vereda with the app going into the background whenever a call
 * comes in. Losing a half filled form there does not mean retyping it, it means
 * the tree never gets registered, so the form outlives the process.
 *
 * **Pressing «Registrar» hands the work to the queue, and that always works.**
 * There is no failed submission on this screen any more, because there is
 * nothing here that can fail: the form becomes a job on the phone, the draft is
 * cleared because the data is no longer only in a form, and the queue sends it
 * whenever the radio allows. What the screen then reports is which of two
 * things happened to that job -- the server has it, or this phone still does --
 * and never a dead end asking a guardian in a vereda to try again later.
 */
export default function PlantTreeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const zones = useZones();
  const location = useUserLocation();
  const locationPrimer = useLocationPrimer(location);
  const registerTree = useRegisterTree();

  const stored = useStoredPlantingDraft();

  // Whether the guardian has answered the "you have a draft" question. Held
  // here rather than derived, because the answer is a decision they made and
  // not a fact about the stored draft.
  const [hasResumed, setHasResumed] = useState(false);
  const [working, setWorking] = useState<PlantingDraft>(() => stored.draft ?? emptyDraft());
  const [isConfirmingExit, setIsConfirmingExit] = useState(false);
  const [hasTriedToAdvance, setHasTriedToAdvance] = useState(false);
  const [done, setDone] = useState<{ result: RegisterTreeResult; villageName: string } | null>(
    null,
  );

  // The stored draft, only while it is still an unanswered offer. Narrowed here
  // so the screen below works with a draft rather than with an optional.
  const resumable = stored.isLoaded && !hasResumed && done === null ? stored.draft : null;

  /** Every change goes to disk as well as to state. That is the whole point. */
  const update = useCallback((patch: Partial<PlantingDraft>) => {
    setWorking((current) => {
      const next = { ...current, ...patch };
      savePlantingDraft(next);
      return next;
    });
  }, []);

  const villages = useMemo(
    () =>
      working.municipalityId === null
        ? []
        : (zones.data?.villagesByMunicipality.get(working.municipalityId) ?? []),
    [working.municipalityId, zones.data],
  );
  const villageName = villages.find((zone) => zone.id === working.villageId)?.name ?? null;

  // Validity is worked out during render from the current values. Mirroring it
  // into state through an effect is what turns a keystroke into a cascade.
  const heightNumber = Number.parseInt(working.heightCm, 10);
  const heightError =
    hasTriedToAdvance && (!Number.isFinite(heightNumber) || heightNumber < 1)
      ? texts.planting.heightRequired
      : undefined;
  const plantedAtError = !hasTriedToAdvance
    ? undefined
    : !isRealCalendarDate(working.plantedAt)
      ? texts.planting.plantedAtInvalid
      : working.plantedAt > todayInColombia()
        ? texts.planting.plantedAtFuture
        : undefined;

  const stepBlocker = useMemo(() => {
    switch (working.step) {
      case 0:
        return working.location === null ? texts.planting.locationNoFix : null;
      case 1:
        return working.municipalityId === null || working.villageId === null
          ? texts.planting.zoneRequired
          : null;
      case 2:
        if (working.speciesRawText.trim() === '') {
          return texts.treeErrors.speciesBlank;
        }
        if (!isRealCalendarDate(working.plantedAt)) {
          return texts.planting.plantedAtInvalid;
        }
        if (working.plantedAt > todayInColombia()) {
          return texts.planting.plantedAtFuture;
        }
        return !Number.isFinite(heightNumber) || heightNumber < 1
          ? texts.planting.heightRequired
          : null;
      default:
        return working.photo === null ? texts.photo.required : null;
    }
  }, [heightNumber, working]);

  const goNext = useCallback(() => {
    if (stepBlocker !== null) {
      setHasTriedToAdvance(true);
      return;
    }
    setHasTriedToAdvance(false);
    update({ step: Math.min(working.step + 1, STEP_TITLES.length - 1) });
  }, [stepBlocker, update, working.step]);

  const submit = useCallback(async () => {
    if (stepBlocker !== null || working.photo === null || working.villageId === null) {
      setHasTriedToAdvance(true);
      return;
    }

    const result = await registerTree.mutateAsync({
      speciesRawText: working.speciesRawText.trim(),
      zoneId: working.villageId,
      villageName,
      location: working.location ?? { lat: 0, lng: 0 },
      plantedAt: working.plantedAt,
      heightCm: heightNumber,
      visibleBranches: working.visibleBranches,
      photo: working.photo,
      // The moment the job exists, the queue owns the photograph and every
      // field, and the draft stops being a safety net and becomes a way to
      // plant the same tree twice.
      onQueued: clearPlantingDraft,
    });

    setDone({ result, villageName: villageName ?? '' });
  }, [heightNumber, registerTree, stepBlocker, villageName, working]);

  /**
   * Back to a blank step one without leaving the route. Planting a second tree
   * on the same walk is the common case, and sending the guardian out to the
   * map only to have them press «Sembrar» again is a detour through a screen
   * they did not ask for.
   */
  const plantAnother = useCallback(() => {
    clearPlantingDraft();
    setWorking(emptyDraft());
    setHasResumed(true);
    setHasTriedToAdvance(false);
    setDone(null);
  }, []);

  const leave = useCallback(() => {
    // The draft is already on disk, so leaving is genuinely free. It is only
    // confirmed at all so a mis-tap on the close control does not lose the
    // guardian's place in the wizard.
    router.back();
  }, [router]);

  if (session === null) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <View style={styles.centred}>
          <AppText variant="title">{texts.myTrees.signedOutTitle}</AppText>
          <AppText variant="bodyMuted" style={styles.centredBody}>
            {texts.myTrees.signedOutBody}
          </AppText>
          <Button label={texts.map.guestSignIn} onPress={() => router.replace('/sign-in')} />
        </View>
      </SafeAreaView>
    );
  }

  if (done !== null) {
    return (
      <PlantingSuccess
        result={done.result}
        villageName={done.villageName}
        speciesRawText={working.speciesRawText}
        onPlantAnother={plantAnother}
      />
    );
  }

  if (resumable !== null) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <View style={styles.centred}>
          <AppText variant="title">{texts.planting.draftFound}</AppText>
          <AppText variant="bodyMuted" style={styles.centredBody}>
            {texts.planting.draftFoundBody(formatShortDate(resumable.savedAt))}
          </AppText>

          <Button
            label={texts.planting.draftResume}
            onPress={() => {
              setWorking(resumable);
              setHasResumed(true);
            }}
          />
          <Button
            label={texts.planting.draftDiscard}
            variant="secondary"
            onPress={() => {
              clearPlantingDraft();
              setWorking(emptyDraft());
              setHasResumed(true);
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const isLastStep = working.step === STEP_TITLES.length - 1;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ConnectionBanner />
      {locationPrimer.primer}

      <WizardHeader
        step={working.step}
        totalSteps={STEP_TITLES.length}
        title={STEP_TITLES[working.step]}
        onClose={() => setIsConfirmingExit(true)}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          {working.step === 0 ? (
            <StepLocation
              location={working.location}
              accuracyMetres={working.accuracyMetres}
              onChange={(next, accuracyMetres) => update({ location: next, accuracyMetres })}
              onRequestLocation={() => locationPrimer.request(true)}
              permission={location.permission}
            />
          ) : null}

          {working.step === 1 ? (
            <StepZone
              catalogue={zones.data}
              isLoading={zones.isPending}
              municipalityId={working.municipalityId}
              villageId={working.villageId}
              onChange={(municipalityId, villageId) => update({ municipalityId, villageId })}
              location={working.location}
            />
          ) : null}

          {working.step === 2 ? (
            <StepSpecies
              speciesRawText={working.speciesRawText}
              onSpeciesChange={(speciesRawText) => update({ speciesRawText })}
              plantedAt={working.plantedAt}
              onPlantedAtChange={(plantedAt) => update({ plantedAt })}
              plantedAtError={plantedAtError}
              heightCm={working.heightCm}
              onHeightChange={(heightCm) => update({ heightCm })}
              heightError={heightError}
              visibleBranches={working.visibleBranches}
              onBranchesChange={(visibleBranches) => update({ visibleBranches })}
            />
          ) : null}

          {working.step === 3 ? (
            <StepPhoto
              photo={working.photo}
              onCaptured={(photo) => update({ photo })}
              onRetake={() => update({ photo: null })}
              speciesRawText={working.speciesRawText}
              plantedAt={working.plantedAt}
              heightCm={Number.isFinite(heightNumber) ? heightNumber : 0}
              visibleBranches={working.visibleBranches}
              villageName={villageName}
              location={working.location}
            />
          ) : null}

          {/* Saving to the queue is a local write and effectively cannot fail;
              if the phone's own storage refuses it, that is worth saying rather
              than swallowing. Everything that used to be reported here -- a
              refused registration, a photograph that would not upload -- now
              belongs to the job itself and is shown on its card in «Mis
              árboles», where it survives this screen being closed. */}
          {registerTree.isError ? (
            <Notice
              tone="error"
              title={texts.treeErrors.title}
              message={texts.treeErrors.unknown}
              onRetry={() => void submit()}
            />
          ) : null}

          {hasTriedToAdvance && stepBlocker !== null ? (
            <Notice tone="warning" message={stepBlocker} />
          ) : null}

          <View style={styles.actions}>
            {working.step > 0 ? (
              <Button
                label={texts.planting.back}
                onPress={() => update({ step: working.step - 1 })}
                variant="secondary"
                style={styles.action}
              />
            ) : null}

            <Button
              label={isLastStep ? texts.planting.submit : texts.planting.next}
              loadingLabel={texts.planting.submitting}
              isLoading={registerTree.isPending}
              onPress={isLastStep ? () => void submit() : goNext}
              style={styles.submit}
            />
          </View>

          <AppText variant="caption" style={styles.draftHint}>
            {texts.planting.draftSaved}
          </AppText>
        </View>
      </ScrollView>

      <Dialog
        isVisible={isConfirmingExit}
        title={texts.planting.exitTitle}
        onClose={() => setIsConfirmingExit(false)}
        footer={
          <>
            <Button
              label={texts.planting.exitCancel}
              variant="secondary"
              onPress={() => setIsConfirmingExit(false)}
            />
            <Button label={texts.planting.exitConfirm} onPress={leave} />
          </>
        }
      >
        <AppText variant="bodyMuted">{texts.planting.exitBody}</AppText>
      </Dialog>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfacePage,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    padding: spacing[4],
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    gap: spacing[4],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  action: {
    flex: 1,
  },
  submit: {
    flex: 2,
  },
  draftHint: {
    textAlign: 'center',
  },
  centred: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[6],
  },
  centredBody: {
    textAlign: 'center',
  },
});
