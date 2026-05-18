import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000';

export default function HomeScreen() {
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
      setMessage(`Olá, ${data.user.name} (${data.user.role})`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erro de conexão. API rodando em ' + API_URL + '?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mealfy</Text>
      <Text style={styles.subtitle}>Inteligência de dados · vínculo humano</Text>
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
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
      </Pressable>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Text style={styles.hint}>API: {API_URL}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f1eb', padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '700', color: '#0c1222' },
  subtitle: { fontSize: 14, color: '#3d4a63', marginBottom: 24 },
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
  message: { marginTop: 16, color: '#0c1222' },
  hint: { marginTop: 24, fontSize: 11, color: '#94a3b8' },
});
