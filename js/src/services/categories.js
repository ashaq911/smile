import { apiGet, apiPost, apiPut, apiDelete } from './api.js';

let categories = [];
let subcategories = [];

function dataChanged() { window.dispatchEvent(new CustomEvent('dataUpdated')); }

export async function initCategories() {
  const c = localStorage.getItem('cache_categories');
  const s = localStorage.getItem('cache_subcategories');
  if (c) try { categories = JSON.parse(c); } catch {}
  if (s) try { subcategories = JSON.parse(s); } catch {}
  if (categories.length === 0 && subcategories.length === 0) {
    const data = await Promise.all([apiGet('/categories').catch(() => []), apiGet('/categories/subcategories').catch(() => [])]);
    categories = data[0]; subcategories = data[1];
    if (categories.length) localStorage.setItem('cache_categories', JSON.stringify(categories));
    if (subcategories.length) localStorage.setItem('cache_subcategories', JSON.stringify(subcategories));
  } else {
    Promise.all([
      apiGet('/categories').then(d => { if (d.length) { categories = d; localStorage.setItem('cache_categories', JSON.stringify(d)); dataChanged(); } }).catch(() => {}),
      apiGet('/categories/subcategories').then(d => { if (d.length) { subcategories = d; localStorage.setItem('cache_subcategories', JSON.stringify(d)); dataChanged(); } }).catch(() => {})
    ]);
  }
}

export async function reloadCategories() {
  categories = await apiGet('/categories');
  localStorage.setItem('cache_categories', JSON.stringify(categories));
  dataChanged();
}

export async function reloadSubcategories() {
  subcategories = await apiGet('/categories/subcategories');
  localStorage.setItem('cache_subcategories', JSON.stringify(subcategories));
  dataChanged();
}

export function getCategories() { return categories; }
export function getSubcategories() { return subcategories; }

export function getCategoriesByStore(storeId) {
  return categories.filter(c => c.storeId === storeId);
}

export function getCategoryById(id) {
  return categories.find(c => c.id === id);
}

export function getSubcategoriesByCategory(categoryId) {
  return subcategories.filter(s => s.categoryId === categoryId);
}

export function getSubcategoryById(id) {
  return subcategories.find(s => s.id === id);
}

export async function addCategory(storeId, name, icon) {
  const result = await apiPost('/categories', { storeId, name, icon });
  await reloadCategories();
  return categories.find(c => c.id === result.id);
}

export async function updateCategory(id, data) {
  await apiPut(`/categories/${id}`, data);
  await reloadCategories();
}

export async function deleteCategory(id) {
  await apiDelete(`/categories/${id}`);
  await reloadCategories();
  await reloadSubcategories();
}

export async function addSubcategory(categoryId, name) {
  const result = await apiPost('/categories/subcategories', { categoryId, name });
  await reloadSubcategories();
  return subcategories.find(s => s.id === result.id);
}

export async function updateSubcategory(id, data) {
  await apiPut(`/categories/subcategories/${id}`, data);
  await reloadSubcategories();
}

export async function deleteSubcategory(id) {
  await apiDelete(`/categories/subcategories/${id}`);
  await reloadSubcategories();
}
