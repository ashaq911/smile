const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/:productId', async (req, res) => {
  const reviews = await db.prepare(`
    SELECT r.*, u.name as userName FROM reviews r
    JOIN users u ON r."userId" = u.id
    WHERE r."productId" = ? ORDER BY r."createdAt" DESC
  `).all(req.params.productId);
  res.json(reviews);
});

router.post('/', verifyToken, async (req, res) => {
  const { productId, rating, comment } = req.body;
  if (!productId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'بيانات التقييم غير مكتملة' });
  }
  const existing = await db.prepare('SELECT id FROM reviews WHERE "productId" = ? AND "userId" = ?').get(productId, req.user.id);
  if (existing) {
    await db.prepare('UPDATE reviews SET rating=?, comment=? WHERE id=?').run(rating, comment || '', existing.id);
    return res.json({ id: existing.id, updated: true });
  }
  const result = await db.prepare('INSERT INTO reviews ("productId", "userId", rating, comment) VALUES (?, ?, ?, ?) RETURNING id')
    .run(productId, req.user.id, rating, comment || '');
  const review = await db.prepare('SELECT r.*, u.name as userName FROM reviews r JOIN users u ON r."userId" = u.id WHERE r.id = ?').get(result.rows[0].id);
  res.json(review);
});

module.exports = router;