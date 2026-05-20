/** @type {import('expo/config').ExpoConfig} */
export default {
  expo: {
    name: 'Mealfy',
    slug: 'mealfy',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'mealfy',
    userInterfaceStyle: 'light',
    icon: './assets/icon.png',
    splash: {
      image: './assets/logo.png',
      resizeMode: 'contain',
      backgroundColor: '#0b2239',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.mealfy.app',
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '',
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#0b5a78',
      },
      package: 'com.mealfy.app',
    },
    plugins: ['expo-asset', 'expo-font'],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
    },
  },
};
