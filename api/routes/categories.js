const express = require('express');
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const { storeId } = req.query;
  let categories;
  if (storeId) {
    categories = await db.prepare('SELECT * FROM categories WHERE storeId = ? ORDER BY name').all(storeId);
  } else {
    categories = await db.prepare('SELECT * FROM categories ORDER BY name').all();
  }
  res.json(categories);
});

router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  const { storeId, name, icon } = req.body;
  if (!storeId || !name) return res.status(400).json({ error: 'بيانات القسم غير مكتملة' });
  const result = await db.prepare('INSERT INTO categories (storeId, name, icon) VALUES (?, ?, ?) RETURNING id')
    .run(storeId, name, icon || 'fa-folder');
  res.json({ id: result.rows[0].id });
});

router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { name, icon } = req.body;
  await db.prepare('UPDATE categories SET name=?, icon=? WHERE id=?')
    .run(name, icon || 'fa-folder', req.params.id);
  res.json({ success: true });
});

router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  await db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/subcategories', async (req, res) => {
  const { categoryId } = req.query;
  let subs;
  if (categoryId) {
    subs = await db.prepare('SELECT * FROM subcategories WHERE categoryId = ? ORDER BY name').all(categoryId);
  } else {
    subs = await db.prepare('SELECT * FROM subcategories ORDER BY name').all();
  }
  res.json(subs);
});

router.post('/subcategories', verifyToken, requireRole('admin'), async (req, res) => {
  const { categoryId, name } = req.body;
  if (!categoryId || !name) return res.status(400).json({ error: 'بيانات التفرع غير مكتملة' });
  const result = await db.prepare('INSERT INTO subcategories (categoryId, name) VALUES (?, ?) RETURNING id').run(categoryId, name);
  res.json({ id: result.rows[0].id });
});

router.put('/subcategories/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { name } = req.body;
  await db.prepare('UPDATE subcategories SET name=? WHERE id=?').run(name, req.params.id);
  res.json({ success: true });
});

router.delete('/subcategories/:id', verifyToken, requireRole('admin'), async (req, res) => {
  await db.prepare('DELETE FROM subcategories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;