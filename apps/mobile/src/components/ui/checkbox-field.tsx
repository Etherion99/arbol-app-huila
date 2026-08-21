import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { MIN_TOUCH_TARGET, colors, radii, spacing } from '@/constants/theme';

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
    width: 26,
    height: 26,
    // Nudged down so the square lines up with the first line of a label that
    // wraps over several lines.
    marginTop: 1,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  boxError: {
    borderColor: colors.danger,
  },
  mark: {
    color: colors.onAccent,
    lineHeight: 22,
  },
  label: {
    flex: 1,
  },
  link: {
    color: colors.textLink,
    textDecorationLine: 'underline',
  },
  error: {
    color: colors.danger,
  },
});
