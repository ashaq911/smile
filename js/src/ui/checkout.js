import { getCart, getCartTotal, clearCart } from '../services/cart.js';
import { getAddresses, saveAddress } from '../services/addresses.js';
import { showToast } from './toast.js';
import { invalidateOrders } from './orders.js';

export function renderCheckoutSummary() {
  const container = document.getElementById('checkoutSummary');
  if (!container) return;
  const cart = getCart();
  if (cart.length === 0) { container.innerHTML = '<p>السلة فارغة</p>'; return; }
  const fmt = n => n.toLocaleString();
  const subtotal = cart.reduce((s, item) => s + item.price * item.quantity, 0);
  const shippingFee = cart.reduce((s, item) => Math.max(s, (item.shippingFee || 0)), 0);
  container.innerHTML = `
    <h3>ملخص الطلب</h3>
    ${cart.map(item => {
      return `<div class="checkout-item" style="flex-wrap:wrap;"><span>${item.title} × ${item.quantity}</span><span style="text-align:left;">${fmt(item.price * item.quantity)} د.ع</span></div>`;
    }).join('')}
    <div class="checkout-item" style="margin-top:12px;padding-top:12px;border-top:2px solid var(--border);"><span>المجموع الفرعي</span><span>${fmt(subtotal)} د.ع</span></div>
    <div class="checkout-item"><span>رسوم الشحن</span><span>${shippingFee > 0 ? fmt(shippingFee) + ' د.ع' : 'لا توجد'}</span></div>
    <div class="checkout-item" style="font-weight:800;font-size:20px;color:var(--primary);"><span>الإجمالي المطلوب</span><span>${fmt(subtotal + shippingFee)} د.ع</span></div>
    <p style="text-align:center;margin-top:12px;padding:12px;background:var(--bg-secondary);border-radius:12px;font-size:14px;color:var(--text-light);"><i class="fas fa-money-bill-wave"></i> الدفع عند الاستلام</p>`;
}

export async function loadSavedAddresses() {
  const sel = document.getElementById('savedAddressSelect');
  const container = document.getElementById('savedAddressesContainer');
  if (!sel || !container) return;
  try {
    const addresses = await getAddresses();
    if (addresses && addresses.length > 0) {
      container.style.display = 'block';
      sel.innerHTML = '<option value="">-- اختر عنواناً محفوظاً --</option>';
      addresses.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = `${a.label || 'عنوان'} - ${a.city} - ${a.address}`;
        sel.appendChild(opt);
      });
    }
  } catch {}
}

window.fillAddress = function() {
  const sel = document.getElementById('savedAddressSelect');
  if (!sel || !sel.value) return;
  getAddresses().then(addresses => {
    const addr = addresses.find(a => a.id == sel.value);
    if (!addr) return;
    document.getElementById('custName').value = addr.fullName || '';
    document.getElementById('custPhone').value = addr.phone || '';
    document.getElementById('custAddress').value = addr.address || '';
    document.getElementById('custCity').value = addr.city || '';
  });
};

export async function submitOrder(event) {
  event.preventDefault();
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const email = document.getElementById('custEmail').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const city = document.getElementById('custCity').value;
  const saveAddr = document.getElementById('saveAddressCheck')?.checked;
  if (!name || !phone || !address) { showToast('يرجى تعبئة الحقول المطلوبة'); return; }
  const cart = getCart();
  if (cart.length === 0) { showToast('السلة فارغة'); return; }
  try {
    if (saveAddr) {
      try { await saveAddress({ fullName: name, phone, address, city, label: 'العنوان الرئيسي' }); } catch {}
    }
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      body: JSON.stringify({ customer: name, phone, email, address, city, payment: 'cod' })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'فشل تقديم الطلب');
    }
    await clearCart();
    invalidateOrders();
    routerNavigate('orders');
  } catch (e) {
    showToast(e.message);
  }
}
window.submitOrder = submitOrder;