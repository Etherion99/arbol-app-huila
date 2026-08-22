import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Switch } from '@/components/ui/switch';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, spacing } from '@/constants/theme';

/**
 * The notification switches, which the canvas gives a screen of their own
 * behind the profile's «Ajustes de notificaciones» row.
 *
 * ## Nothing here is stored
 *
 * There is no place to store it. The schema has `devices` and `reminders` —
 * one row per installation and one per reminder actually sent — and neither
 * holds a per-guardian preference, nor does `users`. Inventing a table or an
 * endpoint so the screen looked like it worked would be the worse failure, so
 * the state is local to this screen and the screen says so.
 *
 * The switches stay operable rather than disabled: a guardian is allowed to see
 * what the choice looks like, and the hint on each one repeats that the sending
 * itself is a later delivery.
 */
export default function NotificationSettingsScreen() {
  const [wantsReminders, setWantsReminders] = useState(true);
  const [wantsSummary, setWantsSummary] = useState(false);

  return (
    <Screen
      hasConnectionBanner={false}
      header={<ScreenHeader title={texts.notificationSettings.title} />}
    >
      <AppText variant="caption">{texts.notificationSettings.hint}</AppText>

      <SettingRow
        label={texts.notificationSettings.remindersLabel}
        isEnabled={wantsReminders}
        onChange={setWantsReminders}
      />

      <SettingRow
        label={texts.notificationSettings.summaryLabel}
        isEnabled={wantsSummary}
        onChange={setWantsSummary}
      />
    </Screen>
  );
}

/** One setting: its name on the left and the switch that turns it on. */
function SettingRow({
  label,
  isEnabled,
  onChange,
}: {
  label: string;
  isEnabled: boolean;
  onChange: (isEnabled: boolean) => void;
}) {
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="label">{label}</AppText>
          <AppText variant="caption">{texts.notificationSettings.comingSoon}</AppText>
        </View>

        <Switch
          isChecked={isEnabled}
          onChange={onChange}
          accessibilityLabel={label}
          accessibilityHint={texts.notificationSettings.comingSoon}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    minHeight: MIN_TOUCH_TARGET,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});
