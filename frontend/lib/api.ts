const API_URL = resolveApiUrl();

function resolveApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  if (raw.endsWith('/api')) return raw;
  return `${raw.replace(/\/$/, '')}/api`;
}
export const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG || 'studio-regina';

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
    request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<any>('/auth/me'),

  dashboard: {
    overview: () => request<any>('/dashboard/overview'),
    revenueChart: (days = 30) => request<any>(`/dashboard/revenue-chart?days=${days}`),
    cashFlow: (m: number, y: number) => request<any>(`/dashboard/cash-flow?month=${m}&year=${y}`),
  },
  professionals: {
    list: () => request<any[]>('/professionals'),
    ranking: () => request<any[]>('/professionals/ranking'),
    create: (d: object) => request<any>('/professionals', { method: 'POST', body: JSON.stringify(d) }),
    remove: (id: string) => request<any>(`/professionals/${id}`, { method: 'DELETE' }),
  },
  services: {
    list: () => request<any[]>('/services'),
    analysis: () => request<any>('/services/analysis'),
    create: (d: object) => request<any>('/services', { method: 'POST', body: JSON.stringify(d) }),
    remove: (id: string) => request<any>(`/services/${id}`, { method: 'DELETE' }),
  },
  clients: {
    list: () => request<any[]>('/clients'),
    stats: () => request<any>('/clients/stats'),
    create: (d: object) => request<any>('/clients', { method: 'POST', body: JSON.stringify(d) }),
    remove: (id: string) => request<any>(`/clients/${id}`, { method: 'DELETE' }),
  },
  appointments: {
    list: () => request<any[]>('/appointments'),
    create: (d: object) => request<any>('/appointments', { method: 'POST', body: JSON.stringify(d) }),
    complete: (id: string, d: object) =>
      request<any>(`/appointments/${id}/complete`, { method: 'PATCH', body: JSON.stringify(d) }),
    update: (id: string, d: object) =>
      request<any>(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id: string) => request<any>(`/appointments/${id}`, { method: 'DELETE' }),
  },
  expenses: {
    list: () => request<any[]>('/expenses'),
    summary: () => request<any>('/expenses/summary'),
    create: (d: object) => request<any>('/expenses', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: object) =>
      request<any>(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id: string) => request<any>(`/expenses/${id}`, { method: 'DELETE' }),
  },
  goals: {
    progress: () => request<any[]>('/goals/progress'),
    create: (d: object) => request<any>('/goals', { method: 'POST', body: JSON.stringify(d) }),
    remove: (id: string) => request<any>(`/goals/${id}`, { method: 'DELETE' }),
  },
  public: {
    info: () => request<any>(`/public/${TENANT_SLUG}/info`),
    services: () => request<any[]>(`/public/${TENANT_SLUG}/services`),
    professionals: () => request<any[]>(`/public/${TENANT_SLUG}/professionals`),
    availability: (professionalId: string, serviceIds: string[], date: string) =>
      request<string[]>(
        `/public/${TENANT_SLUG}/availability?professionalId=${professionalId}&serviceIds=${serviceIds.join(',')}&date=${date}`
      ),
    book: (d: object) =>
      request<any>(`/public/${TENANT_SLUG}/book`, { method: 'POST', body: JSON.stringify(d) }),
    myAppointments: (phone: string) =>
      request<any[]>(`/public/${TENANT_SLUG}/my-appointments`, {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),
  },
};
