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

async function reloadCats() {
  categories = await apiGet('/categories');
}

async function reloadSubs() {
  subcategories = await apiGet('/categories/subcategories');
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
  await reloadCats();
  return categories.find(c => c.id === result.id);
}

export async function updateCategory(id, data) {
  await apiPut(`/categories/${id}`, data);
  await reloadCats();
}

export async function deleteCategory(id) {
  await apiDelete(`/categories/${id}`);
  categories = categories.filter(c => c.id !== id);
  subcategories = subcategories.filter(s => s.categoryId !== id);
}

export async function addSubcategory(categoryId, name) {
  const result = await apiPost('/categories/subcategories', { categoryId, name });
  await reloadSubs();
  return subcategories.find(s => s.id === result.id);
}

export async function updateSubcategory(id, data) {
  await apiPut(`/categories/subcategories/${id}`, data);
  await reloadSubs();
}

export async function deleteSubcategory(id) {
  await apiDelete(`/categories/subcategories/${id}`);
  subcategories = subcategories.filter(s => s.id !== id);
}
