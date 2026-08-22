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
 * On leaf-white paper a card is not a lighter step: `surfaceCard` is plain
 * white and the page is `#F4FDF4`, 1.04:1 apart, so a fill can no longer say
 * «this is a card». What separates it from the page is the `borderSubtle`
 * outline and `shadowCard`, exactly as the canvas draws it, and every state
 * this component shows has to be drawn the same way — on the edge, not in the
 * fill.
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
  /**
   * The canvas draws no pressed card anywhere, so the mechanism is decided
   * here. It cannot be a step up in surface — that used to be `surfaceOverlay`
   * over `surfaceCard` and both are now the same white, which is a state that
   * compiles and cannot be seen.
   *
   * The signal moves to the outline, the only part of the card that already
   * carries its shape: `accent` `#008D46` reads 4.12:1 against the page and
   * 3.47:1 against the `borderSubtle` edge it replaces, so both the press and
   * the change of press are above the 3:1 that a component state has to hold.
   * It is also the colour of `borderFocus`, so being pressed and being focused
   * speak with one voice.
   *
   * `accentSoft` only tints the fill by 1.17:1 and is reinforcement, never the
   * signal. It is safe for the content: the lightest ink a card carries,
   * `textSecondary`, still reads 6.07:1 over it. Dimming the card with opacity
   * was the alternative and was rejected — at 0.7 the ink and the card fade
   * together and the pair falls to 3.52:1, and a card must not become
   * unreadable while a finger rests on it.
   */
  pressed: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
});
