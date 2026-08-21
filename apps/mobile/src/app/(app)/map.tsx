import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { texts } from '@/constants/texts';
import { spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';

/**
 * Placeholder for the interactive map, which is the next delivery. The route,
 * the tab and the guest access are wired now so that building the map is only
 * a matter of replacing what this screen renders.
 */
export default function MapScreen() {
  const router = useRouter();
  const { session } = useSession();

  return (
    <Screen>
      <View style={styles.body}>
        <AppText variant="display">{texts.map.placeholderTitle}</AppText>
        <AppText variant="bodyMuted">{texts.map.placeholderBody}</AppText>

        {session === null ? (
          <View style={styles.guest}>
            <Notice tone="info" message={texts.map.guestNotice} />
            <Button label={texts.map.guestAction} onPress={() => router.push('/sign-up')} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing[4],
  },
  guest: {
    gap: spacing[4],
    marginTop: spacing[6],
  },
});
