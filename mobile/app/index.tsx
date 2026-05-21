import { useCallback, useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';

const WEB_URL =
  Constants.expoConfig?.extra?.webAppUrl ??
  process.env.EXPO_PUBLIC_WEB_APP_URL ??
  'http://192.168.0.101:5173';

const TIMEOUT_MS = 30000;

export default function MealfyScreen() {
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState('Conectando…');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const armTimeout = useCallback(() => {
    clearTimer();
    loadedRef.current = false;
    timerRef.current = setTimeout(() => {
      if (!loadedRef.current) {
        setLoading(false);
        setFailed(true);
        setStatus('Timeout — site não respondeu');
      }
    }, TIMEOUT_MS);
  }, []);

  useEffect(() => {
    armTimeout();
    return () => clearTimer();
  }, [armTimeout]);

  const onSuccess = () => {
    loadedRef.current = true;
    clearTimer();
    setLoading(false);
    setFailed(false);
    setStatus('Site carregado');
  };

  const reload = () => {
    setFailed(false);
    setLoading(true);
    setStatus('Recarregando…');
    armTimeout();
    webRef.current?.reload();
  };

  if (failed) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.fail}>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.failTitle}>Site não alcançou o celular</Text>
          <Text style={styles.failBody}>
            Checklist:{'\n\n'}
            1. No PC: <Text style={styles.bold}>npm run dev</Text> (deixe aberto){'\n'}
            2. No PC: <Text style={styles.bold}>npm run dev:api</Text>{'\n'}
            3. Celular e PC na mesma Wi‑Fi{'\n'}
            4. Firewall: rode{'\n'}
            <Text style={styles.bold}>npm run firewall</Text> como Admin{'\n\n'}
            URL: {WEB_URL}
          </Text>
          <Pressable style={styles.btn} onPress={reload}>
            <Text style={styles.btnText}>Tentar de novo</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Text style={styles.topUrl} numberOfLines={1}>{WEB_URL}</Text>
        <Pressable onPress={reload} hitSlop={8}>
          <Text style={styles.reload}>↻</Text>
        </Pressable>
      </View>

      {loading && (
        <View style={styles.overlay}>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <ActivityIndicator size="large" color="#0d6e6e" style={{ marginTop: 16 }} />
          <Text style={styles.overlayText}>{status}</Text>
        </View>
      )}

      <WebView
        ref={webRef}
        source={{ uri: WEB_URL }}
        style={styles.web}
        onLoadStart={() => {
          setLoading(true);
          setFailed(false);
          setStatus('Carregando site Mealfy…');
          armTimeout();
        }}
        onLoadProgress={({ nativeEvent }) => {
          if (nativeEvent.progress > 0.35) {
            onSuccess();
          }
        }}
        onLoadEnd={onSuccess}
        onError={() => {
          clearTimer();
          setLoading(false);
          setFailed(true);
          setStatus('Erro de rede no WebView');
        }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures
        originWhitelist={['*']}
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        cacheEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f1eb' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b5a78',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  topUrl: { flex: 1, color: '#c5e8e6', fontSize: 10 },
  reload: { color: '#fff', fontSize: 18, fontWeight: '700' },
  web: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    top: 32,
    backgroundColor: '#f4f1eb',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logo: { width: 100, height: 100 },
  overlayText: { marginTop: 12, color: '#3d4a63', fontWeight: '600', fontSize: 13 },
  fail: { flex: 1, padding: 24, justifyContent: 'center' },
  failTitle: { fontSize: 20, fontWeight: '800', color: '#0b5a78', marginBottom: 12, textAlign: 'center' },
  failBody: { fontSize: 14, color: '#3d4a63', lineHeight: 22, textAlign: 'center' },
  bold: { fontWeight: '800', color: '#0d6e6e' },
  btn: {
    marginTop: 20,
    alignSelf: 'center',
    backgroundColor: '#0d6e6e',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
