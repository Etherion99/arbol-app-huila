import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, fontSize, radii, spacing } from '@/constants/theme';
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

      <View style={[styles.row, hasError && styles.rowError]}>
        <Part
          label={texts.planting.plantedAtDay}
          value={parts.day}
          maxLength={2}
          onChangeText={(next) => update('day', next)}
        />
        <AppText variant="data" style={styles.separator} accessibilityElementsHidden>
          /
        </AppText>
        <Part
          label={texts.planting.plantedAtMonth}
          value={parts.month}
          maxLength={2}
          onChangeText={(next) => update('month', next)}
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
  isWide = false,
}: {
  label: string;
  value: string;
  maxLength: number;
  onChangeText: (value: string) => void;
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
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
  },
  rowError: {
    borderColor: colors.danger,
  },
  part: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: 44,
    textAlign: 'center',
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
