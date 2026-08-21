import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { texts } from '@/constants/texts';
import { colors, radii, spacing } from '@/constants/theme';
import { PhotoCapture } from '@/features/photos/components/photo-capture';
import type { PreparedPhoto } from '@/features/photos/photo-pipeline';
import { formatCoordinates, formatShortDate } from '@/lib/dates';

export type StepPhotoProps = {
  photo: PreparedPhoto | null;
  onCaptured: (photo: PreparedPhoto) => void;
  onRetake: () => void;
  speciesRawText: string;
  plantedAt: string;
  heightCm: number;
  visibleBranches: number;
  villageName: string | null;
  location: { lat: number; lng: number } | null;
};

/**
 * Step four: the photograph, and one last look at everything before it is sent.
 *
 * The summary is not decoration. Registration is the one action in this app that
 * cannot be undone by its author -- a tree is archived by a coordinator, never
 * deleted, and never by the guardian -- so the last screen before it happens
 * shows exactly what is about to be written.
 */
export function StepPhoto({
  photo,
  onCaptured,
  onRetake,
  speciesRawText,
  plantedAt,
  heightCm,
  visibleBranches,
  villageName,
  location,
}: StepPhotoProps) {
  return (
    <View style={styles.container}>
      <AppText variant="title">{texts.planting.photoHeading}</AppText>

      <PhotoCapture
        photo={photo}
        onCaptured={onCaptured}
        onRetake={onRetake}
        // The capture coordinate is kept from the moment the shutter is pressed
        // because Phase 8 will use it to spot an entry recorded far from the
        // tree. Nothing reads it today; a photograph taken in 2026 cannot grow a
        // coordinate in 2027.
        fallbackLocation={location}
      />

      <AppText variant="overline">{texts.planting.summaryHeading}</AppText>

      <View style={styles.summary}>
        <Row label={texts.planting.summarySpecies} value={speciesRawText} isStrong />
        <Row
          label={texts.planting.summaryPlanting}
          value={texts.planting.summaryPlantingValue(
            formatShortDate(plantedAt),
            heightCm,
            visibleBranches,
          )}
          isData
        />
        <Row
          label={texts.planting.summaryLocation}
          value={
            location === null
              ? texts.planting.locationNoFix
              : `${villageName ?? ''} · ${formatCoordinates(location.lat, location.lng)}`.trim()
          }
          isData
        />
        <Row
          label={texts.planting.summaryPhoto}
          value={
            photo === null
              ? texts.planting.summaryPhotoPending
              : texts.photo.ready(Math.round(photo.photoBytes / 1024))
          }
          isData
          isMissing={photo === null}
        />
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  isStrong = false,
  isData = false,
  isMissing = false,
}: {
  label: string;
  value: string;
  isStrong?: boolean;
  isData?: boolean;
  isMissing?: boolean;
}) {
  return (
    <View style={styles.row} accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="caption" style={styles.rowLabel}>
        {label}
      </AppText>
      <AppText
        variant={isData ? 'caption' : 'body'}
        numberOfLines={2}
        style={[
          styles.rowValue,
          isData && styles.rowData,
          isStrong && styles.rowStrong,
          isMissing && styles.rowMissing,
        ]}
      >
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  summary: {
    gap: spacing[2],
    padding: spacing[4],
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[4],
  },
  rowLabel: {
    color: colors.textSecondary,
  },
  rowValue: {
    flex: 1,
    textAlign: 'right',
  },
  rowData: {
    fontFamily: 'IBMPlexMono_500Medium',
    color: colors.textPrimary,
  },
  rowStrong: {
    fontFamily: 'Archivo_600SemiBold',
  },
  rowMissing: {
    color: colors.stateDue,
  },
});
