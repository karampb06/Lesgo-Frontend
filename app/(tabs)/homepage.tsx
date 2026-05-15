import { Ionicons } from '@expo/vector-icons';
import { useHangoutPlans } from '@/contexts/hangout-plans-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

export default function HomePage() {
  const router = useRouter();
  const { plans } = useHangoutPlans();
  const upcomingPlans = plans.slice(0, 2);

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

          <TouchableOpacity style={styles.notificationButton} activeOpacity={0.8}>
            <Ionicons name="notifications-outline" size={26} color="#ffffff" />
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
          {upcomingPlans.map((plan) => (
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
          ))}
        </View>
      </ScrollView>
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
});
