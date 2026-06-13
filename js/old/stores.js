const defaultStores = [
  { id: 1, name: 'سمايل', description: 'متجر سمايل الرسمي - جميع المنتجات الأصلية', icon: 'fa-smile', owner: 'الإدارة', phone: '0551234567', deliveryFee: 0 },
  { id: 2, name: 'متجر الإلكترونيات', description: 'متخصص في الهواتف والأجهزة اللوحية والكاميرات', icon: 'fa-microchip', owner: 'أحمد', phone: '0557654321', deliveryFee: 0 },
  { id: 3, name: 'متجر الإكسسوارات', description: 'كل ما تحتاجه من إكسسوارات وملحقات تقنية', icon: 'fa-headphones', owner: 'سارة', phone: '0559876543', deliveryFee: 0 }
];

let stores = JSON.parse(localStorage.getItem('stores')) || [...defaultStores];
let storeIdCounter = parseInt(localStorage.getItem('storeIdCounter')) || 4;

function saveStores() {
  localStorage.setItem('stores', JSON.stringify(stores));
}

function getStores() {
  return stores;
}

function getStoreById(id) {
  return stores.find(s => s.id === id);
}

function addStore(name, description, icon, owner, phone, paymentInfo) {
  const store = {
    id: storeIdCounter++,
    name,
    description,
    icon: icon || 'fa-store',
    owner: owner || '',
    phone: phone || '',
    paymentInfo: paymentInfo || '',
    deliveryFee: 0
  };
  localStorage.setItem('storeIdCounter', storeIdCounter.toString());
  stores.push(store);
  saveStores();
  return store;
}

function updateStore(id, data) {
  const idx = stores.findIndex(s => s.id === id);
  if (idx === -1) return null;
  stores[idx] = { ...stores[idx], ...data };
  saveStores();
  return stores[idx];
}

function deleteStore(id) {
  stores = stores.filter(s => s.id !== id);
  saveStores();
}

function getStoreProductCount(storeId) {
  return products.filter(p => p.storeId === storeId).length;
}
