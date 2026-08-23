import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { HealthStatus } from '@arbolapp/core';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip-group';
import { ConnectionBanner } from '@/components/connection-banner';
import { Icon } from '@/components/ui/icon';
import { Notice } from '@/components/ui/notice';
import { StepperField } from '@/components/ui/stepper-field';
import { TextField } from '@/components/ui/text-field';
import { texts } from '@/constants/texts';
import { MAX_CONTENT_WIDTH, MIN_TOUCH_TARGET, colors, fontFace, spacing } from '@/constants/theme';
import { useAddLogEntry, type AddLogEntryResult } from '@/features/growth-log/use-add-log-entry';
import { useUserLocation } from '@/features/map/use-user-location';
import { PhotoCapture } from '@/features/photos/components/photo-capture';
import type { PreparedPhoto } from '@/features/photos/photo-pipeline';
import { useNextCycleForTree } from '@/features/sync/sync-queue';
import { useTreeDetail } from '@/features/trees/use-tree-detail';
import { formatCoordinates, formatDayAndMonth } from '@/lib/dates';

const HEALTH_OPTIONS = [
  { value: 'healthy' as const, label: texts.growthLog.health.healthy },
  { value: 'sick' as const, label: texts.growthLog.health.sick },
  { value: 'at_risk' as const, label: texts.growthLog.health.at_risk },
];

/**
 * A new cycle of the growth log, and the variant that reports a tree dead.
 *
 * The two are one screen because they are one decision: a guardian arrives at a
 * tree and reports what they find. Choosing "muerto" swaps the form rather than
 * navigating somewhere else -- measurements disappear, a cause appears -- which
 * matches what the database itself insists on: a living tree is measured, a dead
 * one is explained, and the check constraints will not accept either shape in
 * place of the other.
 */
