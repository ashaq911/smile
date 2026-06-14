import { getProductById, getProducts } from '../services/products.js';
import { getStoreById } from '../services/stores.js';
import { getSubcategoryById } from '../services/categories.js';
import { getCurrentUser } from '../services/auth.js';
import { getReviews, addReview } from '../services/reviews.js';
import { showToast } from './toast.js';

export async function renderProductDetail() {
  const container = document.getElementById('productDetailContainer');
  const loader = document.getElementById('productLoader');
  if (!container) return;

  const p = window._spaParams || new URLSearchParams(window.location.search);
  const productId = parseInt(p.get('id'));
  if (!productId) { container.innerHTML = '<div class="cart-empty"><h2>المنتج غير موجود</h2></div>'; return; }

  loader.style.display = 'flex';
  container.querySelector('.product-detail')?.remove();

  const product = getProductById(productId);
  if (!product) {
    loader.style.display = 'none';
    container.innerHTML = '<div class="cart-empty"><h2>المنتج غير موجود</h2></div>';
    return;
  }

  const store = getStoreById(product.storeId);
  const sub = getSubcategoryById(product.subcategoryId);
  const user = getCurrentUser();
  const canShop = user && (user.role === 'customer' || user.role === 'admin');

  if (typeof window.trackRecentlyViewed === 'function') {
    window.trackRecentlyViewed(productId);
  }

  // Fetch reviews
  let reviews = [];
  try { reviews = await getReviews(productId); } catch {}

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 0;

  loader.style.display = 'none';

  const detailHtml = document.createElement('div');
  detailHtml.className = 'product-detail';
  detailHtml.innerHTML = `
    <div class="product-detail-grid">
      <div class="product-detail-image">
        ${product.image
          ? `<img src="${product.image}" alt="${product.title}" onerror="this.outerHTML='<i class=\\'fas ${product.icon}\\' style=\\'font-size:120px;color:var(--primary);\\'></i>'">`
          : `<i class="fas ${product.icon}" style="font-size:120px;color:var(--primary);"></i>`
        }
        ${!product.inStock ? '<div class="product-out-badge">نفد من المخزون</div>' : ''}
      </div>
      <div class="product-detail-info">
        <div class="product-detail-meta">
          <span><i class="fas fa-store"></i> ${store ? store.name : '—'}</span>
          <span><i class="fas fa-tag"></i> ${sub ? sub.name : 'غير مصنف'}</span>
        </div>
        <h1 class="product-detail-title">${product.title}</h1>
        <div class="product-detail-rating-summary">
          <div class="stars">${'<i class="fas fa-star"></i>'.repeat(Math.round(avgRating))}${'<i class="far fa-star"></i>'.repeat(5 - Math.round(avgRating))}</div>
          <span>${avgRating} (${reviews.length} تقييم)</span>
        </div>
        <div class="product-detail-price">
          <span class="current-price">${product.price.toLocaleString()} د.ع</span>
          ${product.oldPrice ? `<span class="old-price">${product.oldPrice.toLocaleString()} د.ع</span><span class="discount-badge">-${Math.round((1 - product.price / product.oldPrice) * 100)}%</span>` : ''}
        </div>
        <p class="product-detail-desc">${product.description || 'لا يوجد وصف'}</p>
        ${product.shippingFee > 0 ? `<p class="product-detail-shipping"><i class="fas fa-truck"></i> رسوم الشحن: ${product.shippingFee.toLocaleString()} د.ع</p>` : '<p class="product-detail-shipping"><i class="fas fa-truck"></i> شحن مجاني</p>'}
        <div class="product-detail-actions">
          ${canShop ? `
            <div class="qty-selector">
              <button onclick="window.productQtyChange(-1)">-</button>
              <span id="productQty">1</span>
              <button onclick="window.productQtyChange(1)">+</button>
            </div>
            <button class="btn btn-primary btn-lg" onclick="window.addToCartFromDetail(${product.id})" ${!product.inStock ? 'disabled' : ''}>
              <i class="fas fa-shopping-cart"></i> ${product.inStock ? 'أضف إلى السلة' : 'نفد من المخزون'}
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  container.appendChild(detailHtml);

  // Breadcrumb
  const breadcrumb = document.getElementById('productBreadcrumb');
  if (breadcrumb) {
    breadcrumb.innerHTML = `
      <a href="../index.html"><i class="fas fa-home"></i> الرئيسية</a>
      ${store ? `<span class="bc-sep">/</span> <a href="store.html?id=${store.id}">${store.name}</a>` : ''}
      ${sub ? `<span class="bc-sep">/</span> <span>${sub.name}</span>` : ''}
      <span class="bc-sep">/</span> <span>${product.title}</span>
    `;
  }

  // Reviews
  renderReviews(productId, reviews);

  // Related products
  renderRelatedProducts(product);
}

