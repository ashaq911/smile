import { getCurrentUser, getStoreOwners, getStoreOwnerByStoreId, getAuthUserById, deleteAuthUser, addStoreOwner, getAllAuthUsers } from '../services/auth.js';
import { getStores, getStoreById, addStore, updateStore, deleteStore } from '../services/stores.js';
import { getCategories, getSubcategories, getCategoryById, getCategoriesByStore, getSubcategoriesByCategory, getSubcategoryById, addCategory, updateCategory, deleteCategory, addSubcategory, updateSubcategory, deleteSubcategory } from '../services/categories.js';
import { getProducts, getProductById, getProductsByStore, addProduct, deleteProduct, getStoreProductCount, getSubcategoryProductCount, getCategoryProductCount } from '../services/products.js';
import { showToast } from './toast.js';

let cachedOrders = [];
let cachedTransfers = [];
let cachedOwners = [];

async function fetchAdminData() {
  try {
    const token = localStorage.getItem('auth_token');
    const ac = new AbortController(), ac2 = new AbortController();
    setTimeout(() => ac.abort(), 4000);
    setTimeout(() => ac2.abort(), 4000);
    const [orders, transfers] = await Promise.all([
      fetch('/api/orders', { signal: ac.signal, headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/orders/transfers', { signal: ac2.signal, headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []).catch(() => [])
    ]);
    cachedOrders = orders;
    cachedTransfers = transfers;
  } catch { cachedOrders = []; cachedTransfers = []; }
}

async function fetchOwners() {
  try {
    const token = localStorage.getItem('auth_token');
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 4000);
    const res = await fetch('/api/auth/owners', { signal: ac.signal, headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) cachedOwners = await res.json();
  } catch { cachedOwners = []; }
}

async function fetchOrdersForOwner(storeId) {
  try {
    const token = localStorage.getItem('auth_token');
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 8000);
    const res = await fetch('/api/orders', { signal: ac.signal, headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) { cachedOrders = []; return; }
    const all = await res.json();
    cachedOrders = all.filter(o => o.items && o.items.some(i => i.storeId === storeId));
    // Lazy load transfers in background
    for (const o of cachedOrders) {
      fetch(`/api/orders/transfers?orderId=${o.id}&storeId=${storeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.ok ? r.json() : []).then(t => { o._transfer = t; }).catch(() => {});
    }
  } catch { cachedOrders = []; }
}

function loadAdminCache(user) {
  const key = 'cache_admin_' + user.id;
  const raw = localStorage.getItem(key);
  if (raw) try { const d = JSON.parse(raw); cachedOrders = d.orders || []; cachedTransfers = d.transfers || []; cachedOwners = d.owners || []; return true; } catch {}
  return false;
}

function saveAdminCache(user) {
  const key = 'cache_admin_' + user.id;
  localStorage.setItem(key, JSON.stringify({ orders: cachedOrders, transfers: cachedTransfers, owners: cachedOwners }));
}

export async function initAdminDashboard() {
  const container = document.getElementById('adminContent');
  if (!container) return;
  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = `<div class="cart-empty"><i class="fas fa-user-lock"></i><h2>يرجى تسجيل الدخول</h2><p>يجب تسجيل الدخول للوصول إلى لوحة التحكم</p><button class="btn btn-primary" onclick="window.authShowLogin()">تسجيل الدخول</button></div>`;
    return;
  }
  if (user.role === 'admin') {
    const hasCache = loadAdminCache(user);
    if (hasCache) {
      renderFullAdminDashboard();
      Promise.all([fetchAdminData(), fetchOwners()]).then(() => { try { saveAdminCache(user); renderFullAdminDashboard(); } catch {} }).catch(() => {});
    } else {
      container.innerHTML = '<div class="admin-loading" style="text-align:center;padding:60px;"><i class="fas fa-spinner fa-spin fa-3x" style="color:var(--primary);"></i><p style="margin-top:16px;color:var(--text-light);">جاري تحميل لوحة التحكم...</p></div>';
      await Promise.all([fetchAdminData(), fetchOwners()]);
      saveAdminCache(user);
      try { await renderFullAdminDashboard(); } catch (e) { container.innerHTML = '<div class="cart-empty"><h2>حدث خطأ</h2><p>تعذر تحميل بيانات لوحة التحكم، حاول التحديث</p></div>'; }
    }
  } else if (user.role === 'store_owner') {
    const key = 'cache_store_orders_' + user.id;
    const raw = localStorage.getItem(key);
    if (raw) { try { cachedOrders = JSON.parse(raw); renderStoreOwnerDashboard(user.storeId); } catch {} }
    fetchOrdersForOwner(user.storeId).then(() => {
      localStorage.setItem(key, JSON.stringify(cachedOrders));
      try { renderStoreOwnerDashboard(user.storeId); } catch {}
    }).catch(() => {});
    if (!raw) { container.innerHTML = '<div class="admin-loading" style="text-align:center;padding:60px;"><i class="fas fa-spinner fa-spin fa-3x" style="color:var(--primary);"></i><p style="margin-top:16px;color:var(--text-light);">جاري تحميل لوحة التحكم...</p></div>'; }
  } else {
    container.innerHTML = '<div class="cart-empty"><h2>ليس لديك صلاحية</h2><p>عذراً، لا تملك صلاحية الوصول إلى هذه الصفحة</p></div>';
  }
}
window.initAdminDashboard = initAdminDashboard;

async function renderFullAdminDashboard() {
  const container = document.getElementById('adminContent');
  if (!container) return;
  const totalRevenue = cachedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = cachedOrders.length;
  const pendingOrders = cachedOrders.filter(o => o.status === 'pending').length;
  const deliveredOrders = cachedOrders.filter(o => o.status === 'delivered').length;
  const allStores = getStores();
  const owners = cachedOwners;
  container.innerHTML = `
    <div class="admin-tabs">
      <button class="admin-tab active" onclick="window.switchAdminTab('orders', this)"><i class="fas fa-shopping-bag"></i> الطلبات</button>
      <button class="admin-tab" onclick="window.switchAdminTab('categories', this)"><i class="fas fa-sitemap"></i> الأقسام</button>
      <button class="admin-tab" onclick="window.switchAdminTab('products', this)"><i class="fas fa-box"></i> المنتجات</button>
      <button class="admin-tab" onclick="window.switchAdminTab('stores', this)"><i class="fas fa-store"></i> المتاجر</button>
      <button class="admin-tab" onclick="window.switchAdminTab('owners', this)"><i class="fas fa-users-cog"></i> أصحاب المتاجر</button>
      <button class="admin-tab" onclick="window.switchAdminTab('users', this)"><i class="fas fa-users"></i> المستخدمين</button>
      <button class="admin-tab" onclick="window.switchAdminTab('reports', this)"><i class="fas fa-chart-bar"></i> التقارير</button>
      <button class="admin-tab" onclick="window.switchAdminTab('alerts', this)"><i class="fas fa-exclamation-triangle"></i> التنبيهات</button>
    </div>
    <div class="admin-tab-content" id="adminTabOrders">
      <div class="admin-stats">
        <div class="stat-card"><i class="fas fa-shopping-bag"></i><h3>إجمالي الطلبات</h3><div class="stat-value">${totalOrders}</div></div>
        <div class="stat-card"><i class="fas fa-money-bill-wave"></i><h3>إجمالي الإيرادات</h3><div class="stat-value">${totalRevenue.toLocaleString()} د.ع</div></div>
        <div class="stat-card"><i class="fas fa-clock"></i><h3>قيد الانتظار</h3><div class="stat-value">${pendingOrders}</div></div>
        <div class="stat-card"><i class="fas fa-check-circle"></i><h3>تم التوصيل</h3><div class="stat-value">${deliveredOrders}</div></div>
      </div>
      <h2 class="section-title">جميع الطلبات</h2>
      ${cachedOrders.length === 0 ? '<p style="text-align:center;color:var(--text-light);padding:40px;">لا توجد طلبات حتى الآن</p>' : [...cachedOrders].reverse().map(order => {
        const statusLabels = { pending: 'قيد الانتظار', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التوصيل', cancelled: 'ملغي' };
        const transfer = cachedTransfers.find(t => t.orderId === order.id);
        return `<div class="order-card" style="position:relative;">
          <div style="position:absolute;top:16px;left:16px;">
            <button class="btn btn-danger btn-sm" onclick="window.deleteOrder(${order.id})" title="حذف"><i class="fas fa-trash"></i></button>
          </div>
          <div class="order-header">
            <div><span class="order-id">طلب #${order.id}</span><span style="color:var(--text-light);font-size:13px;margin-right:12px;"><i class="fas fa-calendar"></i> ${order.createdAt || ''}</span></div>
            <select class="status-select" onchange="window.updateOrderStatus(${order.id}, this.value)">
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
            <div><strong><i class="fas fa-credit-card"></i> الدفع:</strong><br>الدفع عند الاستلام</div>
          </div>
          ${transfer ? `
          <div style="padding:8px 12px;margin-bottom:12px;border-radius:8px;background:${transfer.transferPaid ? '#d4edda' : transfer.transferPaymentConfirmed ? '#cce5ff' : '#fff3cd'};border:1px solid ${transfer.transferPaid ? '#28a745' : transfer.transferPaymentConfirmed ? '#004085' : '#ffc107'};display:flex;justify-content:space-between;align-items:center;font-size:14px;flex-wrap:wrap;gap:8px;">
            <span><strong>تحويل لصاحب المتجر:</strong> ${transfer.transferPaid ? '✅ تم الدفع' : transfer.transferPaymentConfirmed ? '🔄 بانتظار تأكيدك' : '⏳ في انتظار الدفع'}</span>
            <span>المبلغ المحول: ${(transfer.amount || 0).toLocaleString()} د.ع</span>
            ${transfer.transferPaymentConfirmed && !transfer.transferPaid ? `<button class="btn btn-success btn-sm" onclick="window.confirmAdminPayment(${transfer.id}, ${order.id})"><i class="fas fa-check"></i> تأكيد الدفع وكشف المعلومات</button>` : ''}
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
                  ${!transfer && owner ? `<button class="btn btn-primary btn-sm" onclick="window.showTransferModal(${order.id}, ${sid}, ${storeTotal + storeShipping})" style="font-size:11px;"><i class="fas fa-exchange-alt"></i> تحويل لصاحب المتجر</button>` : ''}
                  ${transfer && transfer.transferPaid ? `<span style="font-size:11px;color:var(--success);">تم الدفع وتحويل المعلومات</span>` : ''}
                  ${transfer && !transfer.transferPaid ? `<span style="font-size:11px;color:var(--warning);">في انتظار الدفع</span>` : ''}
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
      <button class="btn btn-primary" onclick="window.showAddCategoryModal()" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة قسم جديد</button>
      ${allStores.map(store => {
        const storeCats = getCategoriesByStore(store.id);
        if (storeCats.length === 0) return '';
        return `<h3 style="margin-bottom:12px;color:var(--primary);"><i class="fas ${store.icon}"></i> ${store.name}</h3>
        <div class="table-wrapper" style="margin-bottom:24px;"><table class="admin-table">
          <thead><tr><th>القسم</th><th>الأيقونة</th><th>التفرعات</th><th>المنتجات</th><th>الإجراء</th></tr></thead>
          <tbody>${storeCats.map(cat => {
            const subs = getSubcategoriesByCategory(cat.id);
            const prodCount = getCategoryProductCount(cat.id, getSubcategories());
            return `<tr>
              <td><strong>${cat.name}</strong></td>
              <td><i class="fas ${cat.icon}" style="color:var(--primary);"></i></td>
              <td style="font-size:13px;max-width:250px;">${subs.map(s => s.name).join('، ') || '<span style="color:var(--text-light)">لا توجد تفرعات</span>'}</td>
              <td>${prodCount}</td>
              <td>
                <button class="btn btn-primary btn-sm" onclick="window.showAddSubcategoryModal(${cat.id})" style="margin-left:4px;" title="إضافة تفرع"><i class="fas fa-plus"></i></button>
                <button class="btn btn-primary btn-sm" onclick="window.editCategory(${cat.id})" style="margin-left:4px;" title="تعديل"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger btn-sm" onclick="window.deleteAdminCategory(${cat.id})" title="حذف"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
            <tr style="background:#f8fafc;"><td colspan="5" style="padding:4px 16px 12px;">
              ${subs.map(s => `<span class="subcat-tag" id="subcat-${s.id}"><span>${s.name}</span>
                <button class="subcat-tag-del" onclick="window.deleteAdminSubcategory(${s.id})" title="حذف التفرع">&times;</button>
              </span>`).join('')}
              ${subs.length === 0 ? '<span style="color:var(--text-light);font-size:13px;">لا توجد تفرعات مضافة</span>' : ''}
            </td></tr>`;
          }).join('')}</tbody>
        </table></div>`;
      }).join('')}
    </div>
    <div class="admin-tab-content" id="adminTabProducts" style="display:none;">
      <h2 class="section-title">إدارة المنتجات</h2>
      <button class="btn btn-primary" onclick="window.openAddProductModal()" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة منتج جديد</button>
      <div class="table-wrapper"><table class="admin-table">
        <thead><tr><th>#</th><th>المنتج</th><th>التفرع</th><th>المتجر</th><th>السعر</th><th>الحالة</th><th>الإجراء</th></tr></thead>
        <tbody>${getProducts().map(p => {
          const store = getStoreById(p.storeId);
          const sub = getSubcategoryById(p.subcategoryId);
          const subName = sub ? sub.name : 'غير مصنف';
          return `<tr>
            <td>${p.id}</td><td>${p.title}</td><td>${subName}</td>
            <td>${store ? store.name : '—'}</td><td>${p.price.toLocaleString()} د.ع</td>
            <td style="color:${p.inStock ? 'var(--success)' : 'var(--danger)'}">${p.inStock ? 'متوفر' : 'غير متوفر'}</td>
            <td><button class="btn btn-danger btn-sm" onclick="window.deleteAdminProduct(${p.id})"><i class="fas fa-trash"></i></button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>
    <div class="admin-tab-content" id="adminTabStores" style="display:none;">
      <h2 class="section-title">إدارة المتاجر</h2>
      <button class="btn btn-primary" onclick="window.showAddStoreModal()" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة متجر جديد</button>
      <div class="table-wrapper"><table class="admin-table">
        <thead><tr><th>#</th><th>المتجر</th><th>الوصف</th><th>المالك</th><th>الجوال</th><th>المنتجات</th><th>الإجراء</th></tr></thead>
        <tbody>${allStores.map(store => `<tr>
          <td>${store.id}</td><td><i class="fas ${store.icon}" style="margin-left:6px;color:var(--primary);"></i>${store.name}</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${store.description}</td>
          <td>${store.owner}</td><td>${store.phone}</td><td>${getStoreProductCount(store.id)}</td>
          <td><button class="btn btn-primary btn-sm" onclick="window.editStore(${store.id})" style="margin-left:4px;"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-sm" onclick="window.deleteAdminStore(${store.id})"><i class="fas fa-trash"></i></button></td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>
    <div class="admin-tab-content" id="adminTabOwners" style="display:none;">
      <h2 class="section-title">إدارة أصحاب المتاجر</h2>
      <button class="btn btn-primary" onclick="window.showAddOwnerModal()" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة صاحب متجر</button>
      ${owners.length === 0 ? '<p style="text-align:center;color:var(--text-light);padding:40px;">لا يوجد أصحاب متاجر مضافة</p>' : `
      <div class="table-wrapper"><table class="admin-table">
        <thead><tr><th>#</th><th>الاسم</th><th>اسم المستخدم</th><th>المتجر</th><th>الإجراء</th></tr></thead>
        <tbody>${owners.map(owner => {
          const store = getStoreById(owner.storeId);
          return `<tr>
            <td>${owner.id}</td><td>${owner.name}</td><td>${owner.username}</td>
            <td>${store ? store.name : '—'}</td>
            <td><button class="btn btn-danger btn-sm" onclick="window.deleteOwner(${owner.id})"><i class="fas fa-trash"></i></button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
    <div class="admin-tab-content" id="adminTabUsers" style="display:none;">
      <h2 class="section-title">جميع المستخدمين</h2>
      <p style="color:var(--text-light);margin-bottom:16px;">قائمة بجميع المستخدمين المسجلين في النظام مع كلمات المرور</p>
      <div class="table-wrapper"><table class="admin-table">
        <thead><tr><th>#</th><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>المتجر</th></tr></thead>
        <tbody>${owners.map(u => {
          const roleLabels = { admin: 'مدير', store_owner: 'صاحب متجر', customer: 'زبون' };
          const store = u.storeId ? getStoreById(u.storeId) : null;
          return `<tr>
            <td>${u.id}</td><td>${u.name || '—'}</td>
            <td><strong>${u.username}</strong></td>
            <td><span class="role-badge role-${u.role}">${roleLabels[u.role] || u.role}</span></td>
            <td>${store ? store.name : '—'}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>
    <div class="admin-tab-content" id="adminTabReports" style="display:none;">
      <h2 class="section-title">التقارير والإحصائيات</h2>
      <div class="admin-stats" style="margin-bottom:24px;">
        <div class="stat-card"><i class="fas fa-shopping-bag"></i><h3>إجمالي الطلبات</h3><div class="stat-value">${totalOrders}</div></div>
        <div class="stat-card"><i class="fas fa-money-bill-wave"></i><h3>إجمالي الإيرادات</h3><div class="stat-value">${totalRevenue.toLocaleString()} د.ع</div></div>
        <div class="stat-card"><i class="fas fa-cubes"></i><h3>إجمالي المنتجات</h3><div class="stat-value">${getProducts().length}</div></div>
        <div class="stat-card"><i class="fas fa-store"></i><h3>المتاجر</h3><div class="stat-value">${allStores.length}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-xl);padding:20px;">
          <h3 style="margin-bottom:16px;text-align:center;">حالة الطلبات</h3>
          <canvas id="ordersChart" height="200"></canvas>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-xl);padding:20px;">
          <h3 style="margin-bottom:16px;text-align:center;">المنتجات حسب المتجر</h3>
          <canvas id="storesChart" height="200"></canvas>
        </div>
      </div>
      <div style="text-align:center;margin-top:16px;">
        <button class="btn btn-primary" onclick="window.exportReport()"><i class="fas fa-download"></i> تصدير التقرير</button>
      </div>
    </div>
    <div class="admin-tab-content" id="adminTabAlerts" style="display:none;">
      <h2 class="section-title">تنبيهات المخزون</h2>
      ${(() => {
        const lowStock = getProducts().filter(p => !p.inStock);
        if (lowStock.length === 0) return '<p style="text-align:center;color:var(--success);padding:40px;"><i class="fas fa-check-circle" style="font-size:48px;display:block;margin-bottom:12px;"></i> جميع المنتجات متوفرة في المخزون</p>';
        return `<div class="table-wrapper"><table class="admin-table">
          <thead><tr><th>#</th><th>المنتج</th><th>المتجر</th><th>السعر</th></tr></thead>
          <tbody>${lowStock.map(p => {
            const store = getStoreById(p.storeId);
            return `<tr style="background:#fff3cd;">
              <td>${p.id}</td><td><strong>${p.title}</strong></td>
              <td>${store ? store.name : '—'}</td>
              <td>${p.price.toLocaleString()} د.ع</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
        <p style="color:var(--danger);margin-top:12px;"><i class="fas fa-exclamation-circle"></i> هذه المنتجات نفدت من المخزون وتحتاج إلى إعادة تزويد</p></div>`;
      })()}
    </div>`;
  renderCharts();
}

function renderCharts() {
  setTimeout(() => {
    try {
      const statusCounts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
      cachedOrders.forEach(o => { if (statusCounts[o.status] !== undefined) statusCounts[o.status]++; });
      const ctx = document.getElementById('ordersChart');
      if (ctx && window.Chart) {
        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['قيد الانتظار', 'قيد التجهيز', 'تم الشحن', 'تم التوصيل', 'ملغي'],
            datasets: [{ data: [statusCounts.pending, statusCounts.processing, statusCounts.shipped, statusCounts.delivered, statusCounts.cancelled], backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'] }]
          },
          options: { responsive: true, plugins: { legend: { position: 'bottom', rtl: true } } }
        });
      }
      const stores = getStores();
      const storeData = stores.map(s => getStoreProductCount(s.id));
      const ctx2 = document.getElementById('storesChart');
      if (ctx2 && window.Chart) {
        new Chart(ctx2, {
          type: 'bar',
          data: {
            labels: stores.map(s => s.name),
            datasets: [{ label: 'عدد المنتجات', data: storeData, backgroundColor: '#3b82f6' }]
          },
          options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
      }
    } catch {}
  }, 100);
}

function renderStoreOwnerDashboard(storeId) {
  const container = document.getElementById('adminContent');
  if (!container) return;
  const store = getStoreById(storeId);
  if (!store) { container.innerHTML = '<div class="cart-empty"><h2>المتجر غير موجود</h2></div>'; return; }
  const storeProducts = getProductsByStore(storeId);
  const storeCats = getCategoriesByStore(storeId);
  container.innerHTML = `
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:28px;font-weight:800;"><i class="fas ${store.icon}" style="color:var(--primary);"></i> ${store.name}</h1>
      <p style="color:var(--text-light);">لوحة تحكم المتجر</p>
    </div>
    <div class="admin-tabs">
      <button class="admin-tab active" onclick="window.switchAdminTab('products', this)"><i class="fas fa-box"></i> منتجاتي</button>
      <button class="admin-tab" onclick="window.switchAdminTab('categories', this)"><i class="fas fa-sitemap"></i> أقسامي</button>
      <button class="admin-tab" onclick="window.switchAdminTab('transfers', this)"><i class="fas fa-exchange-alt"></i> الطلبات المحولة</button>
    </div>
    <div class="admin-tab-content" id="adminTabProducts">
      <h2 class="section-title">منتجات المتجر</h2>
      <button class="btn btn-primary" onclick="window.openAddProductModal()" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة منتج جديد</button>
      ${storeProducts.length === 0 ? '<p style="text-align:center;color:var(--text-light);padding:40px;">لا توجد منتجات في هذا المتجر</p>' : `
      <div class="table-wrapper"><table class="admin-table">
        <thead><tr><th>#</th><th>المنتج</th><th>التفرع</th><th>السعر</th><th>الحالة</th><th>الإجراء</th></tr></thead>
        <tbody>${storeProducts.map(p => {
          const sub = getSubcategoryById(p.subcategoryId);
          const subName = sub ? sub.name : 'غير مصنف';
          return `<tr>
            <td>${p.id}</td><td>${p.title}</td><td>${subName}</td>
            <td>${p.price.toLocaleString()} د.ع</td>
            <td style="color:${p.inStock ? 'var(--success)' : 'var(--danger)'}">${p.inStock ? 'متوفر' : 'غير متوفر'}</td>
            <td><button class="btn btn-danger btn-sm" onclick="window.deleteAdminProduct(${p.id})"><i class="fas fa-trash"></i></button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
    <div class="admin-tab-content" id="adminTabCategories" style="display:none;">
      <h2 class="section-title">أقسام المتجر والتفرعات</h2>
      <button class="btn btn-primary" onclick="window.showAddCategoryModal()" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة قسم جديد</button>
      ${storeCats.length === 0 ? '<p style="text-align:center;color:var(--text-light);padding:40px;">لا توجد أقسام في هذا المتجر</p>' : `
      <div class="table-wrapper"><table class="admin-table">
        <thead><tr><th>القسم</th><th>الأيقونة</th><th>التفرعات</th><th>المنتجات</th><th>الإجراء</th></tr></thead>
        <tbody>${storeCats.map(cat => {
          const subs = getSubcategoriesByCategory(cat.id);
          const prodCount = getCategoryProductCount(cat.id, getSubcategories());
          return `<tr>
            <td><strong>${cat.name}</strong></td>
            <td><i class="fas ${cat.icon}" style="color:var(--primary);"></i></td>
            <td style="font-size:13px;">${subs.map(s => s.name).join('، ') || '<span style="color:var(--text-light)">—</span>'}</td>
            <td>${prodCount}</td>
            <td>
              <button class="btn btn-primary btn-sm" onclick="window.showAddSubcategoryModal(${cat.id})" style="margin-left:4px;" title="إضافة تفرع"><i class="fas fa-plus"></i></button>
              <button class="btn btn-primary btn-sm" onclick="window.editCategory(${cat.id})" style="margin-left:4px;" title="تعديل"><i class="fas fa-edit"></i></button>
              <button class="btn btn-danger btn-sm" onclick="window.deleteAdminCategory(${cat.id})" title="حذف"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
    <div class="admin-tab-content" id="adminTabTransfers" style="display:none;">
      <h2 class="section-title">الطلبات المحولة لك</h2>
      <p style="color:var(--text-light);margin-bottom:16px;">هذه الطلبات تم تحويلها من المدير لمتجرك</p>
      ${cachedOrders.length === 0 ? '<p style="text-align:center;color:var(--text-light);padding:40px;">لا توجد طلبات محولة بعد</p>' : [...cachedOrders].reverse().map(order => {
        const statusLabels = { pending: 'قيد الانتظار', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التوصيل', cancelled: 'ملغي' };
        const transfer = order._transfer;
        return `<div class="order-card">
          <div class="order-header">
            <div><span class="order-id">طلب #${order.id}</span></div>
            <span class="order-status status-${order.status}">${statusLabels[order.status] || order.status}</span>
          </div>
          <div style="padding:8px 12px;margin-bottom:12px;border-radius:8px;background:#fff3cd;border:1px solid #ffc107;display:flex;justify-content:space-between;align-items:center;font-size:14px;flex-wrap:wrap;gap:8px;">
            <span><strong>مبلغ التحويل:</strong> ${(transfer ? transfer.amount : 0).toLocaleString()} د.ع</span>
            <span>الحالة: ${transfer && transfer.transferPaid ? '✅ تم استلام المبلغ' : transfer && transfer.transferPaymentConfirmed ? '🔄 تم تأكيد الدفع من قبلك، في انتظار تأكيد المدير' : '⏳ لم يتم الدفع بعد'}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;padding:12px;background:var(--bg);border-radius:10px;font-size:14px;">
            ${transfer && transfer.customerInfoRevealed ? `
              <div><strong><i class="fas fa-user"></i> العميل:</strong> ${order.customer}</div>
              <div><strong><i class="fas fa-phone"></i> الهاتف:</strong> ${order.phone || '—'}</div>
              <div><strong><i class="fas fa-envelope"></i> البريد:</strong> ${order.email || '—'}</div>
              <div><strong><i class="fas fa-map-marker-alt"></i> العنوان:</strong> ${order.address}${order.city ? '، ' + order.city : ''}</div>
            ` : '<div style="grid-column:1/-1;color:var(--text-light);"><i class="fas fa-lock"></i> معلومات العميل مخفية حتى يتم الدفع للمدير</div>'}
          </div>
          <div class="order-items">${order.items.filter(i => i.storeId === storeId).map(item => {
            return `<div class="order-item"><span>${item.title} × ${item.quantity}</span><span>${(item.price * item.quantity).toLocaleString()} د.ع</span></div>`;
          }).join('')}</div>
          ${transfer && !transfer.transferPaid && !transfer.transferPaymentConfirmed ? `<button class="btn btn-primary" onclick="window.showPaymentModal(${order.id}, ${storeId})" style="width:100%;margin-top:8px;"><i class="fas fa-credit-card"></i> تم الدفع - تأكيد</button>` : ''}
        </div>`;
      }).join('')}
    </div>`;
}

window.openAddProductModal = function() {
  document.getElementById('productForm').reset();
  document.getElementById('productModalTitle').textContent = 'إضافة منتج جديد';
  document.getElementById('productId').value = '';
  var sel = document.getElementById('productStore');
  var stores = getStores();
  var html = '';
  for (var i = 0; i < stores.length; i++) { html += '<option value="' + stores[i].id + '">' + stores[i].name + '</option>'; }
  sel.innerHTML = html;
  sel.disabled = false;
  var u = getCurrentUser();
  if (u && u.role === 'store_owner' && u.storeId) { sel.value = u.storeId; sel.disabled = true; }
  if (window.updateSubcategorySelect) { try { window.updateSubcategorySelect(); } catch(e) {} }
  document.getElementById('productModal').style.display = 'flex';
};
