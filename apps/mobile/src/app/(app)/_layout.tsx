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
 * reaches the map and reads it. What needs a session is the profile, and the
 * two tabs below swap according to whether there is one, so a guest is offered
 * a way in rather than a tab that would bounce them out.
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
        tabBarStyle: {
          backgroundColor: colors.surfaceCard,
          borderTopColor: colors.borderSubtle,
        },
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
          name="trees"
          options={{
            title: texts.myTrees.tabLabel,
            tabBarAccessibilityLabel: texts.myTrees.title,
            tabBarIcon: tabIcon({ ios: 'leaf.fill', android: 'eco', web: 'eco' }),
          }}
        />

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

      <Tabs.Protected guard={!hasSession}>
        <Tabs.Screen
          name="account"
          options={{
            title: texts.map.accountTabLabel,
            tabBarAccessibilityLabel: texts.account.title,
            tabBarIcon: tabIcon({
              ios: 'person.crop.circle.badge.plus',
              android: 'person_add',
              web: 'person_add',
            }),
          }}
        />
      </Tabs.Protected>
    </Tabs>
  );
}
