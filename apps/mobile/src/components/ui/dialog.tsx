import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, effects, radii, spacing } from '@/constants/theme';

export type DialogProps = {
  isVisible: boolean;
  title: string;
  children: ReactNode;
  /** The actions, laid out end aligned. Usually a cancel and a confirm. */
  footer?: ReactNode;
  onClose: () => void;
};

/**
 * A decision that has to be taken before anything else continues: archiving a
 * tree with its reason, signing out, confirming a merge of species.
 *
 * It replaces `Alert.alert`, which cannot carry the design system at all — the
 * native alert is the operating system's, not this project's.
 *
 * ## What separates it from the screen behind it
 *
 * Not the surface. `surfaceRaised`, `surfaceCard` and `surfaceOverlay` are all
 * plain `#FFFFFF`, so stacking one on another expresses nothing, and white on
 * the `#F4FDF4` page is 1.04:1. The dialog names `surfaceOverlay` because that
 * is what it is, and the scrim below does the separating.
 *
 * The border does not help either: `borderStrong` #B9D4C1 is *lighter* than
 * the darkened ground it would have to cut against, at 2.16:1. It stays
 * because the catalogue draws it and because it is the edge on a screenshot or
 * a print where the scrim is flattened away, but the edge a guardian reads is
 * the white body against the scrim, at 3.43:1.
 */
export function Dialog({ isVisible, title, children, footer, onClose }: DialogProps) {
  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.scrim}>
        <Pressable style={styles.dismissArea} onPress={onClose} accessibilityElementsHidden />

        <View style={styles.dialog} accessibilityViewIsModal accessibilityRole="alert">
          <View style={styles.header}>
            <AppText variant="title" style={styles.title} numberOfLines={2}>
              {title}
            </AppText>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={texts.ui.dialogClose}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <AppText style={styles.closeGlyph}>✕</AppText>
            </Pressable>
          </View>

          <View style={styles.body}>{children}</View>

          {footer !== undefined ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  /**
   * `colors.ink` #1A1A1A over the page, which is the derivation the catalogue
   * uses — the bottle green this used to be belonged to a palette that no
   * longer exists.
   *
   * The catalogue draws it at 45 % with a `backdrop-filter: blur(4px)`. React
   * Native has no backdrop filter, and `expo-blur` is a native dependency
   * whose cost lands on the cheapest phone in the vereda, so the separation
   * the blur was carrying is paid in alpha instead: at 45 % the white dialog
   * reads 2.97:1 against the scrim, under the 3:1 a boundary needs, and at
   * 50 % it reads 3.43:1.
   */
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
    backgroundColor: 'rgba(26, 26, 26, 0.5)',
  },
  dismissArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.xl,
    boxShadow: effects.shadowOverlay,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingVertical: spacing[4],
    paddingLeft: spacing[5],
    paddingRight: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  title: {
    flex: 1,
  },
  close: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
  body: {
    gap: spacing[3],
    padding: spacing[5],
  },
  /**
   * The rule is the whole band. Tinting it `surfaceRaised` used to set the
   * actions apart from the body; both are `#FFFFFF` now, so the fill drew
   * nothing and only claimed to, and the divider is what actually separates
   * them.
   */
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
});
