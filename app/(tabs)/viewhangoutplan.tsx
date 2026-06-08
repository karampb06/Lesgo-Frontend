import { Ionicons } from '@expo/vector-icons';
import { useHangoutPlans } from '@/contexts/hangout-plans-context';
import { useAuth } from '@/contexts/auth-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Shows one plan with its place, time, friends, and cancel action.
export default function ViewHangoutPlanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const { plans, getPlanById, cancelPlan, refreshPlans } = useHangoutPlans();
  const [statusMessage, setStatusMessage] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const plan = getPlanById(planId) ?? plans[0];

  useFocusEffect(
    useCallback(() => {
      refreshPlans().catch((error) => {
        console.warn('Could not refresh plan details:', error);
      });
    }, [refreshPlans])
  );

  if (!plan) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.heading}>No hangout plan found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleCancelPlan = async () => {
    if (!plan?.id || isCancelling) {
      return;
    }

    setIsCancelling(true);
    setStatusMessage('');

    try {
      await cancelPlan(plan.id);
      Alert.alert('Plan Cancelled', 'This hangout plan has been cancelled.');
      router.replace('/(tabs)/hangoutplans');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not cancel plan');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.heading}>View Hangout Plans</Text>

        <View style={styles.detailCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryText}>
              <Text style={styles.planTitle}>{plan.title}</Text>
              <Text style={styles.planMeta}>
                {plan.dateTimeLabel} - {plan.location}
              </Text>
            </View>

            {plan.participantProfiles[0]?.profilePicture ? (
              <Image
                source={{ uri: plan.participantProfiles[0].profilePicture }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.initialAvatar]}>
                <Text style={styles.initialAvatarText}>
                  {getInitials(plan.participantProfiles[0]?.name ?? plan.participants[0])}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{plan.location}</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date and Time:</Text>
              <Text style={styles.infoValue}>{formatPlanDate(plan.scheduledAt)}</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Participants:</Text>
              <Text style={styles.infoValue}>{plan.participants.join(', ')}</Text>
            </View>
          </View>

          <Text style={styles.statusHeading}>Invite Status</Text>
          <View style={styles.inviteStatusList}>
            {getInviteStatuses(plan, user).map((participant) => (
              <View key={participant.id} style={styles.inviteStatusRow}>
                <Text style={styles.inviteStatusName}>{participant.name}</Text>
                <View
                  style={[
                    styles.inviteStatusBadge,
                    participant.status === 'accepted'
                      ? styles.acceptedStatusBadge
                      : styles.pendingStatusBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.inviteStatusText,
                      participant.status === 'accepted'
                        ? styles.acceptedStatusText
                        : styles.pendingStatusText,
                    ]}
                  >
                    {formatInviteStatus(participant.status)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}

          <TouchableOpacity
            style={[styles.cancelButton, isCancelling && styles.disabledButton]}
            onPress={handleCancelPlan}
            disabled={isCancelling}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>{isCancelling ? 'Cancelling...' : 'Cancel plan'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function getInitials(name?: string) {
  return (name ?? 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
}

function formatPlanDate(scheduledAt: string) {
  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(scheduledAt));
}

function getInviteStatuses(plan: {
  participants: string[];
  participantProfiles: { id: string; name: string; status?: string }[];
  inviteStatuses?: { id: string; name: string; status?: string }[];
}, user?: { backendId?: string; id: string; name: string } | null) {
  const acceptedNames = new Set(plan.participants.map((name) => normalizeName(name)));
  const statuses = new Map<string, { id: string; name: string; status: string }>();

  plan.inviteStatuses?.forEach((participant) => {
    statuses.set(participant.id, {
      id: participant.id,
      name: participant.name,
      status: normalizeInviteStatus(participant.status),
    });
  });

  plan.participantProfiles.forEach((participant) => {
    const isCurrentUser =
      participant.id === user?.backendId ||
      participant.id === user?.id ||
      normalizeName(participant.name) === normalizeName(user?.name);
    const isAccepted = isCurrentUser || acceptedNames.has(normalizeName(participant.name));

    statuses.set(participant.id, {
      id: participant.id,
      name: participant.name,
      status: isAccepted ? 'accepted' : normalizeInviteStatus(participant.status),
    });
  });

  plan.participants.forEach((name) => {
    const matchingParticipant = [...statuses.values()].find(
      (participant) => normalizeName(participant.name) === normalizeName(name)
    );

    if (matchingParticipant) {
      statuses.set(matchingParticipant.id, {
        ...matchingParticipant,
        status: 'accepted',
      });
      return;
    }

    statuses.set(name, {
      id: name,
      name,
      status: 'accepted',
    });
  });

  return [...statuses.values()];
}

function normalizeInviteStatus(status?: string) {
  const normalizedStatus = status?.toLowerCase();
  return ['accepted', 'joined', 'confirmed'].includes(normalizedStatus ?? '') ? 'accepted' : 'pending';
}

function formatInviteStatus(status?: string) {
  return normalizeInviteStatus(status) === 'accepted' ? 'Accepted' : 'Pending';
}

function normalizeName(name?: string) {
  return (name ?? '').trim().toLowerCase();
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#a9b2bd',
  },

  content: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
  },

  backButton: {
    width: 32,
    height: 30,
    justifyContent: 'center',
    marginBottom: 6,
  },

  heading: {
    color: '#111827',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    marginBottom: 12,
  },

  detailCard: {
    minHeight: 340,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 22,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 44,
  },

  summaryText: {
    flex: 1,
    paddingRight: 12,
  },

  planTitle: {
    color: '#111827',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },

  planMeta: {
    color: '#111827',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },

  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#d8dee7',
  },

  initialAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f5d86',
  },

  initialAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },

  infoBox: {
    borderWidth: 1,
    borderColor: '#e8edf5',
    borderRadius: 2,
    marginBottom: 26,
  },

  infoRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },

  infoLabel: {
    color: '#a0aec0',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },

  infoValue: {
    color: '#111827',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    textAlign: 'right',
  },

  infoDivider: {
    height: 1,
    backgroundColor: '#e8edf5',
  },

  cancelButton: {
    height: 44,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusHeading: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
  },

  inviteStatusList: {
    gap: 8,
    marginBottom: 18,
  },

  inviteStatusRow: {
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: '#eef2fa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },

  inviteStatusName: {
    flex: 1,
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '900',
    paddingRight: 8,
  },

  inviteStatusBadge: {
    minWidth: 72,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  acceptedStatusBadge: {
    backgroundColor: '#dcfce7',
  },

  pendingStatusBadge: {
    backgroundColor: '#fef3c7',
  },

  inviteStatusText: {
    fontSize: 10,
    fontWeight: '900',
  },

  acceptedStatusText: {
    color: '#15803d',
  },

  pendingStatusText: {
    color: '#b45309',
  },

  disabledButton: {
    opacity: 0.6,
  },

  cancelButtonText: {
    color: '#ff1f1f',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },

  statusText: {
    color: '#b91c1c',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
});
