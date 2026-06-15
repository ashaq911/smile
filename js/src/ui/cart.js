import { getCart, addToCart as addToCartService, removeFromCart, updateQuantity, getCartTotal, getCartCount, clearCart } from '../services/cart.js';
import { getProductById } from '../services/products.js';
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
      var cartPage = document.getElementById('page-cart');
      if (cartPage && cartPage.style.display !== 'none') renderCart();
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
    const total = item.price * item.quantity;
    return `
      <div class="cart-item">
        <div class="cart-item-img">
          ${item.image ? `<img src="${item.image}" alt="${item.title}" onerror="this.style.display='none';this.parentElement.innerHTML='<i class=\\'fas ${item.icon}\\'></i>'">` : `<i class="fas ${item.icon || 'fa-box'}"></i>`}
        </div>
        <div class="cart-item-info">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-price">${item.price.toLocaleString()} د.ع</div>
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
    const shippingFee = cart.reduce((s, item) => Math.max(s, (item.shippingFee || 0)), 0);
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
      <a href="javascript:void(0)" onclick="window.routerNavigate('checkout')" class="btn btn-primary" style="width:100%;text-align:center;margin-top:16px;">إتمام الطلب</a>
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
