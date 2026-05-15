import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_ANDROID_CLIENT_ID =
  '927905732381-1r4nlqve9e08dhmsutguospmep7p9da1.apps.googleusercontent.com';

const ANDROID_PACKAGE_NAME = 'lesgo.app';
const ANDROID_DEBUG_SHA1 = '5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IS_ANDROID = Platform.OS === 'android';

const GOOGLE_CLIENT_ID =
  Platform.OS === 'ios'
    ? GOOGLE_IOS_CLIENT_ID
    : Platform.OS === 'web'
      ? GOOGLE_WEB_CLIENT_ID
      : GOOGLE_ANDROID_CLIENT_ID;

const missingGoogleClientMessage =
  Platform.select({
    ios: 'Google login needs an iOS OAuth client ID before it can run on an iPhone.',
    web: 'Google login in the browser needs a Web OAuth client ID. Your Android client ID only works on an Android app build.',
    default: 'Google login needs an Android OAuth client ID before it can run on Android.',
  }) ?? 'Google login is not configured on this platform.';

/**
 * @param {any} props
 */
export default function GoogleLogin({
  label = 'Login with Google',
  loadingLabel = 'Opening Google...',
  style = null,
  textStyle = null,
  errorStyle = null,
  onSuccessRoute = '/(tabs)/homepage',
}) {
  const router = useRouter();
  const [googleError, setGoogleError] = React.useState(null);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  React.useEffect(() => {
    if (!IS_ANDROID) {
      return;
    }

    const nativeGoogleConfig = {
      scopes: ['profile', 'email'],
    };

    if (GOOGLE_WEB_CLIENT_ID) {
      nativeGoogleConfig.webClientId = GOOGLE_WEB_CLIENT_ID;
    }

    GoogleSignin.configure(nativeGoogleConfig);
  }, []);

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  });

  const handleGoogleLogin = async () => {
    if (Constants.appOwnership === 'expo') {
      setGoogleError(
        'Google login needs a development build on Android. Stop Expo Go and run npm.cmd run android:dev.'
      );
      return;
    }

    if (!IS_ANDROID && !GOOGLE_CLIENT_ID) {
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

        console.log('Google Login Success:', {
          googleId: result.data.user.id,
          email: result.data.user.email,
          name: result.data.user.name,
          picture: result.data.user.photo,
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

    try {
      const result = await promptGoogleAsync();

      if (result.type !== 'success') {
        setIsGoogleLoading(false);
      }
    } catch (error) {
      console.warn('Google Login Error:', error);
      setGoogleError('Google login could not start. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  React.useEffect(() => {
    let isMounted = true;

    async function completeGoogleLogin() {
      if (!googleResponse) {
        return;
      }

      if (googleResponse.type === 'success') {
        const accessToken =
          googleResponse.authentication?.accessToken ?? googleResponse.params.access_token;

        if (!accessToken) {
          setGoogleError('Google did not return an access token. Please try again.');
          setIsGoogleLoading(false);
          return;
        }

        try {
          const profile = await AuthSession.fetchUserInfoAsync(
            { accessToken },
            Google.discovery
          );

          if (!isMounted) {
            return;
          }

          console.log('Google Login Success:', {
            googleId: profile.sub ?? profile.id,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
          });

          setGoogleError(null);
          router.replace(onSuccessRoute);
        } catch (error) {
          console.warn('Google Profile Error:', error);

          if (isMounted) {
            setGoogleError('Google login worked, but the profile could not be loaded.');
          }
        } finally {
          if (isMounted) {
            setIsGoogleLoading(false);
          }
        }

        return;
      }

      if (googleResponse.type === 'error') {
        setGoogleError('Google login failed. Please check your OAuth client setup.');
      }

      setIsGoogleLoading(false);
    }

    completeGoogleLogin();

    return () => {
      isMounted = false;
    };
  }, [googleResponse, onSuccessRoute, router]);

  const disabled = isGoogleLoading || (!IS_ANDROID && !googleRequest);

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
