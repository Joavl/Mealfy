import Constants from 'expo-constants';

export const API_URL =
  Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000';

export type FamilyPin = {
  id: string;
  representativeName: string;
  region: string;
  childrenCount: number;
  latitude: number;
  longitude: number;
  supportStatus: string;
};

export async function fetchPublicFamilies(): Promise<FamilyPin[]> {
  const res = await fetch(`${API_URL}/families/public`);
  if (!res.ok) throw new Error('Não foi possível carregar famílias');
  const data = await res.json();
  return (data as FamilyPin[]).filter(
    (f) =>
      typeof f.latitude === 'number' &&
      typeof f.longitude === 'number' &&
      !Number.isNaN(f.latitude) &&
      !Number.isNaN(f.longitude),
  );
}
