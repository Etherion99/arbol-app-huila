import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, spacing } from '@/constants/theme';

export type GuestBarProps = {
  onSignUp: () => void;
  onSignIn: () => void;
};

/**
 * What sits under the map for a visitor without an account.
 *
 * The map itself is the argument for signing up, so the bar offers the account
 * and nothing else: there is no dead affordance where the planting button would
 * be for a guardian, because pressing something that cannot work is worse than
 * not seeing it.
 */
export function GuestBar({ onSignUp, onSignIn }: GuestBarProps) {
  return (
    <View style={styles.bar}>
      <Button label={texts.map.guestAction} onPress={onSignUp} />

      <Pressable
        onPress={onSignIn}
        accessibilityRole="button"
        accessibilityLabel={texts.map.guestSignIn}
        style={({ pressed }) => [styles.signIn, pressed && styles.pressed]}
      >
        <AppText variant="caption" style={styles.signInLabel}>
          {texts.map.guestSignIn}
        </AppText>
      </Pressable>
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
  signIn: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInLabel: {
    color: colors.textLink,
  },
  pressed: {
    opacity: 0.75,
  },
});
