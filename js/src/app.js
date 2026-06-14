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
  try { renderOrders(); } catch (e) {}
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

async function initApp() {
  try {
    await initAuth();
    await Promise.all([initStores(), initCategories(), initProducts()]);
  } catch (e) {
    console.error('Init error:', e);
  }

  renderUI();
  initCart().then(() => { try { updateCartBadge(); } catch {} }).catch(() => {});

  registerPage('store', (p) => { renderStoreDetail(); });
  registerPage('product', (p) => { renderProductDetail(); });
  registerPage('admin', () => { initAdminDashboard(); });
  initRouter();
}

initApp();
