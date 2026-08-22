import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { texts } from '@/constants/texts';
import { colors, radii, spacing } from '@/constants/theme';
import { useIsOnline } from '@/hooks/use-is-online';
import { usePendingSyncCount } from '@/hooks/use-pending-sync-count';

/**
 * A strip that appears the moment the connection drops, before anything is
 * attempted. Telling a guardian afterwards that their registration failed is
 * the failure mode this project cannot afford.
 *
 * When there are records waiting on the phone it says how many, because "sin
 * conexión" on its own leaves the guardian wondering whether the photo they
 * just took is gone. The count comes from `usePendingSyncCount`, which reports
 * none until the offline write queue exists; until then the strip shows the
 * plain message and nothing here has to change when it does.
 */
export function ConnectionBanner() {
  const isOnline = useIsOnline();
  const pendingCount = usePendingSyncCount();

  if (isOnline) {
    return null;
  }

  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Icon name="wifiOff" size={18} color={colors.earthBrown} />
      <AppText variant="caption" style={styles.text}>
        {pendingCount > 0 ? texts.common.offlinePending(pendingCount) : texts.common.offlineBanner}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * An inset amber block, not a full bleed bar, which is how the canvas draws
   * it and how the catalogue draws every other warning: `stateDueSoft` behind
   * the yellow edge the `Notice` warning tone already uses, so the two read as
   * the same kind of message.
   *
   * The fill is an alpha, so on the page it composites to `#F6F5BE`. The strip
   * used to be a solid `warning` `#FFD700` block written in white, which
   * measures 1.40:1 and could not be read at all.
   */
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginHorizontal: spacing[4],
    marginTop: spacing[1],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.stateDueSoft,
    /** `colors.warning` #FFD700, at the alpha the catalogue gives a yellow edge. */
    borderColor: 'rgba(255, 215, 0, 0.55)',
    borderWidth: 1,
    borderRadius: radii.md,
  },
  /**
   * `textPrimary` reads 15.52:1 over the composited fill; the 13 point line
   * owes 4.5:1. The icon is `earthBrown` at 5.36:1 over the same ground, the
   * ink the design system pairs with this yellow — #FFD700 itself would sit
   * there at 1.25:1 and reach nobody.
   */
  text: {
    flex: 1,
    color: colors.textPrimary,
  },
});
