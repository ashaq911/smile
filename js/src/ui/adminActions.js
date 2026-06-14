import { addStore, updateStore, deleteStore, getStoreById, getStores } from '../services/stores.js';
import { addCategory, updateCategory, deleteCategory, getCategoryById, getCategoriesByStore, addSubcategory, updateSubcategory, deleteSubcategory, getSubcategoryById, getSubcategoriesByCategory } from '../services/categories.js';
import { addProduct, deleteProduct, getProducts, getProductsByStore, getStoreProductCount, getSubcategoryProductCount } from '../services/products.js';
import { addStoreOwner, deleteAuthUser, getCurrentUser, getAllAuthUsers, getAuthUserById } from '../services/auth.js';
import { showToast } from './toast.js';
import { initAdminDashboard } from './admin.js';

function getToken() { return localStorage.getItem('auth_token'); }

// ===== STORE CRUD =====
export function showAddStoreModal() {
  document.getElementById('storeForm').reset();
  document.getElementById('storeModalTitle').textContent = 'إضافة متجر جديد';
  document.getElementById('storeId').value = '';
  document.getElementById('ownerCredentialsRow').style.display = 'block';
  document.getElementById('storeModal').style.display = 'flex';
}
window.showAddStoreModal = showAddStoreModal;

export function editStore(id) {
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
window.editStore = editStore;

export async function saveStore() {
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
  const btn = document.querySelector('#storeForm button[type="submit"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...'; }
  try {
    await fetch('/api/ping').catch(() => {});
    if (id) { await updateStore(parseInt(id), data); showToast('تم تحديث المتجر بنجاح'); }
    else {
      const newStore = await addStore(data.name, data.description, data.icon, data.owner, data.phone, data.paymentInfo);
      const defaultCat = await addCategory(newStore.id, 'عام', 'fa-folder');
      await addSubcategory(defaultCat.id, 'عام');
      const ownerUsername = document.getElementById('storeOwnerUsername').value.trim();
      const ownerPassword = document.getElementById('storeOwnerPassword').value.trim();
      if (ownerUsername && ownerPassword) {
        await addStoreOwner(ownerUsername, ownerPassword, data.owner || data.name, newStore.id);
        showToast('تم إضافة المتجر وحساب صاحبه بنجاح');
      } else { showToast('تم إضافة المتجر بنجاح'); }
    }
    document.getElementById('storeModal').style.display = 'none';
    initAdminDashboard();
  } catch (e) { showToast('فشل حفظ المتجر: ' + (e.message || 'الخادم لم يستجب')); }
  if (btn) { btn.disabled = false; btn.innerHTML = 'حفظ'; }
}
window.saveStore = saveStore;

export function closeStoreModal() { document.getElementById('storeModal').style.display = 'none'; }
window.closeStoreModal = closeStoreModal;

export async function deleteAdminStore(id) {
  const store = getStoreById(id);
  if (!store) return;
  const count = getStoreProductCount(id);
  let msg = `هل أنت متأكد من حذف المتجر "${store.name}"؟`;
  if (count > 0) msg += `\nسيتم نقل ${count} منتج إلى المتجر الرئيسي.`;
  if (!confirm(msg)) return;
  try {
    getProductsByStore(id).forEach(async p => {
      await apiPut(`/products/${p.id}`, { storeId: 1 });
    });
    getCategoriesByStore(id).forEach(async c => {
      await apiDelete(`/categories/${c.id}`);
    });
    await deleteStore(id);
    showToast('تم حذف المتجر');
  } catch (e) { showToast(e.message); }
  initAdminDashboard();
}
window.deleteAdminStore = deleteAdminStore;

// ===== CATEGORY CRUD =====
export function showAddCategoryModal() {
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryModalTitle').textContent = 'إضافة قسم جديد';
  document.getElementById('categoryId').value = '';
  const sel = document.getElementById('categoryStore');
  sel.innerHTML = getStores().map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  const subGroup = document.getElementById('subNameGroup');
  if (subGroup) subGroup.style.display = 'block';
  document.getElementById('categoryModal').style.display = 'flex';
}
window.showAddCategoryModal = showAddCategoryModal;

export function editCategory(id) {
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
window.editCategory = editCategory;

export async function saveCategory() {
  const id = document.getElementById('categoryId').value;
  const storeId = parseInt(document.getElementById('categoryStore').value);
  const name = document.getElementById('categoryName').value.trim();
  const icon = document.getElementById('categoryIcon').value || 'fa-folder';
  if (!name) { showToast('يرجى إدخال اسم القسم'); return; }
  try {
    if (id) { await updateCategory(parseInt(id), { name, icon, storeId }); showToast('تم تحديث القسم'); }
    else {
      const newCat = await addCategory(storeId, name, icon);
      const subName = document.getElementById('categorySubName').value.trim();
      if (subName) { await addSubcategory(newCat.id, subName); showToast('تم إضافة القسم والتفرع'); }
      else { showToast('تم إضافة القسم'); }
    }
  } catch (e) { showToast(e.message); }
  document.getElementById('categoryModal').style.display = 'none';
  initAdminDashboard();
}
window.saveCategory = saveCategory;

export function closeCategoryModal() { document.getElementById('categoryModal').style.display = 'none'; }
window.closeCategoryModal = closeCategoryModal;

export async function deleteAdminCategory(id) {
  if (!confirm('هل أنت متأكد من حذف هذا القسم وجميع تفرعاته؟')) return;
  try { await deleteCategory(id); showToast('تم حذف القسم'); } catch (e) { showToast(e.message); }
  initAdminDashboard();
}
window.deleteAdminCategory = deleteAdminCategory;

// ===== SUBCATEGORY CRUD =====
export function showAddSubcategoryModal(categoryId) {
  document.getElementById('subcategoryForm').reset();
  document.getElementById('subcategoryModalTitle').textContent = 'إضافة تفرع جديد';
  document.getElementById('subcategoryId').value = '';
  document.getElementById('subcategoryParent').value = categoryId || '';
  if (categoryId) {
    const cat = getCategoryById(categoryId);
    const existing = document.querySelector('#subcategoryModal .modal-header p');
    if (existing) existing.remove();
    const p = document.createElement('p');
    p.style.cssText = 'color:var(--text-light);font-size:14px;';
    p.textContent = `القسم: ${cat ? cat.name : ''}`;
    document.querySelector('#subcategoryModal .modal-header').appendChild(p);
  }
  document.getElementById('subcategoryModal').style.display = 'flex';
}
window.showAddSubcategoryModal = showAddSubcategoryModal;

export async function saveSubcategory() {
  const id = document.getElementById('subcategoryId').value;
  const categoryId = parseInt(document.getElementById('subcategoryParent').value);
  const name = document.getElementById('subcategoryName').value.trim();
  if (!name || !categoryId) { showToast('يرجى إدخال اسم التفرع'); return; }
  try {
    if (id) { await updateSubcategory(parseInt(id), { name, categoryId }); showToast('تم تحديث التفرع'); }
    else { await addSubcategory(categoryId, name); showToast('تم إضافة التفرع'); }
  } catch (e) { showToast(e.message); }
  document.getElementById('subcategoryModal').style.display = 'none';
  initAdminDashboard();
}
window.saveSubcategory = saveSubcategory;

export function closeSubcategoryModal() { document.getElementById('subcategoryModal').style.display = 'none'; }
window.closeSubcategoryModal = closeSubcategoryModal;

export async function deleteAdminSubcategory(id) {
  const sub = getSubcategoryById(id);
  const pCount = getSubcategoryProductCount(id);
  let msg = `هل أنت متأكد من حذف التفرع "${sub ? sub.name : ''}"؟`;
  if (pCount > 0) msg += `\nسيتم إلغاء تصنيف ${pCount} منتج.`;
  if (!confirm(msg)) return;
  try {
    getProducts().filter(p => p.subcategoryId === id).forEach(async p => {
      await fetch(`/api/products/${p.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ subcategoryId: null })
      });
    });
    await deleteSubcategory(id);
    showToast('تم حذف التفرع');
  } catch (e) { showToast(e.message); }
  initAdminDashboard();
}
window.deleteAdminSubcategory = deleteAdminSubcategory;

// ===== PRODUCT CRUD =====
export function showAddProductModal() {
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
window.showAddProductModal = showAddProductModal;

export function updateSubcategorySelect() {
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
window.updateSubcategorySelect = updateSubcategorySelect;

export async function saveProduct() {
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
  let image = '';
  const fileInput = document.getElementById('productImage');
  if (fileInput && fileInput.files && fileInput.files[0]) {
    try {
      const file = fileInput.files[0];
      const reader = new FileReader();
      image = await new Promise((resolve) => {
        reader.onload = async (e) => {
          const base64 = e.target.result;
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify({ image: base64 })
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            resolve(uploadData.url);
          } else { resolve(''); }
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    } catch { image = ''; }
  }
  const data = { title, description, price, icon, image, inStock, storeId, subcategoryId, shippingFee };
  try {
    const res = await fetch(`/api/products${id ? '/' + id : ''}`, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify(data)
    });
    if (!res.ok) { const e = await res.json().catch(() => ({ error: 'خطأ' })); throw new Error(e.error); }
    showToast(id ? 'تم تحديث المنتج بنجاح' : 'تم إضافة المنتج بنجاح');
  } catch (e) { showToast(e.message || 'فشل حفظ المنتج'); }
  document.getElementById('productModal').style.display = 'none';
  try { (await import('../services/products.js')).initProducts().then(function() { initAdminDashboard(); }); } catch(e) { initAdminDashboard(); }
}
window.saveProduct = saveProduct;

export function closeProductModal() { document.getElementById('productModal').style.display = 'none'; }
window.closeProductModal = closeProductModal;

export async function deleteAdminProduct(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
  try { await deleteProduct(id); showToast('تم حذف المنتج'); } catch (e) { showToast(e.message); }
  initAdminDashboard();
}
window.deleteAdminProduct = deleteAdminProduct;

// ===== ORDERS =====
export async function updateOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) throw new Error();
    showToast('تم تحديث حالة الطلب');
  } catch { showToast('فشل تحديث حالة الطلب'); }
  initAdminDashboard();
}
window.updateOrderStatus = updateOrderStatus;

export async function deleteOrder(orderId) {
  if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
  try {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error();
    showToast('تم حذف الطلب');
  } catch { showToast('فشل حذف الطلب'); }
  initAdminDashboard();
}
window.deleteOrder = deleteOrder;

// ===== TRANSFER =====
export function showTransferModal(orderId, storeId, amount) {
  const modal = document.getElementById('transferModal');
  if (!modal) return;
  document.getElementById('transferOrderId').value = orderId;
  document.getElementById('transferStoreId').value = storeId;
  document.getElementById('transferAmount').value = amount;
  document.getElementById('transferAmountLabel').textContent = 'المبلغ المطلوب تحويله (د.ع):';
  modal.style.display = 'flex';
}
window.showTransferModal = showTransferModal;

export async function confirmTransfer() {
  const orderId = parseInt(document.getElementById('transferOrderId').value);
  const storeId = parseInt(document.getElementById('transferStoreId').value);
  const transferAmount = parseFloat(document.getElementById('transferAmount').value) || 0;
  if (transferAmount <= 0) { showToast('يرجى إدخال مبلغ صحيح'); return; }
  try {
    const transferRes = await fetch('/api/orders/transfers', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ orderId, storeId, amount: transferAmount, transferredToOwner: true })
    });
    if (!transferRes.ok) throw new Error();
    closeTransferModal();
    showToast('تم تحويل الطلب إلى صاحب المتجر');
  } catch { showToast('فشل تحويل الطلب'); }
  initAdminDashboard();
}
window.confirmTransfer = confirmTransfer;

export function closeTransferModal() {
  const modal = document.getElementById('transferModal');
  if (modal) modal.style.display = 'none';
}
window.closeTransferModal = closeTransferModal;

export async function confirmAdminPayment(transferId, orderId) {
  if (!confirm('تأكيد استلام المبلغ من صاحب المتجر؟ بعد التأكيد سيتم الكشف عن معلومات الزبون')) return;
  try {
    const res = await fetch(`/api/orders/transfers/${transferId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ transferPaid: true, customerInfoRevealed: true })
    });
    if (!res.ok) throw new Error();
    showToast('تم تأكيد الدفع! تم الكشف عن معلومات الزبون لصاحب المتجر');
  } catch { showToast('فشل تأكيد الدفع'); }
  initAdminDashboard();
}
window.confirmAdminPayment = confirmAdminPayment;

// ===== STORE OWNER PAY =====
export function showPaymentModal(orderId, storeId) {
  const store = getStoreById(storeId);
  const modal = document.getElementById('storePaymentModal');
  if (!modal) return;
  document.getElementById('payOrderId').value = orderId;
  document.getElementById('payStoreId').value = storeId;
  document.getElementById('payBankInfo').textContent = (store && store.paymentInfo) || 'لم يتم إضافة معلومات الدفع بعد';
  modal.style.display = 'flex';
}
window.showPaymentModal = showPaymentModal;

export function closePaymentModal() {
  const modal = document.getElementById('storePaymentModal');
  if (modal) modal.style.display = 'none';
}
window.closePaymentModal = closePaymentModal;

export async function confirmStorePayment() {
  const orderId = parseInt(document.getElementById('payOrderId').value);
  const storeId = parseInt(document.getElementById('payStoreId').value);
  try {
    const res = await fetch(`/api/orders/transfers?orderId=${orderId}&storeId=${storeId}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (res.ok) {
      const transfers = await res.json();
      if (transfers.length > 0) {
        await fetch(`/api/orders/transfers/${transfers[0].id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
          body: JSON.stringify({ transferPaymentConfirmed: true })
        });
      }
    }
    closePaymentModal();
    showToast('تم إرسال طلب الدفع، في انتظار تأكيد المدير');
  } catch { showToast('فشل تأكيد الدفع'); }
  initAdminDashboard();
}
window.confirmStorePayment = confirmStorePayment;

