import { getNotifications } from '@/services/push-notifications';
import { useRouter } from 'expo-router';
import React from 'react';

type NotificationData = {
  conversationId?: unknown;
  notificationIds?: unknown;
  planId?: unknown;
  type?: unknown;
};

// Configure how notifications are handled when the app is in the foreground.
// This is set outside the component to ensure it's registered as soon as the module loads.
const Notifications = getNotifications();
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true, // Required for the notification to "pop up" (heads-up) on most devices
      shouldSetBadge: true,
    }),
  });
}

export function NotificationListener() {
  const router = useRouter();

  React.useEffect(() => {
    if (!Notifications) {
      return undefined;
    }

    const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
      // Even if the banner shows, you can still trigger local logic here
      const title = notification.request.content.title ?? 'LesGo';
      const body = notification.request.content.body;

      // Optional: If you want a custom Alert in addition to the system banner
      // Alert.alert(title, body ?? '');
      console.log('Notification received in foreground:', title, body);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationData;
      const route = getNotificationRoute(data);

      if (route) {
        router.push(route);
      }
    });

    // Handle notifications that were received while the app was closed
    const lastResponse = Notifications.getLastNotificationResponse();
    const lastResponseData = lastResponse?.notification.request.content.data as NotificationData | undefined;
    const initialRoute = lastResponseData ? getNotificationRoute(lastResponseData) : null;

    if (initialRoute) {
      router.push(initialRoute);
      Notifications.clearLastNotificationResponse();
    }

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, [router]);

  return null;
}

function getNotificationRoute(data: NotificationData) {
  const type = typeof data.type === 'string' ? data.type : '';
  const planId = typeof data.planId === 'string' ? data.planId : '';
  const conversationId = typeof data.conversationId === 'string' ? data.conversationId : '';

  if (conversationId) {
    return {
      pathname: '/(tabs)/chat',
      params: {
        conversationId,
        title: type === 'message' ? 'Chat' : 'Conversation',
      },
    } as const;
  }

  if (planId) {
    return {
      pathname: '/(tabs)/viewhangoutplan',
      params: {
        notificationIds: typeof data.notificationIds === 'string' ? data.notificationIds : undefined,
        planId,
        type,
      },
    } as const;
  }

  if (type) {
    return '/(tabs)/homepage' as const;
  }

  return null;
}
