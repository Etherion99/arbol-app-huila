import { Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { texts } from '@/constants/texts';
import { colors } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';

function tabIcon(name: SymbolViewProps['name']) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <SymbolView name={name} tintColor={color} size={size} />;
  };
}

/**
 * The shell of the application.
 *
 * It is not behind a session guard on purpose: a visitor without an account
 * reaches the map and reads it.
 *
 * The tab bar belongs to the session, which is what the canvas draws: A8, the
 * guest map, has no bar at all and offers the account from the strip under the
 * map; B1 has the bar, with the four places a guardian moves between. A visitor
 * is exploring one screen, not navigating an application, and a bar with a
 * single tab in it says the opposite.
 */
export default function AppLayout() {
  const { session } = useSession();
  const hasSession = session !== null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: hasSession
          ? {
              backgroundColor: colors.surfaceCard,
              borderTopColor: colors.borderSubtle,
            }
          : { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: texts.map.tabLabel,
          tabBarAccessibilityLabel: texts.map.tabLabel,
          tabBarIcon: tabIcon({ ios: 'map.fill', android: 'map', web: 'map' }),
        }}
      />

      <Tabs.Protected guard={hasSession}>
        <Tabs.Screen
          name="profile"
          options={{
            title: texts.map.profileTabLabel,
            tabBarAccessibilityLabel: texts.profile.title,
            tabBarIcon: tabIcon({
              ios: 'person.crop.circle',
              android: 'account_circle',
              web: 'account_circle',
            }),
          }}
        />
      </Tabs.Protected>
    </Tabs>
  );
}
