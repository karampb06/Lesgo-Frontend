import { Redirect } from 'expo-router';

// The tabs group opens on the home page by default.
export default function TabsIndexRedirect() {
  return <Redirect href="/(tabs)/homepage" />;
}
