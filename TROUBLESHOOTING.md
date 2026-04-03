# Troubleshooting Guide

## مشاكل شائعة وحلولها

---

## 1. مشاكل Telegram Bot

### البوت لا يستجيب للأوامر

**الأعراض:**
- إرسال `/start` لا يعطي أي رد
- البوت يظهر offline

**الحلول:**
```bash
# 1. تحقق من تفعيل البوت
curl https://your-app.onrender.com/api/init-bot

# 2. تحقق من صحة Token
# افتح .env وتأكد من TELEGRAM_BOT_TOKEN

# 3. تحقق من Logs في Render
# ابحث عن "Bot initialized" أو أخطاء
```

### البوت يرد بـ "غير مصرح"

**السبب:**
Chat ID الخاص بك غير موجود في `TELEGRAM_ADMIN_IDS`

**الحل:**
```bash
# 1. احصل على Chat ID من @userinfobot
# 2. أضفه إلى .env
TELEGRAM_ADMIN_IDS=123456789,987654321

# 3. أعد نشر التطبيق على Render
```

### البوت يتوقف بعد فترة

**السبب:**
Render Free tier ينام بعد 15 دقيقة من عدم النشاط

**الحل:**
```bash
# استخدم خدمة ping مثل UptimeRobot
# أو Cron job لزيارة /api/health كل 10 دقائق

# مثال Cron:
*/10 * * * * curl https://your-app.onrender.com/api/health
```

---

## 2. مشاكل OAuth

### خطأ "Redirect URI mismatch"

**الأعراض:**
```
Error 400: redirect_uri_mismatch
```

**الحل:**
```bash
# 1. تحقق من .env
ANTIGRAVITY_REDIRECT_URI=https://your-app.onrender.com/api/callback

# 2. اذهب إلى Google Cloud Console
# 3. APIs & Services > Credentials
# 4. انقر على OAuth client ID
# 5. أضف نفس الـ URI في "Authorized redirect URIs"
# 6. احفظ التغييرات
```

### خطأ "Invalid client"

**الأعراض:**
```
Error: invalid_client
```

**الحل:**
```bash
# تحقق من صحة CLIENT_ID و CLIENT_SECRET
# انسخهم مرة أخرى من Google Console
# تأكد من عدم وجود مسافات في البداية أو النهاية
```

### المستخدم يسجل دخول لكن لا يُحفظ الحساب

**الحل:**
```bash
# 1. تحقق من Supabase Logs
# 2. تحقق من صحة SUPABASE_SERVICE_KEY
# 3. تحقق من أن الجداول موجودة:

# في Supabase SQL Editor:
SELECT * FROM antigravity_accounts LIMIT 1;
SELECT * FROM auth_links LIMIT 1;
```

---

## 3. مشاكل Supabase

### خطأ "relation does not exist"

**السبب:**
الجداول غير موجودة في قاعدة البيانات

**الحل:**
```bash
# 1. افتح Supabase Dashboard
# 2. اذهب إلى SQL Editor
# 3. انسخ محتوى supabase-schema.sql
# 4. نفذ السكريبت
```

### خطأ "Invalid API key"

**السبب:**
المفاتيح غير صحيحة أو منتهية

**الحل:**
```bash
# 1. اذهب إلى Supabase Dashboard
# 2. Settings > API
# 3. انسخ المفاتيح مرة أخرى:
#    - Project URL
#    - anon public key
#    - service_role key
# 4. حدّث .env
# 5. أعد نشر التطبيق
```

### لا يمكن الاتصال بـ Supabase

**الحل:**
```bash
# اختبر الاتصال:
curl -H "apikey: YOUR_ANON_KEY" \
  "https://your-project.supabase.co/rest/v1/"

# يجب أن ترى استجابة JSON
```

---

## 4. مشاكل المزامنة

### السكريبت يفشل: "Cannot find module"

**الحل:**
```bash
# تأكد من تثبيت المكتبات
cd antigravity-auth-manager
npm install
```

### السكريبت يفشل: "db.json not found"

**السبب:**
المسار إلى db.json غير صحيح

**الحل:**
```javascript
// عدّل scripts/sync-accounts.js
// غيّر LOCAL_DB_PATH إلى المسار الصحيح:
const LOCAL_DB_PATH = path.join(__dirname, '../../data/db.json');
// أو المسار المطلق:
const LOCAL_DB_PATH = 'C:/path/to/9router-master/data/db.json';
```

### الحسابات لا تُزامن

**الحل:**
```bash
# 1. تحقق من حالة المزامنة:
curl https://your-app.onrender.com/api/sync-status

# 2. تحقق من Supabase:
# في SQL Editor:
SELECT email, synced_to_local FROM antigravity_accounts;

# 3. إعادة تعيين حالة المزامنة (إذا لزم الأمر):
UPDATE antigravity_accounts SET synced_to_local = false;

# 4. شغّل المزامنة مرة أخرى:
npm run sync
```

