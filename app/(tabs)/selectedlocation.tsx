import { Ionicons } from '@expo/vector-icons';
import { useHangoutPlans } from '@/contexts/hangout-plans-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function getLocationName(param: string | string[] | undefined) {
  if (Array.isArray(param)) {
    return param[0] ?? 'Selected Location';
  }

  return param ?? 'Selected Location';
}

// Shows the place the user picked before they confirm a plan.
export default function SelectedLocationScreen() {
  const router = useRouter();
  const { locationName } = useLocalSearchParams<{ locationName?: string | string[] }>();
  const selectedLocationName = getLocationName(locationName);
  const { addPlan } = useHangoutPlans();

  const goToSuggestions = () => {
    router.replace('/(tabs)/plans');
  };

  const confirmLocation = () => {
    const createdPlan = addPlan({
      title: `Hangout at ${selectedLocationName}`,
      location: selectedLocationName,
      scheduledAt: '2026-06-12T09:00:00',
      dateTimeLabel: '12 June 2026',
      participants: ['Karam', 'Harsh', 'Kunal'],
    });

    router.push({
      pathname: '/(tabs)/hangoutplancreated',
      params: {
        planId: createdPlan.id,
        locationName: selectedLocationName,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backIcon} onPress={goToSuggestions} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.heading}>Selected Location Name:</Text>
        <Text style={styles.locationLabel}>Location</Text>
        <Text style={styles.locationName}>{selectedLocationName}</Text>

        <View style={styles.mapPreview}>
          <View style={styles.pinCircle}>
            <Ionicons name="location-outline" size={28} color="#111827" />
          </View>
          <Text style={styles.mapLabel}>MAP Preview</Text>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Timing/Opening</Text>
            <Text style={styles.infoValue}>09:00 AM -10:00 PM</Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contact No.</Text>
            <Text style={styles.infoValue}>00000000</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.confirmButton} onPress={confirmLocation} activeOpacity={0.85}>
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={goToSuggestions} activeOpacity={0.85}>
          <Text style={styles.backButtonText}>BACK</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#a9b2bd',
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
  },

  backIcon: {
    width: 32,
    height: 30,
    justifyContent: 'center',
    marginLeft: -18,
    marginBottom: 12,
  },

  heading: {
    color: '#0f172a',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
  },

  locationLabel: {
    color: '#8b98a8',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    marginTop: 4,
  },

  locationName: {
    color: '#0f172a',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 14,
  },

  mapPreview: {
    height: 84,
    borderRadius: 7,
    backgroundColor: '#d4e5f3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  pinCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#a9cadc',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mapLabel: {
    position: 'absolute',
    left: 10,
    bottom: 8,
    color: '#8b98a8',
    fontSize: 9,
    fontWeight: '700',
  },

  infoBox: {
    borderRadius: 7,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    marginBottom: 24,
  },

  infoRow: {
    minHeight: 39,
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
  },

  infoDivider: {
    height: 1,
    backgroundColor: '#edf1f7',
  },

  confirmButton: {
    height: 42,
    borderRadius: 6,
    backgroundColor: '#1f5d86',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  confirmButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },

  backButton: {
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
