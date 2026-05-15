import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MessagesScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Messages</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#a9b2bd',
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '800',
  },
});
