import os from 'os';

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const ifaces of Object.values(nets)) {
    for (const net of ifaces ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const lanIp = getLanIp();
const webPort = process.env.EXPO_PUBLIC_WEB_PORT || '5173';
const apiPort = process.env.EXPO_PUBLIC_API_PORT || '3001';
const webAppUrl =
  process.env.EXPO_PUBLIC_WEB_APP_URL || `http://${lanIp}:${webPort}`;
const apiUrl =
  process.env.EXPO_PUBLIC_API_URL || `http://${lanIp}:${apiPort}/api`;
const usesHttps = webAppUrl.startsWith('https://');

/** @type {import('expo/config').ExpoConfig} */
export default {
  expo: {
    name: 'Mealfy',
    slug: 'mealfy',
    version: '1.1.0',
    sdkVersion: '54.0.0',
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
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsLocalNetworking: true,
        },
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#0b5a78',
      },
      package: 'com.mealfy.app',
      versionCode: 2,
      permissions: ['INTERNET', 'ACCESS_NETWORK_STATE'],
    },
    plugins: [
      'expo-router',
      'expo-asset',
      'expo-font',
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: !usesHttps,
          },
          ios: {
            flipper: false,
          },
        },
      ],
    ],
    extra: {
      webAppUrl,
      apiUrl,
      lanIp,
      router: {
        origin: false,
      },
    },
  },
};
