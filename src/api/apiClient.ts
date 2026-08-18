import { getToken } from './tokenStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ApiResponse<T = any> {
  data: T;
  status: number;
}

/** Erro de negócio: a API respondeu, mas rejeitou a requisição (4xx/5xx). */
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** A API não respondeu (servidor fora do ar, sem rede, CORS bloqueado, etc.). */
export class ApiNetworkError extends Error {
  constructor(message = 'Não foi possível conectar ao servidor.') {
    super(message);
    this.name = 'ApiNetworkError';
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: any
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = await getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    console.warn(`[API] UNREACHABLE: ${method} ${endpoint}`, error);
    throw new ApiNetworkError();
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.warn(`[API] ERROR ${response.status}: ${method} ${endpoint}`, errorData);
    throw new ApiError(errorData.message || `Erro ${response.status}`, response.status, errorData.code);
  }

  // Handle 204 No Content or empty bodies
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  console.debug(`[API] SUCCESS: ${method} ${endpoint}`, { dataSource: 'api' });
  return data;
}
