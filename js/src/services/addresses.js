import { apiGet, apiPost, apiPut, apiDelete } from './api.js';

export async function getAddresses() {
  return apiGet('/addresses');
}

export async function addAddress(label, address, city, phone, isDefault) {
  return apiPost('/addresses', { label, address, city, phone, isDefault });
}

export async function saveAddress(data) {
  return apiPost('/addresses', data);
}

export async function updateAddress(id, data) {
  return apiPut(`/addresses/${id}`, data);
}

export async function deleteAddress(id) {
  return apiDelete(`/addresses/${id}`);
}
