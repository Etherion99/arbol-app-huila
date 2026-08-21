import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, spacing } from '@/constants/theme';

export type ScreenHeaderProps = {
  title: string;
  /** Where back goes. Defaults to popping the stack. */
  onBack?: () => void;
  /** Hides the arrow on a screen there is no going back from. */
  hasBack?: boolean;
  /** An action on the right, such as the ⋯ menu of the tree detail. */
  action?: ReactNode;
};

/**
 * The bar the canvas puts at the top of every screen you can back out of:
 * registering, recovering a password, the legal notice, the notification
 * settings, and the four steps of planting a tree.
 *
 * Not every screen gets one, and the exceptions are not oversights. The email
 * verification screen and the link-return screen have no arrow because there
 * is nowhere to go back to: one is waiting for a message and the other was
 * opened from it.
 *
 * The chevron is a system symbol rather than a bundled icon. The design
 * system's icon kit is not ported yet, and this is the same source the tab bar
 * already draws from — one strategy instead of two.
 */
export function ScreenHeader({ title, onBack, hasBack = true, action }: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.bar}>
      {hasBack ? (
        <Pressable
          onPress={onBack ?? (() => router.back())}
          accessibilityRole="button"
          accessibilityLabel={texts.common.back}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            tintColor={colors.textPrimary}
            size={22}
          />
        </Pressable>
      ) : null}

      <AppText variant="headerTitle" style={styles.title} numberOfLines={1}>
        {title}
      </AppText>

      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  back: {
    // The canvas draws a 22pt chevron with no box around it. The glyph keeps
    // its size and the target grows around it, which is the same trade the
    // map controls already make.
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    marginLeft: -spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    flex: 1,
  },
});
