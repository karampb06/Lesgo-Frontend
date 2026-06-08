import { Redirect } from 'expo-router';

// Send the app entry point straight to login.
export default function Index() {
  return <Redirect href="/login" />;
}
