// Public app settings. Expo reads EXPO_PUBLIC_* values when the app is built.
export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://172.20.10.4:3001',
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  ANDROID_PACKAGE_NAME: process.env.EXPO_PUBLIC_ANDROID_PACKAGE_NAME ?? 'lesgo.app',
  ANDROID_DEBUG_SHA1: process.env.EXPO_PUBLIC_ANDROID_DEBUG_SHA1 ?? '',
  GOOGLE_BASE_SCOPES: ['profile', 'email'],
  GOOGLE_FREEBUSY_SCOPE: 'https://www.googleapis.com/auth/calendar.freebusy',
} as const;
