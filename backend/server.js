const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { createTables } = require('./db/schema');
const { seedData } = require('./db/seed');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const authRoutes = require('./routes/auth');
const storesRoutes = require('./routes/stores');
const categoriesRoutes = require('./routes/categories');
const productsRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const ordersRoutes = require('./routes/orders');
const reviewsRoutes = require('./routes/reviews');
const addressesRoutes = require('./routes/addresses');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer config
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع صورة' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/addresses', addressesRoutes);

// Fallback: serve index.html for SPA-like navigation
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API endpoint not found' });
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Initialize database
createTables();
seedData();

app.listen(PORT, () => {
  console.log(`Smayel server running at http://localhost:${PORT}`);
});
