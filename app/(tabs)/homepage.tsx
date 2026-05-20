import { Ionicons } from '@expo/vector-icons';
import { ENV } from '@/constants/env';
import { useAuth } from '@/contexts/auth-context';
import { useHangoutPlans } from '@/contexts/hangout-plans-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const trendingPlaces = [
  {
    name: 'Onslow',
    type: 'Restaurant',
    image:
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=240&q=80',
  },
  {
    name: 'Depot',
    type: 'Restaurant',
    image:
      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=240&q=80',
  },
  {
    name: 'Rooftop',
    type: 'Restaurant',
    image:
      'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=240&q=80',
  },
];

type FriendRequest = {
  id: string;
  requester?: {
    name?: string;
    friendCode?: string;
  };
};

type PlanInvite = {
  id: string;
  title: string;
  location: string;
  dateTimeLabel: string;
  creator?: {
    name?: string;
  };
};

export default function HomePage() {
  const router = useRouter();
  const { token } = useAuth();
  const { plans, refreshPlans } = useHangoutPlans();
  const upcomingPlans = plans.slice(0, 2);
  const [friendRequests, setFriendRequests] = React.useState<FriendRequest[]>([]);
  const [planInvites, setPlanInvites] = React.useState<PlanInvite[]>([]);
  const [isNotificationsVisible, setIsNotificationsVisible] = React.useState(false);
  const [notificationMessage, setNotificationMessage] = React.useState('');
  const [isNotificationActionLoading, setIsNotificationActionLoading] = React.useState(false);
  const notificationCount = friendRequests.length + planInvites.length;

  const apiFetch = React.useCallback(
    async (path: string, options: RequestInit = {}) => {
      const response = await fetch(`${ENV.API_BASE_URL}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message ?? data?.error ?? `Request failed with status ${response.status}`);
      }

      return data;
    },
    [token]
  );

  const loadNotifications = React.useCallback(async () => {
    if (!token) {
      setFriendRequests([]);
      setPlanInvites([]);
      return;
    }

    try {
      const requestsData = await apiFetch('/social/friends/requests');
      let invitesData = { invites: [] };

      try {
        invitesData = await apiFetch('/suggestions/plan-invites');
      } catch (error) {
        console.warn('Plan invite notification load failed:', error);
      }

      setFriendRequests(requestsData.requests ?? []);
      setPlanInvites(invitesData.invites ?? []);
    } catch (error) {
      console.warn('Notification load failed:', error);
    }
  }, [apiFetch, token]);

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
      refreshPlans().catch((error) => {
        console.warn('Could not refresh homepage plans:', error);
      });
    }, [loadNotifications, refreshPlans])
  );

  const acceptFriendRequest = async (requestId: string) => {
    setIsNotificationActionLoading(true);
    setNotificationMessage('');

    try {
      await apiFetch(`/social/friends/${requestId}/accept`, { method: 'POST' });
      setNotificationMessage('Friend request accepted.');
      await loadNotifications();
    } catch (error) {
      setNotificationMessage(error instanceof Error ? error.message : 'Could not accept request.');
    } finally {
      setIsNotificationActionLoading(false);
    }
  };

  const acceptPlanInvite = async (planId: string) => {
    setIsNotificationActionLoading(true);
    setNotificationMessage('');

    try {
      await apiFetch(`/suggestions/plans/${planId}/accept`, { method: 'POST' });
      setNotificationMessage('Plan invite accepted.');
      await Promise.all([loadNotifications(), refreshPlans()]);
    } catch (error) {
      setNotificationMessage(error instanceof Error ? error.message : 'Could not accept plan invite.');
    } finally {
      setIsNotificationActionLoading(false);
    }
  };

  const openHangoutPlans = () => {
    router.push('/(tabs)/hangoutplans');
  };

  const openPlanDetails = (planId: string) => {
    router.push({
      pathname: '/(tabs)/viewhangoutplan',
      params: { planId },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Explore Places"
              placeholderTextColor="#111827"
            />
            <Ionicons name="search" size={18} color="#334155" />
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => setIsNotificationsVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={26} color="#ffffff" />
            {notificationCount ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Trending Places</Text>

        <View style={styles.placeRow}>
          {trendingPlaces.map((place) => (
            <TouchableOpacity key={place.name} style={styles.placeCard} activeOpacity={0.85}>
              <Image source={{ uri: place.image }} style={styles.placeImage} contentFit="cover" />
              <View style={styles.placeCaption}>
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={styles.placeType}>{place.type}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Plans</Text>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={openHangoutPlans}
            activeOpacity={0.85}
          >
            <Text style={styles.viewAllText}>View All Plans</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.upcomingList}>
          {upcomingPlans.length ? upcomingPlans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={styles.planCard}
              onPress={() => openPlanDetails(plan.id)}
              activeOpacity={0.85}
            >
              <View style={styles.planCopy}>
                <Text style={styles.planTitle}>{plan.title}</Text>
                <Text style={styles.planMeta}>
                  {plan.dateTimeLabel} - {plan.location}
                </Text>
              </View>
              <Text style={styles.planTime}>{getPlanDistanceLabel(plan.scheduledAt)}</Text>
            </TouchableOpacity>
          )) : (
            <View style={styles.emptyPlansCard}>
              <Text style={styles.emptyPlansTitle}>No plans yet</Text>
              <Text style={styles.emptyPlansText}>Create a hangout to see it here.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={isNotificationsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNotificationsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsNotificationsVisible(false)}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {notificationMessage ? <Text style={styles.notificationStatus}>{notificationMessage}</Text> : null}
            {isNotificationActionLoading ? <ActivityIndicator color="#1f5d86" /> : null}

            <Text style={styles.modalSectionTitle}>Friend Requests</Text>
            {friendRequests.length ? (
              friendRequests.map((request) => (
                <View key={request.id} style={styles.notificationRow}>
                  <View style={styles.notificationCopy}>
                    <Text style={styles.notificationTitle}>
                      {request.requester?.name ?? 'New friend request'}
                    </Text>
                    <Text style={styles.notificationSubtitle}>{request.requester?.friendCode}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => acceptFriendRequest(request.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.modalEmptyText}>No friend requests</Text>
            )}

            <Text style={styles.modalSectionTitle}>Plan Invites</Text>
            {planInvites.length ? (
              planInvites.map((invite) => (
                <View key={invite.id} style={styles.notificationRow}>
                  <View style={styles.notificationCopy}>
                    <Text style={styles.notificationTitle}>{invite.title}</Text>
                    <Text style={styles.notificationSubtitle}>
                      {invite.dateTimeLabel} - {invite.location}
                    </Text>
                    <Text style={styles.notificationSubtitle}>
                      From {invite.creator?.name ?? 'Friend'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => acceptPlanInvite(invite.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.modalEmptyText}>No plan invites</Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getPlanDistanceLabel(scheduledAt: string) {
  const today = new Date();
  const planDate = new Date(scheduledAt);
  const dayInMilliseconds = 1000 * 60 * 60 * 24;
  const dayDifference = Math.max(
    1,
    Math.ceil((planDate.getTime() - today.getTime()) / dayInMilliseconds)
  );

  if (dayDifference === 1) {
    return '1 Day';
  }

  if (dayDifference < 7) {
    return `${dayDifference} Days`;
  }

  const weekDifference = Math.ceil(dayDifference / 7);
  return weekDifference === 1 ? '1 Week' : `${weekDifference} Weeks`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#a9b2bd',
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingTop: 20,
    paddingBottom: 28,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },

  searchBox: {
    flex: 1,
    height: 42,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 14,
  },

  searchInput: {
    flex: 1,
    height: '100%',
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },

  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1f5d86',
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },

  sectionTitle: {
    color: '#0f172a',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
  },

  placeRow: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 12,
    marginBottom: 18,
  },

  placeCard: {
    width: 80,
    height: 116,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },

  placeImage: {
    width: '100%',
    height: 78,
  },

  placeCaption: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 6,
    backgroundColor: '#ffffff',
  },

  placeName: {
    color: '#111827',
    fontSize: 13,
    lineHeight: 15,
    fontWeight: '800',
    textAlign: 'center',
  },

  placeType: {
    color: '#475569',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  viewAllButton: {
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1f5d86',
    justifyContent: 'center',
    paddingHorizontal: 13,
  },

  viewAllText: {
    color: '#ffffff',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '800',
  },

  planCard: {
    minHeight: 68,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  upcomingList: {
    gap: 10,
  },

  planCopy: {
    flex: 1,
    paddingRight: 10,
  },

  planTitle: {
    color: '#111827',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },

  planMeta: {
    color: '#111827',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },

  planTime: {
    color: '#111827',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },

  emptyPlansCard: {
    minHeight: 72,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  emptyPlansTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '900',
  },

  emptyPlansText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  modalPanel: {
    width: '100%',
    maxHeight: '82%',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 16,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  modalTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },

  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eef2fa',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalSectionTitle: {
    color: '#1f5d86',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 12,
    marginBottom: 6,
  },

  notificationRow: {
    minHeight: 64,
    borderRadius: 8,
    backgroundColor: '#eef2fa',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 8,
  },

  notificationCopy: {
    flex: 1,
    paddingRight: 8,
  },

  notificationTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '900',
  },

  notificationSubtitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  notificationStatus: {
    color: '#1f5d86',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },

  acceptButton: {
    minWidth: 72,
    height: 34,
    borderRadius: 7,
    backgroundColor: '#008f62',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  acceptButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },

  modalEmptyText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
});
