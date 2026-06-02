import { ENV } from '@/constants/env';
import { useAuth } from '@/contexts/auth-context';
import { useHangoutPlans } from '@/contexts/hangout-plans-context';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Friend = {
  id: string;
  name: string;
  email: string;
  profilePicture?: string | null;
  homeArea?: string;
};

type PlaceSuggestion = {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  rating?: number | null;
  googleMapsUri?: string | null;
};

type TimeSuggestion = {
  start: string;
  end: string;
  label: string;
};

type HangoutSuggestion = {
  id: string;
  time: TimeSuggestion;
  place: PlaceSuggestion;
  participants: Friend[];
  score: number;
};

const ACTIVITY_OPTIONS = [
  { id: 'food', label: 'Food', icon: 'restaurant-outline' },
  { id: 'coffee', label: 'Coffee', icon: 'cafe-outline' },
  { id: 'activity', label: 'Activity', icon: 'bowling-ball-outline' },
  { id: 'outdoors', label: 'Outdoor', icon: 'leaf-outline' },
] as const;

const DATE_RANGE_OPTIONS = [
  { id: 'today', label: 'Today', days: 1 },
  { id: 'weekend', label: 'Weekend', days: 4 },
  { id: 'week', label: '7 days', days: 7 },
] as const;

const DURATION_OPTIONS = [60, 90, 120, 180];

