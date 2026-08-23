import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { TreeRegistration } from '@arbolapp/core';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Notice } from '@/components/ui/notice';
import { texts } from '@/constants/texts';
import { MAX_CONTENT_WIDTH, colors, effects, spacing } from '@/constants/theme';
import { usePushRegistration } from '@/features/notifications/use-push-registration';
import { useNextPhotoDate, type NextPhotoDate } from '@/features/planting/use-next-photo-date';

/**
 * What became of the question. `declined` is the guardian's own answer; the
 * other three are the system's, and they are kept apart because only one of
 * them means a reminder will arrive.
 */
type NotifyAnswer = 'granted' | 'blocked' | 'unavailable' | 'declined';

export type PlantingSuccessProps = {
  registration: TreeRegistration;
  /** Empty when the zone catalogue could not name it; the line then drops it. */
  villageName: string;
  /** As the guardian typed it. Never title cased: the raw text is preserved. */
  speciesRawText: string;
  /** Resets the wizard to a blank draft at step one, without leaving the route. */
  onPlantAnother: () => void;
};

/**
 * The screen after a successful planting: the payoff, the next date, and the
 * one question worth asking while the guardian is still looking at it.
 *
 * ## Why this replaced the old success screen rather than following it
 *
 * The canvas calls this artboard «éxito + solicitud de notificaciones». It is
 * one screen, not two, and it has to be: a guardian who has just been told
 * their tree is on the map has no reason to read a second screen telling them
 * the same thing. So the confirmation the wizard already showed moved into the
 * hero here, and the request took the panel underneath it. Both exits the old
 * screen offered survive, and «Sembrar otro» — which the copy had but nothing
 * ever rendered — joins them.
 *
 * ## This is where the permission is asked for
 *
 * Here, and on the notification settings screen, and nowhere else. Never during
 * onboarding. The platform shows the dialog once -- a refusal stands until
 * somebody walks into the system settings, which nobody does -- so the single
 * question has to be spent on somebody who already knows what they are being
 * offered. A guardian looking at the tree they just planted, and at the date
 * its next photograph is due, is exactly that person. A guardian on screen two
 * of an intro is not.
 *
 * The answer is the system's, so the outcome is drawn from what it actually
 * said rather than from the button that was pressed: granted, blocked, or a
 * build with no push project behind it. The last one is real -- this repository
 * has no EAS project yet -- and it is named instead of being shown as a
 * success, because the local reminder is what covers that guardian and they
 * should know which of the two is watching their tree.
 *
 * The exits appear with the answer rather than beside the question, so the
 * panel never stacks four actions at once and the canvas's own two are what a
 * guardian meets first.
 */
