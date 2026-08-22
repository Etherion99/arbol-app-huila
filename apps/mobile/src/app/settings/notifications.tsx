import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Switch } from '@/components/ui/switch';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, spacing } from '@/constants/theme';

/**
 * The two notification switches, which the canvas gives a screen of their own
 * behind the profile's «Ajustes de notificaciones» row.
 *
 * ## Nothing here is stored
 *
 * There is no place to store it. The schema has `devices` and `reminders` —
 * one row per installation and one per reminder actually sent — and neither
 * holds a per-guardian preference, nor does `users`. Inventing a table or an
 * endpoint so the screen looked like it worked would be the worse failure, so
 * the state is local to this screen and the notice at the top says so before
 * anything is touched.
 *
 * The switches stay operable rather than disabled: a guardian may see what the
 * choice looks like, and each one repeats in its hint that the sending itself
 * is a later delivery.
 *
 * The starting positions are the canvas's own — reminders on, coordinator
 * notices off — and they are a drawing rather than a default anybody agreed to,
 * because no stored preference exists for them to reflect.
 */
export default function NotificationSettingsScreen() {
  const [wantsReminders, setWantsReminders] = useState(true);
  const [wantsCoordinatorNotices, setWantsCoordinatorNotices] = useState(false);

  return (
    <Screen
      // Nothing on this screen is sent, so the offline strip would warn about
      // a connection none of it needs.
      hasConnectionBanner={false}
      header={<ScreenHeader title={texts.notificationSettings.title} />}
    >
      <Notice tone="warning" message={texts.notificationSettings.inactiveNotice} />

      <SettingRow
        label={texts.notificationSettings.remindersLabel}
        description={texts.notificationSettings.remindersDescription}
        isEnabled={wantsReminders}
        onChange={setWantsReminders}
      />

      <SettingRow
        label={texts.notificationSettings.coordinatorLabel}
        description={texts.notificationSettings.coordinatorDescription}
        isEnabled={wantsCoordinatorNotices}
        onChange={setWantsCoordinatorNotices}
      />

      {/* The canvas draws this footnote as a plain white block with a blue
          outlined «i» beside it. The ported icon kit has no info glyph, and a
          screen does not add glyphs to the kit, so it is the catalogue's info
          notice that carries it: the same mark, the same tone, and the mark's
          own contrast fallback already reasoned through there. The trade is the
          pale blue wash the canvas leaves white, which changes no ink — every
          tone this block uses reads over 14:1 on that fill. */}
      <Notice tone="info" message={texts.notificationSettings.pendingFootnote} />
    </Screen>
  );
}

/**
 * One setting: its name and what it will send on the left, the switch on the
 * right.
 *
 * The description under the name is the canvas's, not a repetition of the
 * label, so the switch's hint carries the «disponible próximamente» instead —
 * a reader who lands on the control hears why moving it changes nothing, and
 * the description is already read as text right beside it.
 */
function SettingRow({
  label,
  description,
  isEnabled,
  onChange,
}: {
  label: string;
  description: string;
  isEnabled: boolean;
  onChange: (isEnabled: boolean) => void;
}) {
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="label">{label}</AppText>
          <AppText variant="caption">{description}</AppText>
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