// ===== OWNER CRUD =====
export function showAddOwnerModal() {
  document.getElementById('ownerForm').reset();
  document.getElementById('ownerId').value = '';
  const sel = document.getElementById('ownerStore');
  sel.innerHTML = getStores().map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  document.getElementById('ownerModal').style.display = 'flex';
}
window.showAddOwnerModal = showAddOwnerModal;

export async function saveOwner() {
  const username = document.getElementById('ownerUsername').value.trim();
  const password = document.getElementById('ownerPassword').value.trim();
  const name = document.getElementById('ownerName').value.trim();
  const storeId = parseInt(document.getElementById('ownerStore').value);
  if (!username || !password || !name || !storeId) { showToast('يرجى تعبئة جميع الحقول'); return; }
  const btn = document.querySelector('#ownerForm button[type="submit"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...'; }
  try {
    // Warm up DB connection first
    await fetch('/api/ping').catch(() => {});
    await addStoreOwner(username, password, name, storeId);
    showToast('تم إضافة صاحب المتجر بنجاح');
    document.getElementById('ownerModal').style.display = 'none';
    initAdminDashboard();
  } catch (e) { showToast('فشل إضافة صاحب المتجر: ' + (e.message || 'الخادم لم يستجب')); }
  if (btn) { btn.disabled = false; btn.innerHTML = 'حفظ'; }
}
window.saveOwner = saveOwner;