---

## 5. مشاكل النشر على Render

### Build يفشل

**الأعراض:**
```
Error: Build failed
```

**الحل:**
```bash
# 1. تحقق من package.json
# تأكد من وجود:
"scripts": {
  "build": "next build",
  "start": "next start"
}

# 2. تحقق من Node version
# في Render Dashboard > Environment:
NODE_VERSION=18.17.0

# 3. تحقق من Logs للبحث عن أخطاء محددة
```

### التطبيق يبدأ لكن يتعطل

**الحل:**
```bash
# 1. تحقق من جميع Environment Variables
# تأكد من إضافة كل المتغيرات من .env.example

# 2. تحقق من Health Check
curl https://your-app.onrender.com/api/health

# 3. راجع Logs في Render Dashboard
```

### "Application failed to respond"

**السبب:**
التطبيق لا يستمع على المنفذ الصحيح

**الحل:**
```bash
# Render يستخدم متغير PORT تلقائياً
# Next.js يجب أن يستمع على process.env.PORT

# في package.json:
"start": "next start -p ${PORT:-3001}"
```

---

## 6. مشاكل الأمان

### تسريب المفاتيح السرية

**إذا تم تسريب مفتاح:**

1. **TELEGRAM_BOT_TOKEN:**
   - تحدث مع @BotFather
   - أرسل `/revoke`
   - أنشئ token جديد

2. **SUPABASE_SERVICE_KEY:**
   - اذهب إلى Supabase Dashboard
   - Settings > API
   - أنقر "Reset service_role key"

3. **ANTIGRAVITY_CLIENT_SECRET:**
   - اذهب إلى Google Cloud Console
   - احذف OAuth client القديم
   - أنشئ واحد جديد

4. **AUTH_SECRET:**
   - شغّل `npm run generate-secret`
   - حدّث .env
   - أعد النشر

---

## 7. مشاكل الأداء

### التطبيق بطيء جداً

**الحلول:**
```bash
# 1. استخدم Render Paid Plan لأداء أفضل

# 2. قلل عدد استعلامات Supabase:
# - استخدم caching
# - اجمع الاستعلامات

# 3. استخدم CDN للملفات الثابتة

# 4. قلل حجم الـ bundle:
npm run build -- --analyze
```

### Cold starts طويلة

**السبب:**
Render Free tier ينام بعد 15 دقيقة

**الحلول:**
```bash
# 1. استخدم UptimeRobot للـ ping كل 5 دقائق

# 2. أو استخدم Render Paid Plan (لا ينام)

# 3. أو استخدم Cron job:
*/5 * * * * curl https://your-app.onrender.com/api/health
```

---

## 8. أدوات التشخيص

### اختبار التكوين الكامل

```bash
npm run test-config
```

### اختبار الاتصال بـ Supabase

```bash
curl -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  "https://your-project.supabase.co/rest/v1/antigravity_accounts?select=count"
```

### اختبار Telegram Bot

```bash
curl "https://api.telegram.org/bot${BOT_TOKEN}/getMe"
```

### اختبار OAuth

```bash
# زر صفحة التسجيل مباشرة:
https://your-app.onrender.com/auth/test-link-id
```

---

## 9. الحصول على المساعدة

### معلومات مفيدة عند طلب المساعدة:

1. **نسخة Node.js:**
   ```bash
   node --version
   ```

2. **Logs من Render:**
   - انسخ آخر 50 سطر من Logs

3. **Environment Variables:**
   - لا تشارك القيم الفعلية!
   - فقط أسماء المتغيرات المضبوطة

4. **خطوات إعادة المشكلة:**
   - ماذا فعلت؟
   - ماذا توقعت؟
   - ماذا حدث فعلاً؟

5. **رسائل الخطأ:**
   - انسخ رسالة الخطأ الكاملة

---

## 10. نصائح عامة

### ✅ افعل:
- احتفظ بنسخة احتياطية من .env
- راجع Logs بانتظام
- اختبر محلياً قبل النشر
- استخدم `npm run test-config` قبل النشر
- وثّق أي تغييرات تجريها

### ❌ لا تفعل:
- لا تشارك المفاتيح السرية
- لا تنشر .env على Git
- لا تستخدم نفس المفاتيح للتطوير والإنتاج
- لا تتجاهل رسائل الخطأ
- لا تنشر بدون اختبار

---

## موارد إضافية

- [Render Docs](https://render.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Next.js Docs](https://nextjs.org/docs)
- [Google OAuth Docs](https://developers.google.com/identity/protocols/oauth2)
