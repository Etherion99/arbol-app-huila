import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { texts } from '@/constants/texts';
import { fontFace, spacing } from '@/constants/theme';

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

      {/* A date stamp, so the mono face, which is what the design system gives
          anything measured. `overline` is the only 12 point role in the scale,
          and its uppercasing and tracking are dropped here: the canvas sets
          this line in sentence case and shouting a date is not the same
          statement as labelling a section.

          It also draws it in `textMuted` #757575, which measures 4.43:1 on the
          page and cannot carry 12 point text. `textSecondary` at 7.04:1 is the
          quiet tone in this palette that clears AA, and it is what the rest of
          the app already recedes to. */}
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
    fontFamily: fontFace.monoMedium,
    textTransform: 'none',
    letterSpacing: 0,
    paddingTop: spacing[2],
  },
});
