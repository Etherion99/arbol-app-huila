import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, effects, radii, spacing } from '@/constants/theme';

export type SheetOption = {
  id: string;
  label: string;
  /** Shown to the right, such as how many trees carry a species. */
  detail?: string;
};

export type OptionSheetProps = {
  isVisible: boolean;
  title: string;
  /**
   * The row that clears the choice, e.g. "Todas las veredas". Absent, no such
   * row is offered — which is what a required field of a form needs, where
   * "ninguno" is not one of the answers.
   */
  clearLabel?: string;
  options: SheetOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
  /** Shown in place of the list while the catalogue is still loading. */
  isLoading?: boolean;
  emptyLabel?: string;
};

/**
 * The list behind every filter chip.
 *
 * The catalogue never draws this sheet open — every select it shows is closed —
 * so the shape here is the app's own and the rules it follows are stated below
 * rather than cited.
 *
 * It is an opaque sheet rather than a translucent one on purpose: the sheet
 * opens over the map and over a form, and anything covering the map stops being
 * see through, because a list of vereda names over a moving map is a list
 * nobody can read outdoors in direct sun. That reason holds on light paper
 * exactly as it held on dark: it is about what is moving behind the list, not
 * about how bright the sheet is.
 */
export function OptionSheet({
  isVisible,
  title,
  clearLabel,
  options,
  selectedId,
  onSelect,
  onClose,
  isLoading = false,
  emptyLabel,
}: OptionSheetProps) {
  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} accessibilityElementsHidden />

        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.header}>
            <AppText variant="subtitle">{title}</AppText>
            <Button
              label={texts.common.close}
              onPress={onClose}
              variant="ghost"
              accessibilityLabel={texts.common.close}
            />
          </View>

          {isLoading ? (
            <AppText variant="bodyMuted" style={styles.status}>
              {texts.common.loading}
            </AppText>
          ) : options.length === 0 ? (
            <AppText variant="bodyMuted" style={styles.status}>
              {emptyLabel ?? texts.map.emptyBody}
            </AppText>
          ) : (
            <FlatList
              data={options}
              keyExtractor={(option) => option.id}
              ListHeaderComponent={
                clearLabel === undefined ? null : (
                  <Row
                    label={clearLabel}
                    isSelected={selectedId === null}
                    onPress={() => onSelect(null)}
                  />
                )
              }
              renderItem={({ item }) => (
                <Row
                  label={item.label}
                  detail={item.detail}
                  isSelected={item.id === selectedId}
                  onPress={() => onSelect(item.id)}
                />
              )}
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function Row({
  label,
  detail,
  isSelected,
  onPress,
}: {
  label: string;
  detail?: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={detail === undefined ? label : `${label}, ${detail}`}
      accessibilityState={{ selected: isSelected }}
      style={({ pressed }) => [
        styles.row,
        isSelected && styles.rowSelected,
        pressed && styles.pressed,
      ]}
    >
      <AppText variant="body" style={styles.rowLabel} numberOfLines={1}>
        {label}
      </AppText>

      {detail !== undefined ? (
        <AppText variant="caption" style={styles.rowDetail}>
          {detail}
        </AppText>
      ) : null}

      {isSelected ? (
        <AppText variant="body" style={styles.tick} accessibilityElementsHidden>
          ✓
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The scrim stays a dark wash even though the app is light: its job is to
  // push the screen behind it back, and on light paper only a darker scrim can
  // do that. A pale one over a pale map would leave the sheet floating on top
  // of a page that still competes with it for attention.
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7, 14, 12, 0.6)',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    maxHeight: '72%',
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderColor: colors.borderStrong,
    boxShadow: effects.shadowOverlay,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing[5],
    paddingRight: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  status: {
    padding: spacing[5],
  },
  row: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  // The selected row is tinted, the way the catalogue tints a chosen row in the
  // species merge panel. `accentSoft` is translucent, so what a reader actually
  // sees is the blend: #e0f1e9 over the white sheet. The row keeps its label in
  // `textPrimary` (14.86:1) and its detail in `textSecondary` (6.25:1), both
  // comfortable on that blend.
  rowSelected: {
    backgroundColor: colors.accentSoft,
  },
  rowLabel: {
    flex: 1,
  },
  rowDetail: {
    color: colors.textSecondary,
  },
  // The tick cannot take `accent`: on the tinted row it lands at 3.66:1, and it
  // is drawn as a character rather than as a path, so it is measured as text
  // and needs 4.5:1. `accentPressed` on the same blend is 4.97:1. It is also
  // the only thing besides the tint that marks the row, so it may not be
  // colour on colour that a reader has to squint at.
  tick: {
    color: colors.accentPressed,
  },
  pressed: {
    opacity: 0.7,
  },
});
