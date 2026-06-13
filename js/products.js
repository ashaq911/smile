const defaultProducts = [
  {
    id: 1, title: 'آيفون 16 برو', description: 'أحدث هاتف من أبل مع كاميرا احترافية ومعالج A18 Pro.',
    price: 4999, oldPrice: 5499, icon: 'fa-mobile-alt', inStock: true, storeId: 1, subcategoryId: 15
  },
  {
    id: 2, title: 'سامسونج جالاكسي S25', description: 'هاتف أندرويد متطور بشاشة AMOLED وكاميرا 200 ميجابكسل.',
    price: 3799, oldPrice: 4199, icon: 'fa-mobile-alt', inStock: true, storeId: 2, subcategoryId: 14
  },
  {
    id: 3, title: 'ماك بوك برو M4', description: 'لابتوب أبل بشريحة M4 فائقة الأداء للمحترفين.',
    price: 8499, oldPrice: 8999, icon: 'fa-laptop', inStock: true, storeId: 1, subcategoryId: 2
  },
  {
    id: 4, title: 'لينوفو ثينك باد X1', description: 'لابتوب تجاري فاخر مع معالج Intel Core i7 وذاكرة 16GB.',
    price: 5499, oldPrice: null, icon: 'fa-laptop', inStock: true, storeId: 2, subcategoryId: 17
  },
  {
    id: 5, title: 'سماعات بلوتوث لاسلكية', description: 'سماعات عزل ضوضاء مع بطارية تدوم 30 ساعة.',
    price: 349, oldPrice: 449, icon: 'fa-headphones', inStock: true, storeId: 3, subcategoryId: 23
  },
  {
    id: 6, title: 'ساعة أبل واتش أولترا 3', description: 'ساعة ذكية مقاومة للماء مع قياس الأكسجين وGPS.',
    price: 2499, oldPrice: 2799, icon: 'fa-clock', inStock: true, storeId: 3, subcategoryId: 27
  },
  {
    id: 7, title: 'آيباد برو M4', description: 'جهاز لوحي احترافي بشاشة 13 بوصة ومعالج M4.',
    price: 4299, oldPrice: null, icon: 'fa-tablet-alt', inStock: false, storeId: 1, subcategoryId: 3
  },
  {
    id: 8, title: 'شاحن ماجستيف واط', description: 'شاحن لاسلكي سريع 40W متوافق مع جميع الأجهزة.',
    price: 189, oldPrice: 249, icon: 'fa-plug', inStock: true, storeId: 3, subcategoryId: 25
  },
  {
    id: 9, title: 'ماوس لاسلكي MX Master 3S', description: 'فأرة لاسلكية احترافية مع حساس 8000DPI.',
    price: 399, oldPrice: null, icon: 'fa-mouse', inStock: true, storeId: 3, subcategoryId: 23
  },
  {
    id: 10, title: 'لابتوب ديل XPS 16', description: 'لابتوب فائق النحافة مع شاشة InfinityEdge OLED.',
    price: 6799, oldPrice: 7499, icon: 'fa-laptop', inStock: true, storeId: 2, subcategoryId: 17
  },
  {
    id: 11, title: 'ايباد اير M3', description: 'جهاز لوحي خفيف الوزن بشاشة Liquid Retina 11 بوصة.',
    price: 2799, oldPrice: 3199, icon: 'fa-tablet-alt', inStock: true, storeId: 1, subcategoryId: 3
  },
  {
    id: 12, title: 'كاميرا كانون EOS R6', description: 'كاميرا احترافية بدون مرآة بدقة 20 ميجابكسل.',
    price: 8999, oldPrice: null, icon: 'fa-camera', inStock: true, storeId: 2, subcategoryId: 20
  },
  {
    id: 13, title: 'تيشيرت قطني رجالي', description: 'تيشيرت قطني فاخر بتصميم عصري ومريح.',
    price: 89, oldPrice: 129, icon: 'fa-tshirt', inStock: true, storeId: 1, subcategoryId: 5
  },
  {
    id: 14, title: 'فستان نسائي صيفي', description: 'فستان نسائي أنيق مناسب لفصل الصيف.',
    price: 199, oldPrice: 279, icon: 'fa-tshirt', inStock: true, storeId: 1, subcategoryId: 6
  },
  {
    id: 15, title: 'بنطلون جينز رجالي', description: 'بنطلون جينز كلاسيكي عالي الجودة.',
    price: 159, oldPrice: null, icon: 'fa-tshirt', inStock: true, storeId: 1, subcategoryId: 7
  },
  {
    id: 16, title: 'حذاء رياضي رجالي', description: 'حذاء رياضي مريح للمشي والجري.',
    price: 299, oldPrice: 399, icon: 'fa-shoe-prints', inStock: true, storeId: 1, subcategoryId: 8
  },
  {
    id: 17, title: 'حذاء كعب عالي نسائي', description: 'حذاء كعب أنيق للمناسبات.',
    price: 249, oldPrice: 329, icon: 'fa-shoe-prints', inStock: true, storeId: 1, subcategoryId: 9
  },
  {
    id: 18, title: 'غطاء حماية آيفون', description: 'غطاء شفاف متين لحماية الهاتف.',
    price: 49, oldPrice: null, icon: 'fa-mobile-alt', inStock: true, storeId: 1, subcategoryId: 13
  }
];

let products = JSON.parse(localStorage.getItem('products')) || [...defaultProducts];
let productIdCounter = parseInt(localStorage.getItem('productIdCounter')) || 19;

function saveProducts() {
  localStorage.setItem('products', JSON.stringify(products));
}

function getProductById(id) {
  return products.find(p => p.id === id);
}

function getProductsByCategory(category) {
  if (category === 'all') return products;
  return products.filter(p => p.category === category);
}

function getProductsByStore(storeId) {
  return products.filter(p => p.storeId === storeId);
}

function getProductsBySubcategory(subcategoryId) {
  return products.filter(p => p.subcategoryId === subcategoryId);
}

function searchProducts(query) {
  const q = query.toLowerCase();
  return products.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q)
  );
}

function addProduct(data) {
  const product = { id: productIdCounter++, shippingFee: 0, ...data };
  localStorage.setItem('productIdCounter', productIdCounter.toString());
  products.push(product);
  saveProducts();
  return product;
}

function updateProduct(id, data) {
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return null;
  products[idx] = { ...products[idx], ...data };
  saveProducts();
  return products[idx];
}

function deleteProduct(id) {
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return;
  products.splice(idx, 1);
  saveProducts();
}
