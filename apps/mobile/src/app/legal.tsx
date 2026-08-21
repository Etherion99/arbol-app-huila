import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { texts } from '@/constants/texts';
import { spacing } from '@/constants/theme';

/**
 * Privacy notice and terms.
 *
 * The wording here is a working draft and is marked as such on screen, because
 * a provisional legal text that does not say it is provisional is worse than
 * none at all. The route and every link into it are final; the definitive text
 * replaces the content of this file before the app reaches the stores.
 *
 * The canvas splits this into two tabs, Privacidad and Términos, and this
 * screen is still one list. Splitting it means deciding which clauses are the
 * privacy notice and which are the terms of use, and that is a call about legal
 * content rather than about layout — with a draft text, guessing the split
 * would publish a structure nobody approved. The `Tabs` component is ready in
 * the catalogue; it goes in with the definitive wording.
 */
export default function LegalScreen() {
  return (
    <Screen hasConnectionBanner={false} header={<ScreenHeader title={texts.legal.title} />}>
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

      <AppText variant="overline" style={styles.version}>
        {texts.legal.version}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing[1],
  },
  version: {
    paddingTop: spacing[2],
  },
});
