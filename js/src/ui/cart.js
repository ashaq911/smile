import { getCart, addToCart as addToCartService, removeFromCart, updateQuantity, getCartTotal, getCartCount, clearCart } from '../services/cart.js';
import { getProductById, getProducts } from '../services/products.js';
import { getStoreById, getStores } from '../services/stores.js';
import { getCategories, getSubcategories, getSubcategoryById, getCategoryById } from '../services/categories.js';
import { getCurrentUser } from '../services/auth.js';
import { showToast } from './toast.js';

export function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (badge) badge.textContent = getCartCount();
}

export async function addToCart(productId, quantity) {
  const product = getProductById(productId);
  if (!product) return;
  if (!product.inStock) { showToast('عذراً، هذا المنتج غير متوفر حالياً'); return; }
  const qty = quantity || 1;
  try {
    const success = await addToCartService(productId, qty);
    if (success) {
      updateCartBadge();
      showToast(`تم إضافة "${product.title}" ×${qty} إلى السلة`);
    }
  } catch (e) {
    showToast(e.message);
  }
}
window.addToCart = addToCart;

export function renderCart() {
  const container = document.getElementById('cartItems');
  const summary = document.getElementById('cartSummary');
  const empty = document.getElementById('cartEmpty');
  if (!container) return;

  const cart = getCart();
  if (cart.length === 0) {
    if (empty) empty.style.display = 'block';
    if (container) container.innerHTML = '';
    if (summary) summary.style.display = 'none';
    return;
  }

  if (empty) empty.style.display = 'none';
  if (summary) summary.style.display = 'block';

  container.innerHTML = cart.map(item => {
    const product = getProductById(item.id);
    if (!product) return '';
    const total = product.price * item.quantity;
    return `
      <div class="cart-item">
        <div class="cart-item-img">
          ${product.image ? `<img src="${product.image}" alt="${product.title}" onerror="this.style.display='none';this.parentElement.innerHTML='<i class=\\'fas ${product.icon}\\'></i>'">` : `<i class="fas ${product.icon}"></i>`}
        </div>
        <div class="cart-item-info">
          <div class="cart-item-title">${product.title}</div>
          <div class="cart-item-price">${product.price.toLocaleString()} د.ع</div>
        </div>
        <div class="cart-item-quantity">
          <button onclick="window.cartUpdateQuantity(${item.id}, -1)">−</button>
          <span>${item.quantity}</span>
          <button onclick="window.cartUpdateQuantity(${item.id}, 1)">+</button>
        </div>
        <div class="cart-item-total">${total.toLocaleString()} د.ع</div>
        <button class="cart-item-remove" onclick="window.cartRemove(${item.id})">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  }).join('');

  if (summary) {
    const subtotal = getCartTotal();
    const shippingFee = cart.reduce((s, item) => {
      const p = getProductById(item.id);
      return Math.max(s, (p && p.shippingFee) || 0);
    }, 0);
    summary.innerHTML = `
      <h3>ملخص الطلب</h3>
      <div class="cart-summary-row">
        <span>المجموع الفرعي</span>
        <span>${subtotal.toLocaleString()} د.ع</span>
      </div>
      <div class="cart-summary-row">
        <span>رسوم الشحن</span>
        <span>${shippingFee > 0 ? shippingFee.toLocaleString() + ' د.ع' : 'لا توجد'}</span>
      </div>
      <div class="cart-summary-row total">
        <span>الإجمالي</span>
        <span>${(subtotal + shippingFee).toLocaleString()} د.ع</span>
      </div>
      <a href="checkout.html" class="btn btn-primary" style="width:100%;text-align:center;margin-top:16px;">إتمام الطلب</a>
      <button class="btn btn-outline" style="width:100%;text-align:center;margin-top:8px;" onclick="window.cartClear();window.renderCart();">تفريغ السلة</button>
    `;
  }
}

export async function cartUpdateQuantity(productId, delta) {
  await updateQuantity(productId, delta);
  updateCartBadge();
  renderCart();
}
window.cartUpdateQuantity = cartUpdateQuantity;

export async function cartRemove(productId) {
  await removeFromCart(productId);
  updateCartBadge();
  renderCart();
}
window.cartRemove = cartRemove;

export async function cartClear() {
  await clearCart();
  updateCartBadge();
}
window.cartClear = cartClear;
window.renderCart = renderCart;
