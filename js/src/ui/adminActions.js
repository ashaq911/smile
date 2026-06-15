import { addStore, updateStore, deleteStore, getStoreById, getStores } from '../services/stores.js';
import { addCategory, updateCategory, deleteCategory, getCategoryById, getCategoriesByStore, addSubcategory, updateSubcategory, deleteSubcategory, getSubcategoryById, getSubcategoriesByCategory } from '../services/categories.js';
import { addProduct, deleteProduct, reloadProducts, getProducts, getSubcategoryProductCount } from '../services/products.js';
import { addStoreOwner, deleteAuthUser, getCurrentUser } from '../services/auth.js';
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
  document.getElementById('storeOwner').value = store.owner;
  document.getElementById('storePhone').value = store.phone;
  document.getElementById('storePaymentInfo').value = store.paymentInfo || '';
  document.getElementById('ownerCredentialsRow').style.display = 'none';
  document.getElementById('storeModal').style.display = 'flex';
}
window.editStore = editStore;

export async function saveStore() {
  const id = document.getElementById('storeId').value;
  const data = {
    name: document.getElementById('storeName').value.trim(),
    description: document.getElementById('storeDesc').value.trim(),
    icon: 'fa-tshirt',
    owner: document.getElementById('storeOwner').value.trim(),
    phone: document.getElementById('storePhone').value.trim(),
    paymentInfo: document.getElementById('storePaymentInfo').value.trim()
  };
  if (!data.name) { showToast('يرجى إدخال اسم المتجر'); return; }
  const btn = document.querySelector('#storeForm button[type="submit"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...'; }
  try {
    await fetch('/api/ping').catch(() => {});
    if (id) { await updateStore(parseInt(id), data); showToast('تم تحديث المتجر'); }
    else {
      const newStore = await addStore(data.name, data.description, data.icon, data.owner, data.phone, data.paymentInfo);
      const menCat = await addCategory(newStore.id, 'رجالي', 'fa-tshirt');
      await addSubcategory(menCat.id, 'قمصان');
      await addSubcategory(menCat.id, 'تيشيرتات');
      await addSubcategory(menCat.id, 'بناطيل');
      const womenCat = await addCategory(newStore.id, 'نسائي', 'fa-female');
      await addSubcategory(womenCat.id, 'فساتين');
      await addSubcategory(womenCat.id, 'بلوزات');
      await addSubcategory(womenCat.id, 'عباءات');
      const kidsCat = await addCategory(newStore.id, 'أطفالي', 'fa-child');
      await addSubcategory(kidsCat.id, 'ملابس أطفال');
      await addSubcategory(kidsCat.id, 'أحذية أطفال');
      await addCategory(newStore.id, 'إكسسوارات', 'fa-gem');
      const ownerUsername = document.getElementById('storeOwnerUsername').value.trim();
      const ownerPassword = document.getElementById('storeOwnerPassword').value.trim();
      if (ownerUsername && ownerPassword) {
        await addStoreOwner(ownerUsername, ownerPassword, data.owner || data.name, newStore.id);
        showToast('تم إضافة المتجر وحساب صاحبه');
      } else { showToast('تم إضافة المتجر'); }
    }
    document.getElementById('storeModal').style.display = 'none';
    initAdminDashboard();
  } catch (e) { showToast('فشل حفظ المتجر: ' + (e.message || 'خطأ')); }
  if (btn) { btn.disabled = false; btn.innerHTML = 'حفظ'; }
}
window.saveStore = saveStore;

export function closeStoreModal() { document.getElementById('storeModal').style.display = 'none'; }
window.closeStoreModal = closeStoreModal;

export async function deleteAdminStore(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المتجر؟')) return;
  try { await deleteStore(id); showToast('تم حذف المتجر'); }
  catch (e) { showToast(e.message); }
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
  const u = getCurrentUser();
  if (u && u.role === 'store_owner' && u.storeId) { sel.value = u.storeId; sel.disabled = true; }
  document.getElementById('subNameGroup').style.display = 'block';
  document.getElementById('categoryModal').style.display = 'flex';
}
window.showAddCategoryModal = showAddCategoryModal;

