import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { DateField } from '@/components/ui/date-field';
import { Notice } from '@/components/ui/notice';
import { StepperField } from '@/components/ui/stepper-field';
import { TextField } from '@/components/ui/text-field';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, fontFace, radii, spacing } from '@/constants/theme';
import { useSpeciesSuggestions } from '@/features/trees/use-species-suggestions';

export type StepSpeciesProps = {
  speciesRawText: string;
  onSpeciesChange: (value: string) => void;
  plantedAt: string;
  onPlantedAtChange: (value: string) => void;
  plantedAtError?: string;
  heightCm: string;
  onHeightChange: (value: string) => void;
  heightError?: string;
  visibleBranches: number;
  onBranchesChange: (value: number) => void;
};

/**
 * Step three: what was planted, and the first measurements.
 *
 * The species field is free text with suggestions, and it is important that it
 * stays that way round. Whatever the guardian types is stored verbatim in
 * `species_raw_text` and never rewritten -- not by the app, not by a merge in
 * the admin panel. The suggestions are how the catalogue converges: most people
 * pick one that already exists, and the names that do not converge are folded
 * together later by a coordinator, by hand.
 *
 * So picking a suggestion is a convenience that fills in the same text box, not
 * a different kind of answer, and the field never blocks a name nobody has used
 * before.
 */
/**
 * Splits a suggestion around the fragment that was typed, so the part the
 * guardian already wrote can be picked out of the name beside it.
 *
 * Null when the fragment is not literally inside the name: the suggestions are
 * ranked on a normalised key, so an accent or a stray space can rank a name
 * that does not contain the raw text character for character, and highlighting
 * the wrong run of letters is worse than highlighting none.
 */
function matchedFragment(name: string, typed: string) {
  const start = typed === '' ? -1 : name.toLowerCase().indexOf(typed.toLowerCase());

  return start === -1
    ? null
    : {
        before: name.slice(0, start),
        match: name.slice(start, start + typed.length),
        after: name.slice(start + typed.length),
      };
}

export function StepSpecies({
  speciesRawText,
  onSpeciesChange,
  plantedAt,
  onPlantedAtChange,
  plantedAtError,
  heightCm,
  onHeightChange,
  heightError,
  visibleBranches,
  onBranchesChange,
}: StepSpeciesProps) {
  const { suggestions, settledText, isSettling, isLoading } = useSpeciesSuggestions(speciesRawText);

  const isTyping = speciesRawText.trim() !== '';
  const hasExactMatch = suggestions.some(
    (option) => option.canonicalName.toLowerCase() === speciesRawText.trim().toLowerCase(),
  );

  return (
    <View style={styles.container}>
      <AppText variant="title">{texts.planting.speciesHeading}</AppText>
      <AppText variant="bodyMuted">{texts.planting.speciesBody}</AppText>

      <TextField
        label={texts.planting.speciesLabel}
        value={speciesRawText}
        onChangeText={onSpeciesChange}
        placeholder={texts.planting.speciesPlaceholder}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {isTyping && suggestions.length > 0 ? (
        <View style={styles.suggestions} accessibilityRole="list">
          {suggestions.map((option, index) => {
            const typed = matchedFragment(option.canonicalName, speciesRawText.trim());

            return (
              <Pressable
                key={option.speciesId}
                onPress={() => onSpeciesChange(option.canonicalName)}
                accessibilityRole="button"
                accessibilityLabel={texts.planting.speciesSuggestionLabel(
                  option.canonicalName,
                  option.treeCount,
                )}
                style={({ pressed }) => [
                  styles.suggestion,
                  index === suggestions.length - 1 && styles.suggestionLast,
                  pressed && styles.pressed,
                ]}
              >
                <AppText variant="body" numberOfLines={1} style={styles.suggestionName}>
                  {typed === null ? (
                    option.canonicalName
                  ) : (
                    <>
                      {typed.before}
                      <AppText variant="body" style={styles.suggestionMatch}>
                        {typed.match}
                      </AppText>
                      {typed.after}
                    </>
                  )}
                </AppText>
                <AppText variant="caption" style={styles.suggestionCount}>
                  {texts.map.treeCount(option.treeCount)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Only once the query has settled and answered, so a name that is simply
          still being typed is never called new. */}
      {isTyping && !isSettling && !isLoading && suggestions.length === 0 ? (
        <AppText variant="caption">{texts.planting.speciesNoMatches}</AppText>
      ) : null}

      {isTyping && settledText !== '' && !hasExactMatch ? (
        <Notice tone="info" message={texts.planting.speciesKeepsRawText} />
      ) : null}

      <DateField
        label={texts.planting.plantedAtLabel}
        value={plantedAt}
        onChange={onPlantedAtChange}
        hint={texts.planting.plantedAtToday}
        error={plantedAtError}
      />

      <TextField
        label={texts.planting.heightLabel}
        value={heightCm}
        onChangeText={(next) => onHeightChange(next.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={4}
        placeholder="32"
        suffix={texts.planting.heightUnit}
        hint={texts.planting.heightHint}
        error={heightError}
      />

      <StepperField
        label={texts.planting.branchesLabel}
        value={visibleBranches}
        onChange={onBranchesChange}
        decreaseLabel={texts.planting.branchesDecrease}
        increaseLabel={texts.planting.branchesIncrease}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[4],
  },
  suggestions: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
  },
  suggestion: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  // The rule belongs between two rows, so the last one does not draw a line
  // against the rounded edge of the card.
  suggestionLast: {
    borderBottomWidth: 0,
  },
  suggestionName: {
    flex: 1,
  },
  // The canvas picks the typed fragment out in `accent`, which measures 4.28:1
  // on the card's white against a 17px word. `textLink` is the same green two
  // steps darker, at 5.82:1, and the weight carries the rest of the emphasis.
  suggestionMatch: {
    fontFamily: fontFace.bodyMedium,
    color: colors.textLink,
  },
  suggestionCount: {
    fontFamily: fontFace.monoMedium,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
});
