import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { API_URL } from '../lib/api';

export default function HomeScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('doador@mealfy.com');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const login = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/auth/login/mock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'mock' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Falha no login');
      setMessage(`Olá, ${data.user.name}`);
      router.push('/map');
    } catch (e) {
      setMessage(
        e instanceof Error
          ? `${e.message}\n\nConfira EXPO_PUBLIC_API_URL (IP do PC na rede Wi‑Fi).`
          : 'Erro de conexão',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.subtitle}>Inteligência · Conexão · Impacto</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="E-mail"
        placeholderTextColor="#94a3b8"
      />
      <Pressable style={styles.button} onPress={login} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Entrar e abrir mapa</Text>
        )}
      </Pressable>
      <Pressable style={styles.link} onPress={() => router.push('/map')}>
        <Text style={styles.linkText}>Ir direto ao mapa</Text>
      </Pressable>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Text style={styles.hint}>API: {API_URL}</Text>
      <Text style={styles.hintSmall}>
        Expo Go: use o IP do seu PC (ex: http://192.168.0.10:3000) em mobile/.env
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f1eb', padding: 24, justifyContent: 'center' },
  logo: { width: 160, height: 160, alignSelf: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#3d4a63', marginBottom: 24, textAlign: 'center' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(12,18,34,0.12)',
  },
  button: {
    backgroundColor: '#0d6e6e',
    borderRadius: 999,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#0b5a78', fontWeight: '600' },
  message: { marginTop: 16, color: '#0c1222' },
  hint: { marginTop: 24, fontSize: 11, color: '#94a3b8' },
  hintSmall: { marginTop: 8, fontSize: 10, color: '#94a3b8', lineHeight: 14 },
});
