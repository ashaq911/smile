import { apiGet, apiPost, apiPut, apiDelete } from './api.js';

let stores = [];

function dataChanged() { window.dispatchEvent(new CustomEvent('dataUpdated')); }

export async function initStores() {
  const cached = localStorage.getItem('cache_stores');
  if (cached) try { stores = JSON.parse(cached); } catch {}
  if (stores.length === 0) {
    stores = await apiGet('/stores').catch(() => []);
    if (stores.length) localStorage.setItem('cache_stores', JSON.stringify(stores));
  } else {
    apiGet('/stores').then(d => { if (d.length) { stores = d; localStorage.setItem('cache_stores', JSON.stringify(d)); dataChanged(); } }).catch(() => {});
  }
}

export async function reloadStores() {
  stores = await apiGet('/stores');
  localStorage.setItem('cache_stores', JSON.stringify(stores));
  dataChanged();
}

export function getStores() {
  return stores;
}

export function getStoreById(id) {
  return stores.find(s => s.id === id);
}

export async function addStore(name, description, icon, owner, phone, paymentInfo) {
  const result = await apiPost('/stores', { name, description, icon, owner, phone, paymentInfo, deliveryFee: 0 });
  await reloadStores();
  return stores.find(s => s.id === result.id);
}

export async function updateStore(id, data) {
  await apiPut(`/stores/${id}`, data);
  await reloadStores();
}

export async function deleteStore(id) {
  await apiDelete(`/stores/${id}`);
  await reloadStores();
}
