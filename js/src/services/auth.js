import { apiPost, apiGet, apiDelete, setToken, setStoredUser, getStoredUser } from './api.js';

let authUsers = [];

export async function initAuth() {
  const stored = getStoredUser();
  if (stored) {
    authUsers = [stored];
    apiGet('/auth/me').then(user => {
      if (user) { setStoredUser(user); authUsers = [user]; }
    }).catch(() => {});
    return stored;
  }
  return null;
}

export async function login(username, password) {
  const data = await apiPost('/auth/login', { username, password });
  setToken(data.token);
  setStoredUser(data.user);
  authUsers = [data.user];
  return data.user;
}

export function logout() {
  setToken(null);
  setStoredUser(null);
  authUsers = [];
  window.routerNavigate('');
  setTimeout(() => { document.querySelectorAll('.page-section').forEach(p => p.style.display = 'none'); document.getElementById('page-home').style.display = 'block'; }, 50);
}

export function getCurrentUser() {
  return getStoredUser();
}

export function isLoggedIn() {
  return getCurrentUser() !== null;
}

export function isAdmin() {
  const u = getCurrentUser();
  return u && u.role === 'admin';
}

export function isStoreOwner() {
  const u = getCurrentUser();
  return u && u.role === 'store_owner';
}

export function canManageStore(storeId) {
  const u = getCurrentUser();
  if (!u) return false;
  if (u.role === 'admin') return true;
  return u.role === 'store_owner' && u.storeId === storeId;
}

export async function registerCustomer(name, username, password) {
  const data = await apiPost('/auth/register', { username, password, name, role: 'customer' });
  setToken(data.token);
  setStoredUser(data.user);
  authUsers = [data.user];
  return data.user;
}

export async function getStoreOwners() {
  const owners = await apiGet('/auth/owners');
  return owners;
}

export async function addStoreOwner(username, password, name, storeId) {
  const data = await apiPost('/auth/register', { username, password, name, role: 'store_owner', storeId });
  return data.user;
}

export async function deleteAuthUser(userId) {
  await apiDelete(`/auth/owners/${userId}`);
}

export function getStoreOwnerByStoreId(storeId) {
  return null;
}

export function getAuthUserById(id) {
  return authUsers.find(u => u.id === id);
}

export async function getAllAuthUsers() {
  const users = await apiGet('/auth/owners');
  return users;
}
