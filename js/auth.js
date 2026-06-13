const defaultAuthUsers = [
  { id: 1, username: 'isaac', password: 'mmhmmh2022', role: 'admin', name: 'المدير', storeId: null }
];

let authUsers = JSON.parse(localStorage.getItem('authUsers')) || [...defaultAuthUsers];
let authUserCounter = parseInt(localStorage.getItem('authUserCounter')) || 2;

function saveAuthUsers() {
  localStorage.setItem('authUsers', JSON.stringify(authUsers));
}

function login(username, password) {
  const user = authUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) return null;
  const session = { id: user.id, username: user.username, role: user.role, storeId: user.storeId, name: user.name };
  localStorage.setItem('currentUser', JSON.stringify(session));
  return session;
}

function logout() {
  localStorage.removeItem('currentUser');
  window.location.reload();
}

function getCurrentUser() {
  const data = localStorage.getItem('currentUser');
  return data ? JSON.parse(data) : null;
}

function isLoggedIn() {
  return getCurrentUser() !== null;
}

function isAdmin() {
  const u = getCurrentUser();
  return u && u.role === 'admin';
}

function isStoreOwner() {
  const u = getCurrentUser();
  return u && u.role === 'store_owner';
}

function canManageStore(storeId) {
  const u = getCurrentUser();
  if (!u) return false;
  if (u.role === 'admin') return true;
  if (u.role === 'store_owner' && u.storeId === storeId) return true;
  return false;
}

function addStoreOwner(username, password, name, storeId) {
  const user = { id: authUserCounter++, username, password, role: 'store_owner', name, storeId };
  localStorage.setItem('authUserCounter', authUserCounter.toString());
  authUsers.push(user);
  saveAuthUsers();
  return user;
}

function deleteAuthUser(userId) {
  authUsers = authUsers.filter(u => u.id !== userId);
  saveAuthUsers();
}

function getStoreOwners() {
  return authUsers.filter(u => u.role === 'store_owner');
}

function getStoreOwnerByStoreId(storeId) {
  return authUsers.find(u => u.role === 'store_owner' && u.storeId === storeId);
}

function getAuthUserById(id) {
  return authUsers.find(u => u.id === id);
}

function updateAuthUI() {
  const section = document.getElementById('authSection');
  if (!section) return;
  const user = getCurrentUser();

  // Toggle login gate
  const gate = document.getElementById('loginGate');
  const content = document.getElementById('siteContent');
  if (gate && content) {
    if (user) { gate.style.display = 'none'; content.style.display = 'block'; }
    else { gate.style.display = 'flex'; content.style.display = 'none'; }
  }

  if (user) {
    const store = user.storeId ? getStoreById(user.storeId) : null;
    const label = user.role === 'admin' ? 'المدير' : (store ? store.name : user.name);
    // Show cart/orders only for customers
    const cartLink = document.getElementById('cartNavLink');
    const ordersLink = document.getElementById('ordersNavLink');
    if (cartLink) cartLink.style.display = user.role === 'customer' ? '' : 'none';
    if (ordersLink) ordersLink.style.display = user.role === 'customer' ? '' : 'none';
    section.innerHTML = `
      <div class="auth-user">
        <span class="auth-user-name"><i class="fas fa-user-circle"></i> ${label}</span>
        <button class="auth-btn" onclick="logout()"><i class="fas fa-sign-out-alt"></i></button>
      </div>
    `;
  } else {
    section.innerHTML = `<button class="auth-btn" onclick="showLoginModal()" style="margin-left:6px;"><i class="fas fa-sign-in-alt"></i> دخول</button><button class="auth-btn auth-btn-reg" onclick="showRegisterModal()"><i class="fas fa-user-plus"></i> سجل</button>`;
  }
}

function processLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  if (!username || !password) { showToast('يرجى إدخال اسم المستخدم وكلمة المرور'); return; }
  const session = login(username, password);
  if (!session) { showToast('اسم المستخدم أو كلمة المرور غير صحيحة'); return; }
  closeLoginModal();
  updateAuthUI();
  showToast(`مرحباً، ${session.name || session.username}`);
  const adminContent = document.getElementById('adminContent');
  if (adminContent) initAdminDashboard();
}

function showLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.style.display = 'flex';
}

function closeLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.style.display = 'none';
}

function showRegisterModal() {
  const modal = document.getElementById('registerModal');
  if (modal) modal.style.display = 'flex';
}

function closeRegisterModal() {
  const modal = document.getElementById('registerModal');
  if (modal) modal.style.display = 'none';
}

function registerCustomer(name, username, password) {
  if (authUsers.find(u => u.username.toLowerCase() === username.toLowerCase())) return null;
  const user = { id: authUserCounter++, username, password, role: 'customer', name, storeId: null };
  localStorage.setItem('authUserCounter', authUserCounter.toString());
  authUsers.push(user);
  saveAuthUsers();
  return user;
}
