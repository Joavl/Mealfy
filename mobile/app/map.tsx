import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { API_URL, fetchPublicFamilies, type FamilyPin } from '../lib/api';

const INITIAL_REGION = {
  latitude: -23.5505,
  longitude: -46.6333,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

export default function MapScreen() {
  const router = useRouter();
  const [families, setFamilies] = useState<FamilyPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPublicFamilies();
      setFamilies(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message}\n\nAPI: ${API_URL}\nNo celular use o IP do PC, não localhost.`,
      : 'Erro ao carregar mapa',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Voltar</Text>
        </Pressable>
        <Text style={styles.title}>Mapa de famílias</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0d6e6e" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : (
        <MapView
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={INITIAL_REGION}
          scrollEnabled
          zoomEnabled
          pitchEnabled={false}
          rotateEnabled={false}
        >
          {families.map((fam) => (
            <Marker
              key={fam.id}
              coordinate={{
                latitude: fam.latitude,
                longitude: fam.longitude,
              }}
              title={fam.representativeName}
              description={`${fam.childrenCount} crianças · ${fam.region}`}
            />
          ))}
        </MapView>
      )}

      {!loading && !error && (
        <View style={styles.legend}>
          <Text style={styles.legendText}>{families.length} famílias no mapa</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f1eb' },
  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#0b5a78',
  },
  backBtn: { marginBottom: 4 },
  backText: { color: '#c5e8e6', fontSize: 14 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  map: { flex: 1, width: '100%' },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  error: { color: '#c64b38', textAlign: 'center', lineHeight: 22 },
  retry: {
    marginTop: 16,
    alignSelf: 'center',
    backgroundColor: '#0d6e6e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  legend: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  legendText: { fontSize: 13, color: '#1f2420', fontWeight: '600' },
});
