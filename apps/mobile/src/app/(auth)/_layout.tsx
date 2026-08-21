import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

/**
 * The signed out area. Whether it is reachable at all is decided one level up,
 * by the guard in the root layout, so nothing here has to re-check the session.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surfacePage },
      }}
    />
  );
}
