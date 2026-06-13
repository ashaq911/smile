import { apiGet, apiPost } from './api.js';

export async function getReviews(productId) {
  return apiGet(`/reviews/${productId}`);
}

export async function addReview(productId, rating, comment) {
  return apiPost('/reviews', { productId, rating, comment });
}
