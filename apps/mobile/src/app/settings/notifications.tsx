import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Switch } from '@/components/ui/switch';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@arbolapp/core';

import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, spacing } from '@/constants/theme';
import {
  useNotificationPreferences,
  useSaveNotificationPreferences,
  type NotificationChoices,
} from '@/features/notifications/use-notification-preferences';
import { usePushRegistration } from '@/features/notifications/use-push-registration';

/**
 * The two notification switches, and the truth about this phone.
 *
 * ## Where the preference lives, and why not on `users`
 *
 * In `notification_preferences`, one row per guardian. Not two columns on
 * `users`: the select privilege there is granted column by column to `anon` as
 * well as to `authenticated`, so putting a preference among them would mean
 * either handing it to `anon` or splitting that grant into two audiences, after
 * which every column added to `users` would have to remember which side it
 * belonged on. A table of its own starts unreachable by `anon` and its policy
 * is one row check, the same posture `devices` and `reminders` already hold.
 *
 * Not on `devices` either. Turning reminders off means "stop asking me", not
 * "stop asking me on the tablet", and a guardian with a phone and a tablet
 * would otherwise have to say it twice. Whether one installation can be reached
 * is `devices.is_active`, which this screen reports separately below -- a
 * delivery fact rather than a choice.
 *
 * ## Two questions, drawn apart
 *
 * The switches say what the guardian wants. The panel above them says whether
 * this phone can deliver it, which is a different thing and fails for its own
 * reasons: a permission never asked for, a permission refused, a build with no
 * push project behind it. A switch that is on while the system permission is
 * denied is not a contradiction, and the screen has to be able to say so rather
 * than picking one of the two to show.
 *
 * ## No optimistic switch
 *
 * The position on screen is the position that was saved. A switch that slides
 * across and quietly slides back is a worse lie than one that waits, and in a
 * vereda the write is exactly what fails.
 */
export default function NotificationSettingsScreen() {
  const preferences = useNotificationPreferences();
  const save = useSaveNotificationPreferences();
  const push = usePushRegistration();

  // Derived during render from the query and the mutation in flight. Mirroring
  // the saved values into state is what would let the two disagree. While a
  // write is on the wire the switch shows what is being written, so the control
  // is not frozen in its old position for the length of a rural round trip.
  const inFlight = save.isPending ? save.variables : undefined;
  const choices: NotificationChoices =
    inFlight ?? preferences.data ?? DEFAULT_NOTIFICATION_PREFERENCES;

  const update = (change: Partial<NotificationChoices>) => {
    const next = { ...choices, ...change };
    save.mutate(next);

    // Asking not to be written to and leaving a live token behind would be
    // half an answer. Granting it back is the settings screen's own job, below.
    if (change.wantsGrowthLogReminders === false) {
      push.disable.mutate();
    }
  };

  return (
    <Screen
      // The preference is saved over the network, so the strip belongs here now
      // that there is something to warn about.
      header={<ScreenHeader title={texts.notificationSettings.title} />}
    >
      <DeliveryPanel />

      {preferences.error !== null ? (
        <Notice
          tone="error"
          message={texts.notificationSettings.loadError}
          onRetry={() => void preferences.refetch()}
        />
      ) : null}

      {save.error !== null && save.variables !== undefined ? (
        <Notice
          tone="error"
          message={texts.notificationSettings.savingError}
          onRetry={() => save.mutate(save.variables)}
        />
      ) : null}

      <SettingRow
        label={texts.notificationSettings.remindersLabel}
        description={texts.notificationSettings.remindersDescription}
        isEnabled={choices.wantsGrowthLogReminders}
        isBusy={preferences.isPending}
        onChange={(wantsGrowthLogReminders) => update({ wantsGrowthLogReminders })}
      />

      <SettingRow
        label={texts.notificationSettings.coordinatorLabel}
        description={texts.notificationSettings.coordinatorDescription}
        isEnabled={choices.wantsCoordinatorNotices}
        isBusy={preferences.isPending}
        onChange={(wantsCoordinatorNotices) => update({ wantsCoordinatorNotices })}
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
 * Whether this installation can be reached at all, and the one action that
 * changes it.
 *
 * The permission dialog is raised from here and from the screen after a first
 * tree is planted, and from nowhere else. The platform shows it once; where
 * that one chance is spent is a decision, not something a layout should do on
 * mount.
 */
function DeliveryPanel() {
  const push = usePushRegistration();

  if (push.state === null) {
    return null;
  }

  if (push.state === 'registered') {
    return (
      <Notice
        tone="success"
        title={texts.notificationSettings.deviceReadyTitle}
        message={texts.notificationSettings.deviceReadyBody}
      />
    );
  }

  if (push.state === 'undetermined') {
    return (
      <Notice
        tone="info"
        title={texts.notificationSettings.deviceAskTitle}
        message={texts.notificationSettings.deviceAskBody}
        onRetry={() => push.enable.mutate()}
        retryLabel={texts.notificationSettings.deviceAskAction}
      />
    );
  }

  // Denied, or a build with no push project. Both end at the same place for the
  // guardian -- nothing arrives from the server -- but the sentence is
  // different because only one of them is theirs to change, and the local
  // backup that covers both is named in each.
  return (
    <Notice
      tone="warning"
      title={
        push.state === 'denied'
          ? texts.notificationSettings.deviceDeniedTitle
          : texts.notificationSettings.deviceUnavailableTitle
      }
      message={
        push.state === 'denied'
          ? texts.notificationSettings.deviceDeniedBody
          : texts.notificationSettings.deviceUnavailableBody
      }
    />
  );
}

/**
 * One setting: its name and what it will send on the left, the switch on the
 * right.
 */
function SettingRow({
  label,
  description,
  isEnabled,
  isBusy,
  onChange,
}: {
  label: string;
  description: string;
  isEnabled: boolean;
  isBusy: boolean;
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
          onChange={isBusy ? () => undefined : onChange}
          accessibilityLabel={label}
          accessibilityHint={description}
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