export function editCategory(id) {
  const cat = getCategoryById(id);
  if (!cat) return;
  const u = getCurrentUser();
  if (u && u.role === 'store_owner' && u.storeId !== cat.storeId) { showToast('لا تصلاحية لك'); return; }
  document.getElementById('categoryModalTitle').textContent = 'تعديل القسم';
  document.getElementById('categoryId').value = cat.id;
  document.getElementById('categoryName').value = cat.name;
  const sel = document.getElementById('categoryStore');
  sel.innerHTML = getStores().map(s => `<option value="${s.id}" ${s.id===cat.storeId?'selected':''}>${s.name}</option>`).join('');
  if (u && u.role === 'store_owner') sel.disabled = true;
  document.getElementById('subNameGroup').style.display = 'none';
  document.getElementById('categoryModal').style.display = 'flex';
}
window.editCategory = editCategory;

export async function saveCategory() {
  const id = document.getElementById('categoryId').value;
  const storeId = parseInt(document.getElementById('categoryStore').value);
  const name = document.getElementById('categoryName').value.trim();
  if (!name) { showToast('يرجى إدخال اسم القسم'); return; }
  try {
    if (id) { await updateCategory(parseInt(id), { name, storeId }); showToast('تم تحديث القسم'); }
    else {
      const newCat = await addCategory(storeId, name, 'fa-tshirt');
      const subName = document.getElementById('categorySubName').value.trim();
      if (subName) { await addSubcategory(newCat.id, subName); }
      showToast('تم إضافة القسم');
    }
  } catch (e) { showToast(e.message); }
  document.getElementById('categoryModal').style.display = 'none';
  initAdminDashboard();
}
window.saveCategory = saveCategory;

export function closeCategoryModal() { document.getElementById('categoryModal').style.display = 'none'; }
window.closeCategoryModal = closeCategoryModal;

export async function deleteAdminCategory(id) {
  if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
  try { await deleteCategory(id); showToast('تم حذف القسم'); }
  catch (e) { showToast(e.message); }
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
    const p = document.createElement('p');
    p.style.cssText = 'color:var(--text-light);font-size:14px;';
    p.textContent = 'القسم: ' + (cat ? cat.name : '');
    const existing = document.querySelector('#subcategoryModal .modal-header p');
    if (existing) existing.remove();
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
  let msg = 'هل أنت متأكد من حذف التفرع "' + (sub ? sub.name : '') + '"?';
  if (pCount > 0) msg += '\nسيتم إلغاء تصنيف ' + pCount + ' منتج.';
  if (!confirm(msg)) return;
  try {
    getProducts().filter(p => p.subcategoryId === id).forEach(async p => {
      await fetch('/api/products/' + p.id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
        body: JSON.stringify({ subcategoryId: null })
      });
    });
    await deleteSubcategory(id);
    await reloadProducts();
    showToast('تم حذف التفرع');
  } catch (e) { showToast(e.message); }
  initAdminDashboard();
}
window.deleteAdminSubcategory = deleteAdminSubcategory;

// ===== PRODUCT CRUD =====
window.updateSubcategorySelect = function() {
  var sid = parseInt(document.getElementById('productStore').value);
  var sub = document.getElementById('productSubcategory');
  if (!sub) return;
  var opts = '<option value="">اختر...</option>';
  if (sid) {
    var cats = getCategoriesByStore(sid);
    for (var i = 0; i < cats.length; i++) {
      var subs = getSubcategoriesByCategory(cats[i].id);
      for (var j = 0; j < subs.length; j++) {
        opts += '<option value="' + subs[j].id + '">' + cats[i].name + ' / ' + subs[j].name + '</option>';
      }
    }
  }
  sub.innerHTML = opts;
};

