const express = require('express');
const { getDb } = require('../db/database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { storeId, subcategoryId, search } = req.query;
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (storeId) { sql += ' AND storeId = ?'; params.push(storeId); }
  if (subcategoryId) { sql += ' AND subcategoryId = ?'; params.push(subcategoryId); }
  if (search) { sql += ' AND (title LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  sql += ' ORDER BY createdAt DESC';
  const products = db.prepare(sql).all(...params);
  res.json(products);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
  res.json(product);
});

router.post('/', verifyToken, requireRole('admin'), (req, res) => {
  const { title, description, price, oldPrice, icon, image, inStock, storeId, subcategoryId, shippingFee } = req.body;
  if (!title || !price || !storeId) return res.status(400).json({ error: 'بيانات المنتج غير مكتملة' });

  const db = getDb();
  const result = db.prepare(`INSERT INTO products (title, description, price, oldPrice, icon, image, inStock, storeId, subcategoryId, shippingFee) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(title, description || '', price, oldPrice || null, icon || 'fa-box', image || '', inStock ?? 1, storeId, subcategoryId || null, shippingFee || 0);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const { title, description, price, oldPrice, icon, image, inStock, storeId, subcategoryId, shippingFee } = req.body;
  if (!title || !price) return res.status(400).json({ error: 'بيانات المنتج غير مكتملة' });

  const db = getDb();
  db.prepare(`UPDATE products SET title=?, description=?, price=?, oldPrice=?, icon=?, image=?, inStock=?, storeId=?, subcategoryId=?, shippingFee=? WHERE id=?`)
    .run(title, description || '', price, oldPrice || null, icon || 'fa-box', image || '', inStock ?? 1, storeId, subcategoryId || null, shippingFee || 0, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/count/:storeId', (req, res) => {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as count FROM products WHERE storeId = ?').get(req.params.storeId);
  res.json(count);
});

router.get('/category-count/:categoryId', (req, res) => {
  const db = getDb();
  const subs = db.prepare('SELECT id FROM subcategories WHERE categoryId = ?').all(req.params.categoryId);
  if (subs.length === 0) return res.json({ count: 0 });

  const placeholders = subs.map(() => '?').join(',');
  const ids = subs.map(s => s.id);
  const count = db.prepare(`SELECT COUNT(*) as count FROM products WHERE subcategoryId IN (${placeholders})`).get(...ids);
  res.json(count);
});

router.get('/subcategory-count/:subcategoryId', (req, res) => {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as count FROM products WHERE subcategoryId = ?').get(req.params.subcategoryId);
  res.json(count);
});

module.exports = router;
