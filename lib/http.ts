import * as SecureStore from 'expo-secure-store';

const API_BASE = 'https://funnelswift.net/api/v1';
const TOKEN_KEY = 'funnelswift_auth_token';

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // ignore
  }
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    await removeToken();
    // Auth error — caller should redirect to login
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.error || body.message || message;
    } catch {}
    throw new ApiError(message, response.status);
  }

  // 204 No Content
  if (response.status === 204) return {} as T;

  return response.json();
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Auth
export function login(email: string, password: string) {
  return request<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string, name: string, tenantName: string) {
  return request<{ token: string; user: any }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, tenant_name: tenantName }),
  });
}

export function getMe() {
  return request<any>('/auth/me');
}

// Forgot / Reset Password
export function forgotPassword(email: string) {
  return request<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string) {
  return request<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

// Tags
export function getTags() {
  return request<any[]>('/tags');
}

export function getTagGroups() {
  return request<any[]>('/tag-groups');
}

// Leads
export function getLeads(params?: {
  page?: number;
  per_page?: number;
  search?: string;
  stage?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.per_page) query.set('per_page', String(params.per_page));
  if (params?.search) query.set('search', params.search);
  if (params?.stage) query.set('stage', params.stage);
  const qs = query.toString();
  return request<any>(`/leads${qs ? '?' + qs : ''}`);
}

export function getLead(id: string) {
  return request<any>(`/leads/${id}`);
}

export function createLead(data: Record<string, any>) {
  return request<{ id: string; message: string }>('/leads', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateLead(id: string, data: Record<string, any>) {
  return request<{ message: string }>(`/leads/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteLead(id: string) {
  return request<{ message: string }>(`/leads/${id}`, {
    method: 'DELETE',
  });
}

// OCR — parse business card image (base64)
export function ocrParseCard(imageBase64: string) {
  return request<any>('/ocr/parse-card', {
    method: 'POST',
    body: JSON.stringify({ image: imageBase64 }),
  });
}

// LinkedIn profile lookup
export function linkedinLookup(url: string) {
  return request<any>('/leads/linkedin-lookup', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

// Dashboard
export function getDashboardStats() {
  return request<any>('/dashboard/stats');
}
