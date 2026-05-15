import { Ionicons } from '@expo/vector-icons';
import { useHangoutPlans } from '@/contexts/hangout-plans-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ViewHangoutPlanScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const { plans, getPlanById } = useHangoutPlans();
  const plan = getPlanById(planId) ?? plans[0];

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

            <Image source={{ uri: plan.avatarUrls[0] }} style={styles.avatar} contentFit="cover" />
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

          <TouchableOpacity style={styles.cancelButton} activeOpacity={0.8}>
            <Text style={styles.cancelButtonText}>Cancel plan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function formatPlanDate(scheduledAt: string) {
  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(scheduledAt));
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

  cancelButtonText: {
    color: '#ff1f1f',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
});
