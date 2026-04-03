# خطوات النشر على Render

## 1. إعداد Supabase

### إنشاء المشروع
1. اذهب إلى https://supabase.com
2. سجل دخول أو أنشئ حساب جديد
3. انقر على "New Project"
4. اختر اسم للمشروع وكلمة مرور قوية
5. اختر المنطقة الأقرب لك

### تنفيذ السكريبت
1. من لوحة التحكم، اذهب إلى "SQL Editor"
2. انقر على "New Query"
3. انسخ محتوى ملف `supabase-schema.sql` والصقه
4. انقر على "Run" لتنفيذ السكريبت

### الحصول على المفاتيح
1. اذهب إلى "Settings" > "API"
2. انسخ:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_KEY` (احتفظ به سرياً!)

---

## 2. إعداد Telegram Bot

### إنشاء البوت
1. افتح Telegram وابحث عن `@BotFather`
2. أرسل `/newbot`
3. اختر اسم للبوت (مثال: Antigravity Auth Manager)
4. اختر username للبوت (يجب أن ينتهي بـ bot، مثال: antigravity_auth_bot)
5. احفظ الـ Token الذي سيرسله لك → `TELEGRAM_BOT_TOKEN`

### الحصول على Chat ID
1. ابحث عن `@userinfobot` في Telegram
2. أرسل `/start`
3. سيرسل لك معلوماتك، انسخ الـ `Id` → `TELEGRAM_ADMIN_IDS`

---

## 3. إعداد Google OAuth (Antigravity)

### إنشاء مشروع Google Cloud
1. اذهب إلى https://console.cloud.google.com
2. انقر على "Select a project" ثم "New Project"
3. اختر اسم للمشروع وانقر "Create"

### تفعيل OAuth
1. من القائمة الجانبية، اذهب إلى "APIs & Services" > "Credentials"
2. انقر على "Create Credentials" > "OAuth client ID"
3. إذا طُلب منك، قم بإعداد "OAuth consent screen":
   - اختر "External"
   - املأ المعلومات المطلوبة (اسم التطبيق، بريدك الإلكتروني)
   - أضف Scopes التالية:
     - `https://www.googleapis.com/auth/cloud-platform`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
     - `openid`
4. ارجع إلى "Credentials" وأنشئ OAuth client ID:
   - Application type: "Web application"
   - Name: اختر اسم
   - Authorized redirect URIs: أضف `https://your-app-name.onrender.com/api/callback`
     (استبدل `your-app-name` باسم تطبيقك على Render)
5. احفظ:
   - `Client ID` → `ANTIGRAVITY_CLIENT_ID`
   - `Client secret` → `ANTIGRAVITY_CLIENT_SECRET`

---

## 4. النشر على Render

### إنشاء الحساب
1. اذهب إلى https://render.com
2. سجل دخول باستخدام GitHub أو بريدك الإلكتروني

### رفع الكود إلى GitHub
```bash
cd antigravity-auth-manager
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/antigravity-auth-manager.git
git push -u origin main
```

### إنشاء Web Service
1. من لوحة تحكم Render، انقر على "New +"
2. اختر "Web Service"
3. اربط حساب GitHub الخاص بك
4. اختر المستودع `antigravity-auth-manager`
5. املأ الإعدادات:
   - **Name**: اختر اسم فريد (مثال: `antigravity-auth-manager`)
   - **Region**: اختر المنطقة الأقرب
   - **Branch**: `main`
   - **Root Directory**: اتركه فارغاً
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: اختر "Free"

