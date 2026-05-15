import { Ionicons } from '@expo/vector-icons';
import { useHangoutPlans } from '@/contexts/hangout-plans-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HangoutPlansScreen() {
  const router = useRouter();
  const { plans } = useHangoutPlans();

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

        <View style={styles.planList}>
          {plans.map((plan) => {
            const visibleAvatars = plan.avatarUrls.slice(0, 3);
            const extraCount = Math.max(0, plan.participants.length - visibleAvatars.length);

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
                  {visibleAvatars.map((avatar, index) => (
                    <Image
                      key={avatar}
                      source={{ uri: avatar }}
                      style={[styles.avatar, { marginLeft: index === 0 ? 0 : -12 }]}
                      contentFit="cover"
                    />
                  ))}

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
