import { ENV } from '@/constants/env';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import GoogleLogin from './GoogleLogin';

export const unstable_settings = {
  headerShown: false,
};

// Signup asks for the home area first, then Google finishes the account setup.
export default function SignupScreen() {
  const router = useRouter();
  const [homeArea, setHomeArea] = useState('');
  const [locationError, setLocationError] = useState('');

  const handleLogin = () => {
    router.replace('/login');
  };

  const prepareSignupProfile = async () => {
    const trimmedHomeArea = homeArea.trim();

    if (!trimmedHomeArea) {
      throw new Error('Enter your home area before signing up.');
    }

    const response = await fetch(
      `${ENV.API_BASE_URL}/location/geocode?area=${encodeURIComponent(trimmedHomeArea)}`
    );
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message ?? 'Could not find that home area.');
    }

    // Send the geocoded area into GoogleLogin so the backend can save it with the user.
    setLocationError('');

    return data;
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

              <ThemedText style={styles.title}>Sign Up</ThemedText>
              <ThemedText style={styles.subtitle}>
                Create your LesGo account
              </ThemedText>

              <View style={styles.locationSection}>
                <ThemedText style={styles.inputLabel}>Home area</ThemedText>
                <TextInput
                  value={homeArea}
                  onChangeText={(value) => {
                    setHomeArea(value);
                    setLocationError('');
                  }}
                  placeholder="e.g. Auckland CBD"
                  placeholderTextColor="#8b96a8"
                  style={styles.input}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
                <ThemedText style={styles.helpText}>
                  Use a suburb or area, not your exact address.
                </ThemedText>
                {locationError ? <ThemedText style={styles.errorText}>{locationError}</ThemedText> : null}
              </View>

              <GoogleLogin
                authMode="signup"
                label="Sign up with Google"
                style={styles.googleButton}
                textStyle={styles.googleButtonText}
                errorStyle={styles.errorText}
                beforeLogin={async () => {
                  try {
                    return await prepareSignupProfile();
                  } catch (error) {
                    const message = error instanceof Error ? error.message : 'Could not prepare signup.';
                    setLocationError(message);
                    throw error;
                  }
                }}
              />

              <TouchableOpacity
                style={styles.existingAccountButton}
                onPress={handleLogin}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.existingAccountText}>
                  Already have an account? Sign in
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
    marginBottom: 24,
    textAlign: 'center',
  },

  locationSection: {
    width: '100%',
    marginBottom: 18,
  },

  inputLabel: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },

  input: {
    width: '100%',
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d8dee7',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },

  helpText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
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

  disabledButton: {
    opacity: 0.6,
  },

  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
    textAlign: 'center',
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
