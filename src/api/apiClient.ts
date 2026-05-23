import { storage } from '../backend/utils/storage';
import { FIREBASE_ID_TOKEN_KEY } from '../lib/firebaseAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ApiResponse<T = any> {
  data: T;
  status: number;
}

export async function apiRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: any
): Promise<T> {
  const user = storage.get<{ id: string } | null>('current_user', null);
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const firebaseToken = storage.get<string | null>(FIREBASE_ID_TOKEN_KEY, null);
  if (firebaseToken) {
    headers['Authorization'] = `Bearer ${firebaseToken}`;
  }

  if (user?.id) {
    headers['x-user-id'] = user.id;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const issueMsg = Array.isArray(errorData.issues)
        ? errorData.issues.map((i: { message?: string }) => i.message).filter(Boolean).join('. ')
        : '';
      throw new Error(
        issueMsg || errorData.message || `Erro na API (${response.status})`,
      );
    }

    // Handle 204 No Content or empty bodies
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    
    console.debug(`[API] SUCCESS: ${method} ${endpoint}`, { dataSource: 'api' });
    return data;
  } catch (error) {
    console.warn(`[API] FAIL: ${method} ${endpoint}. Fallback may trigger.`, error);
    throw error;
  }
}
