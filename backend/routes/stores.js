const express = require('express');
const { getDb } = require('../db/database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const stores = db.prepare('SELECT * FROM stores ORDER BY name').all();
  res.json(stores);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: 'المتجر غير موجود' });
  res.json(store);
});

router.post('/', verifyToken, requireRole('admin'), (req, res) => {
  const { name, description, icon, owner, phone, paymentInfo, deliveryFee } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم المتجر مطلوب' });

  const db = getDb();
  const result = db.prepare('INSERT INTO stores (name, description, icon, owner, phone, paymentInfo, deliveryFee) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(name, description || '', icon || 'fa-store', owner || '', phone || '', paymentInfo || '', deliveryFee || 0);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const { name, description, icon, owner, phone, paymentInfo, deliveryFee } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم المتجر مطلوب' });

  const db = getDb();
  db.prepare('UPDATE stores SET name=?, description=?, icon=?, owner=?, phone=?, paymentInfo=?, deliveryFee=? WHERE id=?')
    .run(name, description || '', icon || 'fa-store', owner || '', phone || '', paymentInfo || '', deliveryFee || 0, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM stores WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
