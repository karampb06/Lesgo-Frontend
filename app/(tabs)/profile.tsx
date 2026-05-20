import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  NativeModules,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ENV } from '@/constants/env';

function getInitial(name?: string, email?: string) {
  const source = name?.trim() || email?.trim() || 'U';
  return source.charAt(0).toUpperCase();
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, token, updateUser, logout } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setContactNumber(user?.contactNumber ?? '');
  }, [user]);

  const handleSave = async () => {
    const profileUpdate = {
      name: name.trim() || user?.name || 'Google User',
      email: email.trim() || user?.email || '',
      contactNumber: contactNumber.trim(),
    };

    try {
      if (!user?.backendId || !token) {
        updateUser(profileUpdate);
        setStatusMessage('Profile updated locally');
        return;
      }

      const response = await fetch(`${ENV.API_BASE_URL}/users/${user.backendId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileUpdate),
      });
      const savedUser = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(savedUser?.error ?? 'Profile could not be saved');
      }

      updateUser({
        backendId: savedUser._id ?? user.backendId,
        id: savedUser.googleId ?? user.id,
        name: savedUser.name ?? profileUpdate.name,
        email: savedUser.email ?? profileUpdate.email,
        picture: savedUser.profilePicture ?? user.picture,
        contactNumber: savedUser.contactNumber ?? profileUpdate.contactNumber,
        friendCode: savedUser.friendCode ?? user.friendCode,
      });
      setStatusMessage('Profile updated');
    } catch (error) {
      console.warn('Profile update failed:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Profile could not be saved');
    }
  };

  const handleLogout = async () => {
    try {
      if (NativeModules.RNGoogleSignin) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        await GoogleSignin.signOut();
      }
    } catch (error) {
      console.warn('Google logout failed:', error);
    } finally {
      logout();
      router.replace('/login');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatar}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{getInitial(user?.name, user?.email)}</Text>
            )}
          </View>

          <View style={styles.friendCodeCard}>
            <Text style={styles.friendCodeLabel}>Your Friend Code</Text>
            <Text style={styles.friendCodeValue}>{user?.friendCode ?? 'Sign in again to generate'}</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              placeholder="Name"
              placeholderTextColor="#8b96a8"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <TextInput
              placeholder="Email"
              placeholderTextColor="#8b96a8"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Contact Number"
              placeholderTextColor="#8b96a8"
              value={contactNumber}
              onChangeText={setContactNumber}
              style={styles.input}
              keyboardType="phone-pad"
            />

            {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.85}
            >
              <Text style={styles.logoutButtonText}>LOGOUT</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#a9b2bd',
  },

  keyboardView: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 64,
    paddingBottom: 28,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1b5b82',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },

  form: {
    width: '100%',
  },

  friendCodeCard: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#eef2fa',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },

  friendCodeLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  friendCodeValue: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },

  input: {
    width: '100%',
    height: 34,
    borderRadius: 6,
    paddingHorizontal: 10,
    marginBottom: 9,
    backgroundColor: '#eef2fa',
    color: '#0f172a',
    fontSize: 12,
  },

  statusText: {
    color: '#1b5b82',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 9,
    textAlign: 'center',
  },

  saveButton: {
    width: '100%',
    height: 34,
    borderRadius: 7,
    backgroundColor: '#1b5b82',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  logoutButton: {
    width: '100%',
    height: 34,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },

  logoutButtonText: {
    color: '#1b5b82',
    fontSize: 14,
    fontWeight: '800',
  },
});
