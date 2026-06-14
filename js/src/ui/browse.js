import { getCurrentUser } from '../services/auth.js';
import { getStoreById, getStores } from '../services/stores.js';
import { getSubcategoryById, getSubcategoriesByCategory, getCategoryById, getCategories, getSubcategories } from '../services/categories.js';
import { getProducts, getProductById, searchProducts, getSubcategoryProductCount, initProducts } from '../services/products.js';
import { getCartCount } from '../services/cart.js';
import { showToast } from './toast.js';

const PAGE_SIZE = 12;
let browseState = { storeId: null, categoryId: null, subcategoryId: null };
let currentPage = 1;
let priceRange = { min: 0, max: Infinity };

export async function initBrowse() {
  await initProducts();
  document.getElementById('productGrid')?.classList.add('loading');
  renderBrowseStores();
  var useFiltered = browseState.storeId || browseState.categoryId || browseState.subcategoryId;
  renderBrowseProducts(useFiltered ? getFilteredProducts() : getVisibleProducts());
  renderRecentlyViewed();
  if (!useFiltered) { updateBreadcrumb(); updateBrowseVisibility(); }
}

export function applySort() {
  currentPage = 1;
  renderBrowseProducts(getFilteredProducts());
}

function getVisibleStores() {
  const user = getCurrentUser();
  const allStores = getStores();
  if (user && user.role === 'store_owner') return allStores.filter(s => s.id === user.storeId);
  return allStores;
}

function getVisibleProducts() {
  const user = getCurrentUser();
  let list = [...getProducts()];
  if (user && user.role === 'store_owner' && user.storeId) {
    list = list.filter(p => p.storeId === user.storeId);
  }
  return list;
}

function getFilteredProducts() {
  let list = getVisibleProducts();
  if (browseState.storeId) {
    list = list.filter(p => p.storeId === browseState.storeId);
  }
  if (browseState.categoryId) {
    const subs = getSubcategories().filter(s => s.categoryId === browseState.categoryId).map(s => s.id);
    list = list.filter(p => subs.includes(p.subcategoryId));
  } else if (browseState.subcategoryId) {
    list = list.filter(p => p.subcategoryId === browseState.subcategoryId);
  }
  if (priceRange.min > 0) list = list.filter(p => p.price >= priceRange.min);
  if (isFinite(priceRange.max)) list = list.filter(p => p.price <= priceRange.max);
  return list;
}

function renderBrowseStores() {
  const container = document.getElementById('browseStores');
  if (!container) return;
  const visibleStores = getVisibleStores();
  container.innerHTML = `
    <button class="browse-btn ${!browseState.storeId ? 'active' : ''}" onclick="window.resetBrowse()">
      <i class="fas fa-store-alt"></i> عرض الجميع
    </button>
    ${visibleStores.map(s => `
      <button class="browse-btn ${browseState.storeId === s.id ? 'active' : ''}" onclick="window.selectStore(${s.id}, this)">
        <i class="fas ${s.icon}"></i> ${s.name}
      </button>
    `).join('')}
  `;
  updateBrowseVisibility();
}

