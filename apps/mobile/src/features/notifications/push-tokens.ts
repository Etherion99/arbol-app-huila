import type { DevicePlatform } from '@arbolapp/core';
import Constants from 'expo-constants';
import * as ExpoDevice from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { texts } from '@/constants/texts';
import { colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';

/**
 * Everything between the operating system's permission dialog and a row in
 * `devices`.
 *
 * ## Why the permission is not asked for at start up
 *
 * It is asked for once the guardian has planted their first tree, and never
 * during onboarding. The dialog can only be shown once -- a refusal is
 * permanent until somebody goes into the system settings, which nobody does --
 * so the single question has to be spent at the moment it makes sense. Somebody
 * who has just watched their avocado appear on the map understands exactly what
 * they are being offered. Somebody on screen two of an intro does not.
 */

/**
 * Android needs the channel to exist before the first notification lands on it,
 * and a notification sent to a channel that was never declared is dropped
 * silently. Named the same string the Edge Function puts on every message.
 */
const REMINDER_CHANNEL_ID = 'growth-log-reminders';

/** Why a registration did not happen, when it did not. */
export type PushRegistrationFailure =
  | 'unsupported'
  | 'permission-denied'
  | 'no-project-id'
  | 'token-failed'
  | 'save-failed';

export type PushRegistrationResult =
  | { state: 'registered'; token: string }
  | { state: 'failed'; reason: PushRegistrationFailure; detail: string | null };

/**
 * How a reminder behaves when it arrives while the app is open.
 *
 * Shown rather than swallowed. A guardian reading the tree list is exactly the
 * person the reminder is for, and hiding it there would make the notification
 * look unreliable for no gain.
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Declares the Android channel. A no-op everywhere else. */
export async function ensureReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: texts.notificationSettings.channelName,
    description: texts.notificationSettings.channelDescription,
    importance: Notifications.AndroidImportance.DEFAULT,
    // The brand green, from the tokens rather than typed in: the notification
    // light and the small icon tint are as much part of the palette as a
    // button is.
    lightColor: colors.accent,
    // A reminder is not urgent enough to shake a phone in somebody's pocket at
    // eight in the morning.
    vibrationPattern: [0, 200],
  });
}

/**
 * The project the token is minted against.
 *
 * Expo will not issue a push token without one, and this repository has no EAS
 * project yet -- `eas.json` describes the build profiles but the account that
 * would own the project is still being set up. So this can genuinely be
 * missing, and when it is, the failure has to be legible rather than an
 * exception nobody reads: the settings screen says the build cannot receive
 * notifications yet, which is true, instead of showing a switch that would
 * never work.
 */
function projectId(): string | null {
  const fromConfig = Constants.expoConfig?.extra?.eas?.projectId;
  const fromEas = Constants.easConfig?.projectId;
  const found = typeof fromConfig === 'string' ? fromConfig : fromEas;
  return typeof found === 'string' && found !== '' ? found : null;
}

/** What `devices.platform` accepts, which is only the two the app ships on. */
function currentPlatform(): DevicePlatform | null {
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return Platform.OS;
  }
  return null;
}

/**
 * Asks for the permission if it has not been answered, and reports what the
 * system said without asking twice.
 *
 * `getPermissionsAsync` first on purpose: on iOS a second request against an
 * already answered permission resolves immediately with the old answer, and on
 * Android 13 it re-prompts. Reading before asking keeps both platforms behaving
 * the same way.
 */
export async function requestNotificationPermission(): Promise<Notifications.PermissionStatus> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status !== 'undetermined') {
    return existing.status;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status;
}

/** Whether this installation may already be pushed to, without asking anything. */
export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Takes the installation from "the guardian said yes" to a row the sweep can
 * find.
 *
 * Never throws. Every way this can fail is a state the settings screen has to
 * be able to draw, and an exception here would be caught by a query boundary
 * and turned back into one of these anyway, one step further from where it
 * happened.
 */
export async function registerPushToken(): Promise<PushRegistrationResult> {
  const platform = currentPlatform();

  // A simulator has no push service behind it, so Expo issues nothing. Told
  // apart from a refusal because they are different problems with different
  // answers.
  if (platform === null || !ExpoDevice.isDevice) {
    return { state: 'failed', reason: 'unsupported', detail: null };
  }

  const status = await requestNotificationPermission();
  if (status !== 'granted') {
    return { state: 'failed', reason: 'permission-denied', detail: null };
  }

  const project = projectId();
  if (project === null) {
    return { state: 'failed', reason: 'no-project-id', detail: null };
  }

  await ensureReminderChannel();

  let token: string;
  try {
    const issued = await Notifications.getExpoPushTokenAsync({ projectId: project });
    token = issued.data;
  } catch (caught) {
    return {
      state: 'failed',
      reason: 'token-failed',
      detail: caught instanceof Error ? caught.message : null,
    };
  }

  // Through the function rather than an upsert: the token belongs to the
  // installation, so on a phone that changed hands the row already exists under
  // somebody else and only a definer can move it.
  const { error } = await supabase.rpc('register_device', {
    token,
    device_platform: platform,
  });

  if (error !== null) {
    return { state: 'failed', reason: 'save-failed', detail: error.message };
  }

  return { state: 'registered', token };
}

/**
 * Stops delivery to this installation.
 *
 * Called on sign out and when the guardian turns reminders off. The row is
 * deactivated rather than removed: `devices` keeps a deactivated token so a
 * reinstall on the same phone can be told apart from somebody who never
 * registered one.
 */
export async function retirePushToken(): Promise<void> {
  const project = projectId();
  if (project === null || !ExpoDevice.isDevice) {
    return;
  }

  if (!(await hasNotificationPermission())) {
    return;
  }

  try {
    const issued = await Notifications.getExpoPushTokenAsync({ projectId: project });
    await supabase.rpc('retire_device', { token: issued.data });
  } catch {
    // Signing out must not be blocked by a token that could not be read. The
    // row is reclaimed by whoever registers next on this device, and the sweep
    // deactivates it on its own the first time Expo reports it as gone.
  }
}
