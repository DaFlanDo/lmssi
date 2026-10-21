const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Token helpers ───────────────────────────────────────────────────────────
export const getToken = (): string | null => localStorage.getItem('lms_token');
export const setToken = (t: string): void => localStorage.setItem('lms_token', t);
export const removeToken = (): void => {
  localStorage.removeItem('lms_token');
  localStorage.removeItem('lms_user');
};

// ─── Base fetch ──────────────────────────────────────────────────────────────
async function request<T>(
  method: string,
  endpoint: string,
  body?: unknown,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    removeToken();
    const err = await res.json().catch(() => ({ detail: 'Unauthorized' }));
    if (!endpoint.includes('/auth/login')) {
      window.location.href = '/login';
    }
    throw new Error(err.detail || 'Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'API Error');
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const apiGet = <T>(endpoint: string): Promise<T> =>
  request<T>('GET', endpoint);

export const apiPost = <T>(endpoint: string, body: unknown): Promise<T> =>
  request<T>('POST', endpoint, body);

export const apiPut = <T>(endpoint: string, body: unknown): Promise<T> =>
  request<T>('PUT', endpoint, body);

export const apiPatch = <T>(endpoint: string, body: unknown): Promise<T> =>
  request<T>('PATCH', endpoint, body);

export const apiDelete = (endpoint: string): Promise<void> =>
  request<void>('DELETE', endpoint);

// ─── Public (no-auth) GET ────────────────────────────────────────────────────
export async function publicGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'API Error');
  }
  return res.json() as Promise<T>;
}

export const API_BASE_URL = API_BASE;

// ─── Default export ──────────────────────────────────────────────────────────
export default {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPatch,
  delete: apiDelete,
};

// ─── File upload ─────────────────────────────────────────────────────────────
export async function uploadFile(file: File): Promise<{ url: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/upload/`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (res.status === 401) {
    removeToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}
