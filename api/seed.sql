-- Seed data for Smayel e-commerce
-- Run this AFTER creating tables (schema.sql)

INSERT INTO users (username, password, role, name) VALUES
('isaac', '$2a$10$5cb6IwushxCmQEkRi8ld6.iM1nluR0IJ41R0LQXokq1/giXeVMfM.', 'admin', 'Isaac Admin'),
('owner1', '$2a$10$5cb6IwushxCmQEkRi8ld6.iM1nluR0IJ41R0LQXokq1/giXeVMfM.', 'store_owner', 'مالك المتجر الأول'),
('customer1', '$2a$10$5cb6IwushxCmQEkRi8ld6.iM1nluR0IJ41R0LQXokq1/giXeVMfM.', 'customer', 'زبون تجريبي')
ON CONFLICT (username) DO NOTHING;

INSERT INTO stores (name, description, icon, owner, phone) VALUES
('متجر الإلكترونيات', 'أحدث الأجهزة الإلكترونية والكهربائية', 'fa-microchip', 'owner1', '07701234567'),
('متجر الملابس', 'أجمل التصاميم العصرية', 'fa-tshirt', 'owner1', '07707654321'),
('متجر المنزل', 'كل ما تحتاجه للمنزل', 'fa-home', 'owner1', '07701112233');

-- Get store IDs into variables
DO $$
DECLARE
  s1 int; s2 int; s3 int;
  c1 int; c2 int; c3 int; c4 int;
  sub_c1 int; sub_c2 int; sub_c3 int; sub_c4 int; sub_c5 int; sub_c6 int; sub_c7 int; sub_c8 int;
BEGIN
  s1 := (SELECT id FROM stores WHERE name = 'متجر الإلكترونيات' LIMIT 1);
  s2 := (SELECT id FROM stores WHERE name = 'متجر الملابس' LIMIT 1);
  s3 := (SELECT id FROM stores WHERE name = 'متجر المنزل' LIMIT 1);

  INSERT INTO categories (storeId, name, icon) VALUES (s1, 'جوالات', 'fa-mobile-alt') RETURNING id INTO c1;
  INSERT INTO categories (storeId, name, icon) VALUES (s1, 'لابتوبات', 'fa-laptop') RETURNING id INTO c2;
  INSERT INTO categories (storeId, name, icon) VALUES (s1, 'إكسسوارات', 'fa-headphones') RETURNING id INTO c3;
  INSERT INTO categories (storeId, name, icon) VALUES (s2, 'رجالي', 'fa-tshirt') RETURNING id INTO c4;
  INSERT INTO categories (storeId, name, icon) VALUES (s2, 'نسائي', 'fa-tshirt');
  INSERT INTO categories (storeId, name, icon) VALUES (s2, 'أطفال', 'fa-tshirt');
  INSERT INTO categories (storeId, name, icon) VALUES (s3, 'أثاث', 'fa-couch');
  INSERT INTO categories (storeId, name, icon) VALUES (s3, 'أجهزة منزلية', 'fa-blender');
  INSERT INTO categories (storeId, name, icon) VALUES (s3, 'ديكور', 'fa-paint-roller');

  INSERT INTO subcategories (categoryId, name) VALUES (c1, 'ايفون') RETURNING id INTO sub_c1;
  INSERT INTO subcategories (categoryId, name) VALUES (c1, 'سامسونج') RETURNING id INTO sub_c2;
  INSERT INTO subcategories (categoryId, name) VALUES (c1, 'شاومي') RETURNING id INTO sub_c3;
  INSERT INTO subcategories (categoryId, name) VALUES (c2, 'ماك بوك') RETURNING id INTO sub_c4;
  INSERT INTO subcategories (categoryId, name) VALUES (c2, 'لينوفو') RETURNING id INTO sub_c5;
  INSERT INTO subcategories (categoryId, name) VALUES (c3, 'سماعات') RETURNING id INTO sub_c6;
  INSERT INTO subcategories (categoryId, name) VALUES (c3, 'شواحن') RETURNING id INTO sub_c7;
  INSERT INTO subcategories (categoryId, name) VALUES (c3, 'كفرات') RETURNING id INTO sub_c8;

  INSERT INTO products (title, description, price, oldPrice, icon, storeId, subcategoryId, shippingFee, inStock) VALUES
    ('آيفون 15 برو', 'أحدث هاتف من أبل مع كاميرا احترافية', 1499000, 1599000, 'fa-mobile-alt', s1, sub_c1, 5000, 1),
    ('سامسونج S24', 'هاتف سامسونج الرائد بشاشة مذهلة', 1299000, 1399000, 'fa-mobile-alt', s1, sub_c2, 5000, 1),
    ('ماك بوك برو 14', 'لابتوب أبل بشريحة M3', 3499000, 3699000, 'fa-laptop', s1, sub_c4, 10000, 1),
    ('سماعات لاسلكية', 'سماعات بلوتوث مع عزل ضوضاء', 149000, NULL, 'fa-headphones', s1, sub_c6, 2000, 1),
    ('شاحن سريع', 'شاحن بقدرة 65 واط USB-C', 65000, 75000, 'fa-plug', s1, sub_c7, 1000, 1),
    ('قميص رجالي قطني', 'قميص كلاسيكي بأكمام طويلة', 45000, NULL, 'fa-tshirt', s2, NULL, 3000, 1),
    ('بنطلون جينز', 'جينز بقصة مستقيمة', 65000, NULL, 'fa-tshirt', s2, NULL, 3000, 1),
    ('فستان صيفي', 'فستان خفيف ومناسب للصيف', 85000, NULL, 'fa-tshirt', s2, NULL, 3000, 1),
    ('حذاء رياضي', 'حذاء جري مريح', 125000, NULL, 'fa-shoe-prints', s2, NULL, 4000, 1),
    ('كرسي مكتب', 'كرسي مريح لدعم الظهر', 250000, 300000, 'fa-chair', s3, NULL, 15000, 1),
    ('طاولة طعام', 'طاولة خشبية 6 كراسي', 650000, 750000, 'fa-table', s3, NULL, 25000, 1),
    ('خلاط كهربائي', 'خلاط بقدرة 500 واط', 85000, NULL, 'fa-blender', s3, NULL, 5000, 1),
    ('مصباح طاولة', 'مصباح LED حديث', 35000, 45000, 'fa-lightbulb', s3, NULL, 3000, 1);
END $$;
