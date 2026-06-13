-- PostgreSQL schema for Smayel e-commerce
-- Run this SQL in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('admin','store_owner','customer')),
  name TEXT DEFAULT '',
  "storeId" INTEGER,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'fa-store',
  owner TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  "paymentInfo" TEXT DEFAULT '',
  "deliveryFee" REAL DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  "storeId" INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'fa-folder',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subcategories (
  id SERIAL PRIMARY KEY,
  "categoryId" INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  "oldPrice" REAL,
  icon TEXT DEFAULT 'fa-box',
  image TEXT DEFAULT '',
  "inStock" INTEGER DEFAULT 1,
  "storeId" INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  "subcategoryId" INTEGER REFERENCES subcategories(id) ON DELETE SET NULL,
  "shippingFee" REAL DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "productId" INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  UNIQUE("userId", "productId")
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER,
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
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "productId" INTEGER NOT NULL,
  title TEXT NOT NULL,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  "shippingFee" REAL DEFAULT 0,
  "storeId" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS order_transfers (
  id SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "storeId" INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  amount REAL NOT NULL DEFAULT 0,
  "transferredToOwner" INTEGER DEFAULT 0,
  "transferPaid" INTEGER DEFAULT 0,
  "transferPaymentConfirmed" INTEGER DEFAULT 0,
  "customerInfoRevealed" INTEGER DEFAULT 0,
  UNIQUE("orderId", "storeId")
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  "productId" INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT DEFAULT '',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS addresses (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT DEFAULT '',
  "fullName" TEXT DEFAULT '',
  address TEXT NOT NULL,
  city TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  "isDefault" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);