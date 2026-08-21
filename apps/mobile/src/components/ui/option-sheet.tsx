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
  /** The row that clears the filter, e.g. "Todas las veredas". */
  clearLabel: string;
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
 * It is an opaque sheet rather than a translucent one on purpose: the design
 * system's rule for a screen read in direct sun is that anything covering the
 * map stops being see through, because a list of vereda names over a moving
 * map is a list nobody can read outdoors.
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
                <Row
                  label={clearLabel}
                  isSelected={selectedId === null}
                  onPress={() => onSelect(null)}
                />
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
  rowSelected: {
    backgroundColor: colors.accentSoft,
  },
  rowLabel: {
    flex: 1,
  },
  rowDetail: {
    color: colors.textSecondary,
  },
  tick: {
    color: colors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
