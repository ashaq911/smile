const defaultCategories = [
  { id: 1, storeId: 1, name: 'إلكترونيات', icon: 'fa-microchip' },
  { id: 2, storeId: 1, name: 'ملابس', icon: 'fa-tshirt' },
  { id: 3, storeId: 1, name: 'أحذية', icon: 'fa-shoe-prints' },
  { id: 4, storeId: 1, name: 'إكسسوارات', icon: 'fa-headphones' },
  { id: 5, storeId: 2, name: 'هواتف', icon: 'fa-mobile-alt' },
  { id: 6, storeId: 2, name: 'لابتوب', icon: 'fa-laptop' },
  { id: 7, storeId: 2, name: 'أجهزة لوحية', icon: 'fa-tablet-alt' },
  { id: 8, storeId: 2, name: 'كاميرات', icon: 'fa-camera' },
  { id: 9, storeId: 3, name: 'سماعات', icon: 'fa-headphones' },
  { id: 10, storeId: 3, name: 'شواحن', icon: 'fa-plug' },
  { id: 11, storeId: 3, name: 'ساعات', icon: 'fa-clock' },
  { id: 12, storeId: 3, name: 'كيبلات', icon: 'fa-plug' }
];

const defaultSubcategories = [
  { id: 1, categoryId: 1, name: 'هواتف' },
  { id: 2, categoryId: 1, name: 'لابتوب' },
  { id: 3, categoryId: 1, name: 'أجهزة لوحية' },
  { id: 4, categoryId: 1, name: 'كاميرات' },
  { id: 5, categoryId: 2, name: 'ملابس رجالية' },
  { id: 6, categoryId: 2, name: 'ملابس نسائية' },
  { id: 7, categoryId: 2, name: 'بنطلونات' },
  { id: 8, categoryId: 3, name: 'أحذية رجالية' },
  { id: 9, categoryId: 3, name: 'أحذية نسائية' },
  { id: 10, categoryId: 4, name: 'سماعات' },
  { id: 11, categoryId: 4, name: 'شواحن' },
  { id: 12, categoryId: 4, name: 'ساعات' },
  { id: 13, categoryId: 4, name: 'أغطية حماية' },
  { id: 14, categoryId: 5, name: 'أندرويد' },
  { id: 15, categoryId: 5, name: 'آيفون' },
  { id: 16, categoryId: 6, name: 'ماك بوك' },
  { id: 17, categoryId: 6, name: 'ويندوز' },
  { id: 18, categoryId: 7, name: 'آيباد' },
  { id: 19, categoryId: 7, name: 'تابلت أندرويد' },
  { id: 20, categoryId: 8, name: 'كانون' },
  { id: 21, categoryId: 8, name: 'نيكون' },
  { id: 22, categoryId: 8, name: 'سوني' },
  { id: 23, categoryId: 9, name: 'لاسلكية' },
  { id: 24, categoryId: 9, name: 'سلكية' },
  { id: 25, categoryId: 10, name: 'لاسلكية' },
  { id: 26, categoryId: 10, name: 'سلكية' },
  { id: 27, categoryId: 11, name: 'ذكية' },
  { id: 28, categoryId: 11, name: 'رياضية' },
  { id: 29, categoryId: 12, name: 'USB' },
  { id: 30, categoryId: 12, name: 'Type-C' },
  { id: 31, categoryId: 12, name: 'Lightning' }
];

let categories = JSON.parse(localStorage.getItem('categories')) || [...defaultCategories];
let subcategories = JSON.parse(localStorage.getItem('subcategories')) || [...defaultSubcategories];
let catIdCounter = parseInt(localStorage.getItem('catIdCounter')) || 13;
let subIdCounter = parseInt(localStorage.getItem('subIdCounter')) || 32;

function saveCategories() {
  localStorage.setItem('categories', JSON.stringify(categories));
}

function saveSubcategories() {
  localStorage.setItem('subcategories', JSON.stringify(subcategories));
}

function getCategoriesByStore(storeId) {
  return categories.filter(c => c.storeId === storeId);
}

function getCategoryById(id) {
  return categories.find(c => c.id === id);
}

function getSubcategoriesByCategory(categoryId) {
  return subcategories.filter(s => s.categoryId === categoryId);
}

function getSubcategoryById(id) {
  return subcategories.find(s => s.id === id);
}

function addCategory(storeId, name, icon) {
  const cat = { id: catIdCounter++, storeId, name, icon: icon || 'fa-folder' };
  localStorage.setItem('catIdCounter', catIdCounter.toString());
  categories.push(cat);
  saveCategories();
  return cat;
}

function updateCategory(id, data) {
  const idx = categories.findIndex(c => c.id === id);
  if (idx === -1) return null;
  categories[idx] = { ...categories[idx], ...data };
  saveCategories();
  return categories[idx];
}

function deleteCategory(id) {
  subcategories = subcategories.filter(s => s.categoryId !== id);
  saveSubcategories();
  categories = categories.filter(c => c.id !== id);
  saveCategories();
}

function addSubcategory(categoryId, name) {
  const sub = { id: subIdCounter++, categoryId, name };
  localStorage.setItem('subIdCounter', subIdCounter.toString());
  subcategories.push(sub);
  saveSubcategories();
  return sub;
}

function updateSubcategory(id, data) {
  const idx = subcategories.findIndex(s => s.id === id);
  if (idx === -1) return null;
  subcategories[idx] = { ...subcategories[idx], ...data };
  saveSubcategories();
  return subcategories[idx];
}

function deleteSubcategory(id) {
  subcategories = subcategories.filter(s => s.id !== id);
  saveSubcategories();
}

function getProductsBySubcategory(subcategoryId) {
  return products.filter(p => p.subcategoryId === subcategoryId);
}

function getSubcategoryProductCount(subcategoryId) {
  return products.filter(p => p.subcategoryId === subcategoryId).length;
}

function getCategoryProductCount(categoryId) {
  const subIds = subcategories.filter(s => s.categoryId === categoryId).map(s => s.id);
  return products.filter(p => subIds.includes(p.subcategoryId)).length;
}
