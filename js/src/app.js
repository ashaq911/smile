import { initAuth } from './services/auth.js';
import { initStores } from './services/stores.js';
import { initCategories } from './services/categories.js';
import { initProducts } from './services/products.js';
import { initCart } from './services/cart.js';
import { updateCartBadge, renderCart } from './ui/cart.js';
import { updateAuthUI, processLogin, processRegister, showLoginModal, showRegisterModal, closeLoginModal, closeRegisterModal } from './ui/authUI.js';
import { initBrowse, renderAllStores, renderStoreDetail, filterProducts, applySort } from './ui/browse.js';
import { renderProductDetail } from './ui/productDetail.js';
import { renderOrders, deleteCustomerOrder } from './ui/orders.js';
import { renderCheckoutSummary, submitOrder } from './ui/checkout.js';
import { initAdminDashboard } from './ui/admin.js';
import './ui/adminActions.js';
import { showToast } from './ui/toast.js';
import { addToCart, cartUpdateQuantity, cartRemove, cartClear } from './ui/cart.js';
import { initRouter, navigate, registerPage } from './router.js';

window.navigateHome = function() {
  if (window.resetBrowseState) window.resetBrowseState();
  document.querySelectorAll('.page-section').forEach(function(p) { p.style.display = 'none'; });
  var home = document.getElementById('page-home');
  if (home) home.style.display = 'block';
  document.querySelectorAll('.nav a').forEach(function(a) { a.classList.remove('active'); });
  var link = document.querySelector('.nav a[data-page=""]');
  if (link) link.classList.add('active');
  document.title = 'سمايل - للتسوق الإلكتروني';
  var t = document.getElementById('productsTitle');
  if (t) t.textContent = 'جميع المنتجات';
  try { initBrowse(); } catch (e) {}
};
window.showLoginModal = showLoginModal;
window.closeLoginModal = closeLoginModal;
window.showRegisterModal = showRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.processLogin = processLogin;
window.processRegister = processRegister;
window.filterProducts = filterProducts;
window.applySort = applySort;
window.showToast = showToast;
window.submitOrder = submitOrder;
window.initAdminDashboard = initAdminDashboard;
window.renderOrders = renderOrders;
window.deleteCustomerOrder = deleteCustomerOrder;
window.addToCart = addToCart;
window.cartUpdateQuantity = cartUpdateQuantity;
window.cartRemove = cartRemove;
window.cartClear = cartClear;

// Track recently viewed
export function trackRecentlyViewed(productId) {
  const stored = JSON.parse(localStorage.getItem('recently_viewed') || '[]');
  const filtered = stored.filter(id => id !== productId);
  filtered.unshift(productId);
  localStorage.setItem('recently_viewed', JSON.stringify(filtered.slice(0, 20)));
}
window.trackRecentlyViewed = trackRecentlyViewed;

// Update cart badge from quantity events
document.addEventListener('cartUpdated', () => {
  try { import('./ui/cart.js').then(m => m.updateCartBadge()); } catch {}
});

function renderUI() {
  try { updateAuthUI(); } catch (e) {}
  try { updateCartBadge(); } catch (e) {}
  try { renderCart(); } catch (e) {}
  try { initBrowse(); } catch (e) {}
  try { renderAllStores(); } catch (e) {}
  try { renderStoreDetail(); } catch (e) {}
  try { renderProductDetail(); } catch (e) {}
  try { renderCheckoutSummary(); } catch (e) {}
}

async function renderDataPages(params) {
  const pid = params.get('id');
  if (pid) renderProductDetail();
  else document.getElementById('page-product').style.display = 'none';
}

// Listen for data updates to refresh views when background fetches complete
window.addEventListener('dataUpdated', () => {
  try {
    updateAuthUI();
    initBrowse();
    renderAllStores();
    renderStoreDetail();
    renderProductDetail();
  } catch (e) {}
});

async function initApp() {
  initAuth();
  const cached = localStorage.getItem('cache_stores') && localStorage.getItem('cache_products');
  if (cached) {
    await Promise.all([initStores(), initCategories(), initProducts()]);
  } else {
    await Promise.all([initStores(), initCategories(), initProducts()]);
  }
  renderUI();
  initCart().then(() => {
    try { updateCartBadge(); } catch {}
    var cp = document.getElementById('page-cart');
    if (cp && cp.style.display !== 'none') try { renderCart(); } catch {}
  }).catch(() => {});

  registerPage('', () => { initBrowse(); });
  registerPage('stores', () => { renderAllStores(); });
  registerPage('store', (p) => { renderStoreDetail(); });
  registerPage('product', (p) => { renderProductDetail(); });
  registerPage('admin', () => { initAdminDashboard(); });
  registerPage('orders', () => { renderOrders(); });
  registerPage('cart', () => { renderCart(); });
  initRouter();
}

initApp();
