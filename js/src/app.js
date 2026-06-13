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
  try { if (document.getElementById('adminContent')) initAdminDashboard(); } catch (e) {}
}

async function initApp() {
  const ready = document.readyState !== 'loading';
  if (ready) renderUI();
  else document.addEventListener('DOMContentLoaded', () => renderUI());

  try {
    await initAuth();
    await Promise.all([initStores(), initCategories(), initProducts()]);
  } catch (e) {
    console.error('Init error:', e);
  }

  if (document.readyState !== 'loading') renderUI();
  else document.addEventListener('DOMContentLoaded', () => renderUI());
  initCart().then(() => { try { updateCartBadge(); } catch {} }).catch(() => {});
}

initApp();
