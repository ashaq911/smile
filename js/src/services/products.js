import { apiGet, apiPost, apiPut, apiDelete } from './api.js';

let products = [];

export async function initProducts() {
  products = await apiGet('/products');
}

async function reload() {
  products = await apiGet('/products');
}

export function getProducts() {
  return products;
}

export function getProductById(id) {
  return products.find(p => p.id === id);
}

export function getProductsByStore(storeId) {
  return products.filter(p => p.storeId === storeId);
}

export function getProductsBySubcategory(subcategoryId) {
  return products.filter(p => p.subcategoryId === subcategoryId);
}

export function searchProducts(query) {
  const q = query.toLowerCase();
  return products.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q)
  );
}

export function getStoreProductCount(storeId) {
  return products.filter(p => p.storeId === storeId).length;
}

export function getSubcategoryProductCount(subcategoryId) {
  return products.filter(p => p.subcategoryId === subcategoryId).length;
}

export function getCategoryProductCount(categoryId, subcategories) {
  const subIds = subcategories.filter(s => s.categoryId === categoryId).map(s => s.id);
  return products.filter(p => subIds.includes(p.subcategoryId)).length;
}

export async function addProduct(data) {
  const result = await apiPost('/products', data);
  await reload();
  return products.find(p => p.id === result.id);
}

export async function updateProduct(id, data) {
  await apiPut(`/products/${id}`, data);
  await reload();
}

export async function deleteProduct(id) {
  await apiDelete(`/products/${id}`);
  products = products.filter(p => p.id !== id);
}
