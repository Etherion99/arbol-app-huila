import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { texts } from '@/constants/texts';
import {
  MIN_TOUCH_TARGET,
  colors,
  effects,
  fontFace,
  fontSize,
  radii,
  spacing,
} from '@/constants/theme';
import { isoDateToParts, partsToIsoDate, todayInColombia, type DateParts } from '@/lib/dates';

export type DateFieldProps = {
  label: string;
  /** An ISO calendar date, `YYYY-MM-DD`, which is what the column stores. */
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
};

/**
 * A calendar date, typed as three numbers.
 *
 * Deliberately not a native picker. The planting date is today for almost every
 * registration -- the wizard is filled in beside the tree that was just put in
 * the ground -- so the shortcut carries the common case, and the three boxes
 * cover the guardian who is catching up on a planting from last weekend.
 *
 * The alternative was a native date picker module, which would be a fourth
 * native dependency added to a build chain this project cannot currently
 * compile, for a field with three digits in it.
 */
export function DateField({ label, value, onChange, hint, error }: DateFieldProps) {
  const parts = isoDateToParts(value);
  const [isFocused, setIsFocused] = useState(false);
  const hasError = error !== undefined;

  const update = (field: keyof DateParts, raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '');
    onChange(partsToIsoDate({ ...parts, [field]: digits }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>

        <Button
          label={texts.planting.plantedAtSetToday}
          onPress={() => onChange(todayInColombia())}
          variant="ghost"
          style={styles.today}
        />
      </View>

      <View style={[styles.row, isFocused && styles.rowFocused, hasError && styles.rowError]}>
        <Part
          label={texts.planting.plantedAtDay}
          value={parts.day}
          maxLength={2}
          onChangeText={(next) => update('day', next)}
          onFocusChange={setIsFocused}
        />
        <AppText variant="data" style={styles.separator} accessibilityElementsHidden>
          /
        </AppText>
        <Part
          label={texts.planting.plantedAtMonth}
          value={parts.month}
          maxLength={2}
          onChangeText={(next) => update('month', next)}
          onFocusChange={setIsFocused}
        />
        <AppText variant="data" style={styles.separator} accessibilityElementsHidden>
          /
        </AppText>
        <Part
          label={texts.planting.plantedAtYear}
          value={parts.year}
          maxLength={4}
          isWide
          onChangeText={(next) => update('year', next)}
          onFocusChange={setIsFocused}
        />
      </View>

      {hasError ? (
        <AppText variant="caption" style={styles.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}

      {!hasError && hint !== undefined ? <AppText variant="caption">{hint}</AppText> : null}
    </View>
  );
}

function Part({
  label,
  value,
  maxLength,
  onChangeText,
  onFocusChange,
  isWide = false,
}: {
  label: string;
  value: string;
  maxLength: number;
  onChangeText: (value: string) => void;
  /** The three boxes share one border, so they share one focus state too. */
  onFocusChange: (isFocused: boolean) => void;
  isWide?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType="number-pad"
      inputMode="numeric"
      maxLength={maxLength}
      accessibilityLabel={label}
      placeholder={label}
      placeholderTextColor={colors.textSecondary}
      onFocus={() => onFocusChange(true)}
      onBlur={() => onFocusChange(false)}
      style={[styles.part, isWide && styles.partWide]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textSecondary,
  },
  today: {
    paddingHorizontal: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    // Same reasoning as every other input edge: white on a near-white page is
    // 1.06:1, so the border alone identifies the control and owes 3:1 under
    // SC 1.4.11. `borderStrong` gives 1.52:1; this grey gives 4.43:1 on the
    // page and 4.61:1 on the field's own white.
    borderColor: colors.slateGrey,
    borderRadius: radii.md,
  },
  // Three inputs share one box, so any of them taking the keyboard lights the
  // whole box; which digit group has the caret is the caret's job to say.
  // Without this the date field was the one input in the app with no focus
  // signal at all.
  rowFocused: {
    borderColor: colors.borderFocus,
    boxShadow: effects.focusRing,
  },
  rowError: {
    borderColor: colors.danger,
  },
  part: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: 44,
    textAlign: 'center',
    // A TextInput inherits no typeface, and a date is a measured value, which
    // the design system sets in mono. Without this the digits fell back to the
    // system font while the slashes beside them were already mono.
    fontFamily: fontFace.monoMedium,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  partWide: {
    minWidth: 66,
  },
  separator: {
    color: colors.textSecondary,
  },
  error: {
    color: colors.danger,
  },
});
