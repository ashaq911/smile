const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('auth_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('auth_token', token);
  else localStorage.removeItem('auth_token');
}

export function getStoredUser() {
  const raw = localStorage.getItem('auth_user');
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('auth_user', JSON.stringify(user));
  else localStorage.removeItem('auth_user');
}

async function request(method, path, body, timeout) {
  const options = { method, headers: { 'Content-Type': 'application/json' } };
  const token = getToken();
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) options.body = JSON.stringify(body);
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), timeout || 8000);
  options.signal = ac.signal;
  const res = await fetch(`${API_BASE}${path}`, options);
  clearTimeout(to);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'خطأ في الاتصال' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function apiGet(path) { return request('GET', path, undefined, 6000); }
export function apiPost(path, body) { return request('POST', path, body, 30000); }
export function apiPut(path, body) { return request('PUT', path, body, 30000); }
export function apiDelete(path) { return request('DELETE', path, undefined, 30000); }
