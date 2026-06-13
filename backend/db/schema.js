const { getDb } = require('./database');

function createTables() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('admin','store_owner','customer')),
      name TEXT,
      storeId INTEGER,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT 'fa-store',
      owner TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      paymentInfo TEXT DEFAULT '',
      deliveryFee REAL DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      storeId INTEGER NOT NULL,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'fa-folder',
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subcategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoryId INTEGER NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      oldPrice REAL,
      icon TEXT DEFAULT 'fa-box',
      image TEXT DEFAULT '',
      inStock INTEGER DEFAULT 1,
      storeId INTEGER NOT NULL,
      subcategoryId INTEGER,
      shippingFee REAL DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
      FOREIGN KEY (subcategoryId) REFERENCES subcategories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(userId, productId)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      customer TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      payment TEXT DEFAULT 'cod',
      subtotal REAL DEFAULT 0,
      shipping REAL DEFAULT 0,
      total REAL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','shipped','delivered','cancelled')),
      notes TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      title TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      shippingFee REAL DEFAULT 0,
      storeId INTEGER NOT NULL,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL,
      storeId INTEGER NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      transferredToOwner INTEGER DEFAULT 0,
      transferPaid INTEGER DEFAULT 0,
      transferPaymentConfirmed INTEGER DEFAULT 0,
      customerInfoRevealed INTEGER DEFAULT 0,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
      UNIQUE(orderId, storeId)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      label TEXT DEFAULT '',
      fullName TEXT DEFAULT '',
      address TEXT NOT NULL,
      city TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      isDefault INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recently_viewed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      viewedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );
  `);
}

module.exports = { createTables };
