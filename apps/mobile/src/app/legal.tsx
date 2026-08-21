import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { texts } from '@/constants/texts';
import { colors, radii, spacing } from '@/constants/theme';

/**
 * Privacy notice and terms.
 *
 * The wording here is a working draft and is marked as such on screen, because
 * a provisional legal text that does not say it is provisional is worse than
 * none at all. The route and every link into it are final; the definitive text
 * replaces the content of this file before the app reaches the stores.
 */
export default function LegalScreen() {
  return (
    <Screen hasConnectionBanner={false}>
      <View style={styles.badge}>
        <AppText variant="caption" style={styles.badgeText}>
          {texts.legal.provisionalBadge}
        </AppText>
      </View>

      <Notice tone="warning" message={texts.legal.provisionalNotice} />

      {texts.legal.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <AppText variant="subtitle">{section.heading}</AppText>
          <AppText variant="bodyMuted">{section.body}</AppText>
        </View>
      ))}

      <View style={styles.section}>
        <AppText variant="subtitle">{texts.legal.contactHeading}</AppText>
        <AppText variant="bodyMuted">{texts.legal.contactBody}</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.warningText,
  },
  badgeText: {
    color: colors.warningText,
    fontWeight: '700',
  },
  section: {
    gap: spacing.xs,
  },
});
