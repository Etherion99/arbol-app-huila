import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { MIN_TOUCH_TARGET, colors, fontFace, radii, spacing } from '@/constants/theme';

export type CheckboxLink = {
  /** A literal fragment of `label`. Matched once, in order of appearance. */
  text: string;
  onPress: () => void;
};

export type CheckboxFieldProps = {
  label: string;
  isChecked: boolean;
  onChange: (isChecked: boolean) => void;
  /**
   * Fragments of the label that open something. The canvas puts the links
   * inside the sentence — «Acepto la _política de privacidad_ y los _términos
   * de uso_» — rather than in a button underneath, so the consent reads as one
   * statement instead of three separate things.
   */
  links?: CheckboxLink[];
  error?: string;
  accessibilityHint?: string;
};

type Segment = { text: string; onPress?: () => void };

/**
 * Cuts the label around each link fragment, keeping the copy a single string in
 * the texts file where a wording review can read it whole.
 */
function segmentsOf(label: string, links: CheckboxLink[]): Segment[] {
  let rest = label;
  const segments: Segment[] = [];

  for (const link of links) {
    const at = rest.indexOf(link.text);
    if (at === -1) {
      continue;
    }

    if (at > 0) {
      segments.push({ text: rest.slice(0, at) });
    }
    segments.push({ text: link.text, onPress: link.onPress });
    rest = rest.slice(at + link.text.length);
  }

  if (rest !== '') {
    segments.push({ text: rest });
  }

  return segments;
}

/**
 * A checkbox whose whole row is the target. The label of the two boxes on the
 * sign up form is a legal statement, so it is long on purpose; making only the
 * square tappable would be a 20 px target next to four lines of text.
 */
export function CheckboxField({
  label,
  isChecked,
  onChange,
  links,
  error,
  accessibilityHint,
}: CheckboxFieldProps) {
  const hasError = error !== undefined;
  const segments = links === undefined ? null : segmentsOf(label, links);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => onChange(!isChecked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isChecked }}
        accessibilityLabel={label}
        accessibilityHint={error ?? accessibilityHint}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View
          style={[
            styles.box,
            isChecked && styles.boxChecked,
            hasError && !isChecked && styles.boxError,
          ]}
        >
          {isChecked ? (
            <AppText variant="label" style={styles.mark}>
              ✓
            </AppText>
          ) : null}
        </View>

        <AppText variant="body" style={styles.label}>
          {segments === null
            ? label
            : segments.map((segment, index) =>
                segment.onPress === undefined ? (
                  segment.text
                ) : (
                  <AppText
                    // The fragments come from one immutable sentence, so their
                    // position in it is a stable identity.
                    key={`${segment.text}-${index}`}
                    style={styles.link}
                    onPress={segment.onPress}
                    accessibilityRole="link"
                  >
                    {segment.text}
                  </AppText>
                ),
              )}
        </AppText>
      </Pressable>

      {hasError ? (
        <AppText variant="caption" style={styles.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: spacing[2],
  },
  pressed: {
    opacity: 0.75,
  },
  box: {
    width: 24,
    height: 24,
    // Nudged down so the square lines up with the first line of a label that
    // wraps over several lines.
    marginTop: 1,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    // An unchecked box is an empty square: its border is the entire control,
    // so it is the border that has to clear the 3:1 SC 1.4.11 asks of a
    // boundary. `borderStrong`, which the catalogue draws around a field,
    // measures 1.58:1 on white and 1.52:1 on the page — it disappears. The
    // neutral grey reaches 4.61:1 on the box and 4.43:1 against the page, so
    // the square is visible before it is filled. It is the grey the text fields
    // and the select set their edge in, named here as the palette's own
    // `slateGrey` because a border is not muted text.
    borderColor: colors.slateGrey,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The catalogue fills the checked box with `accent` and sets the tick in
  // white, which is 4.29:1 — enough for a drawn glyph, short of the 4.5:1 small
  // text needs. This tick is drawn as a character rather than as a path, so it
  // is measured as text and takes the darker fill: white on `accentPressed` is
  // 5.82:1. Same ink, same green ramp, no new colour.
  boxChecked: {
    backgroundColor: colors.accentPressed,
    borderColor: colors.accentPressed,
  },
  boxError: {
    borderColor: colors.danger,
  },
  mark: {
    color: colors.onAccent,
    lineHeight: 20,
  },
  label: {
    flex: 1,
  },
  // The catalogue tells these fragments apart by colour alone, with no
  // underline, and `textLink` reads at 5.60:1 on the page. Colour alone is not
  // enough on its own though: a link inside a sentence may drop its underline
  // only when it stands 3:1 clear of the text around it, and `textLink` against
  // `textPrimary` measures 2.99:1 — short by a hundredth. The weight carries
  // that difference instead of an underline, so the sentence still looks like
  // the one the catalogue draws.
  link: {
    color: colors.textLink,
    fontFamily: fontFace.bodyMedium,
  },
  error: {
    color: colors.danger,
  },
});
