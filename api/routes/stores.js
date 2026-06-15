const express = require('express');
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const stores = await db.prepare('SELECT * FROM stores ORDER BY name').all();
  res.json(stores);
});

router.get('/:id', async (req, res) => {
  const store = await db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: 'المتجر غير موجود' });
  res.json(store);
});

router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  const { name, description, icon, owner, phone, paymentInfo, deliveryFee } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم المتجر مطلوب' });
  const result = await db.prepare('INSERT INTO stores (name, description, icon, owner, phone, paymentInfo, deliveryFee) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id')
    .run(name, description || '', icon || 'fa-store', owner || '', phone || '', paymentInfo || '', deliveryFee || 0);
  res.json({ id: result.rows[0].id });
});

router.put('/:id', verifyToken, requireRole('admin', 'store_owner'), async (req, res) => {
  const { name, description, icon, owner, phone, paymentInfo, deliveryFee } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم المتجر مطلوب' });
  if (req.user.role === 'store_owner' && req.user.storeId !== parseInt(req.params.id)) return res.status(403).json({ error: 'لا تصلاحية لك لهذا المتجر' });
  await db.prepare('UPDATE stores SET name=?, description=?, icon=?, owner=?, phone=?, paymentInfo=?, deliveryFee=? WHERE id=?')
    .run(name, description || '', icon || 'fa-store', owner || '', phone || '', paymentInfo || '', deliveryFee || 0, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  await db.prepare('DELETE FROM stores WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;