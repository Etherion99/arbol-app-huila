import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { MIN_TOUCH_TARGET, colors, fontFace, fontSize, radii, spacing } from '@/constants/theme';

export type TabOption = {
  id: string;
  label: string;
};

export type TabsProps = {
  tabs: TabOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Names what the group switches between, for a screen reader. */
  accessibilityLabel: string;
  style?: ViewStyle;
};

/**
 * A segmented switch between two or three views of the same screen: the
 * Privacidad / Términos of the legal notice, and later the ranges of the admin
 * dashboard.
 *
 * It is not navigation — it does not change route and it does not belong at the
 * bottom of the screen. The tab bar of the application is a different thing.
 */
export function Tabs({ tabs, selectedId, onSelect, accessibilityLabel, style }: TabsProps) {
  return (
    <View
      style={[styles.group, style]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {tabs.map((tab) => {
        const isSelected = tab.id === selectedId;

        return (
          <Pressable
            key={tab.id}
            onPress={() => onSelect(tab.id)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => [
              styles.tab,
              isSelected && styles.tabSelected,
              pressed && !isSelected && styles.pressed,
            ]}
          >
            <AppText
              style={[styles.label, isSelected ? styles.labelSelected : styles.labelIdle]}
              numberOfLines={1}
            >
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * The trough is tinted, not white. The catalogue draws the group on
   * `surfaceRaised` and the selected tab on `surfaceOverlay`, but in this
   * palette both of those are `#FFFFFF`, so the drawn control has no selected
   * state left at all — the two surfaces are the same paint.
   *
   * `borderSubtle` `#DCEBDF` is a real ground in the catalogue, not only a
   * hairline: it is the paper the device frames sit on. Filling the trough with
   * it and leaving the selected tab white restores the shape the design asks
   * for, a bucket with a lighter thumb riding in it.
   *
   * The trough only groups; it never says which tab is chosen, so its 1.19:1
   * against the page is decoration and does not owe the 3:1 that a state does.
   * The outline is `borderStrong` because the fill would otherwise have no edge
   * against itself.
   */
  group: {
    flexDirection: 'row',
    gap: spacing[1],
    padding: spacing[1],
    backgroundColor: colors.borderSubtle,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
  },
  tab: {
    flex: 1,
    // The canvas draws these 38 tall. A control that switches what the screen
    // shows has to be hittable standing in a field, so it takes the minimum
    // target this project holds every control to.
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  /**
   * White on the tinted trough is 1.24:1, so the fill alone cannot be the
   * state. The ring is what tells the guardian which tab is open, which makes
   * it information the control has to carry at 3:1: `accent` `#008D46` measures
   * 4.29:1 against the white thumb and 3.47:1 against the trough, while the
   * catalogue's `borderStrong` reaches 1.28:1 and says nothing. It is the same
   * outline the icon button wears, for the same reason.
   */
  tabSelected: {
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm + 4,
  },
  /**
   * `textPrimary` on the white thumb is 17.40:1. The previous `emerald400`
   * `#3FB877` was 2.42:1 on that same white — under even the large-text bar,
   * and this label is 13px, which is small text and owes 4.5:1.
   *
   * The heavier face is the second signal, the one that survives a screen read
   * in direct sun or by someone who cannot separate the two greens. Roboto has
   * no 600, so the catalogue's weight lands on `bodyMedium`.
   */
  labelSelected: {
    fontFamily: fontFace.bodyMedium,
    color: colors.textPrimary,
  },
  /** `textSecondary` on the trough tint is 5.92:1, and it recedes as it should. */
  labelIdle: {
    fontFamily: fontFace.bodyRegular,
    color: colors.textSecondary,
  },
});
