import { getCurrentUser, logout, login, registerCustomer } from '../services/auth.js';
import { getStoreById } from '../services/stores.js';
import { showToast } from './toast.js';

export function updateAuthUI() {
  const section = document.getElementById('authSection');
  if (!section) return;
  const user = getCurrentUser();

  const gate = document.getElementById('loginGate');
  const content = document.getElementById('siteContent');
  if (gate && content) {
    gate.style.display = user ? 'none' : 'flex';
    content.style.display = user ? 'block' : 'none';
  }

  if (user) {
    const store = user.storeId ? getStoreById(user.storeId) : null;
    const label = user.role === 'admin' ? 'المدير' : (store ? store.name : user.name);
    const canShop = user.role === 'customer' || user.role === 'admin';
    const cartLink = document.getElementById('cartNavLink');
    const ordersLink = document.getElementById('ordersNavLink');
    if (cartLink) cartLink.style.display = canShop ? '' : 'none';
    if (ordersLink) ordersLink.style.display = canShop ? '' : 'none';
    section.innerHTML = `
      <div class="auth-user">
        <span class="auth-user-name"><i class="fas fa-user-circle"></i> ${label}</span>
        <button class="auth-btn" onclick="window.authLogout()"><i class="fas fa-sign-out-alt"></i></button>
      </div>
    `;
  } else {
    section.innerHTML = `<button class="auth-btn" onclick="window.authShowLogin()" style="margin-left:6px;"><i class="fas fa-sign-in-alt"></i> دخول</button><button class="auth-btn auth-btn-reg" onclick="window.authShowRegister()"><i class="fas fa-user-plus"></i> سجل</button>`;
  }
}

export function showLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.style.display = 'flex';
}
window.authShowLogin = showLoginModal;

export function closeLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.style.display = 'none';
}

export function showRegisterModal() {
  const modal = document.getElementById('registerModal');
  if (modal) modal.style.display = 'flex';
}
window.authShowRegister = showRegisterModal;

export function closeRegisterModal() {
  const modal = document.getElementById('registerModal');
  if (modal) modal.style.display = 'none';
}

export function authLogout() {
  logout();
}
window.authLogout = authLogout;

export async function processLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  if (!username || !password) { showToast('يرجى إدخال اسم المستخدم وكلمة المرور'); return; }
  try {
    const session = await login(username, password);
    closeLoginModal();
    updateAuthUI();
    showToast(`مرحباً، ${session.name || session.username}`);
    const adminContent = document.getElementById('adminContent');
    if (adminContent) initAdminDashboard();
  } catch (e) {
    showToast(e.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
  }
}
window.processLogin = processLogin;

export async function processRegister() {
  const name = document.getElementById('regName').value.trim();
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const confirm = document.getElementById('regConfirm').value.trim();
  if (!name || !username || !password) { showToast('يرجى تعبئة جميع الحقول'); return; }
  if (password !== confirm) { showToast('كلمة المرور غير متطابقة'); return; }
  if (password.length < 4) { showToast('كلمة المرور يجب أن تكون 4 أحرف على الأقل'); return; }
  try {
    const user = await registerCustomer(name, username, password);
    closeRegisterModal();
    updateAuthUI();
    showToast(`مرحباً، ${name}`);
    if (document.getElementById('adminContent')) initAdminDashboard();
  } catch (e) {
    showToast(e.message || 'اسم المستخدم موجود مسبقاً');
  }
}
window.processRegister = processRegister;
