const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'smayel-secret-key-change-in-production';

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role, storeId: user.storeid }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'مطلوب تسجيل الدخول' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch { return res.status(401).json({ error: 'رمز الدخول غير صالح' }); }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'مطلوب تسجيل الدخول' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'لا توجد صلاحية' });
    next();
  };
}

module.exports = { generateToken, verifyToken, requireRole };