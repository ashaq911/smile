import { getCurrentUser } from '../services/auth.js';
import { showToast } from './toast.js';

let allOrders = [];

let ordersLoaded = false;

export async function renderOrders() {
  const container = document.getElementById('ordersContainer');
  if (!container) return;
  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = '<div class="cart-empty"><i class="fas fa-user-lock"></i><h2>سجل الدخول لمشاهدة طلباتك</h2><p>قم بتسجيل الدخول أو إنشاء حساب لمتابعة طلباتك</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;"><button class="btn btn-primary" onclick="window.authShowLogin()">تسجيل الدخول</button><button class="btn btn-outline" onclick="window.authShowRegister()">إنشاء حساب</button></div></div>';
    return;
  }
  if (!ordersLoaded) {
    try {
      const res = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (res.ok) allOrders = await res.json();
      else allOrders = [];
    } catch { allOrders = []; }
    ordersLoaded = true;
  }

  let orders = allOrders;
  if (user.role === 'customer') orders = allOrders.filter(o => o.userId === user.id);
  if (orders.length === 0) {
    container.innerHTML = '<div class="cart-empty"><i class="fas fa-box-open"></i><h2>لا توجد طلبات</h2><p>لم تقم بطلب أي منتج بعد</p><a href="javascript:window.routerNavigate(\'stores\')" class="btn btn-primary">تسوق الآن</a></div>';
    return;
  }
  container.innerHTML = [...orders].reverse().map(order => {
    const statusLabels = { pending: 'قيد الانتظار', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التوصيل', cancelled: 'ملغي' };
    const orderShipping = order.items.reduce((s, i) => Math.max(s, i.shippingFee || 0), 0);
    const transferred = order.transfers && order.transfers.some(t => t.transferredToOwner === 1);
    const deletable = !transferred && order.status !== 'cancelled';
    return `<div class="order-card" style="position:relative;">
      ${transferred ? '<div style="position:absolute;top:12px;left:12px;background:var(--warning);color:#333;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;"><i class="fas fa-exchange-alt"></i> تم التحويل للمتجر</div>' : ''}
      ${deletable ? `<button class="btn btn-danger btn-sm" onclick="window.deleteCustomerOrder(${order.id})" style="position:absolute;bottom:12px;left:12px;" title="حذف الطلب"><i class="fas fa-trash"></i> حذف</button>` : ''}
      <div class="order-header"><div><span class="order-id">طلب #${order.id}</span><span style="color:var(--text-light);font-size:13px;margin-right:12px;">${order.createdAt || ''}</span></div><span class="order-status status-${order.status}">${statusLabels[order.status] || order.status}</span></div>
      <div class="order-items">${order.items.map(item => {
        return `<div class="order-item"><span>${item.title} × ${item.quantity}</span><span>${(item.price * item.quantity).toLocaleString()} د.ع</span></div>`;
      }).join('')}</div>
      <div class="order-item" style="justify-content:space-between;display:flex;font-size:14px;color:var(--text-light);"><span>رسوم الشحن</span><span>${orderShipping > 0 ? orderShipping.toLocaleString() + ' د.ع' : 'لا توجد'}</span></div>
      <div style="text-align:center;font-size:13px;color:var(--text-light);margin-top:4px;"><i class="fas fa-money-bill-wave"></i> الدفع عند الاستلام</div>
      <div class="order-total"><span>الإجمالي</span><span>${order.total.toLocaleString()} د.ع</span></div>
    </div>`;
  }).join('');
}

export async function deleteCustomerOrder(orderId) {
  if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
  try {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'فشل حذف الطلب'); }
    showToast('تم حذف الطلب');
    renderOrders();
  } catch (e) { showToast(e.message); }
}
window.deleteCustomerOrder = deleteCustomerOrder;
