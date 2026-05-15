import { useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import GoogleLogin from './GoogleLogin';

export default function LoginScreen() {
  const router = useRouter();

  const handleSignup = () => {
    router.replace('/signup');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.wrapper}>
              <View style={styles.logoSection}>
                <View style={styles.logoBg}>
                  <ThemedText style={styles.logoText}>LesGo</ThemedText>
                </View>
              </View>

              <ThemedText style={styles.title}>Sign In</ThemedText>
              <ThemedText style={styles.subtitle}>Welcome back to LesGo</ThemedText>

              <GoogleLogin
                label="Sign in with Google"
                style={styles.googleButton}
                textStyle={styles.googleButtonText}
              />

              <TouchableOpacity
                style={styles.existingAccountButton}
                onPress={handleSignup}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.existingAccountText}>
                  Don&apos;t have an account? Sign up
                </ThemedText>
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.termsText}>Terms and Conditions</ThemedText>
          </ScrollView>
        </KeyboardAvoidingView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef3fd',
  },

  container: {
    flex: 1,
    backgroundColor: '#eef3fd',
    paddingHorizontal: 20,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },

  wrapper: {
    width: '100%',
    maxWidth: 460,
    alignItems: 'center',
  },

  logoSection: {
    marginBottom: 36,
    alignItems: 'center',
  },
  logoBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1b4f7d',
  },

  logoText: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },

  title: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 32,
    textAlign: 'center',
  },

  googleButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d8dee7',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },

  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },

  existingAccountButton: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },

  existingAccountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1b4f7d',
  },

  termsText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 40,
  },
});
