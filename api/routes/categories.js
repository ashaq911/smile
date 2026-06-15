const express = require('express');
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const { storeId } = req.query;
  let categories;
  if (storeId) {
    categories = await db.prepare('SELECT * FROM categories WHERE "storeId" = ? ORDER BY name').all(storeId);
  } else {
    categories = await db.prepare('SELECT * FROM categories ORDER BY name').all();
  }
  res.json(categories);
});

router.post('/', verifyToken, requireRole('admin', 'store_owner'), async (req, res) => {
  const { storeId, name, icon } = req.body;
  if (!storeId || !name) return res.status(400).json({ error: 'بيانات القسم غير مكتملة' });
  if (req.user.role === 'store_owner' && req.user.storeId !== storeId) return res.status(403).json({ error: 'لا تصلاحية لك لهذا المتجر' });
  const result = await db.prepare('INSERT INTO categories ("storeId", name, icon) VALUES (?, ?, ?) RETURNING id')
    .run(storeId, name, icon || 'fa-folder');
  res.json({ id: result.rows[0].id });
});

router.put('/:id', verifyToken, requireRole('admin', 'store_owner'), async (req, res) => {
  const { name, icon } = req.body;
  const cat = await db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'القسم غير موجود' });
  if (req.user.role === 'store_owner' && req.user.storeId !== cat.storeId) return res.status(403).json({ error: 'لا تصلاحية لك لهذا المتجر' });
  await db.prepare('UPDATE categories SET name=?, icon=? WHERE id=?')
    .run(name, icon || 'fa-folder', req.params.id);
  res.json({ success: true });
});

router.delete('/:id', verifyToken, requireRole('admin', 'store_owner'), async (req, res) => {
  const cat = await db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'القسم غير موجود' });
  if (req.user.role === 'store_owner' && req.user.storeId !== cat.storeId) return res.status(403).json({ error: 'لا تصلاحية لك لهذا المتجر' });
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

router.post('/subcategories', verifyToken, requireRole('admin', 'store_owner'), async (req, res) => {
  const { categoryId, name } = req.body;
  if (!categoryId || !name) return res.status(400).json({ error: 'بيانات التفرع غير مكتملة' });
  const cat = await db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);
  if (!cat) return res.status(404).json({ error: 'القسم غير موجود' });
  if (req.user.role === 'store_owner' && req.user.storeId !== cat.storeId) return res.status(403).json({ error: 'لا تصلاحية لك لهذا المتجر' });
  const result = await db.prepare('INSERT INTO subcategories (categoryId, name) VALUES (?, ?) RETURNING id').run(categoryId, name);
  res.json({ id: result.rows[0].id });
});

router.put('/subcategories/:id', verifyToken, requireRole('admin', 'store_owner'), async (req, res) => {
  const { name } = req.body;
  const sub = await db.prepare('SELECT s.*, c."storeId" FROM subcategories s JOIN categories c ON c.id = s.categoryId WHERE s.id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'التفرع غير موجود' });
  if (req.user.role === 'store_owner' && req.user.storeId !== sub.storeId) return res.status(403).json({ error: 'لا تصلاحية لك لهذا المتجر' });
  await db.prepare('UPDATE subcategories SET name=? WHERE id=?').run(name, req.params.id);
  res.json({ success: true });
});

router.delete('/subcategories/:id', verifyToken, requireRole('admin', 'store_owner'), async (req, res) => {
  const sub = await db.prepare('SELECT s.*, c."storeId" FROM subcategories s JOIN categories c ON c.id = s.categoryId WHERE s.id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'التفرع غير موجود' });
  if (req.user.role === 'store_owner' && req.user.storeId !== sub.storeId) return res.status(403).json({ error: 'لا تصلاحية لك لهذا المتجر' });
  await db.prepare('DELETE FROM subcategories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Cleanup: delete non-clothing categories and set all stores to clothing icon
router.post('/cleanup', verifyToken, requireRole('admin'), async (req, res) => {
  const clothingNames = ['رجالي', 'نسائي', 'أطفال', 'أطفالي', 'إكسسوارات', 'أحذية', 'رجالية', 'نسائية', 'أطفالية', 'ملابس'];
  const cats = await db.prepare('SELECT * FROM categories').all();
  for (const cat of cats) {
    const isClothing = clothingNames.some(n => cat.name.includes(n));
    if (!isClothing) {
      const subs = await db.prepare('SELECT id FROM subcategories WHERE categoryId = ?').all(cat.id);
      for (const sub of subs) {
        await db.prepare('UPDATE products SET "subcategoryId" = NULL WHERE "subcategoryId" = ?').run(sub.id);
        await db.prepare('DELETE FROM subcategories WHERE id = ?').run(sub.id);
      }
      await db.prepare('DELETE FROM categories WHERE id = ?').run(cat.id);
    }
  }
  await db.prepare('UPDATE stores SET icon = ? WHERE icon NOT IN (?,?,?,?)').run('fa-tshirt', 'fa-tshirt', 'fa-shoe-prints', 'fa-gem', 'fa-store');
  res.json({ success: true, message: 'تم تنظيف الأقسام غير المتعلقة بالملابس' });
});

module.exports = router;