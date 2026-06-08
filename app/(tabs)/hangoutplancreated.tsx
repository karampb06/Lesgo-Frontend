import { Ionicons } from '@expo/vector-icons';
import { useHangoutPlans } from '@/contexts/hangout-plans-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function getLocationName(param: string | string[] | undefined) {
  if (Array.isArray(param)) {
    return param[0] ?? 'XYZ';
  }

  return param ?? 'XYZ';
}

// Confirmation screen after a hangout plan has been created.
export default function HangoutPlanCreatedScreen() {
  const router = useRouter();
  const { locationName, planId } = useLocalSearchParams<{
    locationName?: string | string[];
    planId?: string;
  }>();
  const { getPlanById } = useHangoutPlans();
  const createdPlan = getPlanById(planId);
  const selectedLocationName = getLocationName(locationName);

  const goToSuggestions = () => {
    router.replace('/(tabs)/plans');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={48} color="#007b48" />
        </View>

        <Text style={styles.heading}>Hangout Plan Created</Text>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={styles.infoValue}>{createdPlan?.location ?? selectedLocationName}</Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date and Time:</Text>
            <Text style={styles.infoValue}>
              {createdPlan ? formatPlanDate(createdPlan.scheduledAt) : '12 June 2026'}
            </Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Participants:</Text>
            <Text style={styles.infoValue}>
              {createdPlan?.participants.join(', ') ?? 'Karam, Harsh, Kunal'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.chatButton} activeOpacity={0.85}>
          <Text style={styles.chatButtonText}>GO TO CHAT</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={goToSuggestions} activeOpacity={0.85}>
          <Text style={styles.backButtonText}>BACK</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingTop: 64,
    alignItems: 'center',
  },

  successCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#e9fff4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  heading: {
    color: '#00864f',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    marginBottom: 20,
  },

  infoBox: {
    width: '100%',
    borderRadius: 7,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    marginBottom: 24,
  },

  infoRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },

  infoLabel: {
    color: '#8b98a8',
    fontSize: 10,
    fontWeight: '700',
  },

  infoValue: {
    color: '#111827',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'right',
  },

  infoDivider: {
    height: 1,
    backgroundColor: '#edf1f7',
  },

  chatButton: {
    width: '100%',
    height: 44,
    borderRadius: 7,
    backgroundColor: '#1f5d86',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  chatButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },

  backButton: {
    width: '100%',
    height: 42,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#1f5d86',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backButtonText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
  },
});
