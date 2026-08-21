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
 * ## The contrast trap
 *
 * The dialog body sits on `surfaceCard`, not on `surfaceOverlay`. That is not
 * arbitrary: `danger` reaches only 4.31:1 over the overlay and clears AA over
 * the card. An error message inside a dialog is exactly the text nobody can
 * afford to misread, so the card is the surface it gets.
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
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
    backgroundColor: 'rgba(7, 14, 12, 0.7)',
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
    backgroundColor: colors.surfaceCard,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.surfaceRaised,
  },
});
