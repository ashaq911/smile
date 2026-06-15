import { apiGet, apiPost, apiPut, apiDelete } from './api.js';

let products = [];

function dataChanged() { window.dispatchEvent(new CustomEvent('dataUpdated')); }

export async function initProducts() {
  const cached = localStorage.getItem('cache_products');
  if (cached) try { products = JSON.parse(cached); } catch {}
  if (products.length === 0) {
    products = await apiGet('/products').catch(() => []);
    if (products.length) localStorage.setItem('cache_products', JSON.stringify(products));
  } else {
    apiGet('/products').then(d => { if (d.length) { products = d; localStorage.setItem('cache_products', JSON.stringify(d)); dataChanged(); } }).catch(() => {});
  }
}

export async function reloadProducts() {
  products = await apiGet('/products');
  localStorage.setItem('cache_products', JSON.stringify(products));
  dataChanged();
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
  await reloadProducts();
  return products.find(p => p.id === result.id);
}

export async function updateProduct(id, data) {
  await apiPut(`/products/${id}`, data);
  await reloadProducts();
}

export async function deleteProduct(id) {
  await apiDelete(`/products/${id}`);
  await reloadProducts();
}
