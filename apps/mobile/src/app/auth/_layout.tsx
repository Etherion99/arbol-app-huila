import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

/**
 * Landing routes for the links in the confirmation and recovery emails. They
 * exist so `arbolapp://auth/callback` and `arbolapp://auth/reset` resolve to a
 * real screen instead of flashing "not found" while the token is exchanged.
 */
export default function AuthLinkLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
