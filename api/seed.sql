-- Seed data for Smayel e-commerce
-- Run this AFTER creating tables (schema.sql)

-- Password for all seed users: mmhmmh2022 (bcrypt hash)
INSERT INTO users (username, password, role, name) VALUES ('isaac', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 'Isaac Admin') ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password, role, name) VALUES ('owner1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'store_owner', 'مالك المتجر الأول') ON CONFLICT (username) DO NOTHING;
INSERT INTO users (username, password, role, name) VALUES ('customer1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'customer', 'زبون تجريبي') ON CONFLICT (username) DO NOTHING;

INSERT INTO stores (name, description, icon, owner, phone) VALUES ('متجر الإلكترونيات', 'أحدث الأجهزة الإلكترونية والكهربائية', 'fa-microchip', 'owner1', '07701234567') ON CONFLICT DO NOTHING;
INSERT INTO stores (name, description, icon, owner, phone) VALUES ('متجر الملابس', 'أجمل التصاميم العصرية', 'fa-tshirt', 'owner1', '07707654321') ON CONFLICT DO NOTHING;
INSERT INTO stores (name, description, icon, owner, phone) VALUES ('متجر المنزل', 'كل ما تحتاجه للمنزل', 'fa-home', 'owner1', '07701112233') ON CONFLICT DO NOTHING;

-- Categories and subcategories depend on store IDs, so run AFTER stores are inserted
-- (Use Supabase SQL Editor with your actual store IDs)