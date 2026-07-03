const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('salonhub_token');
}

export function storeSession(token: string, user: object, tenant: object) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('salonhub_token', token);
  localStorage.setItem('salonhub_user', JSON.stringify(user));
  localStorage.setItem('salonhub_tenant', JSON.stringify(tenant));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('salonhub_token');
  localStorage.removeItem('salonhub_user');
  localStorage.removeItem('salonhub_tenant');
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('salonhub_user');
  return raw ? JSON.parse(raw) : null;
}

export function getStoredTenant() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('salonhub_tenant');
  return raw ? JSON.parse(raw) : null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || 'Erro na requisição', res.status);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: object; tenant: object }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data: object) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),

  dashboard: {
    overview: () => request('/dashboard/overview'),
    revenueChart: (days = 30) => request(`/dashboard/revenue-chart?days=${days}`),
    cashFlow: (m: number, y: number) => request(`/dashboard/cash-flow?month=${m}&year=${y}`),
  },
  professionals: {
    list: () => request('/professionals'),
    ranking: () => request('/professionals/ranking'),
    create: (d: object) => request('/professionals', { method: 'POST', body: JSON.stringify(d) }),
    remove: (id: string) => request(`/professionals/${id}`, { method: 'DELETE' }),
  },
  services: {
    list: () => request('/services'),
    analysis: () => request('/services/analysis'),
    create: (d: object) => request('/services', { method: 'POST', body: JSON.stringify(d) }),
    remove: (id: string) => request(`/services/${id}`, { method: 'DELETE' }),
  },
  clients: {
    list: () => request('/clients'),
    stats: () => request('/clients/stats'),
    create: (d: object) => request('/clients', { method: 'POST', body: JSON.stringify(d) }),
  },
  appointments: {
    list: () => request('/appointments'),
    create: (d: object) => request('/appointments', { method: 'POST', body: JSON.stringify(d) }),
    complete: (id: string, d: object) =>
      request(`/appointments/${id}/complete`, { method: 'PATCH', body: JSON.stringify(d) }),
    update: (id: string, d: object) =>
      request(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  },
  expenses: {
    list: () => request('/expenses'),
    summary: () => request('/expenses/summary'),
    create: (d: object) => request('/expenses', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: object) =>
      request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id: string) => request(`/expenses/${id}`, { method: 'DELETE' }),
  },
  goals: {
    progress: () => request('/goals/progress'),
    create: (d: object) => request('/goals', { method: 'POST', body: JSON.stringify(d) }),
    remove: (id: string) => request(`/goals/${id}`, { method: 'DELETE' }),
  },
};
