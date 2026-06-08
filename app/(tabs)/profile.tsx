import { useAuth } from '@/contexts/auth-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { AppTheme, ThemeMode, useAppTheme } from '@/contexts/theme-context';

function getInitial(name?: string, email?: string) {
  const source = name?.trim() || email?.trim() || 'U';
  return source.charAt(0).toUpperCase();
}

// Profile lets the user update basic details and sign out.
export default function ProfileScreen() {
  const router = useRouter();
  const { user, token, updateUser, logout } = useAuth();
  const { theme, themeMode, setThemeMode } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
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
        homeArea: savedUser.homeArea ?? user.homeArea,
        homeLat: savedUser.homeLat ?? user.homeLat,
        homeLng: savedUser.homeLng ?? user.homeLng,
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

          <View style={styles.settingsCard}>
            <View style={styles.settingsHeader}>
              <View style={styles.settingsIcon}>
                <Ionicons name="contrast-outline" size={18} color="#ffffff" />
              </View>
              <View style={styles.settingsCopy}>
                <Text style={styles.settingsTitle}>Appearance</Text>
                <Text style={styles.settingsSubtitle}>Choose how LesGo looks on this device.</Text>
              </View>
            </View>
            <View style={styles.themeOptions}>
              {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => {
                const isActive = themeMode === mode;

                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.themeOption, isActive && styles.activeThemeOption]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setThemeMode(mode);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={mode === 'system' ? 'phone-portrait-outline' : mode === 'light' ? 'sunny-outline' : 'moon-outline'}
                      size={15}
                      color={isActive ? '#ffffff' : theme.colors.primary}
                    />
                    <Text style={[styles.themeOptionText, isActive && styles.activeThemeOptionText]}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.form}>
            <TextInput
              placeholder="Name"
              placeholderTextColor={theme.colors.textMuted}
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <TextInput
              placeholder="Email"
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Contact Number"
              placeholderTextColor={theme.colors.textMuted}
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  keyboardView: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 34,
    paddingBottom: 28,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
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
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  friendCodeLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  friendCodeValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },

  settingsCard: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 14,
  },

  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },

  settingsIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingsCopy: {
    flex: 1,
  },

  settingsTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },

  settingsSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    marginTop: 2,
  },

  themeOptions: {
    flexDirection: 'row',
    gap: 8,
  },

  themeOption: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  activeThemeOption: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },

  themeOptionText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '900',
  },

  activeThemeOptionText: {
    color: '#ffffff',
  },

  input: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: 14,
    fontWeight: '700',
  },

  statusText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 9,
    textAlign: 'center',
  },

  saveButton: {
    width: '100%',
    height: 46,
    borderRadius: 13,
    backgroundColor: theme.colors.primary,
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
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },

  logoutButtonText: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
});