function renderReviews(productId, reviews) {
  const container = document.getElementById('reviewsContainer');
  if (!container) return;
  const user = getCurrentUser();
  const userReview = reviews.find(r => r.userId === user?.id);
  container.innerHTML = `
    <div class="reviews-list">
      ${reviews.length === 0 ? '<p style="text-align:center;color:var(--text-light);padding:40px;">لا توجد تقييمات بعد. كن أول من يقيم!</p>' : reviews.map(r => `
        <div class="review-card">
          <div class="review-header">
            <div class="review-user"><i class="fas fa-user-circle"></i> ${r.userName || 'مستخدم'}</div>
            <div class="review-stars">${'<i class="fas fa-star"></i>'.repeat(r.rating)}${'<i class="far fa-star"></i>'.repeat(5 - r.rating)}</div>
          </div>
          <div class="review-date">${r.createdAt || ''}</div>
          ${r.comment ? `<p class="review-comment">${r.comment}</p>` : ''}
        </div>
      `).join('')}
    </div>
    ${user && !userReview && (user.role === 'customer' || user.role === 'admin') ? `
      <div class="review-form">
        <h3><i class="fas fa-star"></i> أضف تقييمك</h3>
        <div class="review-form-stars" id="reviewStars">
          ${[1,2,3,4,5].map(i => `<i class="far fa-star" data-rating="${i}" onclick="window.setReviewRating(${i})"></i>`).join('')}
        </div>
        <input type="hidden" id="reviewRating" value="0">
        <textarea id="reviewComment" placeholder="اكتب تعليقك (اختياري)" rows="3"></textarea>
        <button class="btn btn-primary" onclick="window.submitReview(${productId})"><i class="fas fa-paper-plane"></i> إرسال التقييم</button>
      </div>
    ` : ''}
    ${user && userReview ? '<p style="color:var(--success);font-weight:700;text-align:center;"><i class="fas fa-check-circle"></i> لقد قمت بتقييم هذا المنتج</p>' : ''}
  `;
}

function renderRelatedProducts(product) {
  const container = document.getElementById('relatedProducts');
  if (!container) return;
  const related = getProducts()
    .filter(p => p.id !== product.id && (p.storeId === product.storeId || p.subcategoryId === product.subcategoryId))
    .slice(0, 4);
  if (related.length === 0) { container.innerHTML = ''; return; }
  const user = getCurrentUser();
  const canShop = user && (user.role === 'customer' || user.role === 'admin');
  container.innerHTML = related.map(p => {
    const imgHtml = p.image
      ? `<img src="${p.image}" alt="${p.title}" loading="lazy" onerror="this.outerHTML='<i class=\\'fas ${p.icon}\\'></i>'">`
      : `<i class="fas ${p.icon}"></i>`;
    return `<div class="product-card" onclick="routerNavigate('product?id=${p.id}')">
      <div class="product-img">${imgHtml}</div>
      <div class="product-body">
        <h3 class="product-title">${p.title}</h3>
        <div class="product-footer"><span class="product-price">${p.price.toLocaleString()} د.ع</span></div>
        ${canShop ? `<button class="add-to-cart-btn" onclick="event.stopPropagation();window.addToCart(${p.id})" ${!p.inStock ? 'disabled' : ''}>${p.inStock ? '<i class="fas fa-shopping-cart"></i> أضف' : 'نفد'}</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

window.productQty = 1;
window.productQtyChange = function(delta) {
  const el = document.getElementById('productQty');
  if (!el) return;
  window.productQty = Math.max(1, window.productQty + delta);
  el.textContent = window.productQty;
};

window.setReviewRating = function(rating) {
  document.getElementById('reviewRating').value = rating;
  document.querySelectorAll('#reviewStars i').forEach((el, i) => {
    el.className = i < rating ? 'fas fa-star' : 'far fa-star';
  });
};

window.submitReview = async function(productId) {
  const rating = parseInt(document.getElementById('reviewRating').value);
  const comment = document.getElementById('reviewComment').value.trim();
  if (!rating) { showToast('يرجى اختيار تقييم'); return; }
  try {
    await addReview(productId, rating, comment);
    showToast('تم إضافة تقييمك بنجاح');
    renderProductDetail();
  } catch (e) { showToast(e.message); }
};

window.addToCartFromDetail = function(productId) {
  const qty = window.productQty || 1;
  window.addToCart(productId, qty);
  window.productQty = 1;
  const el = document.getElementById('productQty');
  if (el) el.textContent = '1';
};