export default function GrowthLogScreen() {
  const router = useRouter();
  const { treeId } = useLocalSearchParams<{ treeId: string }>();
  const location = useUserLocation();
  const detail = useTreeDetail(treeId ?? null);
  const addEntry = useAddLogEntry();

  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('healthy');
  const [heightCm, setHeightCm] = useState('');
  const [visibleBranches, setVisibleBranches] = useState(1);
  const [notes, setNotes] = useState('');
  const [deadCause, setDeadCause] = useState<string | null>(null);
  const [hasTriedToSave, setHasTriedToSave] = useState(false);
  const [saved, setSaved] = useState<AddLogEntryResult | null>(null);

  const card = detail.data?.card ?? null;
  const entries = useMemo(() => detail.data?.entries ?? [], [detail.data]);
  const isDead = healthStatus === 'dead';

  /**
   * The cycle this entry will claim.
   *
   * Null until the tree has actually been read, and that is not a nicety: the
   * object key is built from the cycle, so guessing 1 while the log was still
   * loading would write over the planting photograph of a tree that already has
   * several. Nothing may be saved until this is a real number.
   *
   * It counts what is still queued on this phone as well as what the server
   * has. A guardian who recorded a cycle in a vereda on Saturday and comes back
   * to the same tree on Sunday, still without signal, must not be handed the
   * same number twice -- the two entries would collide on the unique index, on
   * the object key, and on each other.
   */
  const nextCycle = useNextCycleForTree(
    treeId ?? '',
    card === null ? null : (card.latestCycle ?? 0),
  );

  /**
   * The previous cycle's photograph, which becomes the ghost in the viewfinder.
   * The newest entry that actually has one: a cycle whose upload never
   * completed must not blank the alignment aid for the next one.
   */
  const ghostUrl = useMemo(
    () => entries.find((entry) => entry.photoUrl !== null)?.photoUrl ?? null,
    [entries],
  );

  const heightNumber = Number.parseInt(heightCm, 10);

  // Worked out during render from the current values rather than mirrored into
  // state, which is what would turn every keystroke into a cascade of renders.
  const blocker = useMemo(() => {
    // Until the log has been read there is no cycle to claim, so there is
    // nothing safe to write yet.
    if (nextCycle === null) {
      return texts.treeDetail.loading;
    }
    if (photo === null) {
      return texts.photo.required;
    }
    if (isDead) {
      return deadCause === null ? texts.growthLog.deadCauseRequired : null;
    }
    return !Number.isFinite(heightNumber) || heightNumber < 1
      ? texts.planting.heightRequired
      : null;
  }, [deadCause, heightNumber, isDead, nextCycle, photo]);

  const save = useCallback(async () => {
    const written = notes.trim() === '' ? null : notes.trim();

    /**
     * What goes into `notes`, and on a death report the column
     * `log_entries_cause_when_dead` will not accept blank.
     *
     * Composed before the guard rather than inside the payload so the rule the
     * database holds is also one the compiler holds: a report with no chip
     * yields null here, the guard below turns that into the same refusal the
     * blocker already shows, and nothing that violates the constraint can be
     * built. The cause is checked on the phone, not discovered from a rejected
     * insert after a photograph has already been prepared.
     */
    const entryNotes =
      isDead && deadCause !== null ? texts.growthLog.deadNotes(deadCause, written) : written;

    if (
      blocker !== null ||
      photo === null ||
      treeId === undefined ||
      nextCycle === null ||
      (isDead && entryNotes === null)
    ) {
      setHasTriedToSave(true);
      return;
    }

    const result = await addEntry.mutateAsync({
      treeId,
      // Captured now, while the tree is on screen and named. The pending card
      // cannot go and look it up: the whole reason it exists is that there is
      // no connection to look anything up with.
      treeLabel: card?.speciesRawText ?? treeId,
      cycle: nextCycle,
      // Null only for a death report. The database enforces the same rule from
      // the other side, so the two cannot drift.
      heightCm: isDead ? null : heightNumber,
      visibleBranches: isDead ? null : visibleBranches,
      healthStatus,
      notes: entryNotes,
      photo,
    });

    setSaved(result);
  }, [
    addEntry,
    blocker,
    card,
    deadCause,
    healthStatus,
    heightNumber,
    isDead,
    nextCycle,
    notes,
    photo,
    treeId,
    visibleBranches,
  ]);

  if (saved !== null) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <View style={styles.centred}>
          <AppText variant="title" style={styles.centredText}>
            {saved.outcome !== 'sent'
              ? texts.sync.queuedTitle
              : isDead
                ? texts.growthLog.deadSavedTitle
                : texts.growthLog.savedTitle}
          </AppText>
          {/* A death report must not be answered with a next photo date. The
              trigger has just moved the tree to `dead`, and the reminder sweep
              skips it from here on, so naming a due date would promise the one
              thing that has stopped happening.

              An entry still on the phone must not be answered with one either,
              and for a plainer reason: the date is a generated column two
              months from the capture, and until the row exists there is nothing
              to generate it from. It is read live rather than snapshotted when
              the entry was saved -- the queue invalidated this query the moment
              the upload landed -- so what renders is the database's answer and
              never an arithmetic guess. */}
          <AppText variant="bodyMuted" style={styles.centredText}>
            {saved.outcome !== 'sent'
              ? texts.sync.queuedLogEntryBody
              : isDead
                ? texts.growthLog.deadSavedBody
                : card === null
                  ? texts.growthLog.savedTitle
                  : texts.growthLog.savedBody(formatDayAndMonth(card.nextReminderAt))}
          </AppText>
          <Button
            label={texts.planting.successOpenTree}
            onPress={() => router.replace({ pathname: '/tree/[id]', params: { id: treeId ?? '' } })}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ConnectionBanner />

      <View style={styles.bar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={texts.common.cancel}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <AppText variant="subtitle" style={styles.closeGlyph}>
            ✕
          </AppText>
        </Pressable>

        <AppText variant="headerTitle" numberOfLines={1} style={styles.barTitle}>
          {isDead
            ? texts.growthLog.reportDead
            : nextCycle === null
              ? texts.growthLog.update
              : texts.growthLog.newEntryTitle(nextCycle)}
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          {isDead ? <Notice tone="error" message={texts.growthLog.deadWarning} /> : null}

          {/* Named above the well rather than inside it, which is where the
              canvas prints it: the canvas draws an empty placeholder and this
              is a live viewfinder, so the two lines would sit over the picture
              being framed. */}
          {isDead ? (
            <View style={styles.evidence}>
              <AppText variant="label">{texts.growthLog.deadPhotoTitle}</AppText>
              <AppText variant="caption">{texts.growthLog.deadPhotoHint}</AppText>
            </View>
          ) : null}

          <PhotoCapture
            photo={photo}
            onCaptured={setPhoto}
            onRetake={() => setPhoto(null)}
            // The ghost is what turns a set of photographs into a growth series
            // rather than a collection of different angles. A death report is
            // evidence of a state, not a step in a series, so it has none.
            ghostUrl={isDead ? null : ghostUrl}
            fallbackLocation={location.coordinates}
            height={isDead ? 220 : 320}
          />

          {!isDead ? (
            <View style={styles.measures}>
              <View style={styles.measure}>
                <TextField
                  label={texts.planting.heightLabel}
                  value={heightCm}
                  onChangeText={(next) => setHeightCm(next.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="118"
                  suffix={texts.planting.heightUnit}
                  error={
                    hasTriedToSave && (!Number.isFinite(heightNumber) || heightNumber < 1)
                      ? texts.planting.heightRequired
                      : undefined
                  }
                />
              </View>
              <View style={styles.measure}>
                <StepperField
                  label={texts.planting.branchesLabel}
                  value={visibleBranches}
                  onChange={setVisibleBranches}
                  decreaseLabel={texts.planting.branchesDecrease}
                  increaseLabel={texts.planting.branchesIncrease}
                />
              </View>
            </View>
          ) : null}

          {/* The health state and the cause are the same question asked of two
              different trees, so only one of them is ever on screen. A report
              of death has already answered «estado de salud», and leaving the
              group up with nothing selected would invite an answer that
              contradicts the one the screen is here to record. */}
          {!isDead ? (
            <ChipGroup
              label={texts.growthLog.healthLabel}
              options={HEALTH_OPTIONS}
              value={healthStatus}
              onChange={setHealthStatus}
            />
          ) : (
            <ChipGroup
              label={texts.growthLog.deadCauseLabel}
              options={texts.growthLog.deadCauses.map((cause) => ({ value: cause, label: cause }))}
              value={deadCause}
              onChange={setDeadCause}
              tone="danger"
              error={
                hasTriedToSave && deadCause === null ? texts.growthLog.deadCauseRequired : undefined
              }
            />
          )}

          <TextField
            label={isDead ? texts.growthLog.deadStoryLabel : texts.growthLog.notesLabel}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder={
              isDead ? texts.growthLog.deadStoryPlaceholder : texts.growthLog.notesPlaceholder
            }
          />

          {/* The coordinate is stamped into a death report exactly as it is into
              any other entry; the canvas simply does not print it back on this
              variant, where the line the guardian has to read is the one about
              the coordinator, not a number to relay. */}
          {!isDead ? (
            <View style={styles.captureRow}>
              {/* Decorative on purpose: the sentence beside it already names
                  what the target marks, and announcing both would read the same
                  thing twice before the coordinate itself. */}
              <Icon name="locate" size={14} color={colors.textMuted} />
              <AppText variant="caption" style={styles.capture}>
                {photo?.captureLocation == null
                  ? texts.growthLog.captureLocationMissing
                  : texts.growthLog.captureLocation(
                      formatCoordinates(photo.captureLocation.lat, photo.captureLocation.lng),
                    )}
              </AppText>
            </View>
          ) : null}

          {isDead ? (
            <AppText variant="caption" style={styles.centredText}>
              {texts.growthLog.deadNoMeasures}
            </AppText>
          ) : null}

          {/* Saving is a local write now and effectively cannot fail. What used
              to be reported here -- a refused insert, a photograph that would
              not upload -- belongs to the queued job and is shown on its card in
              «Mis árboles», where it outlives this screen. */}
          {addEntry.isError ? (
            <Notice
              tone="error"
              title={texts.treeErrors.title}
              message={texts.treeErrors.unknown}
              onRetry={() => void save()}
            />
          ) : null}

          {hasTriedToSave && blocker !== null ? <Notice tone="warning" message={blocker} /> : null}

          {/* One action across the width when reporting a death, which is how
              the canvas draws it: there is nothing to weigh it against, and a
              «Cancelar» of equal standing beside it would read as a choice
              between two ways of finishing. The cross in the bar is the way out
              of the screen, and the quieter button below the way back to a
              living entry. */}
          {isDead ? (
            <>
              <Button
                label={texts.growthLog.deadSubmit}
                loadingLabel={texts.growthLog.saving}
                isLoading={addEntry.isPending}
                onPress={() => void save()}
                variant="dangerSolid"
              />
              <Button
                label={texts.growthLog.deadBack}
                variant="ghost"
                onPress={() => {
                  setHealthStatus('healthy');
                  setDeadCause(null);
                  setHasTriedToSave(false);
                }}
              />
            </>
          ) : (
            <>
              <View style={styles.actions}>
                <Button
                  label={texts.common.cancel}
                  onPress={() => router.back()}
                  variant="secondary"
                  style={styles.action}
                />
                <Button
                  label={texts.growthLog.save}
                  loadingLabel={texts.growthLog.saving}
                  isLoading={addEntry.isPending}
                  onPress={() => void save()}
                  style={styles.submit}
                />
              </View>

              {/* The way into the death report. Kept at the bottom so it is
                  never the first thing a hand lands on. */}
              <Button
                label={texts.growthLog.reportDead}
                variant="danger"
                onPress={() => {
                  setHealthStatus('dead');
                  setHasTriedToSave(false);
                }}
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfacePage,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  // The glyph keeps its drawn size and the target grows around it, then the
  // negative margin pulls that box back so the cross still starts on the
  // sixteen point gutter the rest of the form is set on. Same trade the
  // catalogue's header bar makes with its chevron, so the two bars line up.
  close: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    marginLeft: -spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    color: colors.textPrimary,
  },
  barTitle: {
    flex: 1,
  },
  scroll: {
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
  /**
   * The two lines that name the evidence photograph. The gap is smaller than
   * the column's own, so they read as one label rather than two entries in the
   * form, and the negative margin below pulls the well they belong to up
   * against them instead of leaving it halfway to the warning above.
   *
   * Both lines keep the ink the type scale gives them. The canvas tints them
   * `emerald400` `#3FB877`, which is 2.02:1 on white and carries neither: that
   * green is the empty placeholder's own colour, not a decision about the
   * words. So the title stays `textPrimary` at 16.74:1 and the hint
   * `textSecondary` at 7.04:1 — the 12 point hint owes 4.5:1, which
   * `textMuted`'s 4.43:1 would miss.
   */
  evidence: {
    gap: spacing[1],
    marginBottom: -spacing[2],
  },
  measures: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  measure: {
    flex: 1,
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  /**
   * Mono, because it is a measurement and that is the face the design system
   * keeps for them.
   *
   * The canvas sets the target and the coordinate in the same `textMuted`
   * grey. The grey is `#757575` and measures 4.43:1 on the page: enough for the
   * 3:1 a drawing owes, which is why the target keeps it, and short of the
   * 4.5:1 this thirteen point line owes, which is why the words are in
   * `textSecondary` at 7.04:1 instead. The coordinate is the one thing on this
   * screen a guardian may have to read back to a coordinator.
   */
  capture: {
    flex: 1,
    fontFamily: fontFace.monoMedium,
    color: colors.textSecondary,
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
  centred: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[6],
  },
  centredText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
