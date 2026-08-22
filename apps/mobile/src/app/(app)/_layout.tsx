import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { texts } from '@/constants/texts';
import { colors } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';

function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Icon name={name} color={String(color)} size={size} />;
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
 *
 * The icons are the design system's own, not the platform's. Each tab already
 * carries `tabBarAccessibilityLabel`, so the drawing beside it is decorative
 * and stays unlabelled.
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
          tabBarIcon: tabIcon('map'),
        }}
      />

      <Tabs.Protected guard={hasSession}>
        <Tabs.Screen
          name="trees"
          options={{
            title: texts.myTrees.tabLabel,
            tabBarAccessibilityLabel: texts.myTrees.title,
            tabBarIcon: tabIcon('sprout'),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: texts.map.profileTabLabel,
            tabBarAccessibilityLabel: texts.profile.title,
            tabBarIcon: tabIcon('user'),
          }}
        />
      </Tabs.Protected>
    </Tabs>
  );
}