export function PlantingSuccess({
  registration,
  villageName,
  speciesRawText,
  onPlantAnother,
}: PlantingSuccessProps) {
  const router = useRouter();
  const nextPhoto = useNextPhotoDate(registration.treeId);
  const push = usePushRegistration();
  const [answer, setAnswer] = useState<NotifyAnswer | null>(null);

  const ask = async () => {
    const result = await push.enable.mutateAsync();
    setAnswer(
      result.state === 'registered'
        ? 'granted'
        : result.reason === 'permission-denied'
          ? 'blocked'
          : 'unavailable',
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.hero}>
        {/* A graphic, not a label: the title beside it already says what
            happened, so a screen reader gains nothing from hearing «brote». */}
        <View style={styles.badge}>
          <Icon name="sprout" size={44} color={colors.accent} />
        </View>

        <AppText variant="display" style={styles.centred}>
          {texts.planting.successTitle}
        </AppText>

        <AppText variant="bodyMuted" style={styles.centred}>
          {villageName === ''
            ? speciesRawText
            : texts.planting.successBody(speciesRawText, villageName)}
        </AppText>

        <NextPhotoLine value={nextPhoto} />

        {/* Not in the canvas, which stops at the species and the date. Kept
            because the code is the string that finds this tree in the search
            and on the map, it was already on the screen this one replaces, and
            dropping it would take something real away from the guardian at the
            one moment they are told it exists. */}
        <AppText
          variant="data"
          style={styles.code}
          accessibilityLabel={texts.planting.successCodeLabel(registration.code)}
        >
          {registration.code}
        </AppText>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelColumn}>
          {answer === null ? (
            <>
              <View style={styles.prompt}>
                <Icon name="bell" size={22} color={colors.accent} />
                <View style={styles.promptCopy}>
                  <AppText variant="label">{texts.planting.successNotifyTitle}</AppText>
                  <AppText variant="caption">{texts.planting.successNotifyBody}</AppText>
                </View>
              </View>

              <Button
                label={texts.planting.successNotifyAccept}
                isLoading={push.enable.isPending}
                onPress={() => void ask()}
              />
              {/* Ghost rather than the canvas's muted grey. `textMuted`
                  #757575 reads 4.61:1 on this white panel but only 4.43:1 on
                  the page, and a 15 point control label must not depend on
                  which of the two it lands on. `textLink` #00753A is 5.82:1
                  here and 5.60:1 there. */}
              <Button
                label={texts.planting.successNotifyDecline}
                variant="ghost"
                onPress={() => setAnswer('declined')}
              />
            </>
          ) : (
            <>
              {answer === 'granted' ? (
                <Notice tone="success" message={texts.planting.successNotifyGranted} />
              ) : answer === 'declined' ? (
                <AppText variant="caption">{texts.planting.successNotifyDeclined}</AppText>
              ) : (
                // Blocked, or a build the server cannot push to. Both offer the
                // settings screen, which is the only place either can be
                // followed up, and neither is dressed up as having worked.
                <Notice
                  tone="warning"
                  message={
                    answer === 'blocked'
                      ? texts.planting.successNotifyBlocked
                      : texts.planting.successNotifyUnavailable
                  }
                  onRetry={() => router.push('/settings/notifications')}
                  retryLabel={texts.planting.successNotifySettings}
                />
              )}

              <View style={styles.exits}>
                <Button
                  label={texts.planting.successOpenTree}
                  onPress={() =>
                    router.replace({
                      pathname: '/tree/[id]',
                      params: { id: registration.treeId },
                    })
                  }
                  style={styles.exit}
                />
                <Button
                  label={texts.planting.successPlantAnother}
                  variant="secondary"
                  onPress={onPlantAnother}
                  style={styles.exit}
                />
              </View>

              <Button
                label={texts.planting.successDone}
                variant="ghost"
                onPress={() => router.replace('/trees')}
              />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

/**
 * «Próxima foto: 21 oct 2026», or what is true instead.
 *
 * The date is the one thing on this screen that has to be fetched, so it is
 * also the one thing that can be missing. It waits and it fails out loud rather
 * than collapsing to a blank line, because a guardian who never learns when the
 * next photograph is due has lost the point of the reminder they are about to
 * be asked about.
 */
function NextPhotoLine({ value }: { value: NextPhotoDate }) {
  if (value.state === 'loading') {
    return (
      <AppText variant="caption" style={styles.centred}>
        {texts.planting.successNextPhotoLoading}
      </AppText>
    );
  }

  if (value.state === 'failed') {
    return (
      <View style={styles.failed}>
        <AppText variant="caption" style={styles.centred}>
          {texts.planting.successNextPhotoFailed}
        </AppText>
        <Button label={texts.common.retry} variant="ghost" size="sm" onPress={value.retry} />
      </View>
    );
  }

  // Grouped so it is announced as the sentence it reads as, rather than as a
  // label and a loose date.
  return (
    <View
      style={styles.nextPhoto}
      accessible
      accessibilityLabel={texts.planting.successNextPhoto(value.date)}
    >
      <AppText variant="bodyMuted">{texts.planting.successNextPhotoLabel}</AppText>
      <AppText variant="data">{value.date}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfacePage,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[6],
  },
  /**
   * The 96 point disc of the canvas. `accentSoft` is a 12% wash, so the green
   * inside it reads 3.56:1 against the composite — over the 3:1 a graphic owes
   * and nowhere near the 4.5:1 it would owe if it were text.
   */
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    boxShadow: effects.glowAccent,
  },
  centred: {
    textAlign: 'center',
  },
  nextPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  failed: {
    alignItems: 'center',
    gap: spacing[1],
  },
  // 16 point mono is small text by WCAG's reckoning, and `accent` reads 4.12:1
  // on the page. `textLink` is the same green darkened for exactly this case.
  code: {
    textAlign: 'center',
    color: colors.textLink,
  },
  /**
   * The white shelf the canvas anchors the request to. It is the page's only
   * change of ground, and `borderSubtle` is 1.19:1 against it — a seam, not a
   * rule, which is all it is asked to be: the shelf is decoration and every
   * word inside it carries its own contrast.
   */
  panel: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    paddingBottom: spacing[6],
  },
  panelColumn: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    gap: spacing[3],
  },
  prompt: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  promptCopy: {
    flex: 1,
    gap: 2,
  },
  exits: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  exit: {
    flex: 1,
  },
});
