const express = require('express');
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const { storeId, subcategoryId, search } = req.query;
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  if (storeId) { sql += ` AND storeId = $${params.length + 1}`; params.push(storeId); }
  if (subcategoryId) { sql += ` AND subcategoryId = $${params.length + 1}`; params.push(subcategoryId); }
  if (search) { sql += ` AND (title ILIKE $${params.length + 1} OR description ILIKE $${params.length + 2})`; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY "createdAt" DESC';
  const products = await db.prepare(sql).all(...params);
  res.json(products);
});

router.get('/:id', async (req, res) => {
  const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
  res.json(product);
});

router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  const { title, description, price, oldPrice, icon, image, inStock, storeId, subcategoryId, shippingFee } = req.body;
  if (!title || !price || !storeId) return res.status(400).json({ error: 'بيانات المنتج غير مكتملة' });
  const result = await db.prepare(`INSERT INTO products (title, description, price, oldPrice, icon, image, inStock, storeId, subcategoryId, shippingFee) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`)
    .run(title, description || '', price, oldPrice || null, icon || 'fa-box', image || '', inStock ?? 1, storeId, subcategoryId || null, shippingFee || 0);
  res.json({ id: result.rows[0].id });
});

router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { title, description, price, oldPrice, icon, image, inStock, storeId, subcategoryId, shippingFee } = req.body;
  if (!title || !price) return res.status(400).json({ error: 'بيانات المنتج غير مكتملة' });
  await db.prepare(`UPDATE products SET title=?, description=?, price=?, oldPrice=?, icon=?, image=?, inStock=?, storeId=?, subcategoryId=?, shippingFee=? WHERE id=?`)
    .run(title, description || '', price, oldPrice || null, icon || 'fa-box', image || '', inStock ?? 1, storeId, subcategoryId || null, shippingFee || 0, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  await db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/count/:storeId', async (req, res) => {
  const count = await db.prepare('SELECT COUNT(*) as count FROM products WHERE storeId = ?').get(req.params.storeId);
  res.json(count);
});

router.get('/category-count/:categoryId', async (req, res) => {
  const subs = await db.prepare('SELECT id FROM subcategories WHERE categoryId = ?').all(req.params.categoryId);
  if (subs.length === 0) return res.json({ count: 0 });
  const placeholders = subs.map((_, i) => `$${i + 1}`).join(',');
  const ids = subs.map(s => s.id);
  const result = await db.prepare(`SELECT COUNT(*) as count FROM products WHERE subcategoryId IN (${placeholders})`).all(...ids);
  res.json(result[0] || { count: 0 });
});

router.get('/subcategory-count/:subcategoryId', async (req, res) => {
  const count = await db.prepare('SELECT COUNT(*) as count FROM products WHERE subcategoryId = ?').get(req.params.subcategoryId);
  res.json(count);
});

module.exports = router;