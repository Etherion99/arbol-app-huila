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
  group: {
    flexDirection: 'row',
    gap: spacing[1],
    padding: spacing[1],
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
  },
  tab: {
    flex: 1,
    // The canvas draws these 34 tall. A control that switches what the screen
    // shows has to be hittable standing in a field, so it takes the minimum
    // target this project holds every control to.
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  tabSelected: {
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: fontFace.bodyMedium,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm + 4,
  },
  labelSelected: {
    color: colors.emerald400,
  },
  labelIdle: {
    color: colors.textSecondary,
  },
});
