import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useAuth } from '@/contexts/auth-context';

export const GOOGLE_ANDROID_CLIENT_ID =
  '927905732381-1r4nlqve9e08dhmsutguospmep7p9da1.apps.googleusercontent.com';

const GOOGLE_WEB_CLIENT_ID =
  '927905732381-dn4368p04d0gv3h8r5b9to1jkq8ti3r9.apps.googleusercontent.com';
const ANDROID_PACKAGE_NAME = 'lesgo.app';
const ANDROID_DEBUG_SHA1 = '5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25';
const IS_ANDROID = Platform.OS === 'android';
const BASE_GOOGLE_SCOPES = ['profile', 'email'];
const FREEBUSY_SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy';

const missingGoogleClientMessage =
  Platform.select({
    ios: 'Google login is currently configured for Android only.',
    web: 'Google login is currently configured for Android only.',
    default: 'Google login needs an Android OAuth client ID before it can run on Android.',
  }) ?? 'Google login is not configured on this platform.';

/**
 * @param {any} props
 */
export default function GoogleLogin({
  authMode = 'login',
  label = 'Login with Google',
  loadingLabel = 'Opening Google...',
  style = null,
  textStyle = null,
  errorStyle = null,
  onSuccessRoute = '/(tabs)/homepage',
}) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [googleError, setGoogleError] = React.useState(null);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const googleScopes = React.useMemo(
    () => (authMode === 'signup' ? [...BASE_GOOGLE_SCOPES, FREEBUSY_SCOPE] : BASE_GOOGLE_SCOPES),
    [authMode]
  );

  React.useEffect(() => {
    if (!IS_ANDROID) {
      return;
    }

    const nativeGoogleConfig = {
      scopes: googleScopes,
    };

    if (authMode === 'signup') {
      nativeGoogleConfig.webClientId = GOOGLE_WEB_CLIENT_ID;
      nativeGoogleConfig.offlineAccess = true;
      nativeGoogleConfig.forceCodeForRefreshToken = true;
    }

    GoogleSignin.configure(nativeGoogleConfig);
  }, [authMode, googleScopes]);

  const handleGoogleLogin = async () => {
    if (Constants.appOwnership === 'expo') {
      setGoogleError(
        'Google login needs a development build on Android. Stop Expo Go and run npm.cmd run android:dev.'
      );
      return;
    }

    if (!IS_ANDROID) {
      setGoogleError(missingGoogleClientMessage);
      return;
    }

    setGoogleError(null);
    setIsGoogleLoading(true);

    if (IS_ANDROID) {
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

        const result = await GoogleSignin.signIn();

        if (result.type === 'cancelled') {
          setIsGoogleLoading(false);
          return;
        }

        const permissionResult =
          authMode === 'signup'
            ? await GoogleSignin.addScopes({ scopes: [FREEBUSY_SCOPE] })
            : null;
        const user = permissionResult?.data?.user ?? result.data.user;
        const tokens = await GoogleSignin.getTokens();

        setUser({
          id: user.id,
          name: user.name ?? user.email ?? 'Google User',
          email: user.email ?? '',
          picture: user.photo,
        });

        console.log(
          authMode === 'signup' ? 'Google Signup Details:' : 'Google Login Success:',
          {
            googleId: user.id,
            name: user.name,
            email: user.email,
            profilePicture: user.photo,
            homeArea: '',
            homeLat: null,
            homeLng: null,
            googleAccessToken: tokens.accessToken,
            googleRefreshToken: null,
            googleTokenExpiry: null,
            googleIdToken: tokens.idToken,
            googleServerAuthCode: permissionResult?.data?.serverAuthCode ?? result.data.serverAuthCode,
            grantedScopes: permissionResult?.data?.scopes ?? result.data.scopes ?? googleScopes,
          }
        );

        console.log('Google Login Success:', {
          googleId: user.id,
          email: user.email,
          name: user.name,
          picture: user.photo,
        });

        setGoogleError(null);
        router.replace(onSuccessRoute);
      } catch (error) {
        console.warn('Google Native Login Error:', error);
        const isDeveloperError = error?.code === '10';

        setGoogleError(
          isDeveloperError
            ? `Google rejected this APK signing key. Add Android OAuth package ${ANDROID_PACKAGE_NAME} with SHA-1 ${ANDROID_DEBUG_SHA1} in Google Cloud.`
            : 'Google login could not start. Please try again.'
        );
      } finally {
        setIsGoogleLoading(false);
      }

      return;
    }
  };

  const disabled = isGoogleLoading || !IS_ANDROID;

  return (
    <>
      <TouchableOpacity
        style={[styles.button, style, disabled && styles.disabledButton]}
        onPress={handleGoogleLogin}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <Text style={[styles.buttonText, textStyle]}>
          {isGoogleLoading ? loadingLabel : label}
        </Text>
      </TouchableOpacity>

      {googleError ? (
        <Text style={[styles.errorText, errorStyle]}>{googleError}</Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d8dee7',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
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
});
