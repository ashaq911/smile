import { getCurrentUser } from './services/auth.js';

const protectedPages = ['cart', 'orders', 'checkout', 'admin'];

let pageRenderers = {};

export function registerPage(name, renderFn) {
  pageRenderers[name] = renderFn;
}

export function navigate(path) {
  const [page, qs] = path.split('?');
  const params = new URLSearchParams(qs || '');
  window.location.hash = '#' + path;

  document.querySelectorAll('.page-section').forEach(p => p.style.display = 'none');

  const sectionId = page ? 'page-' + page : 'page-home';
  const section = document.getElementById(sectionId);
  if (!section) return;

  const isProtected = protectedPages.includes(page);
  const user = getCurrentUser();
  const gate = document.getElementById('loginGate');
  const content = document.getElementById('siteContent');
  if (isProtected && !user) {
    if (gate) gate.style.display = 'flex';
    if (content) content.style.display = 'none';
    return;
  }
  if (gate) gate.style.display = user ? 'none' : 'flex';
  if (content) content.style.display = user ? 'block' : 'none';

  section.style.display = 'block';
  window._spaParams = params;

  document.querySelectorAll('.nav a').forEach(a => a.classList.remove('active'));
  const link = document.querySelector(`.nav a[data-page="${page}"]`);
  if (link) link.classList.add('active');

  const titles = { '': 'سمايل - للتسوق الإلكتروني', 'stores': 'المتاجر - سمايل', 'store': 'المتجر - سمايل', 'cart': 'سلة التسوق - سمايل', 'orders': 'طلباتي - سمايل', 'checkout': 'إتمام الطلب - سمايل', 'admin': 'لوحة التحكم - سمايل', 'product': 'المنتج - سمايل' };
  document.title = titles[page] || 'سمايل';

  if (pageRenderers[page]) pageRenderers[page](params);
}

export function goHome() {
  navigate('');
}

export function initRouter() {
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1) || '';
    navigate(hash);
  });

  const hash = window.location.hash.slice(1) || '';
  if (hash) navigate(hash);
  else {
    const user = getCurrentUser();
    const gate = document.getElementById('loginGate');
    const content = document.getElementById('siteContent');
    if (gate) gate.style.display = user ? 'none' : 'flex';
    if (content) content.style.display = user ? 'block' : 'none';
    document.getElementById('page-home').style.display = 'block';
    const link = document.querySelector('.nav a[data-page=""]');
    if (link) link.classList.add('active');
  }
}

window.routerNavigate = navigate;