### إضافة المتغيرات البيئية
في قسم "Environment Variables"، أضف:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
TELEGRAM_ADMIN_IDS=123456789
ANTIGRAVITY_CLIENT_ID=xxxxx.apps.googleusercontent.com
ANTIGRAVITY_CLIENT_SECRET=GOCSPX-xxxxx
ANTIGRAVITY_REDIRECT_URI=https://your-app-name.onrender.com/api/callback
AUTH_SECRET=generate_random_32_char_string_here
NEXT_PUBLIC_APP_URL=https://your-app-name.onrender.com
```

**ملاحظة**: استبدل `your-app-name` باسم تطبيقك الفعلي على Render

6. انقر على "Create Web Service"

### الانتظار حتى يكتمل النشر
- سيستغرق النشر الأول 5-10 دقائق
- راقب السجلات (Logs) للتأكد من عدم وجود أخطاء

---

## 5. تفعيل البوت

بعد اكتمال النشر:

1. افتح المتصفح واذهب إلى:
   ```
   https://your-app-name.onrender.com/api/init-bot
   ```

2. يجب أن ترى رسالة: `{"success":true,"message":"Bot initialized"}`

3. افتح Telegram وابحث عن البوت الخاص بك
4. أرسل `/start` للتأكد من أنه يعمل

---

## 6. تحديث Google OAuth Redirect URI

إذا لم تكن قد أضفت الـ Redirect URI الصحيح:

1. ارجع إلى Google Cloud Console
2. اذهب إلى "APIs & Services" > "Credentials"
3. انقر على OAuth client ID الذي أنشأته
4. في "Authorized redirect URIs"، أضف:
   ```
   https://your-app-name.onrender.com/api/callback
   ```
5. احفظ التغييرات

---

## 7. الاختبار

### اختبار البوت
1. افتح Telegram وأرسل `/create` للبوت
2. يجب أن يرسل لك رابط تسجيل دخول
3. افتح الرابط في المتصفح
4. سجل دخول بحساب Google
5. يجب أن ترى رسالة نجاح

### التحقق من Supabase
1. اذهب إلى لوحة تحكم Supabase
2. افتح "Table Editor"
3. افتح جدول `antigravity_accounts`
4. يجب أن ترى الحساب الذي سجلته

---

## 8. المزامنة مع الأداة المحلية

على جهازك المحلي:

```bash
# انتقل إلى مجلد المشروع
cd antigravity-auth-manager

# أنشئ ملف .env بنفس المتغيرات
cp .env.example .env
# عدّل .env وأضف قيمك

# ثبت المكتبات
npm install

# شغّل سكريبت المزامنة
npm run sync
```

السكريبت سيجلب جميع الحسابات الجديدة من Supabase ويضيفها إلى `../data/db.json`

---

## استكشاف الأخطاء الشائعة

### خطأ: "Bot token is invalid"
- تأكد من نسخ الـ Token كاملاً من BotFather
- تأكد من عدم وجود مسافات في بداية أو نهاية الـ Token

### خطأ: "Redirect URI mismatch"
- تأكد من تطابق الـ Redirect URI في Google Console مع `.env`
- تأكد من استخدام `https://` وليس `http://`

### البوت لا يستجيب
- تأكد من زيارة `/api/init-bot` بعد كل نشر
- تحقق من Logs في Render للبحث عن أخطاء

### خطأ في المزامنة
- تأكد من وجود مجلد `data` في المشروع الرئيسي
- تأكد من صحة مسار `LOCAL_DB_PATH` في `sync-accounts.js`

---

## الصيانة

### إعادة تشغيل البوت
إذا توقف البوت عن العمل، ببساطة قم بزيارة:
```
https://your-app-name.onrender.com/api/init-bot
```

### تحديث الكود
```bash
git add .
git commit -m "Update"
git push
```
Render سيعيد النشر تلقائياً

### مراقبة الاستخدام
- Render Free Plan يوفر 750 ساعة شهرياً
- التطبيق سينام بعد 15 دقيقة من عدم النشاط
- أول طلب بعد النوم قد يستغرق 30-60 ثانية

---

## نصائح للأمان

1. ✅ لا تشارك `SUPABASE_SERVICE_KEY` أبداً
2. ✅ لا تشارك `TELEGRAM_BOT_TOKEN` أبداً
3. ✅ لا تشارك `ANTIGRAVITY_CLIENT_SECRET` أبداً
4. ✅ استخدم `AUTH_SECRET` عشوائي وقوي
5. ✅ أضف فقط Chat IDs الموثوقة في `TELEGRAM_ADMIN_IDS`
6. ✅ راجع الحسابات المسجلة بانتظام باستخدام `/list`

---

## الدعم

إذا واجهت أي مشاكل:
1. راجع Logs في Render
2. تحقق من Supabase Logs
3. تأكد من صحة جميع المتغيرات البيئية
