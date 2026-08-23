import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';

import { useSession } from '@/features/auth/session-provider';
import {
  clearLocalReminders,
  rescheduleLocalReminders,
} from '@/features/notifications/local-reminders';
import {
  hasNotificationPermission,
  registerPushToken,
  retirePushToken,
  type PushRegistrationResult,
} from '@/features/notifications/push-tokens';
import { useGuardianTrees } from '@/features/trees/use-guardian-trees';

/**
 * Whether this installation is reachable, as the settings screen has to draw
 * it.
 *
 * Four states rather than a boolean, because the answers to "why is this off"
 * are not interchangeable: a guardian who has never been asked gets a button, a
 * guardian who said no gets the system settings, and a build with no push
 * project behind it gets the truth.
 */
export type PushRegistrationState = 'registered' | 'undetermined' | 'denied' | 'unavailable';

export const pushRegistrationQueryKey = (userId: string | null) =>
  ['push-registration', userId] as const;

/**
 * The registration of this installation, and the local reminders that stand in
 * for it when there is none.
 *
 * ## Nothing is asked for here
 *
 * This hook reads. It never raises the permission dialog, because the dialog
 * can only be shown once and where it is spent is a product decision, not a
 * side effect of mounting a screen. `enable()` is what asks, and it is called
 * from the two places that earned the question: the screen after a first tree
 * is planted, and the settings screen where the guardian went looking for it.
 *
 * ## The local reminders follow the registration
 *
 * Every time the registration state or the tree list settles, the local backup
 * is laid down again -- armed when this installation is not registered, cleared
 * when it is. That single call is what keeps the phone from ever holding both
 * a local notification and a pushed one for the same cycle.
 */
export function usePushRegistration() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? null;
  const trees = useGuardianTrees();

  const registration = useQuery({
    queryKey: pushRegistrationQueryKey(userId),
    enabled: userId !== null,
    queryFn: async (): Promise<PushRegistrationState> => {
      const permission = await Notifications.getPermissionsAsync();

      if (permission.status === 'undetermined') {
        return 'undetermined';
      }
      if (permission.status !== 'granted') {
        return 'denied';
      }

      // Granted, so the row can be written without asking anything. Doing it
      // on every read rather than once keeps `last_seen_at` honest and repairs
      // a registration that was lost -- a reinstall, a rotated token, a device
      // that changed hands while this one was in a pocket.
      const result = await registerPushToken();
      return result.state === 'registered' ? 'registered' : 'unavailable';
    },
  });

  const state = registration.data ?? null;

  // Derived during render from what the two queries currently hold, and
  // applied by the effect below. Nothing is mirrored into state.
  const isRegistered = state === 'registered';

  const applyLocalReminders = useMutation({
    mutationFn: async (): Promise<void> => {
      await rescheduleLocalReminders(trees.data ?? [], isRegistered);
    },
  });

  const { mutate: reapply } = applyLocalReminders;

  /**
   * Asks for the permission and registers.
   *
   * The one call in this feature that can raise a system dialog, so it is the
   * one the caller has to make deliberately.
   */
  const enable = useMutation({
    mutationFn: async (): Promise<PushRegistrationResult> => registerPushToken(),
    onSuccess: (result) => {
      queryClient.setQueryData(
        pushRegistrationQueryKey(userId),
        result.state === 'registered'
          ? 'registered'
          : result.reason === 'permission-denied'
            ? 'denied'
            : 'unavailable',
      );
      void queryClient.invalidateQueries({ queryKey: pushRegistrationQueryKey(userId) });
    },
  });

  /**
   * Stops delivery to this installation without touching the guardian's
   * preference.
   *
   * Two different facts: the preference says whether they want reminders at
   * all, and the token says whether this phone is one of the places they get
   * them. Turning the switch off does both -- there is no point keeping a live
   * token for somebody who asked not to be written to -- and the local backup
   * is deliberately not armed in its place, because a guardian who said no did
   * not mean "send it from the phone instead".
   */
  const disable = useMutation({
    mutationFn: async (): Promise<void> => {
      await retirePushToken();
      await clearLocalReminders();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pushRegistrationQueryKey(userId) });
    },
  });

  return {
    state,
    isRegistered,
    isPending: registration.isPending,
    error: registration.error,
    enable,
    disable,
    /** Lays the local backup down again for the current trees and registration. */
    refreshLocalReminders: reapply,
    hasNotificationPermission,
  };
}
