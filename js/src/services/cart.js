import { apiGet, apiPost, apiPut, apiDelete } from './api.js';
import { getProductById } from './products.js';

let cartItems = [];

export async function initCart() {
  const user = JSON.parse(localStorage.getItem('auth_user') || 'null');
  if (!user) { cartItems = []; return; }
  const key = 'cache_cart_' + user.id;
  const cached = sessionStorage.getItem(key);
  if (cached) try { cartItems = JSON.parse(cached); } catch {}
  if (cartItems.length === 0) {
    cartItems = await apiGet('/cart').catch(() => []);
  } else {
    apiGet('/cart').then(d => { if (d) { cartItems = d; sessionStorage.setItem(key, JSON.stringify(d)); } }).catch(() => {});
  }
  if (cartItems.length) sessionStorage.setItem(key, JSON.stringify(cartItems));
}

function getProductDetails() {
  return cartItems.map(item => {
    const product = getProductById(item.productId);
    return { ...item, product };
  });
}

export function getCart() {
  return cartItems.map(item => ({
    id: item.productId,
    quantity: item.quantity,
    title: item.title,
    price: item.price,
    shippingFee: item.shippingFee,
    storeId: item.storeId,
    icon: item.icon,
    image: item.image,
    inStock: item.inStock
  }));
}

export async function addToCart(productId, quantity) {
  const product = getProductById(productId);
  if (!product) return false;
  if (!product.inStock) return false;
  await apiPost('/cart', { productId, quantity: quantity || 1 });
  cartItems = await apiGet('/cart');
  return true;
}

export async function removeFromCart(productId) {
  const item = cartItems.find(i => i.productId === productId);
  if (item) {
    await apiDelete(`/cart/${item.id}`);
    cartItems = cartItems.filter(i => i.productId !== productId);
  }
}

export async function updateQuantity(productId, delta) {
  const item = cartItems.find(i => i.productId === productId);
  if (!item) return;
  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    await removeFromCart(productId);
    return;
  }
  await apiPut(`/cart/${item.id}`, { quantity: newQty });
  item.quantity = newQty;
}

export function getCartTotal() {
  return cartItems.reduce((sum, item) => {
    const product = getProductById(item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);
}

export function getCartCount() {
  return cartItems.reduce((sum, item) => sum + item.quantity, 0);
}

export async function clearCart() {
  try { await apiDelete('/cart'); } catch {}
  cartItems = [];
}
