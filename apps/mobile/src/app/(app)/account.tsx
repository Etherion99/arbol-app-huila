import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { texts } from '@/constants/texts';
import { spacing } from '@/constants/theme';

/** What the account tab shows to a visitor exploring the map without one. */
export default function AccountScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.body}>
        <AppText variant="display">{texts.account.title}</AppText>
        <AppText variant="bodyMuted">{texts.account.body}</AppText>
      </View>

      <View style={styles.actions}>
        <Button label={texts.account.signUp} onPress={() => router.push('/sign-up')} />
        <Button
          label={texts.account.signIn}
          onPress={() => router.push('/sign-in')}
          variant="secondary"
        />
        <Button
          label={texts.account.legalLink}
          onPress={() => router.push('/legal')}
          variant="ghost"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
});
