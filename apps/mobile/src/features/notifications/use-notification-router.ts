import { useMutation } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/features/auth/session-provider';
import {
  readNotificationTarget,
  setNotificationTarget,
  takeNotificationTarget,
  useNotificationTarget,
} from '@/features/notifications/notification-target';
import { supabase } from '@/lib/supabase/client';

/** Why a tapped notification did not open a camera. */
export type NotificationRoutingProblem = 'gone' | 'failed';

type TreeCheck = { state: 'ok' } | { state: 'gone' };

/**
 * Turns a tapped notification into the growth log camera of the right tree.
 *
 * ## The link scheme is the app's real one
 *
 * The plan wrote it as `arbolapp://tree/{id}/log`. That route does not exist:
 * the growth log lives at `log/[treeId]`, opened as a modal over whatever the
 * guardian was on, and `tree/[id]` is the read only detail. So the notification
 * carries `arbolapp:///log/<treeId>`, which is the path expo-router actually
 * resolves, and the payload carries the same identifier separately for the
 * listener below to route on without parsing a URL.
 *
 * ## Three cases the tap has to survive
 *
 * **The app was closed.** The response is waiting in
 * `getLastNotificationResponseAsync()` before the navigator exists. It is read
 * into the target store on mount and consumed once there is somewhere to go.
 *
 * **The session ran out.** This hook lives inside the signed in area, so it
 * only ever runs with a session. A tap that arrives without one leaves the
 * target sitting in the store; the guardian signs in, the area mounts, and the
 * tree they were asked about is the first thing they see. Nothing is lost and
 * nothing opens behind a sign in screen.
 *
 * **The tree was archived.** A reminder sent on Monday and tapped on Friday can
 * point at a tree a coordinator archived in between. `trees_select_active` hides
 * it, so navigating would open a camera onto a detail query that returns
 * nothing. It is checked first and the guardian is told, instead of being shown
 * a screen that fails to load.
 */
export function useNotificationRouter() {
  const router = useRouter();
  const { session } = useSession();
  const target = useNotificationTarget();
  const [problem, setProblem] = useState<NotificationRoutingProblem | null>(null);

  const dismissProblem = useCallback(() => setProblem(null), []);

  // The tap that started the application, which never reaches the listener.
  useEffect(() => {
    let isMounted = true;

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      const found = readNotificationTarget(response);
      if (isMounted && found !== null) {
        setNotificationTarget(found);
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const found = readNotificationTarget(response);
      if (found !== null) {
        setNotificationTarget(found);
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const open = useMutation({
    mutationFn: async (treeId: string): Promise<TreeCheck> => {
      // Cheap and decisive: the policies already hide an archived tree, so an
      // empty answer is the answer. Asking for the id alone keeps it to one row
      // of one column over a vereda connection.
      const { data, error } = await supabase
        .from('trees')
        .select('id')
        .eq('id', treeId)
        .is('archived_at', null)
        .maybeSingle<{ id: string }>();

      if (error !== null) {
        throw new Error(error.message);
      }

      return data === null ? { state: 'gone' } : { state: 'ok' };
    },
  });

  const { mutateAsync: checkTree } = open;

  useEffect(() => {
    if (target === null || session === null) {
      return;
    }

    let isMounted = true;
    const taken = takeNotificationTarget();
    if (taken === null) {
      return;
    }

    void (async () => {
      try {
        const check = await checkTree(taken.treeId);

        if (!isMounted) {
          return;
        }

        if (check.state === 'gone') {
          setProblem('gone');
          return;
        }

        setProblem(null);
        router.push({ pathname: '/log/[treeId]', params: { treeId: taken.treeId } });

        // Recorded after the navigation rather than before it: `opened_at` says
        // the guardian arrived, and there is no point claiming that while the
        // screen might still refuse to open. It is also the only write here
        // whose failure changes nothing on screen, so it is allowed to fail
        // quietly -- the alternative is an error about a statistic, thrown over
        // a camera the guardian came here to use.
        if (taken.cycle !== null) {
          void supabase.rpc('mark_reminder_opened', {
            target_tree_id: taken.treeId,
            target_cycle: taken.cycle,
          });
        }
      } catch {
        if (isMounted) {
          setProblem('failed');
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [checkTree, router, session, target]);

  return { problem, dismissProblem };
}
