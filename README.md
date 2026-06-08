# LESGO Frontend

This is the mobile frontend for **LESGO**, an Expo React Native app for planning hangouts with friends. Users can sign in with Google, pick friends, browse nearby places, choose a day and time, and send hangout invites.

This repo is only the frontend. The backend API needs to run separately, either on your local machine during development or on a live server such as AWS EC2 for production.

Backend repo:

https://github.com/1322harshd/Lesgo-Backend.git

## What This App Uses

- Expo SDK 54
- React 19
- React Native 0.81
- Expo Router
- TypeScript
- Google Sign-In for Android
- EAS Build for Play Store builds

The main dependency list is in `package.json`. Run `npm install` after cloning the project.

## Before You Start

You need these installed:

- Node.js LTS
- npm
- Android Studio
- Android SDK
- Android emulator or a real Android phone
- A running LESGO backend API
- Google Cloud OAuth clients for Google login
- EAS CLI if you want to build for the Play Store

On this Windows setup, the Android script expects Android Studio in the normal location:

C:\Program Files\Android\Android Studio\jbr

It also uses the Android SDK from:

%LOCALAPPDATA%\Android\Sdk

## Install

````powershell
npm install


## Environment File

Create a `.env` file in the project root.

Use this shape:


EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
EXPO_PUBLIC_ANDROID_PACKAGE_NAME=lesgo.app
EXPO_PUBLIC_ANDROID_DEBUG_SHA1=your-sha1-fingerprint


For local development, `http://localhost:3001` is fine if the backend is running on your computer.

For a Play Store build, do **not** use localhost. Use your real backend URL:


EXPO_PUBLIC_API_BASE_URL=https://your-api-domain.com


After changing `.env`, rebuild the Android app. Expo public env values are baked into the app when it builds.

## Run The App

Start Expo:

```powershell
npm start
````

Run the Android development build:

```powershell
npm.cmd run android:dev
```

Google login will not work in Expo Go because this project uses the native Google Sign-In package. Use the Android development build.

Run lint:

```powershell
npm.cmd run lint
```

## Local Backend Notes

The app calls backend routes like:

```
/auth/google
/location/geocode
/places/trending
/places/:id
/suggestions/friends
/suggestions/hangout
/suggestions/plans
/suggestions/plan-invites
/users/:id
```

The Android run script also does this for connected devices:

```
adb reverse tcp:3001 tcp:3001
```

That lets your phone reach the backend running on your computer at port `3001`.

## Google Login Setup

The Android package name is:

```
lesgo.app
```

In Google Cloud, create both of these in the same project:

1. Android OAuth client
2. Web OAuth client

The Android OAuth client must use:

```
Package name: lesgo.app
SHA-1: your debug, release, or Play signing SHA-1
```

Put the client IDs in `.env`:

```
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
```

If the Google app is still in Testing mode, add your Gmail under:

```
Google Auth Platform -> Audience -> Test users
```

If you see `Error 403: access_denied`, check these first:

- The Gmail is added as a test user.
- The Android and Web client IDs are from the same Google Cloud project.
- The app was rebuilt after changing `.env`.
- The Android OAuth client has the right package name and SHA-1.

## Get The Android SHA-1

From the project root:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
cd android
.\gradlew.bat signingReport
```

Look for the `SHA1:` line under the app debug variant.

For a Play Store release, also add the SHA-1 from:

```
Play Console -> App signing
```

## Build For Play Store

Install EAS CLI:

```powershell
npm install -g eas-cli
```

Login:

```powershell
eas login
```

Build Android:

```powershell
eas build --platform android
```

For Google Play, upload the `.aab` file from the EAS build.

Before you build for production, check:

- `.env` uses the live HTTPS backend URL.
- Google Android client ID is correct.
- Google Web client ID is correct.
- Play Console signing SHA-1 is added in Google Cloud.
- `npm.cmd run lint` passes.

## Backend Deployment On AWS

Deploy the backend separately. A normal EC2 setup looks like this:

1. Create an Ubuntu EC2 instance.
2. Open ports `22`, `80`, and `443`.
3. Install Node.js, npm, Git, PM2, and Nginx.
4. Clone the backend repo:

```bash
git clone https://github.com/1322harshd/Lesgo-Backend.git
```

5. Add the backend `.env`.
6. Start the backend with PM2.
7. Use Nginx as a reverse proxy.
8. Add HTTPS with Certbot.
9. Update this frontend:

```
EXPO_PUBLIC_API_BASE_URL=https://your-api-domain.com
```

Then rebuild the app.

## Important Files

```
app/GoogleLogin.js                  Google login and backend auth
app/(tabs)/homepage.tsx             Home screen, places, invites, notifications
app/(tabs)/plans.tsx                Create Hangout screen
components/time-clock-picker.tsx    Shared start/finish time picker
contexts/auth-context.tsx           User session and token
contexts/hangout-plans-context.tsx  Plan list and backend sync
constants/env.ts                    Public app config
services/places-service.ts          Trending places API helper
scripts/run-android.cmd             Windows Android run helper
```

## Common Problems

**Google login does not open**

Use `npm.cmd run android:dev`. Expo Go does not include the native Google Sign-In module.

**Google says access blocked**

Add the Gmail as a test user in the same Google Cloud project used by the OAuth client IDs.

**Google says developer error**

The SHA-1 or package name is wrong in the Android OAuth client.

**App works locally but fails after Play Store install**

The app is probably still using `localhost` or the wrong backend URL. Update `.env`, rebuild, and upload a new `.aab`.

## Notes For Future Work

These would be useful to add later:

- Production API domain
- Screenshots for Play Store listing
- Privacy policy URL
- Exact AWS server setup once the backend is deployed

## Safety Notes

- Do not commit real secrets.
- `EXPO_PUBLIC_*` values are visible inside the app, so only put public client-side values there.
- Restrict Google Maps API keys in Google Cloud.
- Rebuild the app after every `.env` change.
