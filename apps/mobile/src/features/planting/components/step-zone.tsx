import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Uuid } from '@arbolapp/core';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { OptionSheet, type SheetOption } from '@/components/ui/option-sheet';
import { SelectField } from '@/components/ui/select-field';
import { texts } from '@/constants/texts';
import { spacing } from '@/constants/theme';
import type { ZoneCatalogue } from '@/features/map/use-zones';
import { distanceInMetres, formatDistance } from '@/lib/dates';

export type StepZoneProps = {
  catalogue: ZoneCatalogue | undefined;
  isLoading: boolean;
  municipalityId: Uuid | null;
  villageId: Uuid | null;
  onChange: (municipalityId: Uuid | null, villageId: Uuid | null) => void;
  /** The pin from step one, used only to rank a suggestion. */
  location: { lat: number; lng: number } | null;
};

/**
 * Step two: which municipality and which vereda.
 *
 * **The zone is chosen by hand, and that is the point of this screen.** There
 * are no vereda outlines in the catalogue -- `zones.geometry` exists and is
 * deliberately empty -- and the centroids are, by the catalogue's own
 * admission, approximate positions rather than surveyed centres. So the zone
 * cannot be worked out by containment, and anything that looked like it had
 * been would be a guess wearing the clothes of a fact.
 *
 * What the pin is allowed to do is rank the list: the vereda whose centroid is
 * nearest is offered as a suggestion, with the distance and the word
 * "estimación" attached, and it only takes effect if the guardian accepts it.
 * A silently assigned zone is dirty data nobody would ever know to correct;
 * a suggestion someone confirmed is a decision.
 */
export function StepZone({
  catalogue,
  isLoading,
  municipalityId,
  villageId,
  onChange,
  location,
}: StepZoneProps) {
  const [openSheet, setOpenSheet] = useState<'municipality' | 'village' | null>(null);

  const municipalities = useMemo(() => catalogue?.municipalities ?? [], [catalogue]);
  const villages = useMemo(
    () =>
      municipalityId === null ? [] : (catalogue?.villagesByMunicipality.get(municipalityId) ?? []),
    [catalogue, municipalityId],
  );

  const municipalityOptions = useMemo<SheetOption[]>(
    () => municipalities.map((zone) => ({ id: zone.id, label: zone.name })),
    [municipalities],
  );
  const villageOptions = useMemo<SheetOption[]>(
    () => villages.map((zone) => ({ id: zone.id, label: zone.name })),
    [villages],
  );

  /**
   * The nearest vereda centroid to the pin, across every municipality.
   *
   * Derived during render from the pin and the catalogue rather than mirrored
   * into state, so moving the pin on step one cannot leave a stale suggestion
   * behind on step two.
   */
  const suggestion = useMemo(() => {
    if (location === null || catalogue === undefined) {
      return null;
    }

    let best: { municipalityId: Uuid; villageId: Uuid; name: string; metres: number } | null = null;

    for (const [parentId, group] of catalogue.villagesByMunicipality) {
      for (const village of group) {
        if (village.centroid === null) {
          continue;
        }
        const metres = distanceInMetres(location, village.centroid);
        if (best === null || metres < best.metres) {
          best = { municipalityId: parentId, villageId: village.id, name: village.name, metres };
        }
      }
    }

    return best;
  }, [catalogue, location]);

  const selectedMunicipality = municipalities.find((zone) => zone.id === municipalityId);
  const selectedVillage = villages.find((zone) => zone.id === villageId);

  // Offered only while it would actually change something, so it stops being
  // noise the moment the guardian has answered it either way.
  const isSuggestionWorthShowing = suggestion !== null && suggestion.villageId !== villageId;

  return (
    <View style={styles.container}>
      <AppText variant="title">{texts.planting.zoneHeading}</AppText>
      <AppText variant="bodyMuted">{texts.planting.zoneBody}</AppText>

      <View style={styles.fields}>
        <SelectField
          label={texts.planting.municipalityLabel}
          value={selectedMunicipality?.name ?? null}
          placeholder={texts.planting.municipalityPlaceholder}
          onPress={() => setOpenSheet('municipality')}
        />
        <SelectField
          label={texts.planting.villageLabel}
          value={selectedVillage?.name ?? null}
          placeholder={texts.planting.villagePlaceholder}
          onPress={() => setOpenSheet('village')}
          isDisabled={municipalityId === null}
          hint={municipalityId === null ? texts.planting.villageNeedsMunicipality : undefined}
        />
      </View>

      {isSuggestionWorthShowing ? (
        <View style={styles.suggestion}>
          <Notice
            tone="info"
            title={texts.planting.suggestionTitle}
            message={texts.planting.suggestionBody(
              suggestion.name,
              formatDistance(suggestion.metres),
            )}
          />
          <Button
            label={texts.planting.suggestionAccept(suggestion.name)}
            onPress={() => onChange(suggestion.municipalityId, suggestion.villageId)}
            variant="secondary"
          />
        </View>
      ) : null}

      <OptionSheet
        isVisible={openSheet === 'municipality'}
        title={texts.planting.municipalityLabel}
        clearLabel={texts.planting.municipalityPlaceholder}
        options={municipalityOptions}
        selectedId={municipalityId}
        isLoading={isLoading}
        onSelect={(id) => {
          // The vereda belonged to the municipality that just changed, so
          // keeping it would leave a zone the guardian can no longer see.
          onChange(id, null);
          setOpenSheet(null);
        }}
        onClose={() => setOpenSheet(null)}
      />

      <OptionSheet
        isVisible={openSheet === 'village'}
        title={texts.planting.villageLabel}
        clearLabel={texts.planting.villagePlaceholder}
        options={villageOptions}
        selectedId={villageId}
        isLoading={isLoading}
        onSelect={(id) => {
          onChange(municipalityId, id);
          setOpenSheet(null);
        }}
        onClose={() => setOpenSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  fields: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  suggestion: {
    gap: spacing[2],
  },
});
