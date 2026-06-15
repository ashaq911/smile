# Progress: Smile E-commerce (متجر ملابس)

## Goal
- SPA متجر ملابس عربي RTL مع لوحة تحكم للمدير وأصحاب المتاجر
- منشور على Vercel مع PostgreSQL (Supabase)
- متخصص ببيع الملابس (رجالي، نسائي، أطفالي، إكسسوارات)

## Key Accounts
- **Admin**: `isaac` / `mmhmmh2022`
- **URL**: `https://smile-woad.vercel.app`
- **DB**: pooler IPv4 on Supabase, `connectionTimeoutMillis: 35000`
- **JWT_SECRET**: `smayel-secret-key`

## Recent Changes
- **إعادة كتابة لوحة التحكم بالكامل** (`admin.js` + `adminActions.js`): أبسط، أسرع، فقط للملابس
- **لوحة المدير**: 4 تبويبات: الطلبات، المنتجات، الأقسام، المتاجر
- **لوحة صاحب المتجر**: 3 تبويبات: منتجاتي، أقسامي، الطلبات
- **إضافة endpoint تنظيف**: `POST /api/categories/cleanup` يحذف الأقسام غير المتعلقة بالملابس
- **عند إنشاء متجر جديد**: يتم تلقائياً إنشاء أقسام (رجالي/نسائي/أطفالي/إكسسوارات) مع تفرعاتها
- **تحديث HTML**: الأيقونات والنصوص أصبحت خاصة بالملابس
- **API permissions**: كل صلاحيات الإضافة/التعديل/الحذف متاحة للمدير وصاحب المتجر

## API Route Permissions
- `requireRole('admin', 'store_owner')`: POST/PUT/DELETE للمنتجات، الأقسام، التفرعات، الطلبات، التحويلات، المتاجر
- `requireRole('admin')` فقط: إنشاء متجر، حذف متجر، حذف طلب، إدارة أصحاب المتاجر

## Known Issues
- Vercel Hobby: 10s function timeout but 35-40s actually works
- Supabase free: queries 2-5s, cold start connection may take 10-20s
- Express error handler + express-async-errors installed to catch all async errors
