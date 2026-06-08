import { ENV } from '@/constants/env';
import { TimeClockPicker, formatTimeDisplay } from '@/components/time-clock-picker';
import { useAuth } from '@/contexts/auth-context';
import { useHangoutPlans } from '@/contexts/hangout-plans-context';
import { AppTheme, useAppTheme } from '@/contexts/theme-context';
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

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

// One button for each real day, starting today and ending on this day next week.
type DayWindowOption = {
  offset: number;
  date: Date;
  dayLabel: string;
  dateLabel: string;
};

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function formatInputTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function combineDateAndTime(date: Date, time: string) {
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  const nextDate = new Date(date);
  nextDate.setHours(hour, minute, 0, 0);
  return nextDate;
}

function getDayTimeWindow(offset: number, startTime: string, endTime: string, now = new Date()) {
  const selectedDate = offset === 0 ? now : startOfDay(addDays(now, offset));
  const dateFrom = combineDateAndTime(selectedDate, startTime);
  const dateTo = combineDateAndTime(selectedDate, endTime);

  return {
    dateFrom,
    dateTo,
  };
}

export default function SuggestionsScreen() {
  const { theme } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const { addPlan } = useHangoutPlans();
  const [friends, setFriends] = React.useState<Friend[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = React.useState<string[]>([]);
  const [activityType, setActivityType] = React.useState('food');
  const [selectedDayOffset, setSelectedDayOffset] = React.useState(0);
  const [startTime, setStartTime] = React.useState(() => formatInputTime(new Date()));
  const [endTime, setEndTime] = React.useState(() => formatInputTime(addHours(new Date(), 2)));
  const [isTimePickerVisible, setIsTimePickerVisible] = React.useState(false);
  const [activeTimeField, setActiveTimeField] = React.useState<'start' | 'end'>('start');
  const [suggestions, setSuggestions] = React.useState<HangoutSuggestion[]>([]);
  const [statusMessage, setStatusMessage] = React.useState('');
  const [isLoadingFriends, setIsLoadingFriends] = React.useState(false);
  const [isFindingSuggestions, setIsFindingSuggestions] = React.useState(false);
  const [creatingSuggestionId, setCreatingSuggestionId] = React.useState<string | null>(null);
  const [currentTime, setCurrentTime] = React.useState(() => new Date());
  const dayWindowOptions = React.useMemo<DayWindowOption[]>(() => {
    // Build the day chips from the actual current day, not a fixed Monday list.
    return Array.from({ length: 8 }, (_, offset) => {
      const date = addDays(currentTime, offset);

      return {
        offset,
        date,
        dayLabel: DAY_LABEL_FORMATTER.format(date),
        dateLabel: DATE_LABEL_FORMATTER.format(date),
      };
    });
  }, [currentTime]);
  const activeTime = activeTimeField === 'start' ? startTime : endTime;
  const updateActiveTime = React.useCallback(
    (nextTime: string) => {
      // The same clock picker edits either the start or finish field.
      if (activeTimeField === 'start') {
        setStartTime(nextTime);
        return;
      }

      setEndTime(nextTime);
    },
    [activeTimeField]
  );

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

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60 * 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

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

    const { dateFrom, dateTo } = getDayTimeWindow(selectedDayOffset, startTime, endTime);

    if (!dateFrom || !dateTo) {
      setStatusMessage('Choose a valid start and finish time.');
      return;
    }

    if (dateTo <= dateFrom) {
      setStatusMessage('Finish time must be after the start time.');
      return;
    }

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
          // The backend still expects duration, so calculate it from the chosen times.
          durationMinutes: Math.round((dateTo.getTime() - dateFrom.getTime()) / 60000),
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
          <View style={styles.dayGrid}>
            {dayWindowOptions.map((option) => (
              <TouchableOpacity
                key={`${option.offset}-${option.dateLabel}`}
                style={[styles.dayButton, selectedDayOffset === option.offset && styles.activeSegmentButton]}
                onPress={() => setSelectedDayOffset(option.offset)}
                activeOpacity={0.85}
              >
                <Text style={[styles.dayText, selectedDayOffset === option.offset && styles.activeSegmentText]}>
                  {option.dayLabel}
                </Text>
                <Text style={[styles.dayDateText, selectedDayOffset === option.offset && styles.activeDayDateText]}>
                  {option.dateLabel}
                </Text>
              </TouchableOpacity>
            ))}
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
                <Text style={styles.timeRangeText}>{formatTimeDisplay(startTime)}</Text>
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
                <Text style={styles.timeRangeText}>{formatTimeDisplay(endTime)}</Text>
              </View>
            </TouchableOpacity>
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

      <TimeClockPicker
        visible={isTimePickerVisible}
        title={activeTimeField === 'start' ? 'Select Start Time' : 'Select Finish Time'}
        value={activeTime}
        onChange={updateActiveTime}
        onClose={() => setIsTimePickerVisible(false)}
      />
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  content: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 36,
  },

  heading: {
    color: theme.colors.text,
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
    color: theme.colors.text,
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
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 10,
  },

  selectedFriendChip: {
    backgroundColor: theme.colors.primary,
  },

  friendInitial: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedFriendInitial: {
    backgroundColor: theme.colors.surface,
  },

  friendInitialText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },

  selectedFriendInitialText: {
    color: theme.colors.primary,
  },

  friendName: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  selectedFriendName: {
    color: '#ffffff',
  },

  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  selectedOptionButton: {
    backgroundColor: theme.colors.primary,
  },

  optionText: {
    color: theme.colors.text,
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

  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },

  dayButton: {
    width: '23.2%',
    height: 52,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  segmentButton: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timeRangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },

  timeRangeInput: {
    flex: 1,
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    gap: 4,
  },

  timeRangeLabel: {
    color: theme.colors.primary,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },

  timeRangeValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  timeRangeText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  activeSegmentButton: {
    backgroundColor: theme.colors.primary,
  },

  segmentText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
  },

  dayText: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },

  dayDateText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
  },

  activeSegmentText: {
    color: '#ffffff',
  },

  activeDayDateText: {
    color: '#ffffff',
  },

  statusText: {
    color: theme.colors.danger,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    marginBottom: 10,
  },

  primaryButton: {
    height: 52,
    borderRadius: 8,
    backgroundColor: theme.colors.success,
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
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  scoreText: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '900',
  },

  suggestionTitle: {
    flex: 1,
    color: theme.colors.text,
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
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },

  createButton: {
    height: 42,
    borderRadius: 7,
    backgroundColor: theme.colors.primary,
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
