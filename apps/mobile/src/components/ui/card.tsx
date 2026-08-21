import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, effects, radii, spacing } from '@/constants/theme';

export type CardProps = {
  children: ReactNode;
  /** Inner padding. The catalogue's default of 16 is `spacing[4]`. */
  padding?: number;
  /**
   * Turns the card into a control. The catalogue lights an interactive card on
   * hover; a phone has no hover, so the same lift happens on press.
   */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
};

/**
 * The container almost everything in the canvas sits in: the tree cards of the
 * list, the bitácora entries, the panels of the profile.
 *
 * It never carries a light background. The palette is dark first and a card is
 * one step above the page, never a hole cut into it.
 */
export function Card({
  children,
  padding = spacing[4],
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
}: CardProps) {
  const body = <View style={[styles.base, { padding }, style]}>{children}</View>;

  if (onPress === undefined) {
    return body;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.base, { padding }, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    boxShadow: effects.shadowCard,
  },
  pressed: {
    backgroundColor: colors.surfaceOverlay,
  },
});
