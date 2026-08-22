import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { texts } from '@/constants/texts';
import { MAX_CONTENT_WIDTH, colors, radii, spacing } from '@/constants/theme';

export type LocationPermissionPrimerProps = {
  isVisible: boolean;
  /** Goes on to the system dialog. */
  onAllow: () => void;
  /** Leaves the permission unasked. The wizard's typed coordinates still work. */
  onDecline: () => void;
};

/**
 * The page shown before the system asks for the location, and never after it.
 *
 * Android and iOS both give the guardian one dialog and one answer, and a "no"
 * there cannot be taken back from inside the app. So the reason the GPS is
 * wanted is explained first, on a page of the project's own, and the dialog is
 * only reached by someone who already read it.
 *
 * The way out is a real one and not a polite refusal: the planting wizard lets
 * the coordinates be typed by hand, so declining here costs the guardian a
 * couple of numbers and not the tree.
 */
export function LocationPermissionPrimer({
  isVisible,
  onAllow,
  onDecline,
}: LocationPermissionPrimerProps) {
  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      presentationStyle="fullScreen"
      // The system back gesture means the same thing the second button does.
      onRequestClose={onDecline}
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.column}>
          <View style={styles.medallion}>
            <Icon name="locate" size={42} color={colors.accent} />
          </View>

          <AppText variant="title" style={styles.centred}>
            {texts.planting.locationDeniedTitle}
          </AppText>

          <AppText variant="bodyMuted" style={styles.centred}>
            {texts.planting.locationDeniedBody}
          </AppText>

          <View style={styles.actions}>
            <Button label={texts.planting.locationAllow} onPress={onAllow} />
            <Button
              label={texts.planting.locationManualInstead}
              onPress={onDecline}
              variant="ghost"
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfacePage,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[8],
  },
  /**
   * The canvas fills this disc with `accentSoft` rather than leaving it white
   * as the empty state does, because here the round shape is the subject and
   * not a frame around one. The fill composites to `#D7F0DF` on the page, and
   * `accent` `#008D46` draws the mark on it at 3.56:1 — over the 3:1 a graphic
   * owes, which is the bar a 42 point icon answers to.
   */
  medallion: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.full,
  },
  centred: {
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing[2],
    marginTop: spacing[2],
  },
});
