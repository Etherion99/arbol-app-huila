import { useEffect } from 'react';
import { AppState } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { texts } from '@/constants/texts';
import { usePushRegistration } from '@/features/notifications/use-push-registration';
import { useNotificationRouter } from '@/features/notifications/use-notification-router';

/**
 * The one place the notification machinery is wired to the running application.
 *
 * It draws nothing except the overlay for a tap that could not be honoured, and
 * it is mounted once inside the signed in area rather than per screen: the
 * listeners, the local schedule and the routing all have to exist exactly once,
 * and a hook called from three screens would register three listeners and
 * reschedule the same notifications three times.
 *
 * It asks for no permission. That question belongs to the two screens that
 * earned it -- the one after a first tree is planted, and the settings screen a
 * guardian went looking for -- and firing it from a layout would spend the one
 * dialog the platform allows on somebody who was opening the map.
 */
export function NotificationSync() {
  const { refreshLocalReminders, isRegistered } = usePushRegistration();
  const { problem, dismissProblem } = useNotificationRouter();

  // Every opening, as the backup is specified: the set of trees changes
  // underneath the phone -- a cycle closed on another device, a tree
  // reassigned -- and rebuilding it wholesale is the only version that cannot
  // drift. `isRegistered` is in the dependencies because granting the
  // permission has to clear the local copies in the same breath.
  useEffect(() => {
    refreshLocalReminders();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshLocalReminders();
      }
    });

    return () => subscription.remove();
  }, [isRegistered, refreshLocalReminders]);

  return (
    <Dialog
      isVisible={problem !== null}
      title={
        problem === 'gone'
          ? texts.notifications.treeGoneTitle
          : texts.notifications.routingFailedTitle
      }
      onClose={dismissProblem}
      footer={<Button label={texts.common.close} onPress={dismissProblem} />}
    >
      <AppText variant="body">
        {problem === 'gone'
          ? texts.notifications.treeGoneBody
          : texts.notifications.routingFailedBody}
      </AppText>
    </Dialog>
  );
}