window.saveProduct = async function() {
  var id = document.getElementById('productId').value;
  var sel = document.getElementById('productStore');
  var storeId = sel.disabled ? parseInt(sel.value) : (parseInt(sel.value) || 1);
  var title = document.getElementById('productTitle').value.trim();
  var price = parseFloat(document.getElementById('productPrice').value) || 0;
  var inStock = document.getElementById('productStock').checked;
  var subId = parseInt(document.getElementById('productSubcategory').value) || null;
  var desc = document.getElementById('productDesc').value.trim();
  var ship = parseInt(document.getElementById('productShipping').value) || 0;
  if (!title || price <= 0) { showToast('يرجى إدخال اسم وسعر صالح'); return; }
  var btn = document.querySelector('#productForm button[type="button"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...'; }
  var image = '';
  var file = document.getElementById('productImage');
  if (file && file.files && file.files[0]) {
    try {
      image = await new Promise(function(res) {
        var r = new FileReader();
        r.onload = async function(e) {
          var resp = await fetch('/api/upload', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('auth_token')}, body:JSON.stringify({image:e.target.result}) });
          res(resp.ok ? (await resp.json()).url : '');
        };
        r.onerror = function() { res(''); };
        r.readAsDataURL(file.files[0]);
      });
    } catch(e) { image = ''; }
  }
  var data = { title:title, description:desc, price:price, icon:'fa-tshirt', image:image, inStock:inStock, storeId:storeId, subcategoryId:subId, shippingFee:ship };
  await fetch('/api/ping').catch(function(){});
  try {
    var resp = await fetch('/api/products' + (id ? '/' + id : ''), {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+localStorage.getItem('auth_token') },
      body: JSON.stringify(data)
    });
    if (!resp.ok) { var err = await resp.json().catch(function() { return {error:'خطأ'}; }); throw new Error(err.error); }
    showToast(id ? 'تم تحديث المنتج' : 'تم إضافة المنتج');
  } catch(e) { showToast(e.message || 'فشل حفظ المنتج'); }
  if (btn) { btn.disabled = false; btn.innerHTML = 'حفظ'; }
  document.getElementById('productModal').style.display = 'none';
  try { await reloadProducts(); } catch(e) {}
  initAdminDashboard();
};
window.closeProductModal = function() { document.getElementById('productModal').style.display = 'none'; };

export async function deleteAdminProduct(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
  try { await deleteProduct(id); showToast('تم حذف المنتج'); } catch (e) { showToast(e.message); }
  initAdminDashboard();
}
window.deleteAdminProduct = deleteAdminProduct;

// ===== ORDERS =====
export async function updateOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch('/api/orders/' + orderId + '/status', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) throw new Error();
    showToast('تم تحديث حالة الطلب');
  } catch { showToast('فشل تحديث الحالة'); }
  initAdminDashboard();
}
window.updateOrderStatus = updateOrderStatus;

// ===== TRANSFER =====
export function showTransferModal(orderId, storeId, amount) {
  var modal = document.getElementById('transferModal');
  if (!modal) return;
  document.getElementById('transferOrderId').value = orderId;
  document.getElementById('transferStoreId').value = storeId;
  document.getElementById('transferAmount').value = amount;
  modal.style.display = 'flex';
}
window.showTransferModal = showTransferModal;

export async function confirmTransfer() {
  var orderId = parseInt(document.getElementById('transferOrderId').value);
  var storeId = parseInt(document.getElementById('transferStoreId').value);
  var amount = parseFloat(document.getElementById('transferAmount').value) || 0;
  if (amount <= 0) { showToast('يرجى إدخال مبلغ صحيح'); return; }
  try {
    var res = await fetch('/api/orders/transfers', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ orderId, storeId, amount, transferredToOwner: true })
    });
    if (!res.ok) throw new Error();
    document.getElementById('transferModal').style.display = 'none';
    showToast('تم تحويل الطلب');
  } catch { showToast('فشل تحويل الطلب'); }
  initAdminDashboard();
}
window.confirmTransfer = confirmTransfer;

export function closeTransferModal() { var m = document.getElementById('transferModal'); if (m) m.style.display = 'none'; }
window.closeTransferModal = closeTransferModal;

export async function confirmAdminPayment(transferId, orderId) {
  if (!confirm('تأكيد استلام المبلغ؟ سيتم كشف معلومات الزبون')) return;
  try {
    var res = await fetch('/api/orders/transfers/' + transferId, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ transferPaid: true, customerInfoRevealed: true })
    });
    if (!res.ok) throw new Error();
    showToast('تم تأكيد الدفع!');
  } catch { showToast('فشل تأكيد الدفع'); }
  initAdminDashboard();
}
window.confirmAdminPayment = confirmAdminPayment;

