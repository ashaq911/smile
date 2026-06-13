const express = require('express');
const { getDb } = require('../db/database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, (req, res) => {
  const db = getDb();
  let orders;
  if (req.user.role === 'admin') {
    orders = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC').all();
  } else {
    orders = db.prepare('SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC').all(req.user.id);
  }

  for (const order of orders) {
    order.items = db.prepare('SELECT * FROM order_items WHERE orderId = ?').all(order.id);
  }
  res.json(orders);
});

router.post('/', verifyToken, (req, res) => {
  const { customer, phone, email, address, city, payment, notes } = req.body;
  if (!customer || !phone || !address) return res.status(400).json({ error: 'بيانات الطلب غير مكتملة' });

  const db = getDb();
  const cartItems = db.prepare(`
    SELECT ci.*, p.price, p.title, p.shippingFee, p.storeId
    FROM cart_items ci JOIN products p ON ci.productId = p.id
    WHERE ci.userId = ?
  `).all(req.user.id);

  if (cartItems.length === 0) return res.status(400).json({ error: 'السلة فارغة' });

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = cartItems.reduce((sum, item) => sum + (item.shippingFee || 0) * item.quantity, 0);
  const total = subtotal + shipping;

  const orderResult = db.prepare(`INSERT INTO orders (userId, customer, phone, email, address, city, payment, subtotal, shipping, total, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(req.user.id, customer, phone, email || '', address, city || '', payment || 'cod', subtotal, shipping, total, notes || '');

  const orderId = orderResult.lastInsertRowid;
  const insertItem = db.prepare('INSERT INTO order_items (orderId, productId, title, price, quantity, shippingFee, storeId) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertTransfer = db.prepare('INSERT OR IGNORE INTO order_transfers (orderId, storeId, amount) VALUES (?, ?, ?)');

  const storeAmounts = {};
  for (const item of cartItems) {
    insertItem.run(orderId, item.productId, item.title, item.price, item.quantity, item.shippingFee || 0, item.storeId);
    storeAmounts[item.storeId] = (storeAmounts[item.storeId] || 0) + item.price * item.quantity;
  }

  for (const [storeId, amount] of Object.entries(storeAmounts)) {
    insertTransfer.run(orderId, parseInt(storeId), amount);
  }

  db.prepare('DELETE FROM cart_items WHERE userId = ?').run(req.user.id);

  res.json({ id: orderId, total });
});

router.put('/:id/status', verifyToken, requireRole('admin'), (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'حالة غير صالحة' });

  const db = getDb();
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

// Transfer & payment management
router.get('/transfers', verifyToken, (req, res) => {
  const db = getDb();
  const { orderId, storeId } = req.query;
  let sql = `
    SELECT ot.*, o.customer, o.total, s.name as storeName
    FROM order_transfers ot
    JOIN orders o ON ot.orderId = o.id
    JOIN stores s ON ot.storeId = s.id
  `;
  const params = [];
  const conditions = [];
  if (orderId) { conditions.push('ot.orderId = ?'); params.push(parseInt(orderId)); }
  if (storeId) { conditions.push('ot.storeId = ?'); params.push(parseInt(storeId)); }
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY ot.id DESC';
  const transfers = db.prepare(sql).all(...params);
  res.json(transfers);
});

router.post('/transfers', verifyToken, requireRole('admin'), (req, res) => {
  const { orderId, storeId, amount, transferredToOwner } = req.body;
  if (!orderId || !storeId || amount === undefined) return res.status(400).json({ error: 'بيانات التحويل غير مكتملة' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM order_transfers WHERE orderId = ? AND storeId = ?').get(orderId, storeId);
  if (existing) {
    db.prepare('UPDATE order_transfers SET amount=?, transferredToOwner=? WHERE id=?').run(amount, transferredToOwner ? 1 : 0, existing.id);
    return res.json({ id: existing.id });
  }
  const result = db.prepare('INSERT INTO order_transfers (orderId, storeId, amount, transferredToOwner) VALUES (?, ?, ?, ?)')
    .run(orderId, storeId, amount, transferredToOwner ? 1 : 0);
  res.json({ id: result.lastInsertRowid });
});

router.put('/transfers/:id', verifyToken, requireRole('admin'), (req, res) => {
  const { transferredToOwner, transferPaid, transferPaymentConfirmed, customerInfoRevealed, amount } = req.body;
  const db = getDb();
  const updates = [];
  const params = [];
  if (transferredToOwner !== undefined) { updates.push('transferredToOwner=?'); params.push(transferredToOwner ? 1 : 0); }
  if (transferPaid !== undefined) { updates.push('transferPaid=?'); params.push(transferPaid ? 1 : 0); }
  if (transferPaymentConfirmed !== undefined) { updates.push('transferPaymentConfirmed=?'); params.push(transferPaymentConfirmed ? 1 : 0); }
  if (customerInfoRevealed !== undefined) { updates.push('customerInfoRevealed=?'); params.push(customerInfoRevealed ? 1 : 0); }
  if (amount !== undefined) { updates.push('amount=?'); params.push(amount); }
  if (updates.length === 0) return res.status(400).json({ error: 'لا توجد تحديثات' });

  params.push(req.params.id);
  db.prepare(`UPDATE order_transfers SET ${updates.join(',')} WHERE id=?`).run(...params);
  res.json({ success: true });
});

router.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
