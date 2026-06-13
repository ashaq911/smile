const express = require('express');
const { getDb } = require('../db/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, (req, res) => {
  const db = getDb();
  const items = db.prepare(`
    SELECT ci.id, ci.productId, ci.quantity, p.title, p.price, p.oldPrice, p.icon, p.image, p.storeId, p.shippingFee, p.inStock
    FROM cart_items ci JOIN products p ON ci.productId = p.id
    WHERE ci.userId = ?
  `).all(req.user.id);
  res.json(items);
});

router.post('/', verifyToken, (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId) return res.status(400).json({ error: 'المنتج مطلوب' });

  const db = getDb();
  const existing = db.prepare('SELECT * FROM cart_items WHERE userId = ? AND productId = ?').get(req.user.id, productId);
  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?').run(quantity || 1, existing.id);
  } else {
    db.prepare('INSERT INTO cart_items (userId, productId, quantity) VALUES (?, ?, ?)').run(req.user.id, productId, quantity || 1);
  }
  const items = db.prepare('SELECT COUNT(*) as count FROM cart_items WHERE userId = ?').get(req.user.id);
  res.json({ success: true, count: items.count });
});

router.put('/:id', verifyToken, (req, res) => {
  const { quantity } = req.body;
  const db = getDb();
  db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND userId = ?').run(quantity, req.params.id, req.user.id);
  res.json({ success: true });
});

router.delete('/:id', verifyToken, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM cart_items WHERE id = ? AND userId = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

router.delete('/', verifyToken, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM cart_items WHERE userId = ?').run(req.user.id);
  res.json({ success: true });
});

router.get('/count', verifyToken, (req, res) => {
  const db = getDb();
  const result = db.prepare('SELECT COUNT(*) as count FROM cart_items WHERE userId = ?').get(req.user.id);
  res.json(result);
});

module.exports = router;
