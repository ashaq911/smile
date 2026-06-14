const express = require('express');
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  let orders;
  if (req.user.role === 'admin') {
    orders = await db.prepare('SELECT * FROM orders ORDER BY "createdAt" DESC').all();
  } else {
    orders = await db.prepare('SELECT * FROM orders WHERE userId = ? ORDER BY "createdAt" DESC').all(req.user.id);
  }
  for (const order of orders) {
    order.items = await db.prepare('SELECT * FROM order_items WHERE orderId = ?').all(order.id);
  }
  res.json(orders);
});

router.post('/', verifyToken, async (req, res) => {
  const { customer, phone, email, address, city, payment, notes } = req.body;
  if (!customer || !phone || !address) return res.status(400).json({ error: 'بيانات الطلب غير مكتملة' });
  const cartItems = await db.prepare(`
    SELECT ci.*, p.price, p.title, p.shippingFee, p."storeId"
    FROM cart_items ci JOIN products p ON ci.productId = p.id
    WHERE ci.userId = ?
  `).all(req.user.id);
  if (cartItems.length === 0) return res.status(400).json({ error: 'السلة فارغة' });
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = cartItems.reduce((sum, item) => sum + (item.shippingfee || 0) * item.quantity, 0);
  const total = subtotal + shipping;
  const orderResult = await db.prepare(`INSERT INTO orders (userId, customer, phone, email, address, city, payment, subtotal, shipping, total, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`)
    .run(req.user.id, customer, phone, email || '', address, city || '', payment || 'cod', subtotal, shipping, total, notes || '');
  const orderId = orderResult.rows[0].id;
  const storeAmounts = {};
  for (const item of cartItems) {
    await db.prepare('INSERT INTO order_items (orderId, productId, title, price, quantity, shippingFee, "storeId") VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(orderId, item.productid, item.title, item.price, item.quantity, item.shippingfee || 0, item.storeid);
    storeAmounts[item.storeid] = (storeAmounts[item.storeid] || 0) + item.price * item.quantity;
  }
  for (const [storeId, amount] of Object.entries(storeAmounts)) {
    await db.prepare('INSERT INTO order_transfers (orderId, "storeId", amount) VALUES (?, ?, ?) ON CONFLICT (orderId, "storeId") DO NOTHING')
      .run(orderId, parseInt(storeId), amount);
  }
  await db.prepare('DELETE FROM cart_items WHERE userId = ?').run(req.user.id);
  res.json({ id: orderId, total });
});

router.put('/:id/status', verifyToken, requireRole('admin'), async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'حالة غير صالحة' });
  await db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

router.get('/transfers', verifyToken, async (req, res) => {
  const { orderId, storeId } = req.query;
  let sql = `
    SELECT ot.*, o.customer, o.total, s.name as storeName
    FROM order_transfers ot
    JOIN orders o ON ot.orderId = o.id
    JOIN stores s ON ot."storeId" = s.id
  `;
  const params = [];
  const conditions = [];
  if (orderId) { conditions.push(`ot.orderId = $${params.length + 1}`); params.push(parseInt(orderId)); }
  if (storeId) { conditions.push(`ot."storeId" = $${params.length + 1}`); params.push(parseInt(storeId)); }
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY ot.id DESC';
  const transfers = await db.prepare(sql).all(...params);
  res.json(transfers);
});

router.post('/transfers', verifyToken, requireRole('admin'), async (req, res) => {
  const { orderId, storeId, amount, transferredToOwner } = req.body;
  if (!orderId || !storeId || amount === undefined) return res.status(400).json({ error: 'بيانات التحويل غير مكتملة' });
  const existing = await db.prepare('SELECT id FROM order_transfers WHERE orderId = ? AND "storeId" = ?').get(orderId, storeId);
  if (existing) {
    await db.prepare('UPDATE order_transfers SET amount=?, transferredToOwner=? WHERE id=?').run(amount, transferredToOwner ? 1 : 0, existing.id);
    return res.json({ id: existing.id });
  }
  const result = await db.prepare('INSERT INTO order_transfers (orderId, "storeId", amount, transferredToOwner) VALUES (?, ?, ?, ?) RETURNING id')
    .run(orderId, storeId, amount, transferredToOwner ? 1 : 0);
  res.json({ id: result.rows[0].id });
});

router.put('/transfers/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { transferredToOwner, transferPaid, transferPaymentConfirmed, customerInfoRevealed, amount } = req.body;
  const updates = [];
  const params = [];
  if (transferredToOwner !== undefined) { updates.push(`transferredToOwner=$${params.length + 1}`); params.push(transferredToOwner ? 1 : 0); }
  if (transferPaid !== undefined) { updates.push(`transferPaid=$${params.length + 1}`); params.push(transferPaid ? 1 : 0); }
  if (transferPaymentConfirmed !== undefined) { updates.push(`transferPaymentConfirmed=$${params.length + 1}`); params.push(transferPaymentConfirmed ? 1 : 0); }
  if (customerInfoRevealed !== undefined) { updates.push(`customerInfoRevealed=$${params.length + 1}`); params.push(customerInfoRevealed ? 1 : 0); }
  if (amount !== undefined) { updates.push(`amount=$${params.length + 1}`); params.push(amount); }
  if (updates.length === 0) return res.status(400).json({ error: 'لا توجد تحديثات' });
  params.push(req.params.id);
  await db.prepare(`UPDATE order_transfers SET ${updates.join(',')} WHERE id=$${params.length}`).run(...params);
  res.json({ success: true });
});

router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  await db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;