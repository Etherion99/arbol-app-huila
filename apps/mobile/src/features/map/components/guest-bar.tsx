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
  bar: {
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    backgroundColor: colors.surfaceRaised,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
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
  signInLabel: {
    color: colors.textLink,
  },
  // Quieter than signing in: the notice has to be reachable, not competing
  // with the two actions the screen is actually asking for.
  legalLabel: {
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.75,
  },
});
