import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, fontFace, fontSize, radii, spacing } from '@/constants/theme';
import { useIsOnline } from '@/hooks/use-is-online';
import { usePendingSyncCount } from '@/hooks/use-pending-sync-count';

export type ConnectionBannerProps = {
  /**
   * Set on the screen that already lists what is waiting. The strip keeps its
   * sentence and drops the «Ver» link, which would otherwise offer to take the
   * guardian to the list they are looking at.
   */
  isShowingPending?: boolean;
};

/**
 * The strip that says what this phone is still holding.
 *
 * It appears the moment the connection drops, before anything is attempted.
 * Telling a guardian afterwards that their registration failed is the failure
 * mode this project cannot afford.
 *
 * ## Three things it can be reporting
 *
 * The canvas draws one of them — offline, with a count and a «Ver». The other
 * two are here because the queue made them possible and the project's own rule
 * against silent failure makes them necessary:
 *
 * - **Offline.** With a count when there is something waiting, because "sin
 *   conexión" on its own leaves the guardian wondering whether the photograph
 *   they just took survived.
 * - **Online, sending.** The queue is draining. Worth a line, because the work
 *   left the wizard and has not arrived yet, and a screen that said nothing
 *   during that window would look like it had lost it.
 * - **Online, and something did not go.** The one case that is a failure. It is
 *   the reason this strip cannot simply be hidden as soon as the radio comes
 *   back: a job that the server refused would otherwise disappear in silence,
 *   which is precisely what a guardian standing in a vereda cannot afford.
 *
 * ## Why it can be dismissed, and why it comes back
 *
 * The canvas gives it a close control, and a strip pinned above four different
 * screens for a week without signal earns one. What it must not do is stay
 * dismissed through a change of circumstances, so the dismissal is remembered
 * against what was being said: the moment the count moves, the radio changes
 * its mind, or a job fails, this is a different message and it is shown again.
 */
export function ConnectionBanner({ isShowingPending = false }: ConnectionBannerProps) {
  const router = useRouter();
  const isOnline = useIsOnline();
  const pending = usePendingSyncCount();

  // What the strip is currently saying, as one comparable value. Held rather
  // than derived because it records a decision the guardian took, and compared
  // during render rather than reset from an effect, which would repaint every
  // screen carrying the strip one frame after it changed.
  const [dismissed, setDismissed] = useState<string | null>(null);

  const signature = `${isOnline ? 'on' : 'off'}:${pending.total}:${pending.blocked}`;

  const message = !isOnline
    ? pending.total > 0
      ? texts.common.offlinePending(pending.total)
      : texts.common.offlineBanner
    : pending.blocked > 0
      ? texts.sync.bannerFailed(pending.blocked)
      : pending.total > 0
        ? texts.sync.bannerSending(pending.total)
        : null;

  if (message === null || dismissed === signature) {
    return null;
  }

  const hasFailure = isOnline && pending.blocked > 0;

  return (
    <View
      style={[styles.banner, hasFailure && styles.bannerFailed]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      {/* Decorative: the sentence beside it already says what happened. */}
      <Icon
        name={isOnline ? 'clock' : 'wifiOff'}
        size={18}
        color={hasFailure ? colors.danger : colors.earthBrown}
      />

      <AppText variant="caption" style={styles.text}>
        {message}
      </AppText>

      {/* Absent when there is nothing on the phone to go and look at, and on
          the screen that is already showing it. */}
      {pending.total > 0 && !isShowingPending ? (
        <Pressable
          onPress={() => router.navigate('/trees')}
          accessibilityRole="link"
          accessibilityLabel={texts.sync.bannerView}
          hitSlop={(MIN_TOUCH_TARGET - fontSize.sm) / 2}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <AppText style={styles.link}>{texts.sync.bannerView}</AppText>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => setDismissed(signature)}
        accessibilityRole="button"
        accessibilityLabel={texts.sync.bannerDismiss}
        hitSlop={(MIN_TOUCH_TARGET - fontSize.sm) / 2}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <AppText style={styles.dismiss}>✕</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * An inset amber block, not a full bleed bar, which is how the canvas draws
   * it and how the catalogue draws every other warning: `stateDueSoft` behind
   * the yellow edge the `Notice` warning tone already uses, so the two read as
   * the same kind of message.
   *
   * The fill is an alpha, so on the page it composites to `#F6F5BE`. The strip
   * used to be a solid `warning` `#FFD700` block written in white, which
   * measures 1.40:1 and could not be read at all.
   */
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginHorizontal: spacing[4],
    marginTop: spacing[1],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.stateDueSoft,
    /** `colors.warning` #FFD700, at the alpha the catalogue gives a yellow edge. */
    borderColor: 'rgba(255, 215, 0, 0.55)',
    borderWidth: 1,
    borderRadius: radii.md,
  },
  /**
   * The one variant that is a failure rather than a wait, so it leaves the
   * yellow the rest of the app reads as "owed" and takes the danger tone the
   * `Notice` error already uses: the same 12% wash under a `danger` edge at the
   * 0.35 alpha the catalogue gives it. `textPrimary` measures 13.82:1 over this
   * composite and `danger` itself 3.75:1, which is the mark's 3:1 and not the
   * 4.5:1 a word would owe — so the icon takes the hue and the sentence stays
   * neutral, exactly as `Notice` resolves the same problem.
   */
  bannerFailed: {
    backgroundColor: colors.dangerSoft,
    /** `colors.danger` #E31B23. */
    borderColor: 'rgba(227, 27, 35, 0.35)',
  },
  /**
   * `textPrimary` reads 15.52:1 over the composited fill; the 13 point line
   * owes 4.5:1. The icon is `earthBrown` at 5.36:1 over the same ground, the
   * ink the design system pairs with this yellow — #FFD700 itself would sit
   * there at 1.25:1 and reach nobody.
   */
  text: {
    flex: 1,
    color: colors.textPrimary,
  },
  /**
   * `textLink` `#00753A`, which the canvas uses here and which measures 5.19:1
   * over the composited yellow — over the 4.5:1 a twelve point control label
   * owes. The glyph keeps the size the canvas draws and `hitSlop` grows the
   * area around it to the minimum this project holds every control to.
   */
  link: {
    fontFamily: fontFace.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textLink,
  },
  /** `textSecondary` at 6.52:1 over the same ground, and neutral: the dismiss
      is not part of the message and must not be read as another state. */
  dismiss: {
    fontFamily: fontFace.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
});
