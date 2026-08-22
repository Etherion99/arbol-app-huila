/**
 * Expo configuration.
 *
 * A JavaScript config rather than a static `app.json` for two reasons that both
 * need code: the splash colour and the adaptive icon background come from the
 * design tokens instead of hand copied hex, and the Google Maps setup needs two
 * API keys, which never go into a versioned file. The keys are read from the
 * environment, so a build without them still runs -- the map comes up grey on
 * Android and the failure is visible rather than silent.
 *
 * `design-tokens.json` is generated from packages/core by `pnpm tokens`.
 */

const { colors } = require('./design-tokens.json');

// The placeholder in `.env.example` is a word, not a key. Treating it as one
// would write "PENDIENTE" into the manifest, where it is indistinguishable
// from a real key that has been revoked.
const usable = (value) =>
  typeof value === 'string' && value.trim() !== '' && value.trim() !== 'PENDIENTE';

module.exports = () => {
  const androidGoogleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY;
  const iosGoogleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY;

  return {
    name: 'ÁrbolApp Huila',
    slug: 'arbolapp-huila',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'arbolapp',
    userInterfaceStyle: 'light',
    ios: {
      icon: './assets/expo.icon',
      bundleIdentifier: 'co.edu.iesansebastian.arbolapp',
      supportsTablet: true,
    },
    android: {
      package: 'co.edu.iesansebastian.arbolapp',
      adaptiveIcon: {
        backgroundColor: colors.surfacePage,
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: colors.surfacePage,
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      ],
      'expo-secure-store',
      [
        'expo-camera',
        {
          // The growth log is a photographic record, so the camera is the one
          // permission the app genuinely cannot work around. The wording says
          // what the photograph is for rather than asking for trust.
          cameraPermission: 'Usamos la cámara para las fotografías de la bitácora de tus árboles.',
          // Neither is used: the log is photographs, and nothing is ever read
          // from the library. Declared false so the config plugin leaves the
          // entries out of the manifest instead of requesting them silently.
          microphonePermission: false,
          recordAudioAndroidPermission: false,
        },
      ],
      [
        'react-native-maps',
        {
          ...(usable(androidGoogleMapsApiKey) ? { androidGoogleMapsApiKey } : {}),
          // Without this the iOS build falls back to Apple Maps, where the dark
          // style does not apply and the "points of light" motif is lost.
          ...(usable(iosGoogleMapsApiKey) ? { iosGoogleMapsApiKey } : {}),
        },
      ],
      [
        'expo-location',
        {
          // Shown in the system dialog. The map works without the permission,
          // so the wording asks rather than insists.
          locationAlwaysAndWhenInUsePermission:
            'Usamos tu ubicación solo para centrar el mapa y ubicar los árboles que siembras.',
          locationWhenInUsePermission:
            'Usamos tu ubicación solo para centrar el mapa y ubicar los árboles que siembras.',
          isAndroidBackgroundLocationEnabled: false,
          isIosBackgroundLocationEnabled: false,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      _comentario: 'Las claves reales van en .env, nunca en este archivo versionado.',
    },
  };
};
