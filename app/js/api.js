const API_BASE = 'http://192.168.15.5:3001/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function getToken() {
  return localStorage.getItem('salonhub_token');
}

function setToken(token) {
  localStorage.setItem('salonhub_token', token);
}

function clearToken() {
  localStorage.removeItem('salonhub_token');
  localStorage.removeItem('salonhub_user');
  localStorage.removeItem('salonhub_tenant');
}

function getStoredUser() {
  const raw = localStorage.getItem('salonhub_user');
  return raw ? JSON.parse(raw) : null;
}

function getStoredTenant() {
  const raw = localStorage.getItem('salonhub_tenant');
  return raw ? JSON.parse(raw) : null;
}

function storeSession(token, user, tenant) {
  setToken(token);
  localStorage.setItem('salonhub_user', JSON.stringify(user));
  localStorage.setItem('salonhub_tenant', JSON.stringify(tenant));
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  let data;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }

  if (!res.ok) {
    throw new ApiError(data.error || data.message || 'Erro na requisição', res.status);
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  me: () => request('/auth/me'),

  dashboard: {
    overview: () => request('/dashboard/overview'),
    revenueChart: (days = 30) => request(`/dashboard/revenue-chart?days=${days}`),
    cashFlow: (month, year) => request(`/dashboard/cash-flow?month=${month}&year=${year}`),
  },

  professionals: {
    list: () => request('/professionals'),
    ranking: () => request('/professionals/ranking'),
    create: (data) => request('/professionals', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id) => request(`/professionals/${id}`, { method: 'DELETE' }),
  },

  services: {
    list: () => request('/services'),
    analysis: () => request('/services/analysis'),
    create: (data) => request('/services', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id) => request(`/services/${id}`, { method: 'DELETE' }),
  },

  clients: {
    list: (search) => request(`/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    stats: () => request('/clients/stats'),
    create: (data) => request('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/clients/${id}`, { method: 'DELETE' }),
  },

  appointments: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/appointments${q ? `?${q}` : ''}`);
    },
    create: (data) => request('/appointments', { method: 'POST', body: JSON.stringify(data) }),
    complete: (id, data) =>
      request(`/appointments/${id}/complete`, { method: 'PATCH', body: JSON.stringify(data) }),
    update: (id, data) => request(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/appointments/${id}`, { method: 'DELETE' }),
  },

  expenses: {
    list: () => request('/expenses'),
    summary: () => request('/expenses/summary'),
    create: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  },

  goals: {
    list: () => request('/goals'),
    progress: () => request('/goals/progress'),
    create: (data) => request('/goals', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id) => request(`/goals/${id}`, { method: 'DELETE' }),
  },
};

export { getToken, setToken, clearToken, getStoredUser, getStoredTenant, storeSession, ApiError };
