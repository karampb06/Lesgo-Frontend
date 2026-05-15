import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const previousLocations = ['Cafe Nero', 'Onslow', 'Depot'];

const suggestions = [
  {
    name: 'Starbucks Reserve',
    reason: 'Cafe - 0.4 km away',
    distance: '0.4 KM',
    matchedFrom: 'Cafe Nero',
  },
  {
    name: 'The Rooftop Bar',
    reason: 'Bar 2.5 km away',
    distance: '2.5 KM',
    matchedFrom: 'Onslow',
  },
  {
    name: 'Zen Garden',
    reason: 'Restaurant 2.5 km away',
    distance: '2.5 KM',
    matchedFrom: 'Depot',
  },
];

export default function SuggestionsScreen() {
  const router = useRouter();

  const openSelectedLocation = (locationName: string) => {
    router.push({
      pathname: '/(tabs)/selectedlocation',
      params: { locationName },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.heading}>Suggestions:</Text>
        <Text style={styles.locationLabel}>Locations:</Text>

        <View style={styles.suggestionList}>
          {suggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.name}
              style={styles.suggestionCard}
              onPress={() => openSelectedLocation(suggestion.name)}
              activeOpacity={0.85}
            >
              <View style={styles.pinCircle}>
                <Ionicons name="location-outline" size={26} color="#111827" />
              </View>

              <View style={styles.suggestionCopy}>
                <View style={styles.titleRow}>
                  <Text style={styles.suggestionTitle}>{suggestion.name}</Text>
                  <View style={styles.distancePill}>
                    <Text style={styles.distanceText}>{suggestion.distance}</Text>
                  </View>
                </View>

                <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
                <Text style={styles.basedOnText}>
                  Suggested from: {suggestion.matchedFrom}
                </Text>

                <TouchableOpacity
                  style={styles.detailsRow}
                  onPress={() => openSelectedLocation(suggestion.name)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.detailsText}>View Details</Text>
                  <Ionicons name="arrow-forward" size={16} color="#5158d6" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.previousText}>
          Based on previous visits: {previousLocations.join(', ')}
        </Text>
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
    paddingTop: 24,
  },

  heading: {
    color: '#111827',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },

  locationLabel: {
    color: '#7b8794',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 8,
  },

  suggestionList: {
    gap: 18,
  },

  suggestionCard: {
    minHeight: 86,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 10,
  },

  pinCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e4ddff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  suggestionCopy: {
    flex: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  suggestionTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
  },

  distancePill: {
    minWidth: 58,
    height: 25,
    borderRadius: 8,
    backgroundColor: '#1f5d86',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },

  distanceText: {
    color: '#ffffff',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
  },

  suggestionReason: {
    color: '#111827',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
    marginTop: 1,
  },

  basedOnText: {
    color: '#64748b',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '600',
    marginTop: 1,
  },

  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },

  detailsText: {
    color: '#5158d6',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },

  previousText: {
    color: '#64748b',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    marginTop: 14,
  },
});
