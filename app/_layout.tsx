import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { NotificationListener } from '@/components/notification-listener';
import { AuthProvider } from '@/contexts/auth-context';
import { AppThemeProvider, useAppTheme } from '@/contexts/theme-context';

// RootLayout wraps the app with gesture support and the theme provider.
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AppThemeProvider>
        <RootNavigator />
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { theme } = useAppTheme();

  return (
    <ThemeProvider value={theme.mode === 'dark' ? DarkTheme : DefaultTheme}>
      {/* AuthProvider sits here so login, signup, and tabs can all share the session. */}
      <AuthProvider>
        <NotificationListener />
        <Stack initialRouteName="login">
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
      </AuthProvider>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
