let browseState = { storeId: null, categoryId: null, subcategoryId: null };

document.addEventListener('DOMContentLoaded', function () {
  try {
    const store1 = getStoreById(1);
    if (store1) { store1.name = 'سمايل'; store1.icon = 'fa-smile'; saveStores(); }
  } catch (e) {}
  try { updateAuthUI(); } catch (e) {}
  try { updateCartBadge(); } catch (e) {}
  try { renderCart(); } catch (e) {}
  try { initBrowse(); } catch (e) {}
  try { renderOrders(); } catch (e) {}
  try { renderAllStores(); } catch (e) {}
  try { renderStoreDetail(); } catch (e) {}
  try { if (document.getElementById('adminContent')) initAdminDashboard(); } catch (e) {}
});

function getSubcategoryName(id) {
  const sub = getSubcategoryById(id);
  return sub ? sub.name : 'غير مصنف';
}

// ===== BROWSE (Homepage drill-down) =====
function initBrowse() {
  renderBrowseStores();
  renderBrowseProducts(getVisibleProducts());
}

function applySort() {
  renderBrowseProducts(getFilteredProducts());
}

function getFilteredProducts() {
  let list = getVisibleProducts();
  if (browseState.storeId) {
    list = list.filter(p => p.storeId === browseState.storeId);
  }
  if (browseState.categoryId) {
    const subs = subcategories.filter(s => s.categoryId === browseState.categoryId).map(s => s.id);
    list = list.filter(p => subs.includes(p.subcategoryId));
  } else if (browseState.subcategoryId) {
    list = list.filter(p => p.subcategoryId === browseState.subcategoryId);
  }
  return list;
}

function getVisibleStores() {
  const user = getCurrentUser();
  const allStores = getStores();
  if (user && user.role === 'store_owner') return allStores.filter(s => s.id === user.storeId);
  return allStores;
}

function getVisibleProducts() {
  const user = getCurrentUser();
  let list = [...products];
  if (user && user.role === 'store_owner' && user.storeId) {
    list = list.filter(p => p.storeId === user.storeId);
  }
  return list;
}

function renderBrowseStores() {
  const container = document.getElementById('browseStores');
  if (!container) return;
  const visibleStores = getVisibleStores();
  container.innerHTML = `
    <button class="browse-btn ${!browseState.storeId ? 'active' : ''}" onclick="resetBrowse()">
      <i class="fas fa-store-alt"></i> عرض الجميع
    </button>
    ${visibleStores.map(s => `
      <button class="browse-btn ${browseState.storeId === s.id ? 'active' : ''}" onclick="selectStore(${s.id}, this)">
        <i class="fas ${s.icon}"></i> ${s.name}
      </button>
    `).join('')}
  `;
  updateBrowseVisibility();
}

