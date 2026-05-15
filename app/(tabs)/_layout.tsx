import { HangoutPlansProvider } from '@/contexts/hangout-plans-context';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

const TAB_BLUE = '#1f5d86';
const TAB_MUTED = '#111827';

type TabIconName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  focused,
  name,
  activeName,
}: {
  focused: boolean;
  name: TabIconName;
  activeName: TabIconName;
}) {
  return (
    <View style={focused ? styles.activeIcon : styles.inactiveIcon}>
      <Ionicons
        name={focused ? activeName : name}
        size={focused ? 25 : 24}
        color={focused ? '#ffffff' : TAB_MUTED}
      />
    </View>
  );
}

export default function TabLayout() {
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
            backgroundColor: '#ffffff',
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
              <TabIcon focused={focused} name="home-outline" activeName="home-outline" />
            ),
          }}
        />
        <Tabs.Screen
          name="plans"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} name="time-outline" activeName="time-outline" />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} name="chatbox" activeName="chatbox" />
            ),
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} name="add-circle-outline" activeName="add-circle-outline" />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} name="person-outline" activeName="person-outline" />
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
      </Tabs>
    </HangoutPlansProvider>
  );
}

const styles = StyleSheet.create({
  activeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TAB_BLUE,
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
