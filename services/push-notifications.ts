import { ENV } from '@/constants/env';
import type * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

type ExpoApplicationModule = typeof import('expo-application');
type ExpoDeviceModule = typeof import('expo-device');
type ExpoNotificationsModule = typeof import('expo-notifications');
type DevicePushToken = Notifications.DevicePushToken;

let lastRegisteredToken = '';
let lastRegistrationKey = '';
let pendingRegistrationKey = '';

function getNotificationsModule() {
  try {
    // Native module is present only after rebuilding the development app.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as ExpoNotificationsModule;
  } catch (error) {
    console.warn('Notifications native module is unavailable:', error);
    return null;
  }
}

function getApplicationModule() {
  try {
    // Native module is present only after rebuilding the development app.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-application') as ExpoApplicationModule;
  } catch {
    return null;
  }
}

function getDeviceModule() {
  try {
    // Native module is present only after rebuilding the development app.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-device') as ExpoDeviceModule;
  } catch {
    return null;
  }
}

export function getNotifications() {
  return getNotificationsModule();
}

export async function showLocalNotification(title: string, body: string, data?: any) {
  const NotificationsModule = getNotificationsModule();
  if (!NotificationsModule) return;

  await NotificationsModule.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      priority: 'max',
    },
    trigger: null,
  });
}

export async function registerForPushNotificationsAsync(authToken: string) {
  const NotificationsModule = getNotificationsModule();

  if (!NotificationsModule || Platform.OS === 'web') {
    return null;
  }

  const DeviceModule = getDeviceModule();

  if (!DeviceModule?.isDevice) {
    console.warn('Push notifications require a physical device.');
    return null;
  }

  if (Platform.OS === 'android') {
    await NotificationsModule.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: NotificationsModule.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1f5d86',
    });
  }

  const existingPermission = await NotificationsModule.getPermissionsAsync();
  const permission =
    existingPermission.granted || existingPermission.ios?.status === NotificationsModule.IosAuthorizationStatus.PROVISIONAL
      ? existingPermission
      : await NotificationsModule.requestPermissionsAsync();

  if (!permission.granted && permission.ios?.status !== NotificationsModule.IosAuthorizationStatus.PROVISIONAL) {
    console.warn('Notification permission was not granted.');
    return null;
  }

  const devicePushToken = await NotificationsModule.getDevicePushTokenAsync();
  await registerDevicePushTokenAsync(authToken, devicePushToken);

  return devicePushToken;
}

export function subscribeToPushTokenUpdates(authToken: string) {
  const NotificationsModule = getNotificationsModule();

  if (!NotificationsModule) {
    return { remove: () => undefined };
  }

  return NotificationsModule.addPushTokenListener((devicePushToken) => {
    registerDevicePushTokenAsync(authToken, devicePushToken).catch((error) => {
      console.warn('Could not register refreshed push token:', error);
    });
  });
}

export async function registerDevicePushTokenAsync(authToken: string, devicePushToken: DevicePushToken) {
  const token = getTokenString(devicePushToken);

  if (!token) {
    return;
  }

  const registrationKey = `${authToken}:${token}`;

  if (registrationKey === lastRegistrationKey || registrationKey === pendingRegistrationKey) {
    return;
  }

  pendingRegistrationKey = registrationKey;

  try {
    const response = await fetch(`${ENV.API_BASE_URL}/notifications/fcm-token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        deviceId: await getStableDeviceIdAsync(),
      }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message ?? data?.error ?? 'Could not register push token');
    }

    lastRegisteredToken = token;
    lastRegistrationKey = registrationKey;

    console.log('Push notification token registered', {
      platform: Platform.OS,
      tokenType: devicePushToken.type,
    });
  } finally {
    if (pendingRegistrationKey === registrationKey) {
      pendingRegistrationKey = '';
    }
  }
}

export async function unregisterCurrentPushTokenAsync(authToken: string | null) {
  if (!authToken || !lastRegisteredToken) {
    return;
  }

  const response = await fetch(`${ENV.API_BASE_URL}/notifications/fcm-token`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: lastRegisteredToken }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? data?.error ?? 'Could not remove push token');
  }

  lastRegisteredToken = '';
  lastRegistrationKey = '';
  pendingRegistrationKey = '';
}

function getTokenString(devicePushToken: DevicePushToken) {
  return typeof devicePushToken.data === 'string'
    ? devicePushToken.data
    : JSON.stringify(devicePushToken.data);
}

async function getStableDeviceIdAsync() {
  try {
    const ApplicationModule = getApplicationModule();

    if (Platform.OS === 'android') {
      return ApplicationModule?.getAndroidId();
    }

    if (Platform.OS === 'ios') {
      return await ApplicationModule?.getIosIdForVendorAsync();
    }
  } catch (error) {
    console.warn('Could not resolve stable device id:', error);
  }

  return undefined;
}
