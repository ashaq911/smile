const express = require('express');
const { getDb } = require('../db/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, (req, res) => {
  const db = getDb();
  const addresses = db.prepare('SELECT * FROM addresses WHERE userId = ? ORDER BY isDefault DESC, createdAt DESC').all(req.user.id);
  res.json(addresses);
});

router.post('/', verifyToken, (req, res) => {
  const { label, address, city, phone, isDefault, fullName } = req.body;
  if (!address) return res.status(400).json({ error: 'العنوان مطلوب' });
  const db = getDb();
  if (isDefault) db.prepare('UPDATE addresses SET isDefault=0 WHERE userId=?').run(req.user.id);
  const result = db.prepare('INSERT INTO addresses (userId, label, address, city, phone, isDefault, fullName) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(req.user.id, label || '', address, city || '', phone || '', isDefault ? 1 : 0, fullName || '');
  const addr = db.prepare('SELECT * FROM addresses WHERE id = ?').get(result.lastInsertRowid);
  res.json(addr);
});

router.put('/:id', verifyToken, (req, res) => {
  const { label, address, city, phone, isDefault, fullName } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM addresses WHERE id = ? AND userId = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'العنوان غير موجود' });
  if (isDefault) db.prepare('UPDATE addresses SET isDefault=0 WHERE userId=?').run(req.user.id);
  db.prepare('UPDATE addresses SET label=?, address=?, city=?, phone=?, isDefault=?, fullName=? WHERE id=?')
    .run(label || existing.label, address || existing.address, city || existing.city, phone || existing.phone, isDefault ? 1 : 0, fullName || existing.fullName, req.params.id);
  const addr = db.prepare('SELECT * FROM addresses WHERE id = ?').get(req.params.id);
  res.json(addr);
});

router.delete('/:id', verifyToken, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM addresses WHERE id = ? AND userId = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

module.exports = router;
