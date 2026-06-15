import { apiGet, apiPost, apiPut, apiDelete } from './api.js';

let cartItems = [];

export async function initCart() {
  const raw = localStorage.getItem('auth_user');
  if (!raw) { cartItems = []; return; }
  const user = JSON.parse(raw);
  if (!user) { cartItems = []; return; }
  const key = 'cache_cart_' + user.id;
  const cached = localStorage.getItem(key);
  cartItems = cached ? JSON.parse(cached) : [];
  try {
    const fresh = await apiGet('/cart');
    if (fresh) cartItems = fresh;
    saveCache(user.id);
  } catch {}
}

export function getCart() {
  return cartItems.map(item => ({
    id: item.productId,
    quantity: item.quantity,
    title: item.title,
    price: item.price,
    shippingFee: item.shippingFee || 0,
    storeId: item.storeId,
    icon: item.icon,
    image: item.image
  }));
}

export async function addToCart(productId, quantity) {
  await apiPost('/cart', { productId, quantity: quantity || 1 });
  cartItems = await apiGet('/cart');
  saveCache();
  return true;
}

export async function removeFromCart(productId) {
  const item = cartItems.find(i => i.productId === productId);
  if (!item) return;
  await apiDelete(`/cart/${item.id}`);
  cartItems = cartItems.filter(i => i.productId !== productId);
  saveCache();
}

export async function updateQuantity(productId, delta) {
  const item = cartItems.find(i => i.productId === productId);
  if (!item) return;
  const newQty = item.quantity + delta;
  if (newQty <= 0) { await removeFromCart(productId); return; }
  await apiPut(`/cart/${item.id}`, { quantity: newQty });
  item.quantity = newQty;
  saveCache();
}

export function getCartTotal() {
  return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getCartCount() {
  return cartItems.reduce((sum, item) => sum + item.quantity, 0);
}

export async function clearCart() {
  try { await apiDelete('/cart'); } catch {}
  cartItems = [];
  saveCache();
}

function saveCache() {
  try {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return;
    const user = JSON.parse(raw);
    if (user) localStorage.setItem('cache_cart_' + user.id, JSON.stringify(cartItems));
  } catch {}
}