export default function SuggestionsScreen() {
  const { token } = useAuth();
  const { addPlan } = useHangoutPlans();
  const [friends, setFriends] = React.useState<Friend[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = React.useState<string[]>([]);
  const [activityType, setActivityType] = React.useState('food');
  const [dateRangeId, setDateRangeId] = React.useState('week');
  const [durationMinutes, setDurationMinutes] = React.useState(120);
  const [suggestions, setSuggestions] = React.useState<HangoutSuggestion[]>([]);
  const [statusMessage, setStatusMessage] = React.useState('');
  const [isLoadingFriends, setIsLoadingFriends] = React.useState(false);
  const [isFindingSuggestions, setIsFindingSuggestions] = React.useState(false);
  const [creatingSuggestionId, setCreatingSuggestionId] = React.useState<string | null>(null);

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

  const loadFriends = React.useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoadingFriends(true);
    try {
      const data = await apiFetch('/suggestions/friends');
      setFriends(data.friends ?? []);
      setStatusMessage('');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not load friends');
    } finally {
      setIsLoadingFriends(false);
    }
  }, [apiFetch, token]);

  React.useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds((currentIds) =>
      currentIds.includes(friendId)
        ? currentIds.filter((id) => id !== friendId)
        : [...currentIds, friendId]
    );
  };

  const findSuggestions = async () => {
    if (!selectedFriendIds.length) {
      setStatusMessage('Choose at least one friend first.');
      return;
    }

    const selectedRange = DATE_RANGE_OPTIONS.find((option) => option.id === dateRangeId) ?? DATE_RANGE_OPTIONS[2];
    const dateFrom = new Date();
    const dateTo = new Date(Date.now() + selectedRange.days * 24 * 60 * 60 * 1000);

    setIsFindingSuggestions(true);
    setStatusMessage('');
    setSuggestions([]);

    try {
      const data = await apiFetch('/suggestions/hangout', {
        method: 'POST',
        body: JSON.stringify({
          participantIds: selectedFriendIds,
          dateFrom: dateFrom.toISOString(),
          dateTo: dateTo.toISOString(),
          durationMinutes,
          activityType,
        }),
      });

      setSuggestions(data.suggestions ?? []);

      if (!data.suggestions?.length) {
        setStatusMessage('No common free time found in that range. Try a wider range.');
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not find suggestions');
    } finally {
      setIsFindingSuggestions(false);
    }
  };

  const createPlanFromSuggestion = async (suggestion: HangoutSuggestion) => {
    setCreatingSuggestionId(suggestion.id);
    setStatusMessage('');

    try {
      const title = `${suggestion.place.name} hangout`;
      const data = await apiFetch('/suggestions/plans', {
        method: 'POST',
        body: JSON.stringify({
          title,
          participantIds: selectedFriendIds,
          place: suggestion.place,
          startsAt: suggestion.time.start,
          endsAt: suggestion.time.end,
          activityType,
        }),
      });
      const createdPlan = data.plan;

      addPlan({
        id: createdPlan?.id ?? createdPlan?._id,
        title: createdPlan?.title ?? title,
        location: createdPlan?.location ?? suggestion.place.name,
        scheduledAt: createdPlan?.scheduledAt ?? suggestion.time.start,
        dateTimeLabel: createdPlan?.dateTimeLabel ?? suggestion.time.label,
        participants: createdPlan?.participants?.length
          ? createdPlan.participants
          : suggestion.participants.map((participant) => participant.name),
      });

      setStatusMessage(`Plan invite sent to ${data.invitedCount ?? selectedFriendIds.length} friend(s).`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not create plan');
    } finally {
      setCreatingSuggestionId(null);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Create Hangout</Text>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Friends</Text>
            {isLoadingFriends ? <ActivityIndicator color="#1f5d86" /> : null}
          </View>

          <View style={styles.friendList}>
            {friends.map((friend) => {
              const isSelected = selectedFriendIds.includes(friend.id);

              return (
                <TouchableOpacity
                  key={friend.id}
                  style={[styles.friendChip, isSelected && styles.selectedFriendChip]}
                  onPress={() => toggleFriend(friend.id)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.friendInitial, isSelected && styles.selectedFriendInitial]}>
                    <Text style={[styles.friendInitialText, isSelected && styles.selectedFriendInitialText]}>
                      {getInitials(friend.name)}
                    </Text>
                  </View>
                  <Text style={[styles.friendName, isSelected && styles.selectedFriendName]} numberOfLines={1}>
                    {friend.name}
                  </Text>
                  {isSelected ? <Ionicons name="checkmark" size={16} color="#ffffff" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {!friends.length && !isLoadingFriends ? (
            <Text style={styles.emptyText}>Add and accept friends before creating smart suggestions.</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.optionGrid}>
            {ACTIVITY_OPTIONS.map((option) => {
              const isSelected = activityType === option.id;

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.optionButton, isSelected && styles.selectedOptionButton]}
                  onPress={() => setActivityType(option.id)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={isSelected ? '#ffffff' : '#1f5d86'}
                  />
                  <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Window</Text>
          <View style={styles.segmentRow}>
            {DATE_RANGE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.segmentButton, dateRangeId === option.id && styles.activeSegmentButton]}
                onPress={() => setDateRangeId(option.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.segmentText, dateRangeId === option.id && styles.activeSegmentText]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.segmentRow}>
            {DURATION_OPTIONS.map((duration) => (
              <TouchableOpacity
                key={duration}
                style={[styles.segmentButton, durationMinutes === duration && styles.activeSegmentButton]}
                onPress={() => setDurationMinutes(duration)}
                activeOpacity={0.85}
              >
                <Text style={[styles.segmentText, durationMinutes === duration && styles.activeSegmentText]}>
                  {duration / 60 >= 1.5 ? `${duration / 60}h` : `${duration}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, isFindingSuggestions && styles.disabledButton]}
          onPress={findSuggestions}
          activeOpacity={0.88}
          disabled={isFindingSuggestions}
        >
          {isFindingSuggestions ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={20} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Find Best Plan</Text>
            </>
          )}
        </TouchableOpacity>

        {suggestions.length ? (
          <View style={styles.results}>
            <Text style={styles.sectionTitle}>Suggested Plans</Text>
            {suggestions.map((suggestion) => (
              <View key={suggestion.id} style={styles.suggestionCard}>
                <View style={styles.suggestionTopRow}>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{suggestion.score}%</Text>
                  </View>
                  <Text style={styles.suggestionTitle} numberOfLines={1}>
                    {suggestion.place.name}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={16} color="#1f5d86" />
                  <Text style={styles.metaText}>{formatTimeRange(suggestion.time.start, suggestion.time.end)}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={16} color="#1f5d86" />
                  <Text style={styles.metaText} numberOfLines={2}>
                    {suggestion.place.address || 'Address not available'}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="people-outline" size={16} color="#1f5d86" />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {suggestion.participants.map((participant) => participant.name).join(', ')}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => createPlanFromSuggestion(suggestion)}
                  activeOpacity={0.85}
                  disabled={creatingSuggestionId === suggestion.id}
                >
                  {creatingSuggestionId === suggestion.id ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.createButtonText}>Send Invite</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
}

function formatTimeRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dateLabel = new Intl.DateTimeFormat('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(startDate);
  const timeLabel = `${startDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${endDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  return `${dateLabel}, ${timeLabel}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#a9b2bd',
  },

  content: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 36,
  },

  heading: {
    color: '#0f172a',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    marginBottom: 14,
  },

  section: {
    marginBottom: 18,
  },

  sectionHeader: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: '#111827',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    marginBottom: 8,
  },

  friendList: {
    gap: 8,
  },

  friendChip: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 10,
  },

  selectedFriendChip: {
    backgroundColor: '#1f5d86',
  },

  friendInitial: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e8edf5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedFriendInitial: {
    backgroundColor: '#ffffff',
  },

  friendInitialText: {
    color: '#1f5d86',
    fontSize: 12,
    fontWeight: '900',
  },

  selectedFriendInitialText: {
    color: '#1f5d86',
  },

  friendName: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },

  selectedFriendName: {
    color: '#ffffff',
  },

  emptyText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
  },

  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  optionButton: {
    width: '48.8%',
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  selectedOptionButton: {
    backgroundColor: '#1f5d86',
  },

  optionText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
  },

  selectedOptionText: {
    color: '#ffffff',
  },

  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },

  segmentButton: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeSegmentButton: {
    backgroundColor: '#1f5d86',
  },

  segmentText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '900',
  },

  activeSegmentText: {
    color: '#ffffff',
  },

  statusText: {
    color: '#b42318',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    marginBottom: 10,
  },

  primaryButton: {
    height: 52,
    borderRadius: 8,
    backgroundColor: '#008f62',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },

  disabledButton: {
    opacity: 0.72,
  },

  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },

  results: {
    gap: 10,
  },

  suggestionCard: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 9,
  },

  suggestionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  scoreBadge: {
    minWidth: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#e8f7ef',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  scoreText: {
    color: '#008f62',
    fontSize: 12,
    fontWeight: '900',
  },

  suggestionTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },

  metaText: {
    flex: 1,
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },

  createButton: {
    height: 42,
    borderRadius: 7,
    backgroundColor: '#1f5d86',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
