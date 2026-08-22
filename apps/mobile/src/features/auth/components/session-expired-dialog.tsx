import { useRouter } from 'expo-router';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { texts } from '@/constants/texts';
import { useSession } from '@/features/auth/session-provider';

/**
 * What a guardian sees when the refresh token is refused.
 *
 * Without it the departure is silent: the tabs that need an account unmount,
 * the router falls back to the guest map, and somebody who was halfway through
 * their trees is simply somewhere else with no idea why. The canvas answers
 * that with an overlay over whatever screen they were standing on, which is
 * why this is mounted beside the navigator rather than inside a route.
 *
 * It is not the same message as the strip on the sign in screen. That one is
 * read after arriving there; this one is read where the session ended, and it
 * is the only place that says the work already on the phone survived.
 *
 * Both ways out clear the flag, so the overlay cannot come back over the
 * screen it just sent the guardian to.
 */
export function SessionExpiredDialog() {
  const router = useRouter();
  const { didSessionExpire, acknowledgeExpiry } = useSession();

  return (
    <Dialog
      isVisible={didSessionExpire}
      title={texts.sessionExpiry.title}
      onClose={acknowledgeExpiry}
      footer={
        <Button
          label={texts.sessionExpiry.signInAgain}
          onPress={() => {
            acknowledgeExpiry();
            router.replace('/sign-in');
          }}
        />
      }
    >
      <AppText variant="body">{texts.sessionExpiry.body}</AppText>
    </Dialog>
  );
}
