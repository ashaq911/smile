const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'smayel-secret-key-change-in-production';
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
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, storeId: user.storeId, name: user.name } });
});

router.post('/register', async (req, res) => {
  const { username, password, name, role, storeId } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'الرجاء إدخال اسم المستخدم وكلمة المرور' });
  if (role === 'store_owner' || role === 'admin') {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'مطلوب تسجيل الدخول' });
    try {
      const caller = jwt.verify(header.split(' ')[1], JWT_SECRET);
      if (caller.role !== 'admin') return res.status(403).json({ error: 'لا توجد صلاحية' });
    } catch { return res.status(401).json({ error: 'رمز الدخول غير صالح' }); }
  }
  try {
    const hash = bcrypt.hashSync(password, 8);
    const result = await db.prepare('INSERT INTO users (username, password, role, name, storeId) VALUES (?, ?, ?, ?, ?) ON CONFLICT (username) DO NOTHING RETURNING id, username, role, name, storeId')
      .run(username, hash, role || 'customer', name || '', storeId || null);
    const rows = result.rows;
    if (!rows || !rows[0]) return res.status(409).json({ error: 'اسم المستخدم موجود بالفعل' });
    const user = rows[0];
    const token = generateToken({ id: user.id, username: user.username, role: user.role, storeId: user.storeId, name: user.name });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, storeId: user.storeId, name: user.name } });
  } catch (e) {
    console.error('Register error:', e.message, e.code);
    if (e.code === '23505') return res.status(409).json({ error: 'اسم المستخدم موجود بالفعل' });
    if (!res.headersSent) res.status(500).json({ error: e.message || 'خطأ في الخادم' });
  }
});

router.get('/me', verifyToken, (req, res) => {
  res.json(req.user);
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