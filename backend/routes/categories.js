const express = require('express');
const { getDb } = require('../db/database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { storeId } = req.query;
  let categories;
  if (storeId) {
    categories = db.prepare('SELECT * FROM categories WHERE storeId = ? ORDER BY name').all(storeId);
  } else {
    categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  }
  res.json(categories);
});

router.post('/', verifyToken, requireRole('admin'), (req, res) => {
  const { storeId, name, icon } = req.body;
  if (!storeId || !name) return res.status(400).json({ error: 'بيانات القسم غير مكتملة' });

  const db = getDb();
  const result = db.prepare('INSERT INTO categories (storeId, name, icon) VALUES (?, ?, ?)')
    .run(storeId, name, icon || 'fa-folder');
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const { name, icon } = req.body;
  const db = getDb();
  db.prepare('UPDATE categories SET name=?, icon=? WHERE id=?')
    .run(name, icon || 'fa-folder', req.params.id);
  res.json({ success: true });
});

router.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Subcategories
router.get('/subcategories', (req, res) => {
  const db = getDb();
  const { categoryId } = req.query;
  let subs;
  if (categoryId) {
    subs = db.prepare('SELECT * FROM subcategories WHERE categoryId = ? ORDER BY name').all(categoryId);
  } else {
    subs = db.prepare('SELECT * FROM subcategories ORDER BY name').all();
  }
  res.json(subs);
});

router.post('/subcategories', verifyToken, requireRole('admin'), (req, res) => {
  const { categoryId, name } = req.body;
  if (!categoryId || !name) return res.status(400).json({ error: 'بيانات التفرع غير مكتملة' });

  const db = getDb();
  const result = db.prepare('INSERT INTO subcategories (categoryId, name) VALUES (?, ?)').run(categoryId, name);
  res.json({ id: result.lastInsertRowid });
});

router.put('/subcategories/:id', verifyToken, requireRole('admin'), (req, res) => {
  const { name } = req.body;
  const db = getDb();
  db.prepare('UPDATE subcategories SET name=? WHERE id=?').run(name, req.params.id);
  res.json({ success: true });
});

router.delete('/subcategories/:id', verifyToken, requireRole('admin'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM subcategories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
