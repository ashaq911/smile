let cart = JSON.parse(localStorage.getItem('cart')) || [];

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(productId) {
  const product = getProductById(productId);
  if (!product) return;
  if (!product.inStock) {
    showToast('عذراً، هذا المنتج غير متوفر حالياً');
    return;
  }
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id: productId, quantity: 1 });
  }
  saveCart();
  showToast(`تم إضافة "${product.title}" إلى السلة`);
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  renderCart();
}

function updateQuantity(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(productId);
    return;
  }
  saveCart();
  renderCart();
}

function getCartTotal() {
  return cart.reduce((sum, item) => {
    const product = getProductById(item.id);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);
}

function getCartCount() {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (badge) badge.textContent = getCartCount();
}

function clearCart() {
  cart = [];
  saveCart();
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const summary = document.getElementById('cartSummary');
  const empty = document.getElementById('cartEmpty');
  if (!container) return;

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
          <button onclick="updateQuantity(${item.id}, -1)">−</button>
          <span>${item.quantity}</span>
          <button onclick="updateQuantity(${item.id}, 1)">+</button>
        </div>
        <div class="cart-item-total">${total.toLocaleString()} د.ع</div>
        <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
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
      <a href="checkout.html" class="btn btn-primary" style="width:100%;text-align:center;margin-top:16px;">
        إتمام الطلب
      </a>
      <button class="btn btn-outline" style="width:100%;text-align:center;margin-top:8px;" onclick="clearCart();renderCart();">
        تفريغ السلة
      </button>
    `;
  }
}
