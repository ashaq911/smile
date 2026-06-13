const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken, verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'الرجاء إدخال اسم المستخدم وكلمة المرور' });
  const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }
  const token = generateToken(user);
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, storeid: user.storeid, name: user.name } });
});

router.post('/register', async (req, res) => {
  const { username, password, name, role, storeId } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'الرجاء إدخال اسم المستخدم وكلمة المرور' });
  const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'اسم المستخدم موجود بالفعل' });
  const hash = bcrypt.hashSync(password, 10);
  const result = await db.prepare('INSERT INTO users (username, password, role, name, storeId) VALUES (?, ?, ?, ?, ?) RETURNING id')
    .run(username, hash, role || 'customer', name || '', storeId || null);
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(result.rows[0].id);
  const token = generateToken(user);
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, storeid: user.storeid, name: user.name } });
});

router.get('/me', verifyToken, async (req, res) => {
  const user = await db.prepare('SELECT id, username, role, name, storeId FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
  res.json(user);
});

router.get('/owners', verifyToken, requireRole('admin'), async (req, res) => {
  const owners = await db.prepare("SELECT id, username, name, role, storeId FROM users WHERE role = 'store_owner'").all();
  res.json(owners);
});

router.delete('/owners/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const owner = await db.prepare("SELECT * FROM users WHERE id = ? AND role = 'store_owner'").get(req.params.id);
  if (!owner) return res.status(404).json({ error: 'صاحب المتجر غير موجود' });
  await db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;