export function selectStore(storeId, btn) {
  browseState = { storeId, categoryId: null, subcategoryId: null };
  currentPage = 1;
  document.querySelectorAll('.browse-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderBrowseCategories(storeId);
  document.getElementById('browseSubcategories').style.display = 'none';
  renderBrowseProducts(getFilteredProducts());
  updateBreadcrumb();
}
window.selectStore = selectStore;

export function resetBrowseState() {
  browseState = { storeId: null, categoryId: null, subcategoryId: null };
  currentPage = 1;
  priceRange = { min: 0, max: Infinity };
}
window.resetBrowseState = resetBrowseState;

export function resetBrowse() {
  resetBrowseState();
  document.querySelectorAll('.browse-btn').forEach(b => b.classList.remove('active'));
  const first = document.querySelector('.browse-btn');
  if (first) first.classList.add('active');
  document.getElementById('browseCategories').style.display = 'none';
  document.getElementById('browseSubcategories').style.display = 'none';
  renderBrowseProducts(getVisibleProducts());
  updateBreadcrumb();
}
window.resetBrowse = resetBrowse;

function renderBrowseCategories(storeId) {
  const container = document.getElementById('browseCategories');
  if (!container) return;
  const store = getStoreById(storeId);
  const cats = getCategories().filter(c => c.storeId === storeId);
  container.style.display = 'block';
  container.innerHTML = `
    <div class="browse-label"><i class="fas fa-folder"></i> أقسام ${store ? store.name : ''}</div>
    <div class="browse-bar">
      <button class="browse-sub-btn" onclick="window.selectStore(${storeId}, document.querySelector('.browse-btn.active'))">
        <i class="fas fa-th"></i> عرض الكل
      </button>
      ${cats.map(c => `
        <button class="browse-sub-btn" onclick="window.selectCategory(${c.id}, this)">
          <i class="fas ${c.icon}"></i> ${c.name}
        </button>
      `).join('')}
    </div>
  `;
}

export function selectCategory(catId, btn) {
  browseState.categoryId = catId;
  browseState.subcategoryId = null;
  currentPage = 1;
  document.querySelectorAll('.browse-sub-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderBrowseSubcategories(catId);
  renderBrowseProducts(getFilteredProducts());
  updateBreadcrumb();
}
window.selectCategory = selectCategory;

function renderBrowseSubcategories(catId) {
  const container = document.getElementById('browseSubcategories');
  if (!container) return;
  const cat = getCategoryById(catId);
  const subs = getSubcategoriesByCategory(catId);
  container.style.display = 'block';
  container.innerHTML = `
    <div class="browse-label"><i class="fas fa-tag"></i> تفرعات ${cat ? cat.name : ''}</div>
    <div class="browse-bar">
      <button class="browse-sub-btn" onclick="window.selectCategory(${catId}, document.querySelector('#browseCategories .browse-sub-btn.active'))">
        <i class="fas fa-th"></i> عرض الكل
      </button>
      ${subs.map(s => `
        <button class="browse-sub-btn" onclick="window.selectSubcategory(${s.id}, this)">
          ${s.name}
          <span class="subcat-count">${getSubcategoryProductCount(s.id)}</span>
        </button>
      `).join('')}
    </div>
  `;
}

export function selectSubcategory(subId, btn) {
  browseState.subcategoryId = subId;
  currentPage = 1;
  document.querySelectorAll('#browseSubcategories .browse-sub-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderBrowseProducts(getFilteredProducts());
  updateBreadcrumb();
}
window.selectSubcategory = selectSubcategory;

function updateBreadcrumb() {
  const el = document.getElementById('browseBreadcrumb');
  if (!el) return;
  let html = '<a href="#" onclick="window.resetBrowse();return false;"><i class="fas fa-home"></i> الرئيسية</a>';
  if (browseState.storeId) {
    const store = getStoreById(browseState.storeId);
    if (store) html += ` <span class="bc-sep">/</span> <span>${store.name}</span>`;
    if (browseState.categoryId) {
      const cat = getCategoryById(browseState.categoryId);
      if (cat) html += ` <span class="bc-sep">/</span> <span>${cat.name}</span>`;
      if (browseState.subcategoryId) {
        const sub = getSubcategoryById(browseState.subcategoryId);
        if (sub) html += ` <span class="bc-sep">/</span> <span>${sub.name}</span>`;
      }
    }
  }
  el.innerHTML = html;
}

function updateBrowseVisibility() {
  const cats = document.getElementById('browseCategories');
  const subs = document.getElementById('browseSubcategories');
  if (!browseState.storeId) {
    if (cats) cats.style.display = 'none';
    if (subs) subs.style.display = 'none';
  }
}

function renderPagination(totalItems, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  let html = '';
  html += `<button ${currentPage <= 1 ? 'disabled' : ''} onclick="window.browsePage(${currentPage - 1})">&laquo;</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="${i === currentPage ? 'active' : ''}" onclick="window.browsePage(${i})">${i}</button>`;
  }
  html += `<button ${currentPage >= totalPages ? 'disabled' : ''} onclick="window.browsePage(${currentPage + 1})">&raquo;</button>`;
  html += `<span class="page-info">${currentPage} / ${totalPages}</span>`;
  container.innerHTML = html;
}

export function browsePage(page) {
  currentPage = page;
  renderBrowseProducts(getFilteredProducts());
  document.getElementById('productGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.browsePage = browsePage;

function renderBrowseProducts(productList) {
  const grid = document.getElementById('productGrid');
  const title = document.getElementById('productsTitle');
  if (!grid) return;
  const user = getCurrentUser();
  const sort = document.getElementById('sortSelect');
  const sortVal = sort ? sort.value : 'default';

  grid.classList.remove('loading');

  let sorted = [...productList];
  switch (sortVal) {
    case 'price-asc': sorted.sort((a, b) => a.price - b.price); break;
    case 'price-desc': sorted.sort((a, b) => b.price - a.price); break;
    case 'name-asc': sorted.sort((a, b) => a.title.localeCompare(b.title, 'ar')); break;
    case 'name-desc': sorted.sort((a, b) => b.title.localeCompare(a.title, 'ar')); break;
  }

  if (title) {
    if (browseState.subcategoryId) {
      const sub = getSubcategoryById(browseState.subcategoryId);
      title.textContent = sub ? sub.name : 'المنتجات';
    } else if (browseState.categoryId) {
      const cat = getCategoryById(browseState.categoryId);
      title.textContent = cat ? cat.name : 'المنتجات';
    } else if (browseState.storeId) {
      const store = getStoreById(browseState.storeId);
      title.textContent = store ? `منتجات ${store.name}` : 'المنتجات';
    } else {
      title.textContent = 'جميع المنتجات';
    }
  }

  if (sorted.length === 0) {
    grid.innerHTML = '<div class="no-products">لا توجد منتجات متطابقة</div>';
    const pag = document.getElementById('pagination');
    if (pag) pag.innerHTML = '';
    return;
  }

  const totalItems = sorted.length;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(start, start + PAGE_SIZE);

  grid.innerHTML = pageItems.map(product => {
    const canShop = user && (user.role === 'customer' || user.role === 'admin');
    const showCart = canShop;
    const imgHtml = product.image
      ? `<img src="${product.image}" alt="${product.title}" loading="lazy" onerror="this.parentElement.innerHTML='<i class=\\'fas ${product.icon}\\'></i>'">`
      : `<i class="fas ${product.icon}"></i>`;
    return `<div class="product-card" onclick="routerNavigate('product?id=${product.id}')">
      <div class="product-img">${imgHtml}</div>
      <div class="product-body">
        <div class="product-category">${getSubcategoryName(product.subcategoryId)}</div>
        <h3 class="product-title">${product.title}</h3>
        <p class="product-desc">${product.description}</p>
        <div class="product-footer"><span class="product-price">${product.price.toLocaleString()} د.ع</span></div>
        ${showCart ? `<button class="add-to-cart-btn" onclick="event.stopPropagation();window.addToCart(${product.id})" ${!product.inStock ? 'disabled' : ''}>${product.inStock ? '<i class="fas fa-shopping-cart"></i> أضف إلى السلة' : 'نفد من المخزون'}</button>` : ''}
      </div></div>`;
  }).join('');

  renderPagination(totalItems, 'pagination');
}

export function filterProducts() {
  const query = document.getElementById('searchInput')?.value.trim();
  currentPage = 1;
  if (!query) {
    renderBrowseProducts(getFilteredProducts());
    return;
  }
  const results = searchProducts(query);
  renderBrowseProducts(results);
}
window.filterProducts = filterProducts;

export function applyPriceFilter() {
  const min = parseInt(document.getElementById('priceMin')?.value) || 0;
  const max = parseInt(document.getElementById('priceMax')?.value) || 0;
  priceRange = { min, max: max > 0 ? max : Infinity };
  currentPage = 1;
  renderBrowseProducts(getFilteredProducts());
}
window.applyPriceFilter = applyPriceFilter;

export function resetPriceFilter() {
  priceRange = { min: 0, max: Infinity };
  const elMin = document.getElementById('priceMin');
  const elMax = document.getElementById('priceMax');
  if (elMin) elMin.value = '';
  if (elMax) elMax.value = '';
  currentPage = 1;
  renderBrowseProducts(getFilteredProducts());
}
window.resetPriceFilter = resetPriceFilter;

function getSubcategoryName(id) {
  const sub = getSubcategoryById(id);
  return sub ? sub.name : 'غير مصنف';
}

export function renderAllStores() {
  const grid = document.getElementById('allStoresGrid');
  if (!grid) return;
  const visible = getVisibleStores();
  if (visible.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:40px;">لا توجد متاجر متاحة</p>';
    return;
  }
  grid.innerHTML = visible.map(s => `
    <div class="store-card" onclick="routerNavigate('store?id=${s.id}')">
      <div class="store-card-icon"><i class="fas ${s.icon}"></i></div>
      <h3 class="store-card-name">${s.name}</h3>
      <p class="store-card-desc">${s.description}</p>
    </div>
  `).join('');
}

export function renderStoreDetail() {
  const container = document.getElementById('storeDetail');
  const productsContainer = document.getElementById('storeProducts');
  if (!container) return;
  const p = window._spaParams || new URLSearchParams(window.location.search);
  const storeId = parseInt(p.get('id'));
  if (!storeId) { container.innerHTML = '<div class="cart-empty"><h2>المتجر غير موجود</h2></div>'; return; }
  const store = getStoreById(storeId);
  if (!store) { container.innerHTML = '<div class="cart-empty"><h2>المتجر غير موجود</h2></div>'; return; }
  const user = getCurrentUser();
  if (user && user.role === 'store_owner' && user.storeId !== storeId) {
    container.innerHTML = '<div class="cart-empty"><h2>ليس لديك صلاحية الوصول لهذا المتجر</h2></div>';
    if (productsContainer) productsContainer.innerHTML = '';
    return;
  }
  container.innerHTML = `
    <div class="container">
      <div style="text-align:center;padding:40px 0;">
        <div style="font-size:64px;color:var(--primary);margin-bottom:16px;"><i class="fas ${store.icon}"></i></div>
        <h1 style="font-size:32px;font-weight:800;">${store.name}</h1>
        <p style="color:var(--text-light);font-size:18px;max-width:600px;margin:0 auto;">${store.description}</p>
      </div>
    </div>`;
  if (productsContainer) {
    const storeProducts = getProducts().filter(p => p.storeId === storeId);
    if (storeProducts.length === 0) {
      productsContainer.innerHTML = '<div class="no-products">لا توجد منتجات في هذا المتجر</div>';
    } else {
      const totalItems = storeProducts.length;
      const pageItems = storeProducts.slice(0, PAGE_SIZE);
      productsContainer.innerHTML = pageItems.map(p => {
        const imgHtml = p.image
          ? `<img src="${p.image}" alt="${p.title}" loading="lazy" onerror="this.parentElement.innerHTML='<i class=\\'fas ${p.icon}\\'></i>'">`
          : `<i class="fas ${p.icon}"></i>`;
    const canShop = user && (user.role === 'customer' || user.role === 'admin');
    const showCart = canShop;
        return `<div class="product-card" onclick="window.location.href='product.html?id=${p.id}'">
          <div class="product-img">${imgHtml}</div>
          <div class="product-body">
            <div class="product-category">${getSubcategoryName(p.subcategoryId)}</div>
            <h3 class="product-title">${p.title}</h3>
            <p class="product-desc">${p.description}</p>
            <div class="product-footer"><span class="product-price">${p.price.toLocaleString()} د.ع</span></div>
            ${showCart ? `<button class="add-to-cart-btn" onclick="event.stopPropagation();window.addToCart(${p.id})" ${!p.inStock ? 'disabled' : ''}>${p.inStock ? '<i class="fas fa-shopping-cart"></i> أضف إلى السلة' : 'نفد من المخزون'}</button>` : ''}
          </div>
        </div>`;
      }).join('');
      renderPagination(totalItems, 'storePagination');
    }
  }
}

export function renderRecentlyViewed() {
  const container = document.getElementById('recentlyViewed');
  if (!container) return;
  const user = getCurrentUser();
  if (!user) { container.style.display = 'none'; return; }
  const stored = JSON.parse(localStorage.getItem('recently_viewed') || '[]');
  if (stored.length === 0) { container.style.display = 'none'; return; }
  const products = stored.map(id => getProductById(id)).filter(Boolean).slice(0, 6);
  if (products.length === 0) { container.style.display = 'none'; return; }
  container.style.display = 'block';
  const canShop = user && (user.role === 'customer' || user.role === 'admin');
  container.innerHTML = `
    <h2 class="section-title"><i class="fas fa-clock"></i> شوهدت مؤخراً</h2>
    <div class="product-grid">${products.map(p => {
      const imgHtml = p.image
        ? `<img src="${p.image}" alt="${p.title}" loading="lazy" onerror="this.parentElement.innerHTML='<i class=\\'fas ${p.icon}\\'></i>'">`
        : `<i class="fas ${p.icon}"></i>`;
      return `<div class="product-card" onclick="window.location.href='pages/product.html?id=${p.id}'">
        <div class="product-img">${imgHtml}</div>
        <div class="product-body">
          <h3 class="product-title">${p.title}</h3>
          <div class="product-footer"><span class="product-price">${p.price.toLocaleString()} د.ع</span></div>
        </div></div>`;
    }).join('')}</div>`;
}
