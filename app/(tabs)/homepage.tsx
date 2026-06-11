import { showLocalNotification } from '@/services/push-notifications';
import { Ionicons } from '@expo/vector-icons';
import { ENV } from '@/constants/env';
import { TimeClockPicker, formatTimeDisplay } from '@/components/time-clock-picker';
import { useAuth } from '@/contexts/auth-context';
import { useHangoutPlans } from '@/contexts/hangout-plans-context';
import { AppTheme, useAppTheme } from '@/contexts/theme-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TrendingPlace = {
  id: string;
  name: string;
  type: string;
  category: 'food' | 'activity';
  lat?: number;
  lng?: number;
  image?: string;
  address?: string;
  rating?: number;
  mapsUri?: string;
  phoneNumber?: string;
  websiteUri?: string;
};

type Friend = {
  id: string;
  name: string;
  email: string;
  profilePicture?: string | null;
};

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

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt?: string;
  planId?: string;
  conversationId?: string;
};

export default function HomePage() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const resultRevealAnim = React.useRef(new Animated.Value(0)).current;
  const { token, user } = useAuth();
  const { plans, addPlan, refreshPlans } = useHangoutPlans();
  const homeArea = user?.homeArea;
  const homeLat = user?.homeLat;
  const homeLng = user?.homeLng;
  const upcomingPlans = plans.slice(0, 2);
  const [friendRequests, setFriendRequests] = React.useState<FriendRequest[]>([]);
  const [friends, setFriends] = React.useState<Friend[]>([]);
  const [planInvites, setPlanInvites] = React.useState<PlanInvite[]>([]);
  const [updates, setUpdates] = React.useState<NotificationItem[]>([]);
  const [trendingPlaces, setTrendingPlaces] = React.useState<TrendingPlace[]>([]);
  const [activityPlaces, setActivityPlaces] = React.useState<TrendingPlace[]>([]);
  const [activeTrendingSection, setActiveTrendingSection] = React.useState<'places' | 'activities' | null>(null);
  const [isLoadingTrendingPlaces, setIsLoadingTrendingPlaces] = React.useState(false);
  const [trendingPlacesMessage, setTrendingPlacesMessage] = React.useState('');
  const [selectedPlace, setSelectedPlace] = React.useState<TrendingPlace | null>(null);
  const [isPlaceDetailsVisible, setIsPlaceDetailsVisible] = React.useState(false);
  const [isLoadingPlaceDetails, setIsLoadingPlaceDetails] = React.useState(false);
  const [placeDetailsMessage, setPlaceDetailsMessage] = React.useState('');
  const [addPlaceMessage, setAddPlaceMessage] = React.useState('');
  const [selectedPlaceFriendIds, setSelectedPlaceFriendIds] = React.useState<string[]>([]);
  const [planDate, setPlanDate] = React.useState(() => formatInputDate(getDefaultPlanDate()));
  const [planTime, setPlanTime] = React.useState(() => formatInputTime(getDefaultPlanDate()));
  const [planEndTime, setPlanEndTime] = React.useState(() =>
    formatInputTime(new Date(getDefaultPlanDate().getTime() + 2 * 60 * 60 * 1000))
  );
  const [isCalendarVisible, setIsCalendarVisible] = React.useState(false);
  const [isTimePickerVisible, setIsTimePickerVisible] = React.useState(false);
  const [activeTimeField, setActiveTimeField] = React.useState<'start' | 'end'>('start');
  const [calendarMonth, setCalendarMonth] = React.useState(() => getDefaultPlanDate());
  const [isLoadingFriends, setIsLoadingFriends] = React.useState(false);
  const [isCreatingPlacePlan, setIsCreatingPlacePlan] = React.useState(false);
  const [isNotificationsVisible, setIsNotificationsVisible] = React.useState(false);
  const [notificationMessage, setNotificationMessage] = React.useState('');
  const [isNotificationActionLoading, setIsNotificationActionLoading] = React.useState(false);
  const notificationCount = friendRequests.length + planInvites.length + updates.length;
  const activePlanTime = activeTimeField === 'start' ? planTime : planEndTime;
  const updateActivePlanTime = React.useCallback(
    (nextTime: string) => {
      // Reuse one clock picker for both start and finish time.
      if (activeTimeField === 'start') {
        setPlanTime(nextTime);
        return;
      }

      setPlanEndTime(nextTime);
    },
    [activeTimeField]
  );

  React.useEffect(() => {
    if (!activeTrendingSection) {
      resultRevealAnim.setValue(0);
      return;
    }

    Animated.timing(resultRevealAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeTrendingSection, resultRevealAnim]);

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

  const loadTrendingPlaces = React.useCallback(async () => {
    setIsLoadingTrendingPlaces(true);
    setTrendingPlacesMessage('');

    try {
      const params = new URLSearchParams();

      // Prefer exact home coordinates, but fall back to the user's home area.
      if (
        typeof homeLat === 'number' &&
        Number.isFinite(homeLat) &&
        typeof homeLng === 'number' &&
        Number.isFinite(homeLng)
      ) {
        params.set('lat', String(homeLat));
        params.set('lng', String(homeLng));
      }

      if (homeArea?.trim()) {
        params.set('homeArea', homeArea.trim());
      }

      const data = await apiFetch(`/places/trending?${params.toString()}`);
      const foodPlaces = data.foodPlaces ?? [];
      const nearbyActivityPlaces = data.activityPlaces ?? [];

      setTrendingPlaces(foodPlaces);
      setActivityPlaces(nearbyActivityPlaces);

      if (!foodPlaces.length && !nearbyActivityPlaces.length) {
        setTrendingPlacesMessage('No trending places found right now.');
      }
    } catch (error) {
      console.warn('Trending places load failed:', error);
      setTrendingPlaces([]);
      setActivityPlaces([]);
      setTrendingPlacesMessage(error instanceof Error ? error.message : 'Could not load trending places.');
    } finally {
      setIsLoadingTrendingPlaces(false);
    }
  }, [apiFetch, homeArea, homeLat, homeLng]);

  const openTrendingPlace = async (place: TrendingPlace) => {
    setSelectedPlace(place);
    setIsPlaceDetailsVisible(true);
    setPlaceDetailsMessage('');
    setAddPlaceMessage('');

    if (!place.id) {
      return;
    }

    setIsLoadingPlaceDetails(true);

    try {
      const data = await apiFetch(`/places/${place.id}`);
      const placeDetails = data.place ?? data;

      setSelectedPlace({
        ...place,
        ...placeDetails,
        id: placeDetails?.id ?? place.id,
        name: placeDetails?.name ?? place.name,
        type: placeDetails?.type ?? place.type,
        category: placeDetails?.category ?? place.category,
      });
    } catch (error) {
      console.warn('Place details load failed:', error);
      setPlaceDetailsMessage(error instanceof Error ? error.message : 'Could not load place details.');
    } finally {
      setIsLoadingPlaceDetails(false);
    }
  };

  const loadFriends = React.useCallback(async () => {
    if (!token) {
      setFriends([]);
      return;
    }

    setIsLoadingFriends(true);

    try {
      const data = await apiFetch('/suggestions/friends');
      setFriends(data.friends ?? []);
    } catch (error) {
      setAddPlaceMessage(error instanceof Error ? error.message : 'Could not load friends.');
    } finally {
      setIsLoadingFriends(false);
    }
  }, [apiFetch, token]);

  const togglePlaceFriend = (friendId: string) => {
    setSelectedPlaceFriendIds((currentIds) =>
      currentIds.includes(friendId)
        ? currentIds.filter((id) => id !== friendId)
        : [...currentIds, friendId]
    );
  };

  const addSelectedPlaceToPlans = async () => {
    if (!selectedPlace) {
      return;
    }

    if (!selectedPlaceFriendIds.length) {
      setAddPlaceMessage('Choose at least one friend for this plan.');
      return;
    }

    const startsAt = parsePlanDateTime(planDate, planTime);
    const endsAt = parsePlanDateTime(planDate, planEndTime);

    if (!startsAt || !endsAt) {
      setAddPlaceMessage('Use date YYYY-MM-DD and time HH:mm.');
      return;
    }

    if (endsAt <= startsAt) {
      // A finish time before the start time would create a broken invite.
      setAddPlaceMessage('Finish time must be after the start time.');
      return;
    }

    const title = `Hangout at ${selectedPlace.name}`;

    setIsCreatingPlacePlan(true);
    setAddPlaceMessage('');

    try {
      const data = await apiFetch('/suggestions/plans', {
        method: 'POST',
        body: JSON.stringify({
          title,
          participantIds: selectedPlaceFriendIds,
          place: {
            name: selectedPlace.name,
            address: selectedPlace.address,
            lat: selectedPlace.lat,
            lng: selectedPlace.lng,
            rating: selectedPlace.rating,
            googleMapsUri: selectedPlace.mapsUri,
          },
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          activityType: selectedPlace.category === 'food' ? 'food' : 'activity',
        }),
      });
      console.log('Place Plan Invite Response:', {
        planId: data.plan?.id,
        invitedCount: data.invitedCount,
        participantIds: selectedPlaceFriendIds,
        participants: data.plan?.participants,
        participantProfiles: data.plan?.participantProfiles,
      });
      const createdPlan = data.plan;
      const selectedFriends = friends.filter((friend) => selectedPlaceFriendIds.includes(friend.id));

      addPlan({
        id: createdPlan?.id ?? createdPlan?._id,
        title: createdPlan?.title ?? title,
        location: createdPlan?.location ?? selectedPlace.name,
        scheduledAt: createdPlan?.scheduledAt ?? startsAt.toISOString(),
        endsAt: createdPlan?.endsAt ?? endsAt.toISOString(),
        dateTimeLabel: createdPlan?.dateTimeLabel ?? formatPlanLabel(startsAt),
        participants: createdPlan?.participants?.length
          ? createdPlan.participants
          : selectedFriends.map((friend) => friend.name),
        inviteStatuses:
          createdPlan?.inviteStatuses ??
          createdPlan?.invites ??
          createdPlan?.invitees ??
          createdPlan?.participantProfiles ??
          selectedFriends.map((friend) => ({
            id: friend.id,
            name: friend.name,
            profilePicture: friend.profilePicture,
            status: 'pending',
          })),
        participantProfiles:
          createdPlan?.participantProfiles ??
          selectedFriends.map((friend) => ({
            id: friend.id,
            name: friend.name,
            profilePicture: friend.profilePicture,
            status: 'pending',
          })),
      });

      const invitedCount = data.invitedCount ?? selectedPlaceFriendIds.length;

      await showLocalNotification(
        'Plan Invite Sent! 📅',
        `Invite for ${selectedPlace.name} sent to ${invitedCount} friend(s).`,
        { type: 'plan_created', planId: createdPlan?.id }
      );

      setAddPlaceMessage(`Plan invite sent to ${invitedCount} friend(s). Check their home notifications.`);
      Alert.alert('Invite Sent', `Plan invite sent to ${invitedCount} friend(s).`);
      setSelectedPlaceFriendIds([]);
      await Promise.all([loadNotifications(), refreshPlans()]);
    } catch (error) {
      setAddPlaceMessage(error instanceof Error ? error.message : 'Could not create this plan.');
    } finally {
      setIsCreatingPlacePlan(false);
    }
  };

  const loadNotifications = React.useCallback(async () => {
    if (!token) {
      setFriendRequests([]);
      setPlanInvites([]);
      setUpdates([]);
      return;
    }

    try {
      const requestsData = await apiFetch('/social/friends/requests');
      let invitesData = { invites: [] };
      let notificationsData = { notifications: [] };

      try {
        invitesData = await apiFetch('/suggestions/plan-invites');
      } catch (error) {
        console.warn('Plan invite notification load failed:', error);
      }

      try {
        notificationsData = await apiFetch('/notifications');
      } catch (error) {
        console.warn('Generic notification load failed:', error);
      }

      const genericUpdates = normalizeNotifications(notificationsData).filter(
        (notification) => !['friend_request', 'plan_invite'].includes(notification.type)
      );

      console.log('Home Notifications Loaded:', {
        friendRequests: requestsData.requests?.length ?? 0,
        planInvites: invitesData.invites?.length ?? 0,
        updates: genericUpdates.length,
      });

      setFriendRequests(requestsData.requests ?? []);
      setPlanInvites(normalizePlanInvites(invitesData));
      setUpdates(genericUpdates);
    } catch (error) {
      console.warn('Notification load failed:', error);
      setNotificationMessage(error instanceof Error ? error.message : 'Could not load notifications.');
    }
  }, [apiFetch, token]);

  const openNotifications = async () => {
    setIsNotificationsVisible(true);
    setNotificationMessage('');

    try {
      await loadNotifications();
    } catch (error) {
      setNotificationMessage(error instanceof Error ? error.message : 'Could not load notifications.');
    }
  };

  React.useEffect(() => {
    loadNotifications();
    loadTrendingPlaces();
    loadFriends();
  }, [loadNotifications, loadTrendingPlaces, loadFriends]);

  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
      loadTrendingPlaces();
      loadFriends();
      refreshPlans().catch((error) => {
        console.warn('Could not refresh homepage plans:', error);
      });
    }, [loadFriends, loadNotifications, loadTrendingPlaces, refreshPlans])
  );

  const acceptFriendRequest = async (requestId: string) => {
    setIsNotificationActionLoading(true);
    setNotificationMessage('');

    try {
      await apiFetch(`/social/friends/${requestId}/accept`, { method: 'POST' });
      await showLocalNotification('Friendship Confirmed! 🤝', 'You are now friends.');
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
      await showLocalNotification('Plan Joined! ✅', 'See you there!');
      setNotificationMessage('Plan invite accepted.');
      await Promise.all([loadNotifications(), refreshPlans()]);
    } catch (error) {
      setNotificationMessage(error instanceof Error ? error.message : 'Could not accept plan invite.');
    } finally {
      setIsNotificationActionLoading(false);
    }
  };

  const removeNotification = async (notificationId: string) => {
    const previousUpdates = updates;
    setUpdates((currentUpdates) => currentUpdates.filter((notification) => notification.id !== notificationId));
    setIsNotificationActionLoading(true);
    setNotificationMessage('');

    try {
      await apiFetch(`/notifications/${notificationId}`, { method: 'DELETE' });
      setNotificationMessage('Notification removed.');
    } catch (error) {
      setUpdates(previousUpdates);
      setNotificationMessage(error instanceof Error ? error.message : 'Could not remove notification.');
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

  const openNotification = (notification: NotificationItem) => {
    if (notification.conversationId) {
      router.push({
        pathname: '/(tabs)/chat',
        params: {
          conversationId: notification.conversationId,
          title: notification.title.replace(/^New message from\s+/i, '') || 'Chat',
        },
      });
      setIsNotificationsVisible(false);
      return;
    }

    if (notification.planId) {
      openPlanDetails(notification.planId);
      setIsNotificationsVisible(false);
    }
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
            onPress={openNotifications}
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

        <View style={styles.discoveryPanel}>
          <View style={styles.trendingTitleRow}>
            <View style={styles.discoveryTitleCopy}>
              <Text style={styles.discoveryKicker}>Near you</Text>
              <Text style={styles.sectionTitle}>
                {activeTrendingSection === 'places'
                  ? 'Trending Places'
                  : activeTrendingSection === 'activities'
                    ? 'Trending Activities'
                    : 'Explore Trending'}
              </Text>
              <Text style={styles.trendingSubtitle}>Fresh picks for your next hangout</Text>
            </View>
            {activeTrendingSection ? (
              <TouchableOpacity
                style={styles.trendingBackButton}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTrendingSection(null);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="chevron-back" size={18} color="#1f5d86" />
                <Text style={styles.trendingBackText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.trendingSpark}>
                <Ionicons name="sparkles-outline" size={22} color="#ffffff" />
              </View>
            )}
          </View>

          {!activeTrendingSection ? (
            <>
              <View style={styles.discoveryPreview}>
                <View style={styles.discoveryIconCluster}>
                  <View style={[styles.discoveryIcon, styles.discoveryIconPrimary]}>
                    <Ionicons name="restaurant-outline" size={22} color="#ffffff" />
                  </View>
                  <View style={[styles.discoveryIcon, styles.discoveryIconSecondary]}>
                    <Ionicons name="map-outline" size={22} color="#ffffff" />
                  </View>
                  <View style={[styles.discoveryIcon, styles.discoveryIconAccent]}>
                    <Ionicons name="location-outline" size={20} color="#ffffff" />
                  </View>
                </View>
                <Text style={styles.discoveryTitle}>What kind of vibe today?</Text>
                <Text style={styles.discoveryText}>
                  Pick a category to reveal nearby ideas with photos, details, and plan invites.
                </Text>
              </View>

              <View style={styles.trendingToggle}>
                <TouchableOpacity
                  style={styles.trendingToggleButton}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTrendingSection('places');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.categoryIconWrap, styles.categoryIconPrimary]}>
                    <Ionicons name="restaurant-outline" size={22} color="#ffffff" />
                  </View>
                  <View style={styles.categoryCopy}>
                    <Text style={styles.trendingToggleText}>Places</Text>
                    <Text style={styles.categoryHint}>Food, cafes, local stops</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#1f5d86" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.trendingToggleButton}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTrendingSection('activities');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.categoryIconWrap, styles.categoryIconSecondary]}>
                    <Ionicons name="map-outline" size={22} color="#ffffff" />
                  </View>
                  <View style={styles.categoryCopy}>
                    <Text style={styles.trendingToggleText}>Activities</Text>
                    <Text style={styles.categoryHint}>Parks, sights, things to do</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#1f5d86" />
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>

        {activeTrendingSection ? (
          <Animated.View
            style={[
              styles.placeRow,
              {
                opacity: resultRevealAnim,
                transform: [
                  {
                    translateY: resultRevealAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {isLoadingTrendingPlaces ? (
              <View style={styles.trendingStatusCard}>
                <ActivityIndicator color="#1f5d86" />
              </View>
            ) : (activeTrendingSection === 'places' ? trendingPlaces : activityPlaces).length ? (
              (activeTrendingSection === 'places' ? trendingPlaces : activityPlaces).map((place) => (
              <TouchableOpacity
                key={place.id}
                style={styles.placeCard}
                onPress={() => openTrendingPlace(place)}
                activeOpacity={0.85}
              >
                {place.image ? (
                  <Image source={{ uri: place.image }} style={styles.placeImage} contentFit="cover" />
                ) : (
                  <View style={styles.placeImageFallback}>
                    <Ionicons name="location-outline" size={24} color="#1f5d86" />
                  </View>
                )}
                <View style={styles.placeCaption}>
                  <Text style={styles.placeBadge} numberOfLines={1}>{place.type}</Text>
                  <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
                </View>
              </TouchableOpacity>
              ))
            ) : (
              <View style={styles.trendingStatusCard}>
                <Text style={styles.trendingStatusText}>
                  {trendingPlacesMessage || `No trending ${activeTrendingSection} found right now.`}
                </Text>
              </View>
            )}
          </Animated.View>
        ) : null}

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
              <View style={styles.planIconBadge}>
                <Ionicons name="calendar-outline" size={20} color="#ffffff" />
              </View>
              <View style={styles.planCopy}>
                <Text style={styles.planTitle}>{plan.title}</Text>
                <View style={styles.planMetaRow}>
                  <Ionicons name="time-outline" size={14} color="#64748b" />
                  <Text style={styles.planMeta} numberOfLines={1}>{plan.dateTimeLabel}</Text>
                </View>
                <View style={styles.planMetaRow}>
                  <Ionicons name="location-outline" size={14} color="#64748b" />
                  <Text style={styles.planMeta} numberOfLines={1}>{plan.location}</Text>
                </View>
              </View>
              <View style={styles.planTimePill}>
                <Text style={styles.planTime}>{getPlanDistanceLabel(plan.scheduledAt)}</Text>
              </View>
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

            <ScrollView
              style={styles.notificationScroll}
              contentContainerStyle={styles.notificationScrollContent}
              showsVerticalScrollIndicator={false}
            >
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

              <Text style={styles.modalSectionTitle}>Updates</Text>
              {updates.length ? (
                updates.map((notification) => (
                  <View key={notification.id} style={styles.notificationRow}>
                    <TouchableOpacity
                      style={styles.notificationMainAction}
                      onPress={() => openNotification(notification)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.notificationCopy}>
                        <Text style={styles.notificationTitle}>{notification.title}</Text>
                        <Text style={styles.notificationSubtitle}>{notification.message}</Text>
                        {notification.createdAt ? (
                          <Text style={styles.notificationSubtitle}>
                            {new Date(notification.createdAt).toLocaleString([], {
                              weekday: 'short',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeNotificationButton}
                      onPress={() => removeNotification(notification.id)}
                      disabled={isNotificationActionLoading}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="trash-outline" size={17} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.modalEmptyText}>No updates</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isPlaceDetailsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPlaceDetailsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.placeDetailsPanel}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedPlace?.name ?? 'Place Details'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsPlaceDetailsVisible(false)}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.placeDetailsScroll}
              contentContainerStyle={styles.placeDetailsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedPlace?.image ? (
                <Image source={{ uri: selectedPlace.image }} style={styles.placeDetailsImage} contentFit="cover" />
              ) : (
                <View style={styles.placeDetailsImageFallback}>
                  <Ionicons name="location-outline" size={34} color="#1f5d86" />
                </View>
              )}

              {isLoadingPlaceDetails ? <ActivityIndicator color="#1f5d86" style={styles.detailsLoader} /> : null}
              {placeDetailsMessage ? <Text style={styles.statusText}>{placeDetailsMessage}</Text> : null}

              <View style={styles.detailsInfoBox}>
                <View style={styles.detailRow}>
                  <Ionicons name="restaurant-outline" size={17} color="#1f5d86" />
                  <Text style={styles.detailText}>{selectedPlace?.type ?? 'Place'}</Text>
                </View>

                {selectedPlace?.rating ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="star" size={17} color="#d97706" />
                    <Text style={styles.detailText}>{selectedPlace.rating.toFixed(1)} rating</Text>
                  </View>
                ) : null}

                {selectedPlace?.address ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={17} color="#1f5d86" />
                    <Text style={styles.detailText}>{selectedPlace.address}</Text>
                  </View>
                ) : null}

                {selectedPlace?.phoneNumber ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={17} color="#1f5d86" />
                    <Text style={styles.detailText}>{selectedPlace.phoneNumber}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.modalSectionTitle}>Friends</Text>
              {isLoadingFriends ? <ActivityIndicator color="#1f5d86" style={styles.detailsLoader} /> : null}
              <View style={styles.placeFriendList}>
                {friends.map((friend) => {
                  const isSelected = selectedPlaceFriendIds.includes(friend.id);

                  return (
                    <TouchableOpacity
                      key={friend.id}
                      style={[styles.placeFriendChip, isSelected && styles.selectedPlaceFriendChip]}
                      onPress={() => togglePlaceFriend(friend.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.placeFriendText, isSelected && styles.selectedPlaceFriendText]}>
                        {getInitials(friend.name)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {!friends.length && !isLoadingFriends ? (
                <Text style={styles.modalEmptyText}>Add friends before sending a place invite.</Text>
              ) : null}

              <Text style={styles.modalSectionTitle}>Date and Time</Text>
              <View style={styles.planInputRow}>
                <TouchableOpacity
                  style={styles.planInput}
                  onPress={() => {
                    const currentDate = parsePlanDateTime(planDate, planTime) ?? getDefaultPlanDate();
                    setCalendarMonth(currentDate);
                    setIsCalendarVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.planInputText}>{planDate}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.timeRangeRow}>
                <TouchableOpacity
                  style={styles.timeRangeInput}
                  onPress={() => {
                    setActiveTimeField('start');
                    setIsTimePickerVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.timeRangeLabel}>Start</Text>
                  <View style={styles.timeRangeValue}>
                    <Ionicons name="time-outline" size={15} color="#1f5d86" />
                    <Text style={styles.planInputText}>{formatTimeDisplay(planTime)}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timeRangeInput}
                  onPress={() => {
                    setActiveTimeField('end');
                    setIsTimePickerVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.timeRangeLabel}>Finish</Text>
                  <View style={styles.timeRangeValue}>
                    <Ionicons name="time-outline" size={15} color="#1f5d86" />
                    <Text style={styles.planInputText}>{formatTimeDisplay(planEndTime)}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {addPlaceMessage ? <Text style={styles.placeInviteStatus}>{addPlaceMessage}</Text> : null}

              {selectedPlace?.mapsUri ? (
                <TouchableOpacity
                  style={styles.mapsButton}
                  onPress={() => selectedPlace.mapsUri && Linking.openURL(selectedPlace.mapsUri)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="map-outline" size={18} color="#ffffff" />
                  <Text style={styles.mapsButtonText}>Open in Google Maps</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.addToPlansButton, isCreatingPlacePlan && styles.disabledButton]}
                onPress={addSelectedPlaceToPlans}
                disabled={isCreatingPlacePlan}
                activeOpacity={0.85}
              >
                {isCreatingPlacePlan ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="calendar-outline" size={18} color="#ffffff" />
                    <Text style={styles.mapsButtonText}>Send Plan Invite</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isCalendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCalendarVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.calendarPanel}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => setCalendarMonth(shiftMonth(calendarMonth, -1))}
                activeOpacity={0.85}
              >
                <Ionicons name="chevron-back" size={20} color="#0f172a" />
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>{formatCalendarMonth(calendarMonth)}</Text>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => setCalendarMonth(shiftMonth(calendarMonth, 1))}
                activeOpacity={0.85}
              >
                <Ionicons name="chevron-forward" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.weekdayText}>{day}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {getCalendarDays(calendarMonth).map((date, index) => {
                const isSelected = date && formatInputDate(date) === planDate;
                const isPast = date ? date < startOfToday() : false;

                return (
                  <TouchableOpacity
                    key={`${date?.toISOString() ?? 'empty'}-${index}`}
                    style={[
                      styles.calendarDay,
                      isSelected && styles.selectedCalendarDay,
                      isPast && styles.disabledCalendarDay,
                    ]}
                    onPress={() => {
                      if (!date || isPast) {
                        return;
                      }

                      setPlanDate(formatInputDate(date));
                      setIsCalendarVisible(false);
                    }}
                    disabled={!date || isPast}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        isSelected && styles.selectedCalendarDayText,
                        isPast && styles.disabledCalendarDayText,
                      ]}
                    >
                      {date?.getDate() ?? ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      <TimeClockPicker
        visible={isTimePickerVisible}
        title={activeTimeField === 'start' ? 'Select Start Time' : 'Select Finish Time'}
        value={activePlanTime}
        onChange={updateActivePlanTime}
        onClose={() => setIsTimePickerVisible(false)}
      />
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

function getDefaultPlanDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(18, 0, 0, 0);
  return date;
}

function formatPlanLabel(date: Date) {
  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatInputDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatInputTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function shiftMonth(date: Date, direction: number) {
  return new Date(date.getFullYear(), date.getMonth() + direction, 1);
}

function formatCalendarMonth(date: Date) {
  return new Intl.DateTimeFormat('en-NZ', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const days: (Date | null)[] = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function parsePlanDateTime(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const parsedDate = new Date(`${date}T${time}:00`);
  return Number.isFinite(parsedDate.getTime()) ? parsedDate : null;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
}

function normalizePlanInvites(data: any): PlanInvite[] {
  const rawInvites =
    (Array.isArray(data) ? data : null) ??
    data?.invites ??
    data?.planInvites ??
    data?.pendingInvites ??
    data?.plans ??
    [];

  if (!Array.isArray(rawInvites)) {
    return [];
  }

  return rawInvites
    .map((invite: any, index: number) => {
      const plan = invite.plan ?? invite.hangoutPlan ?? invite;
      const id = invite.id ?? invite._id ?? invite.planId ?? plan.id ?? plan._id;

      if (!id) {
        return null;
      }

      return {
        id,
        title: plan.title ?? invite.title ?? 'Hangout invite',
        location: plan.location ?? plan.place?.name ?? invite.location ?? 'Selected place',
        dateTimeLabel:
          plan.dateTimeLabel ??
          invite.dateTimeLabel ??
          formatPlanLabel(new Date(plan.scheduledAt ?? plan.startsAt ?? Date.now())),
        creator: invite.creator ?? plan.creator,
      };
    })
    .filter(Boolean) as PlanInvite[];
}

function normalizeNotifications(data: any): NotificationItem[] {
  const rawNotifications = Array.isArray(data?.notifications) ? data.notifications : [];

  return rawNotifications
    .filter((notification: any) => notification?.id && notification?.type)
    .map((notification: any) => ({
      id: String(notification.id),
      type: String(notification.type),
      title: String(notification.title || 'Notification'),
      message: String(notification.message || ''),
      createdAt: notification.createdAt ? String(notification.createdAt) : undefined,
      planId: notification.planId ? String(notification.planId) : undefined,
      conversationId: notification.conversationId ? String(notification.conversationId) : undefined,
    }));
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },

  searchBox: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    width: 52,
    height: 52,
    borderRadius: 26,
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
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },

  discoveryPanel: {
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  trendingTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  discoveryTitleCopy: {
    flex: 1,
  },

  discoveryKicker: {
    color: theme.colors.primary,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 3,
  },

  trendingSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 4,
  },

  trendingSpark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  trendingBackButton: {
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 10,
    paddingRight: 14,
  },

  trendingBackText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },

  trendingToggle: {
    gap: 10,
    marginTop: 14,
  },

  trendingToggleButton: {
    minHeight: 74,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  trendingToggleText: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },

  categoryIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  categoryIconPrimary: {
    backgroundColor: theme.colors.primary,
  },

  categoryIconSecondary: {
    backgroundColor: theme.colors.secondary,
  },

  categoryCopy: {
    flex: 1,
  },

  categoryHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    marginTop: 2,
  },

  activeTrendingToggleText: {
    color: '#ffffff',
  },

  discoveryPreview: {
    borderRadius: 14,
    backgroundColor: theme.colors.primarySoft,
    padding: 14,
    marginTop: 16,
  },

  discoveryIconCluster: {
    height: 54,
    marginBottom: 12,
  },

  discoveryIcon: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.surface,
  },

  discoveryIconPrimary: {
    left: 0,
    backgroundColor: theme.colors.primary,
  },

  discoveryIconSecondary: {
    left: 34,
    backgroundColor: theme.colors.secondary,
  },

  discoveryIconAccent: {
    left: 68,
    backgroundColor: '#7c3aed',
  },

  discoveryTitle: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    marginBottom: 5,
  },

  discoveryText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  placeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    marginBottom: 22,
  },

  placeCard: {
    width: '48%',
    height: 188,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  placeImage: {
    width: '100%',
    height: 116,
  },

  placeImageFallback: {
    width: '100%',
    height: 116,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeCaption: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
    paddingTop: 9,
    backgroundColor: theme.colors.surface,
  },

  placeBadge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    color: theme.colors.primary,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    marginBottom: 4,
  },

  placeName: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },

  trendingStatusCard: {
    minHeight: 116,
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  trendingStatusText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  viewAllButton: {
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  viewAllText: {
    color: '#ffffff',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '800',
  },

  planCard: {
    minHeight: 92,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#dbe3ee',
  },

  upcomingList: {
    gap: 10,
  },

  planCopy: {
    flex: 1,
    paddingHorizontal: 12,
  },

  planIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#1f5d86',
    alignItems: 'center',
    justifyContent: 'center',
  },

  planTitle: {
    color: '#111827',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    marginBottom: 5,
  },

  planMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },

  planMeta: {
    flex: 1,
    color: '#64748b',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },

  planTimePill: {
    minWidth: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  planTime: {
    color: '#1f5d86',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
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
    overflow: 'hidden',
  },

  placeDetailsPanel: {
    width: '100%',
    maxHeight: '86%',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 16,
  },

  placeDetailsScroll: {
    maxHeight: '92%',
  },

  placeDetailsScrollContent: {
    paddingBottom: 4,
  },

  placeDetailsImage: {
    width: '100%',
    height: 170,
    borderRadius: 8,
    marginBottom: 12,
  },

  placeDetailsImageFallback: {
    width: '100%',
    height: 170,
    borderRadius: 8,
    backgroundColor: '#e8edf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  detailsLoader: {
    marginBottom: 8,
  },

  detailsInfoBox: {
    gap: 10,
    marginBottom: 14,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },

  detailText: {
    flex: 1,
    color: '#0f172a',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },

  mapsButton: {
    height: 42,
    borderRadius: 8,
    backgroundColor: '#1f5d86',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  addToPlansButton: {
    height: 42,
    borderRadius: 8,
    backgroundColor: '#008f62',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },

  disabledButton: {
    opacity: 0.6,
  },

  statusText: {
    color: '#1f5d86',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },

  placeFriendList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },

  placeFriendChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8edf5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedPlaceFriendChip: {
    backgroundColor: '#1f5d86',
  },

  placeFriendText: {
    color: '#1f5d86',
    fontSize: 11,
    fontWeight: '900',
  },

  selectedPlaceFriendText: {
    color: '#ffffff',
  },

  planInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },

  planInput: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#eef2fa',
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    justifyContent: 'center',
  },

  planInputText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
  },

  timeInput: {
    width: 108,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#eef2fa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
  },

  timeRangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },

  timeRangeInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#eef2fa',
    paddingHorizontal: 10,
    paddingVertical: 7,
    justifyContent: 'center',
    gap: 3,
  },

  timeRangeLabel: {
    color: '#1f5d86',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },

  timeRangeValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },

  durationButton: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#eef2fa',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeDurationButton: {
    backgroundColor: '#1f5d86',
  },

  durationText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '900',
  },

  activeDurationText: {
    color: '#ffffff',
  },

  mapsButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },

  placeInviteStatus: {
    color: '#1f5d86',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },

  calendarPanel: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 16,
  },

  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  calendarNavButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eef2fa',
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
  },

  timePickerPanel: {
    width: '100%',
    maxHeight: '72%',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 16,
  },

  timePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  selectedTimeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  timeModeButton: {
    minWidth: 58,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#eef2fa',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeTimeModeButton: {
    backgroundColor: '#1f5d86',
  },

  timeModeText: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
  },

  activeTimeModeText: {
    color: '#ffffff',
  },

  timeSeparator: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '900',
    marginHorizontal: 6,
  },

  periodToggle: {
    height: 48,
    minWidth: 48,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  periodToggleText: {
    color: '#1f5d86',
    fontSize: 13,
    fontWeight: '900',
  },

  clockFace: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#eef2fa',
    alignSelf: 'center',
    marginBottom: 14,
  },

  clockCenter: {
    position: 'absolute',
    left: 104,
    top: 104,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1f5d86',
  },

  clockOption: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedClockOption: {
    backgroundColor: '#1f5d86',
  },

  clockOptionText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '900',
  },

  selectedClockOptionText: {
    color: '#ffffff',
  },

  timeDoneButton: {
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1f5d86',
    alignItems: 'center',
    justifyContent: 'center',
  },

  timeDoneText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },

  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },

  weekdayText: {
    flex: 1,
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  calendarDay: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },

  selectedCalendarDay: {
    backgroundColor: '#1f5d86',
  },

  disabledCalendarDay: {
    opacity: 0.35,
  },

  calendarDayText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '900',
  },

  selectedCalendarDayText: {
    color: '#ffffff',
  },

  disabledCalendarDayText: {
    color: '#94a3b8',
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

  notificationScroll: {
    flexShrink: 1,
    maxHeight: '88%',
  },

  notificationScrollContent: {
    paddingBottom: 4,
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

  notificationMainAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
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

  removeNotificationButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#dce5f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
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
