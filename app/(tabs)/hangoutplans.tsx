import { Ionicons } from '@expo/vector-icons';
import { useHangoutPlans } from '@/contexts/hangout-plans-context';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Shows the user's saved hangout plans.
export default function HangoutPlansScreen() {
  const router = useRouter();
  const { plans, refreshPlans } = useHangoutPlans();

  useFocusEffect(
    React.useCallback(() => {
      refreshPlans().catch((error) => {
        console.warn('Could not refresh hangout plans:', error);
      });
    }, [refreshPlans])
  );

  const openPlanDetails = (planId: string) => {
    router.push({
      pathname: '/(tabs)/viewhangoutplan',
      params: { planId },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.heading}>Upcoming Hangout Plans</Text>

        {plans.length ? (
          <View style={styles.planList}>
            {plans.map((plan) => {
            const visibleParticipants = plan.participantProfiles.slice(0, 3);
            const extraCount = Math.max(0, plan.participants.length - visibleParticipants.length);

            return (
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

                  <TouchableOpacity
                    style={styles.detailsRow}
                    onPress={() => openPlanDetails(plan.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.detailsText}>View Details</Text>
                    <Ionicons name="arrow-forward" size={16} color="#5158d6" />
                  </TouchableOpacity>
                </View>

                <View style={styles.avatarStack}>
                  {visibleParticipants.map((participant, index) =>
                    participant.profilePicture ? (
                      <Image
                        key={participant.id}
                        source={{ uri: participant.profilePicture }}
                        style={[styles.avatar, { marginLeft: index === 0 ? 0 : -12 }]}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        key={participant.id}
                        style={[styles.avatar, styles.initialAvatar, { marginLeft: index === 0 ? 0 : -12 }]}
                      >
                        <Text style={styles.initialAvatarText}>{getInitials(participant.name)}</Text>
                      </View>
                    )
                  )}

                  {extraCount ? (
                    <View style={styles.extraAvatar}>
                      <Text style={styles.extraAvatarText}>+{extraCount}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={30} color="#1f5d86" />
            <Text style={styles.emptyTitle}>No hangout plans yet</Text>
            <Text style={styles.emptyText}>Create a plan from Suggestions to see it here.</Text>
          </View>
        )}
      </View>
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

  planList: {
    gap: 10,
  },

  emptyState: {
    minHeight: 160,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  emptyTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 10,
  },

  emptyText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },

  planCard: {
    minHeight: 75,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 14,
    paddingRight: 12,
    paddingVertical: 10,
  },

  planCopy: {
    flex: 1,
    paddingRight: 8,
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

  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 7,
  },

  detailsText: {
    color: '#5158d6',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },

  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#ffffff',
    backgroundColor: '#d8dee7',
  },

  initialAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f5d86',
  },

  initialAvatarText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },

  extraAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginLeft: -12,
    borderWidth: 1,
    borderColor: '#ffffff',
    backgroundColor: '#1f5d86',
    alignItems: 'center',
    justifyContent: 'center',
  },

  extraAvatarText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
});
