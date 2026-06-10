import { HangoutPlansProvider } from '@/contexts/hangout-plans-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/contexts/auth-context';
import { AppTheme, useAppTheme } from '@/contexts/theme-context';

type TabIconName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  focused,
  name,
  activeName,
  theme,
}: {
  focused: boolean;
  name: TabIconName;
  activeName: TabIconName;
  theme: AppTheme;
}) {
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={focused ? styles.activeIcon : styles.inactiveIcon}>
      <Ionicons
        name={focused ? activeName : name}
        size={focused ? 25 : 24}
        color={focused ? '#ffffff' : theme.colors.text}
      />
    </View>
  );
}

export default function TabLayout() {
  const { user, token, isRestoringSession } = useAuth();
  const { theme } = useAppTheme();

  if (isRestoringSession) {
    const styles = createStyles(theme);

    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!user || !token) {
    return <Redirect href="/login" />;
  }

  return (
    <HangoutPlansProvider>
      <Tabs
        initialRouteName="homepage"
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            height: 72,
            borderTopWidth: 0,
            backgroundColor: theme.colors.tabBar,
            paddingTop: 10,
            paddingBottom: 10,
          },
          tabBarItemStyle: {
            height: 52,
          },
        }}
      >
        <Tabs.Screen
          name="homepage"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} name="home-outline" activeName="home-outline" theme={theme} />
            ),
          }}
        />
        <Tabs.Screen
          name="plans"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} name="time-outline" activeName="time-outline" theme={theme} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} name="chatbox" activeName="chatbox" theme={theme} />
            ),
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} name="sparkles-outline" activeName="sparkles-outline" theme={theme} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} name="person-outline" activeName="person-outline" theme={theme} />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="hangoutplans"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="viewhangoutplan"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="selectedlocation"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="hangoutplancreated"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </HangoutPlansProvider>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inactiveIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
