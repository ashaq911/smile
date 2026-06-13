const express = require('express');
const { getDb } = require('../db/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/:productId', (req, res) => {
  const db = getDb();
  const reviews = db.prepare(`
    SELECT r.*, u.name as userName FROM reviews r
    JOIN users u ON r.userId = u.id
    WHERE r.productId = ? ORDER BY r.createdAt DESC
  `).all(req.params.productId);
  res.json(reviews);
});

router.post('/', verifyToken, (req, res) => {
  const { productId, rating, comment } = req.body;
  if (!productId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'بيانات التقييم غير مكتملة' });
  }
  const db = getDb();
  const existing = db.prepare('SELECT id FROM reviews WHERE productId = ? AND userId = ?').get(productId, req.user.id);
  if (existing) {
    db.prepare('UPDATE reviews SET rating=?, comment=? WHERE id=?').run(rating, comment || '', existing.id);
    return res.json({ id: existing.id, updated: true });
  }
  const result = db.prepare('INSERT INTO reviews (productId, userId, rating, comment) VALUES (?, ?, ?, ?)')
    .run(productId, req.user.id, rating, comment || '');
  const review = db.prepare('SELECT r.*, u.name as userName FROM reviews r JOIN users u ON r.userId = u.id WHERE r.id = ?').get(result.lastInsertRowid);
  res.json(review);
});

module.exports = router;
