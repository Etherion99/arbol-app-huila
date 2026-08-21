import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, fontFace, fontSize, radii, spacing } from '@/constants/theme';

export type TagProps = {
  label: string;
  /** Adds the dismiss control. Absent, the tag is a plain marker. */
  onRemove?: () => void;
  /** Mono face, for a species key, a coordinate or an identifier. */
  isMono?: boolean;
  style?: ViewStyle;
};

/**
 * A neutral marker: an applied filter, a species key, a label the coordinator
 * attached. It carries no state — that is the `Badge`, and keeping the two
 * apart is what stops a grey tag from being read as a tree in trouble.
 */
export function Tag({ label, onRemove, isMono = false, style }: TagProps) {
  return (
    <View style={[styles.tag, style]}>
      <AppText style={[styles.label, isMono && styles.mono]} numberOfLines={1}>
        {label}
      </AppText>

      {onRemove !== undefined ? (
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={texts.ui.removeTag(label)}
          // The canvas draws a 12px cross. A 12px target is not a target on a
          // phone held in one hand, so the glyph keeps its size and the area
          // around it grows to the minimum this project holds every control to.
          hitSlop={(MIN_TOUCH_TARGET - 12) / 2}
          style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
        >
          <AppText style={styles.removeGlyph}>✕</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[1] + 2,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2] + 2,
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.full,
  },
  label: {
    fontFamily: fontFace.bodyMedium,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs + 4,
    color: colors.textSecondary,
  },
  mono: {
    fontFamily: fontFace.monoMedium,
  },
  remove: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeGlyph: {
    fontFamily: fontFace.bodyMedium,
    fontSize: fontSize.xs,
    // Muted is legal here: this is a glyph, not small text, and it carries an
    // accessible label of its own.
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.6,
  },
});
