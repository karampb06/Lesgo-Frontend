import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as React from "react";
import {
  NativeModules,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

import { ENV } from "@/constants/env";
import { useAuth } from "@/contexts/auth-context";

export const GOOGLE_ANDROID_CLIENT_ID = ENV.GOOGLE_ANDROID_CLIENT_ID;

const IS_ANDROID = Platform.OS === "android";
const missingNativeModuleMessage =
  "Google login native module is missing. Rebuild the Android app with npx expo run:android after updating app.json.";

function getGoogleSigninModule() {
  if (!NativeModules.RNGoogleSignin) {
    return null;
  }

  // Use require only after confirming the native module exists. Importing this
  // package without the native binary crashes during Expo Router route loading.
  return require("@react-native-google-signin/google-signin").GoogleSignin;
}

const missingGoogleClientMessage =
  Platform.select({
    ios: "Google login is currently configured for Android only.",
    web: "Google login is currently configured for Android only.",
    default:
      "Google login needs an Android OAuth client ID before it can run on Android.",
  }) ?? "Google login is not configured on this platform.";

/**
 * @param {any} props
 */
export default function GoogleLogin({
  authMode = "login",
  label = "Login with Google",
  loadingLabel = "Opening Google...",
  style = null,
  textStyle = null,
  errorStyle = null,
  onSuccessRoute = "/(tabs)/homepage",
  profile = {},
  beforeLogin = null,
}) {
  const router = useRouter();
  const { setSession } = useAuth();
  const [googleError, setGoogleError] = React.useState(null);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const googleScopes = React.useMemo(
    () =>
      authMode === "signup"
        ? [...ENV.GOOGLE_BASE_SCOPES, ENV.GOOGLE_FREEBUSY_SCOPE]
        : ENV.GOOGLE_BASE_SCOPES,
    [authMode],
  );

  React.useEffect(() => {
    if (!IS_ANDROID) {
      return;
    }

    let isMounted = true;

    async function configureGoogleSignin() {
      try {
        const GoogleSignin = getGoogleSigninModule();

        if (!GoogleSignin) {
          setGoogleError(missingNativeModuleMessage);
          return;
        }

        const nativeGoogleConfig = {
          scopes: googleScopes,
        };

        if (authMode === "signup") {
          nativeGoogleConfig.webClientId = ENV.GOOGLE_WEB_CLIENT_ID;
          nativeGoogleConfig.offlineAccess = true;
          nativeGoogleConfig.forceCodeForRefreshToken = true;
        }

        GoogleSignin.configure(nativeGoogleConfig);
      } catch (error) {
        console.warn("Google Sign-In module is unavailable:", error);

        if (isMounted) {
          setGoogleError(missingNativeModuleMessage);
        }
      }
    }

    configureGoogleSignin();

    return () => {
      isMounted = false;
    };
  }, [authMode, googleScopes]);

  const handleGoogleLogin = async () => {
    if (Constants.appOwnership === "expo") {
      setGoogleError(
        "Google login needs a development build on Android. Stop Expo Go and run npm.cmd run android:dev.",
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
        const GoogleSignin = getGoogleSigninModule();

        if (!GoogleSignin) {
          throw new Error(missingNativeModuleMessage);
        }

        const preparedProfile = beforeLogin ? await beforeLogin() : profile;

        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });

        const result = await GoogleSignin.signIn();

        if (result.type === "cancelled") {
          setIsGoogleLoading(false);
          return;
        }

        const permissionResult =
          authMode === "signup"
            ? await GoogleSignin.addScopes({
                scopes: [ENV.GOOGLE_FREEBUSY_SCOPE],
              })
            : null;
        const user = permissionResult?.data?.user ?? result.data.user;
        const tokens = await GoogleSignin.getTokens();
        const serverAuthCode =
          permissionResult?.data?.serverAuthCode ?? result.data.serverAuthCode;

        const response = await fetch(`${ENV.API_BASE_URL}/auth/google`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            authMode,
            idToken: tokens.idToken ?? result.data.idToken,
            accessToken: tokens.accessToken,
            serverAuthCode,
            profile: {
              googleId: user.id,
              name: user.name,
              email: user.email,
              profilePicture: user.photo,
              homeArea: preparedProfile?.homeArea ?? "",
              homeLat: preparedProfile?.homeLat ?? null,
              homeLng: preparedProfile?.homeLng ?? null,
            },
          }),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.message ??
              `Backend auth failed with status ${response.status}`,
          );
        }

        const savedUser = data?.user;
        const jwtToken = data?.token;

        if (!savedUser || !jwtToken) {
          throw new Error("Backend did not return a complete auth session.");
        }

        await setSession(
          {
            backendId: savedUser._id,
            id: savedUser?.googleId ?? user.id,
            name: savedUser?.name ?? user.name ?? user.email ?? "Google User",
            email: savedUser?.email ?? user.email ?? "",
            picture: savedUser?.profilePicture ?? user.photo,
            contactNumber: savedUser?.contactNumber ?? "",
            friendCode: savedUser?.friendCode,
            homeArea: savedUser?.homeArea ?? preparedProfile?.homeArea ?? "",
            homeLat: savedUser?.homeLat ?? preparedProfile?.homeLat ?? null,
            homeLng: savedUser?.homeLng ?? preparedProfile?.homeLng ?? null,
          },
          jwtToken,
        );

        console.log(
          authMode === "signup"
            ? "Google Signup Saved Details:"
            : "Google Login Saved Details:",
          {
            mongoId: savedUser?._id,
            googleId: savedUser?.googleId ?? user.id,
            name: savedUser?.name ?? user.name,
            email: savedUser?.email ?? user.email,
            profilePicture: savedUser?.profilePicture ?? user.photo,
            homeArea: savedUser?.homeArea ?? "",
            homeLat: savedUser?.homeLat ?? null,
            homeLng: savedUser?.homeLng ?? null,
            googleAccessToken:
              savedUser?.googleAccessToken ?? tokens.accessToken,
            googleRefreshToken: savedUser?.googleRefreshToken ?? null,
            googleTokenExpiry: savedUser?.googleTokenExpiry ?? null,
            googleIdToken: tokens.idToken,
            googleServerAuthCode: serverAuthCode,
            grantedScopes:
              permissionResult?.data?.scopes ??
              result.data.scopes ??
              googleScopes,
          },
        );

        console.log("Google Login Success:", {
          googleId: user.id,
          email: user.email,
          name: user.name,
          picture: user.photo,
        });

        setGoogleError(null);
        router.replace(onSuccessRoute);
      } catch (error) {
        console.warn("Google Native Login Error:", error);
        const isDeveloperError = error?.code === "10";

        setGoogleError(
          isDeveloperError
            ? `Google rejected this APK signing key. Add Android OAuth package ${ENV.ANDROID_PACKAGE_NAME} with SHA-1 ${ENV.ANDROID_DEBUG_SHA1} in Google Cloud.`
            : (error?.message ??
                "Google login could not start. Please try again."),
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
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8dee7",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
    textAlign: "center",
  },
});
