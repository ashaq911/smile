const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const storesRoutes = require('./routes/stores');
const categoriesRoutes = require('./routes/categories');
const productsRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const ordersRoutes = require('./routes/orders');
const reviewsRoutes = require('./routes/reviews');
const addressesRoutes = require('./routes/addresses');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple upload: accept base64 data URL
app.post('/api/upload', require('./middleware/auth').verifyToken, (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'لم يتم رفع صورة' });
  res.json({ url: image });
});

app.use('/api/auth', authRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/addresses', addressesRoutes);

// Serve static files for SPA
app.use(express.static(path.join(__dirname, '..')));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API endpoint not found' });
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

module.exports = app;