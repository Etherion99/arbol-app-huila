import { DEFAULT_NOTIFICATION_PREFERENCES } from '@arbolapp/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod/v4';

import { useSession } from '@/features/auth/session-provider';
import { supabase } from '@/lib/supabase/client';

/** The two switches, as the settings screen reads and writes them. */
export type NotificationChoices = {
  wantsGrowthLogReminders: boolean;
  wantsCoordinatorNotices: boolean;
};

const preferencesRowSchema = z.object({
  wants_growth_log_reminders: z.boolean(),
  wants_coordinator_notices: z.boolean(),
});

export const notificationPreferencesQueryKey = (userId: string | null) =>
  ['notification-preferences', userId] as const;

/**
 * What the guardian chose about being notified.
 *
 * ## An absent row is an answer
 *
 * Everybody who signed up before this screen existed has no row, and there is
 * no backfill: a missing row means `DEFAULT_NOTIFICATION_PREFERENCES`, and the
 * sweep reads it the same way with a `coalesce`. So the default lives in one
 * sentence on each side rather than in a migration that would have to be run
 * again for every account created afterwards.
 *
 * The first time a switch is moved the row is written, which is also the first
 * moment anybody has actually expressed a preference.
 */
export function useNotificationPreferences() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  return useQuery({
    queryKey: notificationPreferencesQueryKey(userId),
    enabled: userId !== null,
    queryFn: async ({ signal }): Promise<NotificationChoices> => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('wants_growth_log_reminders, wants_coordinator_notices')
        .eq('user_id', userId)
        .abortSignal(signal)
        .maybeSingle<unknown>();

      if (error !== null) {
        throw new Error(error.message);
      }

      if (data === null) {
        return { ...DEFAULT_NOTIFICATION_PREFERENCES };
      }

      const row = preferencesRowSchema.parse(data);
      return {
        wantsGrowthLogReminders: row.wants_growth_log_reminders,
        wantsCoordinatorNotices: row.wants_coordinator_notices,
      };
    },
  });
}

/**
 * Saves both switches at once.
 *
 * Both, not one: the row is a single record and an upsert of half of it would
 * write the default over whatever the other switch was already set to. The
 * screen holds the pair and sends the pair.
 *
 * There is no optimistic update. The point of this screen is that what it shows
 * is what the server will act on, and a switch that slides across and then
 * slides back is a worse lie than a switch that waits half a second. The
 * failure is shown rather than swallowed: in a vereda the write is exactly what
 * fails, and a guardian who turned reminders off has to know it did not take.
 */
export function useSaveNotificationPreferences() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? null;

  return useMutation({
    mutationFn: async (choices: NotificationChoices): Promise<NotificationChoices> => {
      if (userId === null) {
        throw new Error('No hay sesión');
      }

      const { error } = await supabase.from('notification_preferences').upsert(
        {
          user_id: userId,
          wants_growth_log_reminders: choices.wantsGrowthLogReminders,
          wants_coordinator_notices: choices.wantsCoordinatorNotices,
        },
        { onConflict: 'user_id' },
      );

      if (error !== null) {
        throw new Error(error.message);
      }

      return choices;
    },
    onSuccess: (choices) => {
      queryClient.setQueryData(notificationPreferencesQueryKey(userId), choices);
    },
  });
}