// ===== STORE OWNER PAY =====
export async function showPaymentModal(orderId, storeId) {
  var store = getStoreById(storeId);
  var modal = document.getElementById('storePaymentModal');
  if (!modal) return;
  document.getElementById('payOrderId').value = orderId;
  document.getElementById('payStoreId').value = storeId;
  document.getElementById('payBankInfo').textContent = (store && store.paymentInfo) || 'لم يتم إضافة معلومات الدفع';
  try {
    var tRes = await fetch('/api/orders/transfers?orderId=' + orderId + '&storeId=' + storeId, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    if (tRes.ok) {
      var transfers = await tRes.json();
      if (transfers.length > 0) {
        document.getElementById('payAmount').textContent = (transfers[0].amount || 0).toLocaleString();
      }
    }
  } catch {}
  modal.style.display = 'flex';
}
window.showPaymentModal = showPaymentModal;

export function closePaymentModal() { var m = document.getElementById('storePaymentModal'); if (m) m.style.display = 'none'; }
window.closePaymentModal = closePaymentModal;

export async function confirmStorePayment() {
  var orderId = parseInt(document.getElementById('payOrderId').value);
  var storeId = parseInt(document.getElementById('payStoreId').value);
  try {
    var res = await fetch('/api/orders/transfers?orderId=' + orderId + '&storeId=' + storeId, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    if (res.ok) {
      var transfers = await res.json();
      if (transfers.length > 0) {
        await fetch('/api/orders/transfers/' + transfers[0].id, {
          method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
          body: JSON.stringify({ transferPaymentConfirmed: true })
        });
      }
    }
    closePaymentModal();
    showToast('تم إرسال طلب الدفع');
  } catch { showToast('فشل تأكيد الدفع'); }
  initAdminDashboard();
}
window.confirmStorePayment = confirmStorePayment;

// ===== OWNER CRUD =====
export function showAddOwnerModal() {
  document.getElementById('ownerForm').reset();
  document.getElementById('ownerId').value = '';
  var sel = document.getElementById('ownerStore');
  sel.innerHTML = getStores().map(s => '<option value="' + s.id + '">' + s.name + '</option>').join('');
  document.getElementById('ownerModal').style.display = 'flex';
}
window.showAddOwnerModal = showAddOwnerModal;

export async function saveOwner() {
  var username = document.getElementById('ownerUsername').value.trim();
  var password = document.getElementById('ownerPassword').value.trim();
  var name = document.getElementById('ownerName').value.trim();
  var storeId = parseInt(document.getElementById('ownerStore').value);
  if (!username || !password || !name || !storeId) { showToast('يرجى تعبئة الحقول'); return; }
  var btn = document.querySelector('#ownerForm button[type="submit"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...'; }
  try {
    await fetch('/api/ping').catch(() => {});
    await addStoreOwner(username, password, name, storeId);
    showToast('تم إضافة صاحب المتجر');
    document.getElementById('ownerModal').style.display = 'none';
    initAdminDashboard();
  } catch (e) { showToast('فشل الإضافة: ' + (e.message || 'خطأ')); }
  if (btn) { btn.disabled = false; btn.innerHTML = 'حفظ'; }
}
window.saveOwner = saveOwner;

export function closeOwnerModal() { document.getElementById('ownerModal').style.display = 'none'; }
window.closeOwnerModal = closeOwnerModal;

export async function deleteOwner(userId) {
  if (!confirm('هل أنت متأكد من حذف صاحب المتجر؟')) return;
  try { await deleteAuthUser(userId); showToast('تم الحذف'); }
  catch (e) { showToast(e.message); }
  initAdminDashboard();
}
window.deleteOwner = deleteOwner;

// ===== TABS =====
export function switchAdminTab(tab, btn) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
  var map = { orders:'Orders', products:'Products', categories:'Categories', stores:'Stores', owners:'Owners', transfers:'Transfers', users:'Users' };
  var el = document.getElementById('adminTab' + (map[tab] || tab.charAt(0).toUpperCase() + tab.slice(1)));
  if (el) el.style.display = 'block';
}
window.switchAdminTab = switchAdminTab;
