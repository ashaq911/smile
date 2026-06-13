const { getDb } = require('./database');
const bcrypt = require('bcryptjs');

function seedData() {
  const db = getDb();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return;

  const hash = bcrypt.hashSync('mmhmmh2022', 10);

  const insertUser = db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)');
  insertUser.run('isaac', hash, 'admin', 'المدير');

  const insertStore = db.prepare('INSERT INTO stores (name, description, icon, owner, phone) VALUES (?, ?, ?, ?, ?)');
  insertStore.run('سمايل', 'متجر سمايل الرسمي - جميع المنتجات الأصلية', 'fa-smile', 'الإدارة', '0551234567');
  insertStore.run('متجر الإلكترونيات', 'متخصص في الهواتف والأجهزة اللوحية والكاميرات', 'fa-microchip', 'أحمد', '0557654321');
  insertStore.run('متجر الإكسسوارات', 'كل ما تحتاجه من إكسسوارات وملحقات تقنية', 'fa-headphones', 'سارة', '0559876543');

  const insertCat = db.prepare('INSERT INTO categories (storeId, name, icon) VALUES (?, ?, ?)');
  insertCat.run(1, 'إلكترونيات', 'fa-microchip');
  insertCat.run(1, 'ملابس', 'fa-tshirt');
  insertCat.run(1, 'أحذية', 'fa-shoe-prints');
  insertCat.run(1, 'إكسسوارات', 'fa-headphones');
  insertCat.run(2, 'هواتف', 'fa-mobile-alt');
  insertCat.run(2, 'لابتوب', 'fa-laptop');
  insertCat.run(2, 'أجهزة لوحية', 'fa-tablet-alt');
  insertCat.run(2, 'كاميرات', 'fa-camera');
  insertCat.run(3, 'سماعات', 'fa-headphones');
  insertCat.run(3, 'شواحن', 'fa-plug');
  insertCat.run(3, 'ساعات', 'fa-clock');
  insertCat.run(3, 'كيبلات', 'fa-plug');

  const insertSub = db.prepare('INSERT INTO subcategories (categoryId, name) VALUES (?, ?)');
  const subs = [
    [1, 'هواتف'], [1, 'لابتوب'], [1, 'أجهزة لوحية'], [1, 'كاميرات'],
    [2, 'ملابس رجالية'], [2, 'ملابس نسائية'], [2, 'بنطلونات'],
    [3, 'أحذية رجالية'], [3, 'أحذية نسائية'],
    [4, 'سماعات'], [4, 'شواحن'], [4, 'ساعات'], [4, 'أغطية حماية'],
    [5, 'أندرويد'], [5, 'آيفون'],
    [6, 'ماك بوك'], [6, 'ويندوز'],
    [7, 'آيباد'], [7, 'تابلت أندرويد'],
    [8, 'كانون'], [8, 'نيكون'], [8, 'سوني'],
    [9, 'لاسلكية'], [9, 'سلكية'],
    [10, 'لاسلكية'], [10, 'سلكية'],
    [11, 'ذكية'], [11, 'رياضية'],
    [12, 'USB'], [12, 'Type-C'], [12, 'Lightning']
  ];
  for (const [catId, name] of subs) { insertSub.run(catId, name); }

  const insertProduct = db.prepare(`INSERT INTO products (title, description, price, oldPrice, icon, inStock, storeId, subcategoryId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const products = [
    ['آيفون 16 برو', 'أحدث هاتف من أبل مع كاميرا احترافية', 4999, 5499, 'fa-mobile-alt', 1, 1, 15],
    ['سامسونج جالاكسي S25', 'هاتف أندرويد متطور بشاشة AMOLED', 3799, 4199, 'fa-mobile-alt', 1, 2, 14],
    ['ماك بوك برو M4', 'لابتوب أبل بشريحة M4', 8499, 8999, 'fa-laptop', 1, 1, 2],
    ['لينوفو ثينك باد X1', 'لابتوب تجاري فاخر', 5499, null, 'fa-laptop', 1, 2, 17],
    ['سماعات بلوتوث', 'سماعات عزل ضوضاء', 349, 449, 'fa-headphones', 1, 3, 23],
    ['ساعة أبل واتش أولترا 3', 'ساعة ذكية مقاومة للماء', 2499, 2799, 'fa-clock', 1, 3, 27],
    ['آيباد برو M4', 'جهاز لوحي احترافي', 4299, null, 'fa-tablet-alt', 0, 1, 3],
    ['شاحن ماجستيف واط', 'شاحن لاسلكي سريع', 189, 249, 'fa-plug', 1, 3, 25],
    ['ماوس لاسلكي MX', 'فأرة لاسلكية احترافية', 399, null, 'fa-mouse', 1, 3, 23],
    ['لابتوب ديل XPS 16', 'لابتوب فائق النحافة', 6799, 7499, 'fa-laptop', 1, 2, 17],
    ['ايباد اير M3', 'جهاز لوحي خفيف الوزن', 2799, 3199, 'fa-tablet-alt', 1, 1, 3],
    ['كاميرا كانون EOS R6', 'كاميرا احترافية', 8999, null, 'fa-camera', 1, 2, 20],
    ['تيشيرت قطني رجالي', 'تيشيرت قطني فاخر', 89, 129, 'fa-tshirt', 1, 1, 5],
    ['فستان نسائي صيفي', 'فستان نسائي أنيق', 199, 279, 'fa-tshirt', 1, 1, 6],
    ['بنطلون جينز رجالي', 'بنطلون جينز كلاسيكي', 159, null, 'fa-tshirt', 1, 1, 7],
    ['حذاء رياضي رجالي', 'حذاء رياضي مريح', 299, 399, 'fa-shoe-prints', 1, 1, 8],
    ['حذاء كعب عالي نسائي', 'حذاء كعب أنيق', 249, 329, 'fa-shoe-prints', 1, 1, 9],
    ['غطاء حماية آيفون', 'غطاء شفاف متين', 49, null, 'fa-mobile-alt', 1, 1, 13]
  ];
  for (const p of products) { insertProduct.run(...p); }
}

module.exports = { seedData };
