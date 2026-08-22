import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, spacing } from '@/constants/theme';

export type GuestBarProps = {
  onSignUp: () => void;
  onSignIn: () => void;
  onLegal: () => void;
};

/**
 * What sits under the map for a visitor without an account.
 *
 * The map itself is the argument for signing up, so the bar offers the account
 * and nothing else: there is no dead affordance where the planting button would
 * be for a guardian, because pressing something that cannot work is worse than
 * not seeing it.
 *
 * The privacy link is the one thing here the canvas does not draw. It is not a
 * decoration: a visitor exploring the map is having their location read and the
 * guardians' data shown to them, and this bar is the only surface they see. Law
 * 1581 does not care that the notice is one screen further in, and before this
 * bar existed the link lived on a tab the design does not have.
 */
export function GuestBar({ onSignUp, onSignIn, onLegal }: GuestBarProps) {
  return (
    <View style={styles.bar}>
      <Button label={texts.map.guestAction} onPress={onSignUp} />

      <View style={styles.links}>
        <Pressable
          onPress={onSignIn}
          accessibilityRole="button"
          accessibilityLabel={texts.map.guestSignIn}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <AppText variant="caption" style={styles.signInLabel}>
            {texts.map.guestSignIn}
          </AppText>
        </Pressable>

        <Pressable
          onPress={onLegal}
          accessibilityRole="link"
          accessibilityLabel={texts.common.legalLink}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <AppText variant="caption" style={styles.legalLabel}>
            {texts.map.guestLegal}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * The rule is the whole boundary. `surfaceRaised` is white and the map above
   * it is `#F4FDF4`, 1.04:1 apart, so the bar has no edge of its own the way it
   * did over a dark map — without the rule the map simply runs into the bar.
   *
   * That is why it is `borderStrong` `#B9D4C1` and not the `borderSubtle` a
   * list divider takes: 1.52:1 against the map ground rather than 1.19:1, the
   * strongest edge the palette offers. Neither reaches the 3:1 of SC 1.4.11 and
   * neither owes it — this is a divider between two surfaces, and the button
   * and the two links inside are what identify the controls.
   */
  bar: {
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    backgroundColor: colors.surfaceRaised,
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[5],
  },
  link: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // `textLink` `#00753A` and not the `textLinkHover` green: on the bar's white
  // it reads 5.82:1, where `#008D46` would only reach 4.29:1 under a 13 point
  // label.
  signInLabel: {
    color: colors.textLink,
  },
  // Quieter than signing in: the notice has to be reachable, not competing
  // with the two actions the screen is actually asking for. Quiet still means
  // read — `textSecondary` `#4A5A50` is 7.32:1 here, and it is the only
  // receding ink in the palette that clears AA.
  legalLabel: {
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.75,
  },
});
