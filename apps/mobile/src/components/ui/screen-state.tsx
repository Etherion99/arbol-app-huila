import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { colors, radii, spacing } from '@/constants/theme';

/** The wash behind the medallion. */
export type ScreenStateTone = 'danger' | 'neutral';

/** The single way out of the state. */
export type ScreenStateAction = {
  label: string;
  onPress: () => void;
  /**
   * Defaults to the primary green, which is what the canvas gives «Reintentar»
   * and «Entrar de nuevo». `danger` is for the way out that ends the session.
   */
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
};

export type ScreenStateProps = {
  /**
   * The drawing inside the medallion, from the design system's own kit. A
   * screen picks the name; it never adds a glyph the kit does not carry.
   */
  icon: IconName;
  /** `danger` when something failed, `neutral` when nothing did. Defaults to `danger`. */
  tone?: ScreenStateTone;
  title: string;
  /** Running text under the title, for a state that explains itself in prose. */
  message?: string;
  /**
   * The failure the server actually named, framed rather than run on. Use it
   * instead of `message` when the sentence comes from an error and not from
   * the copy deck, so a guardian can tell the two apart.
   */
  detail?: string;
  action?: ScreenStateAction;
  /** Off on a state that has nothing to send anyway. */
  hasConnectionBanner?: boolean;
};

/**
 * A screen that has nothing to show but the reason why.
 *
 * The canvas draws these full height rather than as a strip inside a list —
 * F4 for a read that failed and for a session that ran out, F6 for the two
 * ways a profile can be missing — and it draws F6 by following F4, which is
 * why one component serves both instead of the same column being typed out
 * once per screen. `Notice` remains the strip that reports a failure inside a
 * working screen; this is the screen that failed.
 *
 * It brings its own `Screen`, so wiring one into a route is a single early
 * return:
 *
 *     if (trees.isError) {
 *       return (
 *         <ScreenState
 *           icon="wifiOff"
 *           title={texts.myTrees.errorTitle}
 *           message={texts.myTrees.errorBody}
 *           action={{ label: texts.common.retry, onPress: () => void trees.refetch() }}
 *         />
 *       );
 *     }
 *
 * ## Colour
 *
 * Nothing here is a new pair. The red medallion is `dangerSoft` under a
 * `danger` glyph, 3.75:1 composited over the page and so over the 3:1 a
 * drawing owes; the neutral one is the white card under `textSecondary` at
 * 7.04:1. The title is `textPrimary`, the message `textSecondary`, and the
 * framed detail is `Notice` with the fills it already measured.
 */
export function ScreenState({
  icon,
  tone = 'danger',
  title,
  message,
  detail,
  action,
  hasConnectionBanner = true,
}: ScreenStateProps) {
  return (
    <Screen hasConnectionBanner={hasConnectionBanner}>
      <View
        style={styles.centred}
        accessibilityRole="alert"
        // A live region only where there is not already one inside. `Notice`
        // declares its own, and two nested regions read the same sentence
        // twice to somebody who cannot see it was only written once.
        accessibilityLiveRegion={detail === undefined ? 'polite' : 'none'}
      >
        <StateMedallion icon={icon} tone={tone} />

        <AppText variant="title" style={styles.centredText}>
          {title}
        </AppText>

        {message !== undefined ? (
          <AppText variant="bodyMuted" style={styles.centredText}>
            {message}
          </AppText>
        ) : null}

        {detail !== undefined ? (
          <View style={styles.detail}>
            <Notice tone="error" message={detail} />
          </View>
        ) : null}

        {action !== undefined ? (
          <Button
            label={action.label}
            onPress={action.onPress}
            variant={action.variant ?? 'primary'}
            isLoading={action.isLoading ?? false}
          />
        ) : null}
      </View>
    </Screen>
  );
}

/**
 * The round mark the canvas puts above every one of these states, and above
 * the camera the guardian turned off.
 *
 * Exported because the camera refusal is drawn the same way inside a panel of
 * the planting wizard rather than on a screen of its own, and one medallion
 * measured once beats two that drift.
 */
export function StateMedallion({
  icon,
  tone = 'danger',
}: {
  icon: IconName;
  tone?: ScreenStateTone;
}) {
  const isDanger = tone === 'danger';

  return (
    <View style={[styles.medallion, isDanger ? styles.medallionDanger : styles.medallionNeutral]}>
      {/* Decorative: the heading right below says the same thing in words. */}
      <Icon name={icon} size={30} color={isDanger ? colors.danger : colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  centredText: {
    textAlign: 'center',
  },
  /**
   * The framed detail keeps the column's width instead of shrinking to its
   * sentence, which is how the canvas sets it, and its own text stays left
   * aligned inside the centred column because a paragraph in a box reads as a
   * quotation and not as a caption.
   */
  detail: {
    alignSelf: 'stretch',
  },
  medallion: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallionDanger: {
    backgroundColor: colors.dangerSoft,
  },
  medallionNeutral: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
});
