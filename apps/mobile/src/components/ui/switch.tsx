import { Switch as PlatformSwitch, StyleSheet, View, type ViewStyle } from 'react-native';

import { MIN_TOUCH_TARGET, colors } from '@/constants/theme';

export type SwitchProps = {
  isChecked: boolean;
  onChange: (isChecked: boolean) => void;
  /**
   * Required, because the control has no visible text of its own. The row that
   * holds it shows the setting's name; a reader who cannot see that row needs
   * the name here too.
   */
  accessibilityLabel: string;
  accessibilityHint?: string;
  isDisabled?: boolean;
  style?: ViewStyle;
};

/**
 * The on/off control of the notification settings.
 *
 * It wraps the platform switch rather than redrawing one. A switch is dragged
 * as often as it is tapped, and the drag, the spring back when the finger lets
 * go halfway, the announcement VoiceOver and TalkBack make, and the way both
 * honour a reduced-motion setting all come free that way. A redrawn one would
 * be a Pressable that only responds to a tap, and a guardian sliding a thumb
 * would think the app had frozen.
 *
 * The trade is that two details of the catalogue cannot be expressed on a
 * platform switch: it draws the off track as a white pill with a `borderStrong`
 * ring, and the ring has no equivalent prop, so it is folded into the fill
 * below; and it grows the thumb from 22 to 24 points when the switch turns on,
 * while the platform owns the thumb's size. Neither carries meaning that the
 * colour and the position do not already carry.
 */
export function Switch({
  isChecked,
  onChange,
  accessibilityLabel,
  accessibilityHint,
  isDisabled = false,
  style,
}: SwitchProps) {
  return (
    <View style={[styles.container, style]}>
      <PlatformSwitch
        value={isChecked}
        onValueChange={onChange}
        disabled={isDisabled}
        accessibilityRole="switch"
        accessibilityState={{ checked: isChecked, disabled: isDisabled }}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        // What tells the two states apart is the thumb, not the track: the off
        // track is so pale it is 1.24:1 against a white card, which is by
        // design — the catalogue's own ring is 1.58:1 there. So the thumb has
        // to carry the 3:1 SC 1.4.11 asks of the parts of a control, and it
        // does in every combination: `textMuted` is 3.73:1 on the off track and
        // 4.61:1 against the card around it, and white is 4.29:1 on the accent
        // track. A thumb is a drawn circle rather than a glyph, so 3:1 is the
        // bar it has to clear and not 4.5:1.
        thumbColor={isChecked ? colors.onAccent : colors.textMuted}
        trackColor={{ false: colors.borderSubtle, true: colors.accent }}
        ios_backgroundColor={colors.borderSubtle}
        // A switch is about 31 points tall and the app is used standing up,
        // outdoors, often one-handed, so the target is padded back out to 44.
        hitSlop={styles.hitSlop}
        style={isDisabled ? styles.disabled : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitSlop: {
    top: 8,
    bottom: 8,
    left: 8,
    right: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
