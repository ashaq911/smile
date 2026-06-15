import { getCurrentUser, getStoreOwners } from '../services/auth.js';
import { getStores, getStoreById } from '../services/stores.js';
import { getCategories, getSubcategories, getCategoryById, getCategoriesByStore, getSubcategoriesByCategory, getSubcategoryById } from '../services/categories.js';
import { getProducts, getProductById, getProductsByStore, getStoreProductCount, getCategoryProductCount } from '../services/products.js';
import { showToast } from './toast.js';

let cachedOrders = [];
let cachedTransfers = [];
let cachedOwners = [];

async function fetchAdminData() {
  try {
    const token = localStorage.getItem('auth_token');
    const [orders, transfers, owners] = await Promise.all([
      fetch('/api/orders', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/orders/transfers', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/auth/owners', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []).catch(() => [])
    ]);
    cachedOrders = orders;
    cachedTransfers = transfers;
    cachedOwners = owners;
  } catch { cachedOrders = []; cachedTransfers = []; cachedOwners = []; }
}

async function fetchOrdersForOwner(storeId) {
  try {
    const token = localStorage.getItem('auth_token');
    const res = await fetch('/api/orders', { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) { cachedOrders = []; return; }
    const all = await res.json();
    cachedOrders = all.filter(o => o.items && o.items.some(i => i.storeId === storeId));
    for (const o of cachedOrders) {
      try {
        const tRes = await fetch(`/api/orders/transfers?orderId=${o.id}&storeId=${storeId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tRes.ok) o._transfer = (await tRes.json())[0];
      } catch {}
    }
  } catch { cachedOrders = []; }
}

export async function initAdminDashboard() {
  const container = document.getElementById('adminContent');
  if (!container) return;
  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = `<div class="cart-empty"><i class="fas fa-user-lock"></i><h2>يرجى تسجيل الدخول</h2><button class="btn btn-primary" onclick="window.authShowLogin()">تسجيل الدخول</button></div>`;
    return;
  }
  if (user.role === 'admin') {
    container.innerHTML = '<div class="admin-loading" style="text-align:center;padding:60px;"><i class="fas fa-spinner fa-spin fa-3x"></i><p style="margin-top:16px;">جاري تحميل لوحة التحكم...</p></div>';
    await fetchAdminData();
    renderAdminDashboard();
  } else if (user.role === 'store_owner') {
    container.innerHTML = '<div class="admin-loading" style="text-align:center;padding:60px;"><i class="fas fa-spinner fa-spin fa-3x"></i><p style="margin-top:16px;">جاري تحميل لوحة التحكم...</p></div>';
    await fetchOrdersForOwner(user.storeId);
    renderOwnerDashboard(user.storeId);
  } else {
    container.innerHTML = '<div class="cart-empty"><h2>ليس لديك صلاحية</h2></div>';
  }
}
window.initAdminDashboard = initAdminDashboard;

function renderAdminDashboard() {
  const container = document.getElementById('adminContent');
  if (!container) return;
  const visibleOrdersList = cachedOrders.filter(o => {
    const ts = cachedTransfers.filter(t => t.orderId === o.id);
    return ts.length === 0 || ts.some(t => t.customerInfoRevealed !== 1);
  });
  const totalOrders = visibleOrdersList.length;
  const totalRevenue = visibleOrdersList.reduce((s, o) => s + (o.total || 0), 0);
  const pendingOrders = visibleOrdersList.filter(o => o.status === 'pending').length;
  const stores = getStores();
  container.innerHTML = `
    <div class="admin-stats">
      <div class="stat-card"><i class="fas fa-shopping-bag"></i><h3>إجمالي الطلبات</h3><div class="stat-value">${totalOrders}</div></div>
      <div class="stat-card"><i class="fas fa-money-bill-wave"></i><h3>الإيرادات</h3><div class="stat-value">${totalRevenue.toLocaleString()} د.ع</div></div>
      <div class="stat-card"><i class="fas fa-clock"></i><h3>قيد الانتظار</h3><div class="stat-value">${pendingOrders}</div></div>
    </div>
    <div class="admin-tabs">
      <button class="admin-tab active" onclick="switchAdminTab('orders',this)"><i class="fas fa-shopping-bag"></i> الطلبات</button>
      <button class="admin-tab" onclick="switchAdminTab('products',this)"><i class="fas fa-tshirt"></i> المنتجات</button>
      <button class="admin-tab" onclick="switchAdminTab('categories',this)"><i class="fas fa-sitemap"></i> الأقسام</button>
      <button class="admin-tab" onclick="switchAdminTab('stores',this)"><i class="fas fa-store"></i> المتاجر</button>
      <button class="admin-tab" onclick="switchAdminTab('owners',this)"><i class="fas fa-user-tie"></i> أصحاب المتاجر</button>
    </div>
    <div class="admin-tab-content" id="adminTabOrders">
      <h2 class="section-title">جميع الطلبات</h2>
      ${(()=>{
        // Filter orders: hide those where ALL transfers have customerInfoRevealed = 1
        const visibleOrders = [...cachedOrders].reverse().filter(o => {
          const orderTransfers = cachedTransfers.filter(t => t.orderId === o.id);
          if (orderTransfers.length === 0) return true;
          return orderTransfers.some(t => t.customerInfoRevealed !== 1);
        });
        if (visibleOrders.length === 0) return '<p style="text-align:center;padding:40px;color:var(--text-light);">لا توجد طلبات</p>';
        return visibleOrders.map(o => {
        const sLabels = { pending: 'قيد الانتظار', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التوصيل', cancelled: 'ملغي' };
        const orderTransfers = cachedTransfers.filter(t => t.orderId === o.id);
        return `<div class="order-card">
          <div class="order-header">
            <div><span class="order-id">طلب #${o.id}</span><span style="color:var(--text-light);font-size:13px;margin-right:12px;"><i class="fas fa-calendar"></i> ${o.createdAt || ''}</span></div>
            <select class="status-select" onchange="updateOrderStatus(${o.id},this.value)">
              ${Object.entries(sLabels).map(([k,v]) => `<option value="${k}" ${o.status===k?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;padding:12px;background:var(--bg);border-radius:10px;font-size:14px;">
            <div><strong>العميل:</strong> ${o.customer}</div>
            <div><strong>الهاتف:</strong> ${o.phone || '—'}</div>
            <div><strong>العنوان:</strong> ${o.address}</div>
          </div>
          ${orderTransfers.map(transfer => `
          <div style="padding:8px 12px;margin-bottom:12px;border-radius:8px;background:${transfer.customerInfoRevealed?'#d4edda':transfer.transferPaymentConfirmed?'#cce5ff':'#fff3cd'};display:flex;justify-content:space-between;align-items:center;font-size:14px;flex-wrap:wrap;gap:8px;">
            <span><strong>تحويل المتجر ${getStoreById(transfer.storeId)?.name||'#'+transfer.storeId}:</strong> ${transfer.customerInfoRevealed?'✅ تم الكشف عن المعلومات':transfer.transferPaymentConfirmed?'🔄 بانتظار الموافقة':'⏳ في انتظار الدفع'}</span>
            <span>${(transfer.amount||0).toLocaleString()} د.ع</span>
            ${transfer.transferPaymentConfirmed&&!transfer.customerInfoRevealed?`<button class="btn btn-success btn-sm" onclick="confirmAdminReveal(${transfer.id},${o.id})"><i class="fas fa-eye"></i> الموافقة على اظهار المعلومات</button>`:''}
          </div>`).join('')}
          <div style="margin-bottom:8px;">${(()=>{
            const g={}; o.items.forEach(i=>{const sid=i.storeId||'unknown'; if(!g[sid])g[sid]=[]; g[sid].push(i);});
            return Object.entries(g).map(([sid,items])=>{
              const st=getStoreById(parseInt(sid)); const sName=st?st.name:'غير معروف';
              const sTotal=items.reduce((s,i)=>s+i.price*i.quantity,0);
              const sShip=items.reduce((s,i)=>Math.max(s,i.shippingFee||0),0);
              const storeTransfer = cachedTransfers.find(t => t.orderId === o.id && t.storeId === parseInt(sid));
              return `<div style="margin-bottom:8px;">
                <div style="font-size:13px;font-weight:800;color:var(--primary);margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
                  <span><i class="fas ${st?st.icon:'fa-store'}"></i> ${sName}</span>
                  ${!storeTransfer?`<button class="btn btn-primary btn-sm" onclick="showTransferModal(${o.id},${sid},${sTotal+sShip})" style="font-size:11px;"><i class="fas fa-exchange-alt"></i> تحويل</button>`:''}
                </div>
                ${items.map(i=>`<div class="order-item"><span>${i.title} × ${i.quantity}</span><span>${(i.price*i.quantity).toLocaleString()} د.ع</span></div>`).join('')}
              </div>`;
            }).join('');
          })()}</div>
          <div class="order-total"><span>الإجمالي</span><span>${o.total.toLocaleString()} د.ع</span></div>
        </div>`;
      }).join('');
      })()}
    </div>
    <div class="admin-tab-content" id="adminTabProducts" style="display:none;">
      <h2 class="section-title">جميع المنتجات</h2>
      <button class="btn btn-primary" onclick="window.openAddProductModal()" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة منتج</button>
      <div class="table-wrapper"><table class="admin-table">
        <thead><tr><th>#</th><th>المنتج</th><th>القسم</th><th>المتجر</th><th>السعر</th><th>المخزون</th><th></th></tr></thead>
        <tbody>${getProducts().map(p => {
          const store = getStoreById(p.storeId);
          const sub = getSubcategoryById(p.subcategoryId);
          const cat = sub ? getCategoryById(sub.categoryId) : null;
          return `<tr>
            <td>${p.id}</td><td>${p.title}</td>
            <td style="font-size:13px;">${cat?cat.name:''}${sub?' / '+sub.name:''}</td>
            <td>${store?store.name:'—'}</td>
            <td>${p.price.toLocaleString()} د.ع</td>
            <td style="color:${p.inStock?'var(--success)':'var(--danger)'}">${p.inStock?'متوفر':'نفد'}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteAdminProduct(${p.id})"><i class="fas fa-trash"></i></button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>
    <div class="admin-tab-content" id="adminTabCategories" style="display:none;">
      <h2 class="section-title">الأقسام والتفرعات</h2>
      <button class="btn btn-primary" onclick="window.showAddCategoryModal()" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة قسم</button>
      ${stores.map(store => {
        const cats = getCategoriesByStore(store.id);
        if (!cats.length) return '';
        return `<h3 style="margin-bottom:12px;color:var(--primary);"><i class="fas ${store.icon}"></i> ${store.name}</h3>
        <div class="table-wrapper" style="margin-bottom:24px;"><table class="admin-table">
          <thead><tr><th>القسم</th><th>التفرعات</th><th>المنتجات</th><th></th></tr></thead>
          <tbody>${cats.map(cat => {
            const subs = getSubcategoriesByCategory(cat.id);
            const pCount = getCategoryProductCount(cat.id, getSubcategories());
            return `<tr>
              <td><strong>${cat.name}</strong></td>
              <td style="font-size:13px;">${subs.map(s=>s.name).join('، ') || '<span style="color:var(--text-light)">—</span>'}</td>
              <td>${pCount}</td>
              <td>
                <button class="btn btn-primary btn-sm" onclick="window.showAddSubcategoryModal(${cat.id})" title="إضافة تفرع"><i class="fas fa-plus"></i></button>
                <button class="btn btn-primary btn-sm" onclick="window.editCategory(${cat.id})" title="تعديل"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteAdminCategory(${cat.id})" title="حذف"><i class="fas fa-trash"></i></button>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>`;
      }).join('')}
    </div>
    <div class="admin-tab-content" id="adminTabStores" style="display:none;">
      <h2 class="section-title">المتاجر</h2>
      <button class="btn btn-primary" onclick="window.showAddStoreModal()" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة متجر</button>
      <div class="table-wrapper"><table class="admin-table">
        <thead><tr><th>#</th><th>المتجر</th><th>المنتجات</th><th></th></tr></thead>
        <tbody>${stores.map(s => `<tr>
          <td>${s.id}</td>
          <td><i class="fas ${s.icon}" style="color:var(--primary);margin-left:6px;"></i>${s.name}</td>
          <td>${getStoreProductCount(s.id)}</td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="window.editStore(${s.id})"><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deleteAdminStore(${s.id})"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>
    <div class="admin-tab-content" id="adminTabOwners" style="display:none;">
      <h2 class="section-title">أصحاب المتاجر</h2>
      <button class="btn btn-primary" onclick="window.showAddOwnerModal()" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة صاحب متجر</button>
      <div class="table-wrapper"><table class="admin-table">
        <thead><tr><th>#</th><th>الاسم</th><th>اسم المستخدم</th><th>المتجر</th><th></th></tr></thead>
        <tbody>${cachedOwners.map(o => {
          const st = getStoreById(o.storeId);
          return `<tr><td>${o.id}</td><td>${o.name||''}</td><td>${o.username}</td><td>${st?st.name:'—'}</td><td><button class="btn btn-danger btn-sm" onclick="deleteOwner(${o.id})"><i class="fas fa-trash"></i></button></td></tr>`;
        }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-light);">لا يوجد أصحاب متاجر</td></tr>'}
      </table></div>
    </div>`;
}

function renderOwnerDashboard(storeId) {
  const container = document.getElementById('adminContent');
  if (!container) return;
  const store = getStoreById(storeId);
  if (!store) { container.innerHTML = '<div class="cart-empty"><h2>المتجر غير موجود</h2></div>'; return; }
  const products = getProductsByStore(storeId);
  const cats = getCategoriesByStore(storeId);
  container.innerHTML = `
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:28px;font-weight:800;"><i class="fas ${store.icon}" style="color:var(--primary);"></i> ${store.name}</h1>
      <p style="color:var(--text-light);">لوحة تحكم المتجر</p>
    </div>
    <div class="admin-tabs">
      <button class="admin-tab active" onclick="switchAdminTab('products',this)"><i class="fas fa-tshirt"></i> منتجاتي</button>
      <button class="admin-tab" onclick="switchAdminTab('categories',this)"><i class="fas fa-sitemap"></i> أقسامي</button>
      <button class="admin-tab" onclick="switchAdminTab('transfers',this)"><i class="fas fa-exchange-alt"></i> الطلبات</button>
    </div>
    <div class="admin-tab-content" id="adminTabProducts">
      <h2 class="section-title">منتجات المتجر</h2>
      <button class="btn btn-primary" onclick="window.openAddProductModal()" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة منتج</button>
      ${!products.length ? '<p style="text-align:center;padding:40px;color:var(--text-light);">لا توجد منتجات</p>' : `
      <div class="table-wrapper"><table class="admin-table">
        <thead><tr><th>#</th><th>المنتج</th><th>القسم</th><th>السعر</th><th>المخزون</th><th></th></tr></thead>
        <tbody>${products.map(p => {
          const sub = getSubcategoryById(p.subcategoryId);
          const cat = sub ? getCategoryById(sub.categoryId) : null;
          return `<tr>
            <td>${p.id}</td><td>${p.title}</td>
            <td style="font-size:13px;">${cat?cat.name:''}${sub?' / '+sub.name:''}</td>
            <td>${p.price.toLocaleString()} د.ع</td>
            <td style="color:${p.inStock?'var(--success)':'var(--danger)'}">${p.inStock?'متوفر':'نفد'}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteAdminProduct(${p.id})"><i class="fas fa-trash"></i></button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
    <div class="admin-tab-content" id="adminTabCategories" style="display:none;">
      <h2 class="section-title">أقسام المتجر</h2>
      <button class="btn btn-primary" onclick="window.showAddCategoryModal()" style="margin-bottom:20px;"><i class="fas fa-plus"></i> إضافة قسم</button>
      ${!cats.length ? '<p style="text-align:center;padding:40px;color:var(--text-light);">لا توجد أقسام</p>' : `
      <div class="table-wrapper"><table class="admin-table">
        <thead><tr><th>القسم</th><th>التفرعات</th><th>المنتجات</th><th></th></tr></thead>
        <tbody>${cats.map(cat => {
          const subs = getSubcategoriesByCategory(cat.id);
          const pCount = getCategoryProductCount(cat.id, getSubcategories());
          return `<tr>
            <td><strong>${cat.name}</strong></td>
            <td style="font-size:13px;">${subs.map(s=>s.name).join('، ') || '—'}</td>
            <td>${pCount}</td>
            <td>
              <button class="btn btn-primary btn-sm" onclick="window.showAddSubcategoryModal(${cat.id})"><i class="fas fa-plus"></i></button>
              <button class="btn btn-primary btn-sm" onclick="window.editCategory(${cat.id})"><i class="fas fa-edit"></i></button>
              <button class="btn btn-danger btn-sm" onclick="deleteAdminCategory(${cat.id})"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
    <div class="admin-tab-content" id="adminTabTransfers" style="display:none;">
      <h2 class="section-title">الطلبات المحولة</h2>
      ${!cachedOrders.length ? '<p style="text-align:center;padding:40px;color:var(--text-light);">لا توجد طلبات</p>' : [...cachedOrders].reverse().map(o => {
        const sLabels = { pending: 'قيد الانتظار', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التوصيل', cancelled: 'ملغي' };
        const tr = o._transfer;
        const revealed = tr && tr.customerInfoRevealed === 1;
        return `<div class="order-card">
          <div class="order-header">
            <div><span class="order-id">طلب #${o.id}</span></div>
            <span class="order-status status-${o.status}">${sLabels[o.status]||o.status}</span>
          </div>
          ${!revealed ? `
          <div style="padding:20px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:var(--primary);margin-bottom:4px;">${(tr?tr.amount:0).toLocaleString()} د.ع</div>
            <div style="font-size:14px;color:var(--text-light);margin-bottom:16px;"><i class="fas fa-lock"></i> تم تحويل طلب إليك، يرجى دفع المبلغ لعرض التفاصيل</div>
            ${tr&&!tr.transferPaymentConfirmed ? `<button class="btn btn-primary" onclick="window.showPaymentModal(${o.id},${storeId})" style="width:100%;"><i class="fas fa-credit-card"></i> تأكيد الدفع</button>` : `<div style="padding:12px;background:#cce5ff;border-radius:10px;font-size:14px;"><i class="fas fa-clock"></i> تم إرسال إشعار الدفع، بانتظار تأكيد المدير</div>`}
          </div>
          ` : `
          <div style="padding:12px;background:var(--bg);border-radius:10px;font-size:14px;margin-bottom:8px;">
            <div><strong>العميل:</strong> ${o.customer}</div>
            <div><strong>الهاتف:</strong> ${o.phone||'—'}</div>
            <div><strong>العنوان:</strong> ${o.address}</div>
          </div>
          ${o.items.filter(i=>i.storeId===storeId).map(i=>`<div class="order-item"><span>${i.title} × ${i.quantity}</span><span>${(i.price*i.quantity).toLocaleString()} د.ع</span></div>`).join('')}
          <div style="margin-top:8px;padding:8px;background:#d4edda;border-radius:8px;text-align:center;font-size:14px;"><i class="fas fa-check-circle"></i> تم تأكيد الدفع — معلومات الزبون متاحة</div>
          `}
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
  sel.innerHTML = stores.map(s => '<option value="' + s.id + '">' + s.name + '</option>').join('');
  sel.disabled = false;
  var u = getCurrentUser();
  if (u && u.role === 'store_owner' && u.storeId) { sel.value = u.storeId; sel.disabled = true; }
  if (window.updateSubcategorySelect) { try { window.updateSubcategorySelect(); } catch(e) {} }
  document.getElementById('productModal').style.display = 'flex';
};
