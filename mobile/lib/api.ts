import Constants from 'expo-constants';

export const API_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3000';

export type FamilyPin = {
  id: string;
  representativeName: string;
  region: string;
  childrenCount: number;
  latitude: number;
  longitude: number;
  supportStatus: string;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export async function loginMock(email: string): Promise<SessionUser> {
  const res = await fetch(`${API_URL}/auth/login/mock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'mock' }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data.message ?? data.title ?? 'Falha no login') as string);
  }
  const user = (data.user ?? data.User) as SessionUser;
  if (!user?.name) throw new Error('Resposta inválida da API');
  return user;
}

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