export function closeOwnerModal() { document.getElementById('ownerModal').style.display = 'none'; }
window.closeOwnerModal = closeOwnerModal;

export async function deleteOwner(userId) {
  if (!confirm('هل أنت متأكد من حذف صاحب المتجر هذا؟')) return;
  try {
    await deleteAuthUser(userId);
    showToast('تم حذف صاحب المتجر');
  } catch (e) { showToast(e.message); }
  initAdminDashboard();
}
window.deleteOwner = deleteOwner;

// ===== ADMIN TABS =====
export function switchAdminTab(tab, btn) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
  const map = { orders: 'Orders', categories: 'Categories', products: 'Products', stores: 'Stores', owners: 'Owners', users: 'Users', transfers: 'Transfers', reports: 'Reports', alerts: 'Alerts' };
  const el = document.getElementById('adminTab' + map[tab]);
  if (el) el.style.display = 'block';
}
window.switchAdminTab = switchAdminTab;

export function exportReport() {
  const orders = JSON.parse(localStorage.getItem('export_orders') || '[]');
  const stores = JSON.parse(localStorage.getItem('export_stores') || '[]');
  const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0,19);
  const token = localStorage.getItem('auth_token');
  fetch('/api/orders', { headers: { 'Authorization': `Bearer ${token}` } })
    .then(r => r.json())
    .then(orders => {
      let csv = 'التقرير,سمايل\n';
      csv += `تاريخ التصدير,${now}\n\n`;
      csv += 'رقم الطلب,العميل,الإجمالي,الحالة,التاريخ\n';
      orders.forEach(o => {
        csv += `${o.id},${o.customer},${o.total},${o.status},${o.createdAt}\n`;
      });
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `smayel-report-${now}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast('تم تصدير التقرير بنجاح');
    });
}
window.exportReport = exportReport;
