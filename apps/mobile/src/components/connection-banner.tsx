import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { texts } from '@/constants/texts';
import { colors, fontFace, spacing } from '@/constants/theme';
import { useIsOnline } from '@/hooks/use-is-online';

/**
 * A strip that appears the moment the connection drops, before anything is
 * attempted. Telling a guardian afterwards that their registration failed is
 * the failure mode this project cannot afford.
 */
export function ConnectionBanner() {
  const isOnline = useIsOnline();

  if (isOnline) {
    return null;
  }

  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <AppText variant="caption" style={styles.text}>
        {texts.common.offlineBanner}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  text: {
    // Dark ink on amber, which is the readable pairing of the two.
    color: colors.onAccent,
    fontFamily: fontFace.bodySemibold,
    textAlign: 'center',
  },
});
