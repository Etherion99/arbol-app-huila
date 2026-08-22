import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { texts } from '@/constants/texts';
import { colors, radii, spacing } from '@/constants/theme';

type Tone = 'error' | 'warning' | 'info' | 'success';

const GLYPH: Record<Tone, string> = {
  error: '✕',
  warning: '!',
  info: 'i',
  success: '✓',
};

export type NoticeProps = {
  tone: Tone;
  message: string;
  title?: string;
  /** Adds a retry button. Present whenever pressing again could work. */
  onRetry?: () => void;
  retryLabel?: string;
};

/**
 * The one way the app reports something the guardian has to know about.
 *
 * It is never optional decoration: a failure that is not shown is a guardian
 * who believes their photo went up when it did not, and in a vereda with
 * intermittent signal that is the normal case, not the edge case.
 *
 * ## Where the tone lives
 *
 * Not in the words. No soft fill in the palette can carry its own colour as a
 * label: composited over the page the best of them reaches 3.75:1 and the
 * yellow one 1.25:1, so a title written in its own tone is somewhere between
 * hard to read and invisible. Title and message are `textPrimary`, which
 * measures 13.82:1 or better over all four fills, and the tone is carried by
 * the fill, the border and the glyph instead.
 */
export function Notice({ tone, message, title, onRetry, retryLabel }: NoticeProps) {
  return (
    <View
      style={[styles.container, toneSurface[tone]]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.heading}>
        {/* A glyph until the design system's icon kit is ported. The canvas
            never shows a notice without a mark: colour alone does not reach a
            guardian who cannot separate red from green. */}
        <AppText variant="label" style={toneGlyph[tone]} accessibilityElementsHidden>
          {GLYPH[tone]}
        </AppText>

        {title !== undefined ? (
          <AppText variant="label" style={styles.title}>
            {title}
          </AppText>
        ) : null}
      </View>

      <AppText variant="body">{message}</AppText>

      {onRetry !== undefined ? (
        <Button
          label={retryLabel ?? texts.common.retry}
          onPress={onRetry}
          variant="secondary"
          style={styles.retry}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
    padding: spacing[4],
    borderRadius: radii.md,
    borderWidth: 1,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    flex: 1,
  },
  retry: {
    marginTop: spacing[2],
  },
});

/**
 * Fill and edge for each tone.
 *
 * The fills are the semantic tokens and never the Juventud en línea pair: the
 * affiliation yellow and magenta mark who made this app and are not allowed to
 * say anything about a tree, whatever hex they happen to share with a token
 * that is. The warning tone is the one seam left, because the palette ships
 * `warning` with no soft of its own; it borrows the wash of `stateDue`, the
 * same yellow under a name that at least means something in this interface.
 * All four fills are alphas, so a notice on a card and one on the page each
 * keep the ground they sit on.
 *
 * The edges are the tone's own colour at low alpha rather than the solid
 * token, which is how the catalogue draws every callout: at these values the
 * border reads as the end of the block and never as a rule competing with the
 * text. Yellow is the palest of the four and takes 0.55 where the other three
 * take 0.35, as the catalogue draws it.
 */
const toneSurface = StyleSheet.create({
  error: {
    backgroundColor: colors.dangerSoft,
    /** `colors.danger` #E31B23. */
    borderColor: 'rgba(227, 27, 35, 0.35)',
  },
  warning: {
    backgroundColor: colors.stateDueSoft,
    /** `colors.warning` #FFD700. */
    borderColor: 'rgba(255, 215, 0, 0.55)',
  },
  info: {
    backgroundColor: colors.infoSoft,
    /** `colors.info` #0097DA. */
    borderColor: 'rgba(0, 151, 218, 0.35)',
  },
  success: {
    backgroundColor: colors.accentSoft,
    /** `colors.accent` #008D46. */
    borderColor: 'rgba(0, 141, 70, 0.35)',
  },
});

/**
 * The mark is a graphic, so it answers to 3:1 rather than to 4.5:1 — but it
 * answers over its own fill, not over the page, and that is where three of the
 * four tones nearly lost it. Measured against each fill composited on the
 * page: `danger` 3.75:1, `accent` 3.56:1, and `earthBrown` 5.36:1 on the
 * yellow fill, which is why the warning mark is brown and not the #FFD700 that
 * would sit there at 1.25:1 and reach nobody.
 *
 * `info` is the one the palette cannot serve: #0097DA over its own fill is
 * 2.76:1 and the system has no darker blue. It falls back to `textSecondary`
 * at 6.18:1 rather than borrow green or brown, which already mean other tones;
 * on that notice the fill and the border carry blue by themselves.
 */
const toneGlyph = StyleSheet.create({
  error: { color: colors.danger },
  warning: { color: colors.earthBrown },
  info: { color: colors.textSecondary },
  success: { color: colors.accent },
});