function selectStore(storeId, btn) {
  browseState = { storeId, categoryId: null, subcategoryId: null };
  document.querySelectorAll('.browse-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderBrowseCategories(storeId);
  document.getElementById('browseSubcategories').style.display = 'none';
  renderBrowseProducts(getFilteredProducts());
  updateBreadcrumb();
}

function resetBrowse() {
  browseState = { storeId: null, categoryId: null, subcategoryId: null };
  document.querySelectorAll('.browse-btn').forEach(b => b.classList.remove('active'));
  const first = document.querySelector('.browse-btn');
  if (first) first.classList.add('active');
  document.getElementById('browseCategories').style.display = 'none';
  document.getElementById('browseSubcategories').style.display = 'none';
  renderBrowseProducts(getVisibleProducts());
  updateBreadcrumb();
}

function renderBrowseCategories(storeId) {
  const container = document.getElementById('browseCategories');
  if (!container) return;
  const store = getStoreById(storeId);
  const cats = getCategoriesByStore(storeId);
  container.style.display = 'block';
  container.innerHTML = `
    <div class="browse-label"><i class="fas fa-folder"></i> أقسام ${store ? store.name : ''}</div>
    <div class="browse-bar">
      <button class="browse-sub-btn" onclick="selectStore(${storeId}, document.querySelector('.browse-btn.active'))">
        <i class="fas fa-th"></i> عرض الكل
      </button>
      ${cats.map(c => `
        <button class="browse-sub-btn" onclick="selectCategory(${c.id}, this)">
          <i class="fas ${c.icon}"></i> ${c.name}
        </button>
      `).join('')}
    </div>
  `;
}

function selectCategory(catId, btn) {
  browseState.categoryId = catId;
  browseState.subcategoryId = null;
  document.querySelectorAll('.browse-sub-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderBrowseSubcategories(catId);
  renderBrowseProducts(getFilteredProducts());
  updateBreadcrumb();
}

function renderBrowseSubcategories(catId) {
  const container = document.getElementById('browseSubcategories');
  if (!container) return;
  const cat = getCategoryById(catId);
  const subs = getSubcategoriesByCategory(catId);
  container.style.display = 'block';
  container.innerHTML = `
    <div class="browse-label"><i class="fas fa-tag"></i> تفرعات ${cat ? cat.name : ''}</div>
    <div class="browse-bar">
      <button class="browse-sub-btn" onclick="selectCategory(${catId}, document.querySelector('#browseCategories .browse-sub-btn.active'))">
        <i class="fas fa-th"></i> عرض الكل
      </button>
      ${subs.map(s => `
        <button class="browse-sub-btn" onclick="selectSubcategory(${s.id}, this)">
          ${s.name}
          <span class="subcat-count">${getSubcategoryProductCount(s.id)}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function selectSubcategory(subId, btn) {
  browseState.subcategoryId = subId;
  document.querySelectorAll('#browseSubcategories .browse-sub-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderBrowseProducts(getFilteredProducts());
  updateBreadcrumb();
}

function updateBreadcrumb() {
  const el = document.getElementById('browseBreadcrumb');
  if (!el) return;
  let html = '<a href="#" onclick="resetBrowse();return false;"><i class="fas fa-home"></i> الرئيسية</a>';
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

function renderAllStores() {
  const grid = document.getElementById('allStoresGrid');
  if (!grid) return;
  const visible = getVisibleStores();
  if (visible.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:40px;">لا توجد متاجر متاحة</p>';
    return;
  }
  grid.innerHTML = visible.map(s => `
    <div class="store-card" onclick="window.location.href='store.html?id=${s.id}'">
      <div class="store-card-icon"><i class="fas ${s.icon}"></i></div>
      <h3 class="store-card-name">${s.name}</h3>
      <p class="store-card-desc">${s.description}</p>
    </div>
  `).join('');
}

function renderStoreDetail() {
  const container = document.getElementById('storeDetail');
  const productsContainer = document.getElementById('storeProducts');
  const categoriesContainer = document.getElementById('storeCategories');
  if (!container) return;
  const params = new URLSearchParams(window.location.search);
  const storeId = parseInt(params.get('id'));
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
    const storeProducts = products.filter(p => p.storeId === storeId);
    if (storeProducts.length === 0) {
      productsContainer.innerHTML = '<div class="no-products">لا توجد منتجات في هذا المتجر</div>';
    } else {
      productsContainer.innerHTML = storeProducts.map(p => `
        <div class="product-card">
          <div class="product-img">${p.image ? `<img src="${p.image}" alt="${p.title}" onerror="this.parentElement.innerHTML='<i class=\\'fas ${p.icon}\\'></i>'">` : `<i class="fas ${p.icon}"></i>`}</div>
          <div class="product-body">
            <div class="product-category">${getSubcategoryName(p.subcategoryId)}</div>
            <h3 class="product-title">${p.title}</h3>
            <p class="product-desc">${p.description}</p>
            <div class="product-footer"><span class="product-price">${p.price.toLocaleString()} د.ع</span></div>
            ${user && user.role !== 'customer' ? '' : `<button class="add-to-cart-btn" onclick="addToCart(${p.id})" ${!p.inStock ? 'disabled' : ''}>${p.inStock ? '<i class="fas fa-shopping-cart"></i> أضف إلى السلة' : 'نفد من المخزون'}</button>`}
          </div>
        </div>
      `).join('');
    }
  }
}

function renderBrowseProducts(productList) {
  const grid = document.getElementById('productGrid');
  const title = document.getElementById('productsTitle');
  if (!grid) return;
  const user = getCurrentUser();
  const sort = document.getElementById('sortSelect');
  const sortVal = sort ? sort.value : 'default';

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
    return;
  }

  grid.innerHTML = sorted.map(product => {
          const showCart = !(user && user.role !== 'customer');
          return `<div class="product-card" onclick="window.location.href='pages/store.html?id=${product.storeId}'">
      <div class="product-img">${product.image ? `<img src="${product.image}" alt="${product.title}" onerror="this.parentElement.innerHTML='<i class=\\'fas ${product.icon}\\'></i>'">` : `<i class="fas ${product.icon}"></i>`}</div>
      <div class="product-body">
        <div class="product-category">${getSubcategoryName(product.subcategoryId)}</div>
        <h3 class="product-title">${product.title}</h3>
        <p class="product-desc">${product.description}</p>
        <div class="product-footer"><span class="product-price">${product.price.toLocaleString()} د.ع</span></div>
        ${showCart ? `<button class="add-to-cart-btn" onclick="event.stopPropagation();addToCart(${product.id})" ${!product.inStock ? 'disabled' : ''}>${product.inStock ? '<i class="fas fa-shopping-cart"></i> أضف إلى السلة' : 'نفد من المخزون'}</button>` : ''}
      </div></div>`;
  }).join('');
}

// ===== SEARCH =====
function filterProducts() {
  const query = document.getElementById('searchInput')?.value.trim();
  if (!query) {
    renderBrowseProducts(getFilteredProducts());
    return;
  }
  const results = searchProducts(query);
  renderBrowseProducts(results);
}

// ===== AUTH UI =====
// (showLoginModal, showRegisterModal, closeLoginModal, closeRegisterModal defined in auth.js)

function processRegister() {
  const name = document.getElementById('regName').value.trim();
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const confirm = document.getElementById('regConfirm').value.trim();
  if (!name || !username || !password) { showToast('يرجى تعبئة جميع الحقول'); return; }
  if (password !== confirm) { showToast('كلمة المرور غير متطابقة'); return; }
  if (password.length < 4) { showToast('كلمة المرور يجب أن تكون 4 أحرف على الأقل'); return; }
  const user = registerCustomer(name, username, password);
  if (!user) { showToast('اسم المستخدم موجود مسبقاً'); return; }
  const session = login(username, password);
  if (session) {
    closeRegisterModal();
    updateAuthUI();
    showToast(`مرحباً، ${name}`);
    if (document.getElementById('adminContent')) initAdminDashboard();
  }
}

// ===== TOAST =====
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== CHECKOUT =====
function getCartMaxShipping() {
  let max = 0;
  cart.forEach(item => {
    const p = getProductById(item.id);
    if (p && p.shippingFee && p.shippingFee > max) max = p.shippingFee;
  });
  return max;
}

function renderCheckoutSummary() {
  const container = document.getElementById('checkoutSummary');
  if (!container) return;
  if (cart.length === 0) { container.innerHTML = '<p>السلة فارغة</p>'; return; }
  const fmt = n => n.toLocaleString('en-US');
  const subtotal = getCartTotal();
  const shippingFee = getCartMaxShipping();
  container.innerHTML = `
    <h3>ملخص الطلب</h3>
    ${cart.map(item => {
      const p = getProductById(item.id);
      if (!p) return '';
      return `<div class="checkout-item" style="flex-wrap:wrap;"><span>${p.title} × ${item.quantity}</span><span style="text-align:left;">${fmt(p.price * item.quantity)} د.ع</span></div>`;
    }).join('')}
    <div class="checkout-item" style="margin-top:12px;padding-top:12px;border-top:2px solid var(--border);"><span>المجموع الفرعي</span><span>${fmt(subtotal)} د.ع</span></div>
    <div class="checkout-item"><span>رسوم الشحن</span><span>${shippingFee > 0 ? fmt(shippingFee) + ' د.ع' : 'لا توجد'}</span></div>
    <div class="checkout-item" style="font-weight:800;font-size:20px;color:var(--primary);"><span>الإجمالي المطلوب</span><span>${fmt(subtotal + shippingFee)} د.ع</span></div>
    <p style="text-align:center;margin-top:12px;padding:12px;background:var(--bg-secondary);border-radius:12px;font-size:14px;color:var(--text-light);"><i class="fas fa-money-bill-wave"></i> الدفع عند الاستلام</p>`;
}

function submitOrder(event) {
  event.preventDefault();
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const email = document.getElementById('custEmail').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const city = document.getElementById('custCity').value;
  if (!name || !phone || !address) { showToast('يرجى تعبئة الحقول المطلوبة'); return; }
  if (cart.length === 0) { showToast('السلة فارغة'); return; }
  let orders = []; try { orders = JSON.parse(localStorage.getItem('orders')) || []; } catch (e) { orders = []; }
  const user = getCurrentUser();
  const cartItems = cart.map(item => { const p = getProductById(item.id); return { id: item.id, title: p.title, price: p.price, shippingFee: p.shippingFee || 0, quantity: item.quantity, storeId: p.storeId }; });
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingFee = cartItems.reduce((s, i) => Math.max(s, i.shippingFee), 0);
  const order = {
    id: Date.now(), date: new Date().toLocaleDateString('ar-SA'),
    customer: name, phone, email, address, city, payment: 'cod',
    items: cartItems,
    subtotal: subtotal, shipping: shippingFee,
    total: subtotal + shippingFee, status: 'pending',
    username: user && user.role === 'customer' ? user.username : null,
    transferredToOwner: false, transferAmount: 0, transferPaid: false, transferPaymentConfirmed: false, customerInfoRevealed: false
  };
  orders.push(order);
  localStorage.setItem('orders', JSON.stringify(orders));
  clearCart();
  window.location.href = 'orders.html';
}

// ===== ORDERS =====
function renderOrders() {
  const container = document.getElementById('ordersContainer');
  if (!container) return;
  const user = getCurrentUser();
  let allOrders = []; try { allOrders = JSON.parse(localStorage.getItem('orders')) || []; } catch (e) { allOrders = []; }
  let orders = allOrders;
  if (!user) {
    container.innerHTML = '<div class="cart-empty"><i class="fas fa-user-lock"></i><h2>سجل الدخول لمشاهدة طلباتك</h2><p>قم بتسجيل الدخول أو إنشاء حساب لمتابعة طلباتك</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;"><button class="btn btn-primary" onclick="showLoginModal()">تسجيل الدخول</button><button class="btn btn-outline" onclick="showRegisterModal()">إنشاء حساب</button></div></div>';
    return;
  }
  if (user.role === 'customer') orders = allOrders.filter(o => o.username === user.username);
  if (orders.length === 0) {
    container.innerHTML = '<div class="cart-empty"><i class="fas fa-box-open"></i><h2>لا توجد طلبات</h2><p>لم تقم بطلب أي منتج بعد</p><a href="../index.html" class="btn btn-primary">تسوق الآن</a></div>';
    return;
  }
  container.innerHTML = [...orders].reverse().map(order => {
    const statusLabels = { pending: 'قيد الانتظار', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التوصيل', cancelled: 'ملغي' };
    const orderShipping = order.items.reduce((s, i) => Math.max(s, i.shippingFee || 0), 0);
    return `<div class="order-card" style="position:relative;">
      ${order.status === 'delivered' ? `<button class="btn btn-danger btn-sm" onclick="deleteCustomerOrder(${order.id})" style="position:absolute;top:12px;left:12px;" title="حذف"><i class="fas fa-trash"></i></button>` : ''}
      <div class="order-header"><div><span class="order-id">طلب #${order.id}</span><span style="color:var(--text-light);font-size:13px;margin-right:12px;">${order.date}</span></div><span class="order-status status-${order.status}">${statusLabels[order.status] || order.status}</span></div>
      <div class="order-items">${order.items.map(item => {
        return `<div class="order-item"><span>${item.title} × ${item.quantity}</span><span>${(item.price * item.quantity).toLocaleString()} د.ع</span></div>`;
      }).join('')}</div>
      <div class="order-item" style="justify-content:space-between;display:flex;font-size:14px;color:var(--text-light);"><span>رسوم الشحن</span><span>${orderShipping > 0 ? orderShipping.toLocaleString() + ' د.ع' : 'لا توجد'}</span></div>
      <div style="text-align:center;font-size:13px;color:var(--text-light);margin-top:4px;"><i class="fas fa-money-bill-wave"></i> الدفع عند الاستلام</div>
      <div class="order-total"><span>الإجمالي</span><span>${order.total.toLocaleString()} د.ع</span></div>
    </div>`;
  }).join('');
}

function deleteCustomerOrder(orderId) {
  if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
  let orders = JSON.parse(localStorage.getItem('orders')) || [];
  orders = orders.filter(o => o.id !== orderId);
  localStorage.setItem('orders', JSON.stringify(orders));
  showToast('تم حذف الطلب');
  renderOrders();
}

// ===== ADMIN =====
function initAdminDashboard() {
  const container = document.getElementById('adminContent');
  if (!container) return;
  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = `<div class="cart-empty"><i class="fas fa-user-lock"></i><h2>يرجى تسجيل الدخول</h2><p>يجب تسجيل الدخول للوصول إلى لوحة التحكم</p><button class="btn btn-primary" onclick="showLoginModal()">تسجيل الدخول</button></div>`;
    return;
  }
  if (user.role === 'admin') renderFullAdminDashboard();
  else if (user.role === 'store_owner') renderStoreOwnerDashboard(user.storeId);
  else { container.innerHTML = '<div class="cart-empty"><h2>ليس لديك صلاحية</h2><p>عذراً، لا تملك صلاحية الوصول إلى هذه الصفحة</p></div>'; }
}

function renderFullAdminDashboard() {
  const container = document.getElementById('adminContent');
  if (!container) return;
  let orders = []; try { orders = JSON.parse(localStorage.getItem('orders')) || []; } catch (e) { orders = []; }
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const allStores = getStores();
  const owners = getStoreOwners();
  container.innerHTML = `
    <div class="admin-tabs">
      <button class="admin-tab active" onclick="switchAdminTab('orders', this)"><i class="fas fa-shopping-bag"></i> الطلبات</button>
      <button class="admin-tab" onclick="switchAdminTab('categories', this)"><i class="fas fa-sitemap"></i> الأقسام</button>
      <button class="admin-tab" onclick="switchAdminTab('products', this)"><i class="fas fa-box"></i> المنتجات</button>
      <button class="admin-tab" onclick="switchAdminTab('stores', this)"><i class="fas fa-store"></i> المتاجر</button>
      <button class="admin-tab" onclick="switchAdminTab('owners', this)"><i class="fas fa-users-cog"></i> أصحاب المتاجر</button>
      <button class="admin-tab" onclick="switchAdminTab('users', this)"><i class="fas fa-users"></i> المستخدمين</button>
    </div>
    <div class="admin-tab-content" id="adminTabOrders">
      <div class="admin-stats">
        <div class="stat-card"><i class="fas fa-shopping-bag"></i><h3>إجمالي الطلبات</h3><div class="stat-value">${totalOrders}</div></div>
        <div class="stat-card"><i class="fas fa-money-bill-wave"></i><h3>إجمالي الإيرادات</h3><div class="stat-value">${totalRevenue.toLocaleString()} د.ع</div></div>
        <div class="stat-card"><i class="fas fa-clock"></i><h3>قيد الانتظار</h3><div class="stat-value">${pendingOrders}</div></div>
        <div class="stat-card"><i class="fas fa-check-circle"></i><h3>تم التوصيل</h3><div class="stat-value">${deliveredOrders}</div></div>
      </div>
      <h2 class="section-title">جميع الطلبات</h2>
      ${orders.length === 0 ? '<p style="text-align:center;color:var(--text-light);padding:40px;">لا توجد طلبات حتى الآن</p>' : [...orders].reverse().map(order => {
        const statusLabels = { pending: 'قيد الانتظار', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التوصيل', cancelled: 'ملغي' };
        const payLabels = { cod: 'الدفع عند الاستلام' };
        return `<div class="order-card" style="position:relative;">
          <div style="position:absolute;top:16px;left:16px;">
            <button class="btn btn-danger btn-sm" onclick="deleteOrder(${order.id})" title="حذف"><i class="fas fa-trash"></i></button>
          </div>
          <div class="order-header">
            <div>
              <span class="order-id">طلب #${order.id}</span>
              <span style="color:var(--text-light);font-size:13px;margin-right:12px;"><i class="fas fa-calendar"></i> ${order.date}</span>
            </div>
            <select class="status-select" onchange="updateOrderStatus(${order.id}, this.value)">
              <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
              <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>قيد التجهيز</option>
              <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>تم الشحن</option>
              <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>تم التوصيل</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;padding:12px;background:var(--bg);border-radius:10px;">
            <div><strong><i class="fas fa-user"></i> العميل:</strong><br>${order.customer}</div>
            <div><strong><i class="fas fa-phone"></i> الهاتف:</strong><br>${order.phone || '—'}</div>
            <div><strong><i class="fas fa-envelope"></i> البريد:</strong><br>${order.email || '—'}</div>
            <div><strong><i class="fas fa-map-marker-alt"></i> العنوان:</strong><br>${order.address}${order.city ? '، ' + order.city : ''}</div>
            <div><strong><i class="fas fa-credit-card"></i> الدفع:</strong><br>${payLabels[order.payment] || order.payment || '—'}</div>
          </div>
          ${order.transferredToOwner ? `
          <div style="padding:8px 12px;margin-bottom:12px;border-radius:8px;background:${order.transferPaid ? 'var(--success-bg, #d4edda)' : order.transferPaymentConfirmed ? '#cce5ff' : 'var(--warning-bg, #fff3cd)'};border:1px solid ${order.transferPaid ? 'var(--success, #28a745)' : order.transferPaymentConfirmed ? '#004085' : 'var(--warning, #ffc107)'};display:flex;justify-content:space-between;align-items:center;font-size:14px;flex-wrap:wrap;gap:8px;">
            <span><strong>تحويل لصاحب المتجر:</strong> ${order.transferPaid ? '✅ تم الدفع' : order.transferPaymentConfirmed ? '🔄 بانتظار تأكيدك' : '⏳ في انتظار الدفع'}</span>
            <span>المبلغ المحول: ${(order.transferAmount || 0).toLocaleString()} د.ع</span>
            ${order.transferPaymentConfirmed && !order.transferPaid ? `<button class="btn btn-success btn-sm" onclick="confirmAdminPayment(${order.id})"><i class="fas fa-check"></i> تأكيد الدفع وكشف المعلومات</button>` : ''}
          </div>` : ''}
          ${(() => {
            const grouped = {};
            order.items.forEach(item => {
              const sid = item.storeId || 'unknown';
              if (!grouped[sid]) grouped[sid] = [];
              grouped[sid].push(item);
            });
            return Object.entries(grouped).map(([sid, items]) => {
              const store = getStoreById(parseInt(sid));
              const sName = store ? store.name : 'غير معروف';
              const storeTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
              const storeShipping = items.reduce((s, i) => Math.max(s, i.shippingFee || 0), 0);
              const owner = getStoreOwnerByStoreId(parseInt(sid));
              return `<div style="margin-bottom:10px;">
                <div style="font-size:13px;font-weight:800;color:var(--primary);margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
                  <span><i class="fas ${store ? store.icon : 'fa-store'}"></i> ${sName}</span>
                  ${!order.transferredToOwner && owner ? `
                  <button class="btn btn-primary btn-sm" onclick="showTransferModal(${order.id}, ${sid}, ${storeTotal + storeShipping})" style="font-size:11px;"><i class="fas fa-exchange-alt"></i> تحويل لصاحب المتجر</button>
                  ` : ''}
                  ${order.transferredToOwner && order.transferPaid ? `<span style="font-size:11px;color:var(--success);">تم الدفع وتحويل المعلومات</span>` : ''}
                  ${order.transferredToOwner && !order.transferPaid ? `<span style="font-size:11px;color:var(--warning);">في انتظار الدفع</span>` : ''}
                </div>
                ${items.map(item => `<div class="order-item"><span>${item.title} × ${item.quantity}</span><span>${(item.price * item.quantity).toLocaleString()} د.ع</span></div>`).join('')}
                ${storeShipping > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-light);padding:4px 0;"><span>إجمالي رسوم الشحن</span><span>${storeShipping.toLocaleString()} د.ع</span></div>` : ''}
              </div>`;
            }).join('');
          })()}
          <div class="order-total"><span>الإجمالي</span><span>${order.total.toLocaleString()} د.ع</span></div>
        </div>`;
      }).join('')}
    </div>
    <div class="admin-tab-content" id="adminTabCategories" style="display:none;">
      <h2 class="section-title">إدارة الأقسام والتفرعات</h2>
      <button class="btn btn-primary" onclick="showAddCategoryModal()" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة قسم جديد</button>
      ${allStores.map(store => {
        const storeCats = getCategoriesByStore(store.id);
        if (storeCats.length === 0) return '';
        return `<h3 style="margin-bottom:12px;color:var(--primary);"><i class="fas ${store.icon}"></i> ${store.name}</h3>
        <div class="table-wrapper" style="margin-bottom:24px;"><table class="admin-table">
          <thead><tr><th>القسم</th><th>الأيقونة</th><th>التفرعات</th><th>المنتجات</th><th>الإجراء</th></tr></thead>
          <tbody>${storeCats.map(cat => {
            const subs = getSubcategoriesByCategory(cat.id);
            const subsList = subs.map(s => s.name).join('، ');
            const prodCount = getCategoryProductCount(cat.id);
            return `<tr>
              <td><strong>${cat.name}</strong></td>
              <td><i class="fas ${cat.icon}" style="color:var(--primary);"></i></td>
              <td style="font-size:13px;max-width:250px;">${subsList || '<span style="color:var(--text-light)">لا توجد تفرعات</span>'}</td>
              <td>${prodCount}</td>
              <td>
                <button class="btn btn-primary btn-sm" onclick="showAddSubcategoryModal(${cat.id})" style="margin-left:4px;" title="إضافة تفرع"><i class="fas fa-plus"></i></button>
                <button class="btn btn-primary btn-sm" onclick="editCategory(${cat.id})" style="margin-left:4px;" title="تعديل"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteAdminCategory(${cat.id})" title="حذف"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
            <tr style="background:#f8fafc;"><td colspan="5" style="padding:4px 16px 12px;">
              ${subs.map(s => `<span class="subcat-tag" id="subcat-${s.id}"><span>${s.name}</span>
                <button class="subcat-tag-del" onclick="deleteAdminSubcategory(${s.id})" title="حذف التفرع">&times;</button>
              </span>`).join('')}
              ${subs.length === 0 ? '<span style="color:var(--text-light);font-size:13px;">لا توجد تفرعات مضافة</span>' : ''}
            </td></tr>`;
          }).join('')}</tbody>
        </table></div>`;
      }).join('')}
    </div>
    <div class="admin-tab-content" id="adminTabProducts" style="display:none;">
      <h2 class="section-title">إدارة المنتجات</h2>
      <button class="btn btn-primary" onclick="showAddProductModal()" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة منتج جديد</button>
      <div class="table-wrapper"><table class="admin-table">
        <thead><tr><th>#</th><th>المنتج</th><th>التفرع</th><th>المتجر</th><th>السعر</th><th>الحالة</th><th>الإجراء</th></tr></thead>
        <tbody>${products.map(p => {
          const store = getStoreById(p.storeId);
          const subName = getSubcategoryName(p.subcategoryId);
          return `<tr>
            <td>${p.id}</td><td>${p.title}</td><td>${subName}</td>
            <td>${store ? store.name : '—'}</td><td>${p.price.toLocaleString()} د.ع</td>
            <td style="color:${p.inStock ? 'var(--success)' : 'var(--danger)'}">${p.inStock ? 'متوفر' : 'غير متوفر'}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteAdminProduct(${p.id})"><i class="fas fa-trash"></i></button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>
    <div class="admin-tab-content" id="adminTabStores" style="display:none;">
      <h2 class="section-title">إدارة المتاجر</h2>
      <button class="btn btn-primary" onclick="showAddStoreModal()" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة متجر جديد</button>
      <div class="table-wrapper"><table class="admin-table">
        <thead><tr><th>#</th><th>المتجر</th><th>الوصف</th><th>المالك</th><th>الجوال</th><th>المنتجات</th><th>الإجراء</th></tr></thead>
        <tbody>${allStores.map(store => `<tr>
          <td>${store.id}</td><td><i class="fas ${store.icon}" style="margin-left:6px;color:var(--primary);"></i>${store.name}</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${store.description}</td>
          <td>${store.owner}</td><td>${store.phone}</td><td>${getStoreProductCount(store.id)}</td>
          <td><button class="btn btn-primary btn-sm" onclick="editStore(${store.id})" style="margin-left:4px;"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-sm" onclick="deleteAdminStore(${store.id})"><i class="fas fa-trash"></i></button></td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>
    <div class="admin-tab-content" id="adminTabOwners" style="display:none;">
      <h2 class="section-title">إدارة أصحاب المتاجر</h2>
      <button class="btn btn-primary" onclick="showAddOwnerModal()" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة صاحب متجر</button>
      ${owners.length === 0 ? '<p style="text-align:center;color:var(--text-light);padding:40px;">لا يوجد أصحاب متاجر مضافة</p>' : `
      <div class="table-wrapper"><table class="admin-table">
        <thead><tr><th>#</th><th>الاسم</th><th>اسم المستخدم</th><th>المتجر</th><th>الإجراء</th></tr></thead>
        <tbody>${owners.map(owner => {
          const store = getStoreById(owner.storeId);
          return `<tr>
            <td>${owner.id}</td><td>${owner.name}</td><td>${owner.username}</td>
            <td>${store ? store.name : '—'}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteOwner(${owner.id})"><i class="fas fa-trash"></i></button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
    <div class="admin-tab-content" id="adminTabUsers" style="display:none;">
      <h2 class="section-title">جميع المستخدمين</h2>
      <p style="color:var(--text-light);margin-bottom:16px;">قائمة بجميع المستخدمين المسجلين في النظام مع كلمات المرور</p>
      <div class="table-wrapper"><table class="admin-table">
        <thead><tr><th>#</th><th>الاسم</th><th>اسم المستخدم</th><th>كلمة المرور</th><th>الدور</th><th>المتجر</th></tr></thead>
        <tbody>${authUsers.map(u => {
          const roleLabels = { admin: 'مدير', store_owner: 'صاحب متجر', customer: 'زبون' };
          const store = u.storeId ? getStoreById(u.storeId) : null;
          return `<tr>
            <td>${u.id}</td>
            <td>${u.name || '—'}</td>
            <td><strong>${u.username}</strong></td>
            <td><span style="font-family:monospace;background:var(--bg);padding:2px 8px;border-radius:4px;font-size:13px;">${u.password}</span></td>
            <td><span class="role-badge role-${u.role}">${roleLabels[u.role] || u.role}</span></td>
            <td>${store ? store.name : '—'}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>`;
}

function renderStoreOwnerDashboard(storeId) {
  const container = document.getElementById('adminContent');
  if (!container) return;
  const store = getStoreById(storeId);
  if (!store) { container.innerHTML = '<div class="cart-empty"><h2>المتجر غير موجود</h2></div>'; return; }
  const storeProducts = getProductsByStore(storeId);
  const storeCats = getCategoriesByStore(storeId);
  const allOrders = JSON.parse(localStorage.getItem('orders')) || [];
  const transferredOrders = allOrders.filter(o => o.transferredToOwner && o.items.some(i => i.storeId === storeId));
  container.innerHTML = `
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:28px;font-weight:800;"><i class="fas ${store.icon}" style="color:var(--primary);"></i> ${store.name}</h1>
      <p style="color:var(--text-light);">لوحة تحكم المتجر</p>
    </div>
    <div class="admin-tabs">
      <button class="admin-tab active" onclick="switchAdminTab('products', this)"><i class="fas fa-box"></i> منتجاتي</button>
      <button class="admin-tab" onclick="switchAdminTab('categories', this)"><i class="fas fa-sitemap"></i> أقسامي</button>
      <button class="admin-tab" onclick="switchAdminTab('transfers', this)"><i class="fas fa-exchange-alt"></i> الطلبات المحولة</button>
    </div>
    <div class="admin-tab-content" id="adminTabProducts">
      <h2 class="section-title">منتجات المتجر</h2>
      <button class="btn btn-primary" onclick="showAddProductModal()" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة منتج جديد</button>
      ${storeProducts.length === 0 ? '<p style="text-align:center;color:var(--text-light);padding:40px;">لا توجد منتجات في هذا المتجر</p>' : `
      <div class="table-wrapper"><table class="admin-table">
        <thead><tr><th>#</th><th>المنتج</th><th>التفرع</th><th>السعر</th><th>الحالة</th><th>الإجراء</th></tr></thead>
        <tbody>${storeProducts.map(p => {
          const subName = getSubcategoryName(p.subcategoryId);
          return `<tr>
            <td>${p.id}</td><td>${p.title}</td><td>${subName}</td>
            <td>${p.price.toLocaleString()} د.ع</td>
            <td style="color:${p.inStock ? 'var(--success)' : 'var(--danger)'}">${p.inStock ? 'متوفر' : 'غير متوفر'}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteAdminProduct(${p.id})"><i class="fas fa-trash"></i></button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
    <div class="admin-tab-content" id="adminTabCategories" style="display:none;">
      <h2 class="section-title">أقسام المتجر والتفرعات</h2>
      <button class="btn btn-primary" onclick="showAddCategoryModalForOwner(${storeId})" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة قسم جديد</button>
      ${storeCats.length === 0 ? '<p style="text-align:center;color:var(--text-light);padding:40px;">لا توجد أقسام في هذا المتجر</p>' : `
      <div class="table-wrapper"><table class="admin-table">
        <thead><tr><th>القسم</th><th>الأيقونة</th><th>التفرعات</th><th>المنتجات</th><th>الإجراء</th></tr></thead>
        <tbody>${storeCats.map(cat => {
          const subs = getSubcategoriesByCategory(cat.id);
          const prodCount = getCategoryProductCount(cat.id);
          return `<tr>
            <td><strong>${cat.name}</strong></td>
            <td><i class="fas ${cat.icon}" style="color:var(--primary);"></i></td>
            <td style="font-size:13px;">${subs.map(s => s.name).join('، ') || '<span style="color:var(--text-light)">—</span>'}</td>
            <td>${prodCount}</td>
            <td>
              <button class="btn btn-primary btn-sm" onclick="showAddSubcategoryModal(${cat.id})" style="margin-left:4px;" title="إضافة تفرع"><i class="fas fa-plus"></i></button>
              <button class="btn btn-primary btn-sm" onclick="editCategory(${cat.id})" style="margin-left:4px;" title="تعديل"><i class="fas fa-edit"></i></button>
              <button class="btn btn-danger btn-sm" onclick="deleteAdminCategory(${cat.id})" title="حذف"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
    <div class="admin-tab-content" id="adminTabTransfers" style="display:none;">
      <h2 class="section-title">الطلبات المحولة</h2>
      ${transferredOrders.length === 0 ? '<p style="text-align:center;color:var(--text-light);padding:40px;">لا توجد طلبات محولة بعد</p>' : [...transferredOrders].reverse().map(order => {
        const storeItems = order.items.filter(i => i.storeId === storeId);
        const storeTotal = storeItems.reduce((s, i) => s + i.price * i.quantity, 0);
        const hideInfo = !order.customerInfoRevealed;
        return `<div class="order-card" style="border-right:4px solid ${order.transferPaid ? 'var(--success)' : 'var(--warning)'};">
          <div class="order-header">
            <div>
              <span class="order-id">طلب #${order.id}</span>
              <span style="color:var(--text-light);font-size:13px;margin-right:12px;"><i class="fas fa-calendar"></i> ${order.date}</span>
              ${order.transferPaid ? '<span style="color:var(--success);font-size:12px;margin-right:8px;"><i class="fas fa-check-circle"></i> تم الدفع</span>' : order.transferPaymentConfirmed ? '<span style="color:var(--warning);font-size:12px;margin-right:8px;"><i class="fas fa-clock"></i> بانتظار التأكيد</span>' : '<span style="color:var(--warning);font-size:12px;margin-right:8px;"><i class="fas fa-clock"></i> في انتظار الدفع</span>'}
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;padding:12px;background:var(--bg);border-radius:10px;">
            ${hideInfo ? `
            <div><strong><i class="fas fa-user"></i> العميل:</strong><br><span style="color:var(--text-light);">مخفي - يتم الكشف بعد الدفع</span></div>
            <div><strong><i class="fas fa-phone"></i> الهاتف:</strong><br><span style="color:var(--text-light);">مخفي</span></div>
            <div><strong><i class="fas fa-map-marker-alt"></i> العنوان:</strong><br><span style="color:var(--text-light);">مخفي</span></div>
            <div><strong><i class="fas fa-credit-card"></i> الدفع:</strong><br>عند الاستلام</div>
            <div><strong><i class="fas fa-money-bill-wave"></i> المبلغ المطلوب:</strong><br><span style="color:var(--primary);font-weight:800;">${(order.transferAmount || 0).toLocaleString()} د.ع</span></div>
            ` : `
            <div><strong><i class="fas fa-user"></i> العميل:</strong><br>${order.customer}</div>
            <div><strong><i class="fas fa-phone"></i> الهاتف:</strong><br>${order.phone || '—'}</div>
            <div><strong><i class="fas fa-map-marker-alt"></i> العنوان:</strong><br>${order.address}${order.city ? '، ' + order.city : ''}</div>
            <div><strong><i class="fas fa-credit-card"></i> الدفع:</strong><br>عند الاستلام</div>
            <div><strong><i class="fas fa-money-bill-wave"></i> المبلغ المطلوب:</strong><br><span style="color:var(--success);font-weight:800;">${(order.transferAmount || 0).toLocaleString()} د.ع</span></div>
            `}
          </div>
          <div style="margin-bottom:12px;">
            <div style="font-size:13px;font-weight:800;color:var(--primary);margin-bottom:4px;"><i class="fas ${store.icon}"></i> منتجات المتجر</div>
            ${storeItems.map(item => {
              return `<div class="order-item"><span>${item.title} × ${item.quantity}</span><span>${(item.price * item.quantity).toLocaleString()} د.ع</span></div>`;
            }).join('')}
            <div class="order-item" style="font-weight:800;color:var(--primary);"><span>إجمالي المنتجات</span><span>${storeTotal.toLocaleString()} د.ع</span></div>
          </div>
          ${order.transferPaid ? `
          <div style="padding:12px;background:var(--success-bg, #d4edda);border-radius:10px;text-align:center;color:var(--success);font-weight:800;margin-bottom:12px;">
            <i class="fas fa-check-circle"></i> تم الدفع وتم الكشف عن معلومات الزبون
          </div>
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:12px;background:var(--bg);border-radius:10px;">
            <span style="font-weight:800;font-size:14px;">حالة الطلب:</span>
            <select class="status-select" onchange="updateOrderStatus(${order.id}, this.value)" style="flex:1;">
              <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>قيد التجهيز</option>
              <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>تم الشحن</option>
              <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>تم التوصيل</option>
            </select>
          </div>
          ` : order.transferPaymentConfirmed ? `
          <div style="padding:12px;background:var(--warning-bg, #fff3cd);border-radius:10px;text-align:center;color:var(--warning);font-weight:800;">
            <i class="fas fa-clock"></i> في انتظار تأكيد الدفع من المدير
          </div>
          ` : `
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="showPaymentModal(${order.id}, ${storeId})" style="flex:1;"><i class="fas fa-credit-card"></i> دفع ${(order.transferAmount || 0).toLocaleString()} د.ع للمدير</button>
          </div>
          `}
        </div>`;
      }).join('')}
    </div>`;
}

function showAddCategoryModalForOwner(storeId) {
  showAddCategoryModal();
  const sel = document.getElementById('categoryStore');
  if (sel) { sel.value = storeId; sel.disabled = true; }
}

function showAddOwnerModal() {
  document.getElementById('ownerForm').reset();
  document.getElementById('ownerId').value = '';
  const sel = document.getElementById('ownerStore');
  sel.innerHTML = getStores().map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  document.getElementById('ownerModal').style.display = 'flex';
}

function saveOwner() {
  const username = document.getElementById('ownerUsername').value.trim();
  const password = document.getElementById('ownerPassword').value.trim();
  const name = document.getElementById('ownerName').value.trim();
  const storeId = parseInt(document.getElementById('ownerStore').value);
  if (!username || !password || !name || !storeId) { showToast('يرجى تعبئة جميع الحقول'); return; }
  if (authUsers.find(u => u.username === username)) { showToast('اسم المستخدم موجود مسبقاً'); return; }
  addStoreOwner(username, password, name, storeId);
  showToast('تم إضافة صاحب المتجر بنجاح');
  document.getElementById('ownerModal').style.display = 'none';
  renderFullAdminDashboard();
}

function closeOwnerModal() { document.getElementById('ownerModal').style.display = 'none'; }

function deleteOwner(userId) {
  const owner = getAuthUserById(userId);
  if (!owner || !confirm(`هل أنت متأكد من حذف صاحب المتجر "${owner.name}"؟`)) return;
  deleteAuthUser(userId);
  showToast('تم حذف صاحب المتجر');
  renderFullAdminDashboard();
}

function switchAdminTab(tab, btn) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
  const map = { orders: 'Orders', categories: 'Categories', products: 'Products', stores: 'Stores', owners: 'Owners', users: 'Users', transfers: 'Transfers' };
  const el = document.getElementById('adminTab' + map[tab]);
  if (el) el.style.display = 'block';
}

// --- Store CRUD ---
function showAddStoreModal() {
  document.getElementById('storeForm').reset();
  document.getElementById('storeModalTitle').textContent = 'إضافة متجر جديد';
  document.getElementById('storeId').value = '';
  document.getElementById('ownerCredentialsRow').style.display = 'block';
  document.getElementById('storeModal').style.display = 'flex';
}
function editStore(id) {
  const store = getStoreById(id);
  if (!store) return;
  document.getElementById('storeModalTitle').textContent = 'تعديل المتجر';
  document.getElementById('storeId').value = store.id;
  document.getElementById('storeName').value = store.name;
  document.getElementById('storeDesc').value = store.description;
  document.getElementById('storeIcon').value = store.icon;
  document.getElementById('storeOwner').value = store.owner;
  document.getElementById('storePhone').value = store.phone;
  document.getElementById('storePaymentInfo').value = store.paymentInfo || '';
  document.getElementById('ownerCredentialsRow').style.display = 'none';
  document.getElementById('storeModal').style.display = 'flex';
}
function saveStore() {
  const id = document.getElementById('storeId').value;
  const paymentInfo = document.getElementById('storePaymentInfo').value.trim();
  const data = {
    name: document.getElementById('storeName').value.trim(),
    description: document.getElementById('storeDesc').value.trim(),
    icon: document.getElementById('storeIcon').value || 'fa-store',
    owner: document.getElementById('storeOwner').value.trim(),
    phone: document.getElementById('storePhone').value.trim(),
    paymentInfo: paymentInfo
  };
  if (!data.name) { showToast('يرجى إدخال اسم المتجر'); return; }
  if (id) { updateStore(parseInt(id), data); showToast('تم تحديث المتجر بنجاح'); }
  else {
    const newStore = addStore(data.name, data.description, data.icon, data.owner, data.phone, data.paymentInfo);
    const defaultCat = addCategory(newStore.id, 'عام', 'fa-folder');
    addSubcategory(defaultCat.id, 'عام');
    const ownerUsername = document.getElementById('storeOwnerUsername').value.trim();
    const ownerPassword = document.getElementById('storeOwnerPassword').value.trim();
    if (ownerUsername && ownerPassword) {
      addStoreOwner(ownerUsername, ownerPassword, data.owner || data.name, newStore.id);
      showToast('تم إضافة المتجر وحساب صاحبه بنجاح');
    } else {
      showToast('تم إضافة المتجر بنجاح');
    }
  }
  document.getElementById('storeModal').style.display = 'none';
  initAdminDashboard();
}
function closeStoreModal() { document.getElementById('storeModal').style.display = 'none'; }
function deleteAdminStore(id) {
  const store = getStoreById(id);
  if (!store) return;
  const count = getStoreProductCount(id);
  let msg = `هل أنت متأكد من حذف المتجر "${store.name}"؟`;
  if (count > 0) msg += `\nسيتم نقل ${count} منتج إلى المتجر الرئيسي.`;
  if (!confirm(msg)) return;
  getProductsByStore(id).forEach(p => { p.storeId = 1; });
  categories.filter(c => c.storeId === id).forEach(c => deleteCategory(c.id));
  deleteStore(id);
  showToast('تم حذف المتجر');
  initAdminDashboard();
}

// --- Category CRUD ---
function showAddCategoryModal() {
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryModalTitle').textContent = 'إضافة قسم جديد';
  document.getElementById('categoryId').value = '';
  const sel = document.getElementById('categoryStore');
  sel.innerHTML = getStores().map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  const subGroup = document.getElementById('subNameGroup');
  if (subGroup) subGroup.style.display = 'block';
  document.getElementById('categoryModal').style.display = 'flex';
}
function editCategory(id) {
  const cat = getCategoryById(id);
  if (!cat) return;
  document.getElementById('categoryModalTitle').textContent = 'تعديل القسم';
  document.getElementById('categoryId').value = cat.id;
  document.getElementById('categoryName').value = cat.name;
  document.getElementById('categoryIcon').value = cat.icon || 'fa-folder';
  const sel = document.getElementById('categoryStore');
  sel.innerHTML = getStores().map(s => `<option value="${s.id}" ${s.id === cat.storeId ? 'selected' : ''}>${s.name}</option>`).join('');
  const subGroup = document.getElementById('subNameGroup');
  if (subGroup) subGroup.style.display = 'none';
  document.getElementById('categoryModal').style.display = 'flex';
}
function saveCategory() {
  const id = document.getElementById('categoryId').value;
  const storeId = parseInt(document.getElementById('categoryStore').value);
  const name = document.getElementById('categoryName').value.trim();
  const icon = document.getElementById('categoryIcon').value || 'fa-folder';
  if (!name) { showToast('يرجى إدخال اسم القسم'); return; }
  if (id) { updateCategory(parseInt(id), { name, icon, storeId }); showToast('تم تحديث القسم'); }
  else {
    const newCat = addCategory(storeId, name, icon);
    const subName = document.getElementById('categorySubName').value.trim();
    if (subName) {
      addSubcategory(newCat.id, subName);
      showToast('تم إضافة القسم والتفرع');
    } else {
      showToast('تم إضافة القسم');
    }
  }
  document.getElementById('categoryModal').style.display = 'none';
  initAdminDashboard();
}
function closeCategoryModal() { document.getElementById('categoryModal').style.display = 'none'; }
function deleteAdminCategory(id) {
  if (!confirm('هل أنت متأكد من حذف هذا القسم وجميع تفرعاته؟')) return;
  deleteCategory(id); showToast('تم حذف القسم'); initAdminDashboard();
}

// --- Subcategory CRUD ---
function showAddSubcategoryModal(categoryId) {
  document.getElementById('subcategoryForm').reset();
  document.getElementById('subcategoryModalTitle').textContent = 'إضافة تفرع جديد';
  document.getElementById('subcategoryId').value = '';
  document.getElementById('subcategoryParent').value = categoryId || '';
  if (categoryId) {
    const cat = getCategoryById(categoryId);
    document.querySelector('#subcategoryModal .modal-header p')?.remove();
    const p = document.createElement('p');
    p.style.cssText = 'color:var(--text-light);font-size:14px;';
    p.textContent = `القسم: ${cat ? cat.name : ''}`;
    document.querySelector('#subcategoryModal .modal-header').appendChild(p);
  }
  document.getElementById('subcategoryModal').style.display = 'flex';
}
function editSubcategory(id) {
  const sub = getSubcategoryById(id);
  if (!sub) return;
  document.getElementById('subcategoryModalTitle').textContent = 'تعديل التفرع';
  document.getElementById('subcategoryId').value = sub.id;
  document.getElementById('subcategoryName').value = sub.name;
  document.getElementById('subcategoryParent').value = sub.categoryId;
  document.getElementById('subcategoryModal').style.display = 'flex';
}
function saveSubcategory() {
  const id = document.getElementById('subcategoryId').value;
  const categoryId = parseInt(document.getElementById('subcategoryParent').value);
  const name = document.getElementById('subcategoryName').value.trim();
  if (!name || !categoryId) { showToast('يرجى إدخال اسم التفرع'); return; }
  if (id) { updateSubcategory(parseInt(id), { name, categoryId }); showToast('تم تحديث التفرع'); }
  else { addSubcategory(categoryId, name); showToast('تم إضافة التفرع'); }
  document.getElementById('subcategoryModal').style.display = 'none';
  initAdminDashboard();
}
function closeSubcategoryModal() { document.getElementById('subcategoryModal').style.display = 'none'; }
function deleteAdminSubcategory(id) {
  const sub = getSubcategoryById(id);
  const pCount = getSubcategoryProductCount(id);
  let msg = `هل أنت متأكد من حذف التفرع "${sub ? sub.name : ''}"؟`;
  if (pCount > 0) msg += `\nسيتم إلغاء تصنيف ${pCount} منتج.`;
  if (!confirm(msg)) return;
  products.filter(p => p.subcategoryId === id).forEach(p => { p.subcategoryId = null; });
  deleteSubcategory(id); showToast('تم حذف التفرع'); initAdminDashboard();
}

// --- Product CRUD ---
function showAddProductModal() {
  document.getElementById('productForm').reset();
  document.getElementById('productModalTitle').textContent = 'إضافة منتج جديد';
  document.getElementById('productId').value = '';
  const storeSel = document.getElementById('productStore');
  storeSel.innerHTML = getStores().map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  storeSel.disabled = false;
  const user = getCurrentUser();
  if (user && user.role === 'store_owner' && user.storeId) {
    storeSel.value = user.storeId;
    storeSel.disabled = true;
  }
  updateSubcategorySelect();
  document.getElementById('productModal').style.display = 'flex';
}
function updateSubcategorySelect() {
  const storeId = parseInt(document.getElementById('productStore')?.value);
  const subSel = document.getElementById('productSubcategory');
  if (!subSel) return;
  let options = '<option value="">اختر التفرع...</option>';
  if (storeId) {
    const cats = getCategoriesByStore(storeId);
    cats.forEach(cat => {
      const subs = getSubcategoriesByCategory(cat.id);
      subs.forEach(s => { options += `<option value="${s.id}">${cat.name} / ${s.name}</option>`; });
    });
  }
  subSel.innerHTML = options;
}
function saveProduct() {
  const id = document.getElementById('productId').value;
  const storeSel = document.getElementById('productStore');
  const storeId = storeSel.disabled ? parseInt(storeSel.value) : (parseInt(storeSel.value) || 1);
  const title = document.getElementById('productTitle').value.trim();
  const description = document.getElementById('productDesc').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value) || 0;
  const icon = document.getElementById('productIcon').value || 'fa-box';
  const inStock = document.getElementById('productStock').checked;
  const subcategoryId = parseInt(document.getElementById('productSubcategory').value) || null;
  const shippingFee = parseInt(document.getElementById('productShipping').value) || 0;
  if (!title || price <= 0) { showToast('يرجى إدخال اسم المنتج وسعر صالح'); return; }
  const fileInput = document.getElementById('productImage');
  function save(img) {
    addProduct({ title, description, price, icon, image: img || '', inStock, storeId, subcategoryId, shippingFee });
    showToast('تم إضافة المنتج بنجاح');
    document.getElementById('productModal').style.display = 'none';
    initAdminDashboard();
  }
  if (fileInput && fileInput.files && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) { save(e.target.result); };
    reader.readAsDataURL(fileInput.files[0]);
  } else { save(''); }
}
function closeProductModal() { document.getElementById('productModal').style.display = 'none'; }
function deleteAdminProduct(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
  deleteProduct(id); showToast('تم حذف المنتج'); initAdminDashboard();
}

function updateOrderStatus(orderId, newStatus) {
  const orders = JSON.parse(localStorage.getItem('orders')) || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  order.status = newStatus;
  localStorage.setItem('orders', JSON.stringify(orders));
  showToast('تم تحديث حالة الطلب');
  initAdminDashboard();
}
function deleteOrder(orderId) {
  if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
  let orders = JSON.parse(localStorage.getItem('orders')) || [];
  orders = orders.filter(o => o.id !== orderId);
  localStorage.setItem('orders', JSON.stringify(orders));
  showToast('تم حذف الطلب'); initAdminDashboard();
}

// ===== TRANSFER ORDER TO STORE OWNER =====
function showTransferModal(orderId, storeId, amount) {
  const modal = document.getElementById('transferModal');
  if (!modal) return;
  document.getElementById('transferOrderId').value = orderId;
  document.getElementById('transferStoreId').value = storeId;
  document.getElementById('transferAmount').value = amount;
  document.getElementById('transferAmountLabel').textContent = 'المبلغ المطلوب تحويله (د.ع):';
  modal.style.display = 'flex';
}

function confirmTransfer() {
  const orderId = parseInt(document.getElementById('transferOrderId').value);
  const storeId = parseInt(document.getElementById('transferStoreId').value);
  const transferAmount = parseFloat(document.getElementById('transferAmount').value) || 0;
  if (transferAmount <= 0) { showToast('يرجى إدخال مبلغ صحيح'); return; }
  const orders = JSON.parse(localStorage.getItem('orders')) || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) { showToast('الطلب غير موجود'); return; }
  order.transferredToOwner = true;
  order.transferAmount = transferAmount;
  order.transferPaid = false;
  order.transferPaymentConfirmed = false;
  order.customerInfoRevealed = false;
  localStorage.setItem('orders', JSON.stringify(orders));
  closeTransferModal();
  showToast('تم تحويل الطلب إلى صاحب المتجر');
  initAdminDashboard();
}

function closeTransferModal() {
  const modal = document.getElementById('transferModal');
  if (modal) modal.style.display = 'none';
}

// ===== ADMIN CONFIRM PAYMENT =====
function confirmAdminPayment(orderId) {
  if (!confirm('تأكيد استلام المبلغ من صاحب المتجر؟ بعد التأكيد سيتم الكشف عن معلومات الزبون')) return;
  const orders = JSON.parse(localStorage.getItem('orders')) || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) { showToast('الطلب غير موجود'); return; }
  order.transferPaid = true;
  order.customerInfoRevealed = true;
  localStorage.setItem('orders', JSON.stringify(orders));
  showToast('تم تأكيد الدفع! تم الكشف عن معلومات الزبون لصاحب المتجر');
  initAdminDashboard();
}

// ===== STORE OWNER PAY ADMIN =====
function showPaymentModal(orderId, storeId) {
  const store = getStoreById(storeId);
  const orders = JSON.parse(localStorage.getItem('orders')) || [];
  const order = orders.find(o => o.id === orderId);
  if (!order || !store) { showToast('الطلب أو المتجر غير موجود'); return; }
  const modal = document.getElementById('storePaymentModal');
  if (!modal) return;
  document.getElementById('payOrderId').value = orderId;
  document.getElementById('payStoreId').value = storeId;
  document.getElementById('payAmount').textContent = (order.transferAmount || 0).toLocaleString();
  document.getElementById('payBankInfo').textContent = store.paymentInfo || 'لم يتم إضافة معلومات الدفع بعد';
  modal.style.display = 'flex';
}
function closePaymentModal() {
  const modal = document.getElementById('storePaymentModal');
  if (modal) modal.style.display = 'none';
}
function confirmStorePayment() {
  const orderId = parseInt(document.getElementById('payOrderId').value);
  const orders = JSON.parse(localStorage.getItem('orders')) || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) { showToast('الطلب غير موجود'); return; }
  order.transferPaymentConfirmed = true;
  localStorage.setItem('orders', JSON.stringify(orders));
  closePaymentModal();
  showToast('تم إرسال طلب الدفع، في انتظار تأكيد المدير');
  initAdminDashboard();
}
