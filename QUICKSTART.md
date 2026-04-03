# Quick Start Guide

## البدء السريع (5 دقائق)

### 1. التثبيت
```bash
cd antigravity-auth-manager
npm install
```

### 2. الإعداد التفاعلي
```bash
npm run setup
```
سيطلب منك المعلومات التالية:
- Supabase URL & Keys
- Telegram Bot Token & Admin IDs
- Google OAuth Client ID & Secret
- App URL

### 3. إنشاء الجداول في Supabase
1. افتح Supabase Dashboard
2. اذهب إلى SQL Editor
3. انسخ محتوى `supabase-schema.sql`
4. نفذ السكريبت

### 4. تشغيل محلي
```bash
npm run dev
```
افتح http://localhost:3001

### 5. تفعيل البوت (بعد النشر)
```
https://your-app.onrender.com/api/init-bot
```

---

## الأوامر المتاحة

```bash
npm run dev              # تشغيل محلي للتطوير
npm run build            # بناء للإنتاج
npm start                # تشغيل الإنتاج
npm run sync             # مزامنة الحسابات من Supabase
npm run generate-secret  # توليد AUTH_SECRET عشوائي
npm run setup            # معالج الإعداد التفاعلي
```

---

## استخدام Telegram Bot

### الأوامر الأساسية
```
/start   - عرض المساعدة
/create  - إنشاء رابط تسجيل دخول
/list    - عرض جميع الحسابات
/stats   - إحصائيات النظام
```

### سير العمل
1. أرسل `/create` للبوت
2. سيرسل لك رابط مثل: `https://your-app.onrender.com/auth/abc-123`
3. أرسل الرابط لأي شخص
4. عند فتح الرابط، سيسجل دخول بحساب Google
5. البيانات تُحفظ تلقائياً في Supabase

---

## المزامنة المحلية

### مزامنة يدوية
```bash
npm run sync
```

### مزامنة تلقائية (Cron Job)
أضف إلى crontab:
```bash
# كل ساعة
0 * * * * cd /path/to/antigravity-auth-manager && npm run sync

# كل 30 دقيقة
*/30 * * * * cd /path/to/antigravity-auth-manager && npm run sync
```

---

## التحقق من الحالة

### عبر API
```bash
# التحقق من الحسابات المعلقة للمزامنة
curl https://your-app.onrender.com/api/sync-status
```

### عبر Telegram
```
/stats
```

---

## استكشاف الأخطاء السريع

### البوت لا يرد
```bash
# تفعيل البوت
curl https://your-app.onrender.com/api/init-bot
```

### خطأ في OAuth
- تحقق من Redirect URI في Google Console
- يجب أن يكون: `https://your-app.onrender.com/api/callback`

### فشل المزامنة
```bash
# تحقق من المسار
ls ../data/db.json

# تحقق من الاتصال بـ Supabase
curl -H "apikey: YOUR_ANON_KEY" \
  "https://your-project.supabase.co/rest/v1/antigravity_accounts?select=count"
```

---

## الأمان

### ✅ افعل
- استخدم HTTPS دائماً
- احفظ المفاتيح في .env
- أضف فقط Admin IDs موثوقة
- راجع الحسابات بانتظام

### ❌ لا تفعل
- لا تشارك SUPABASE_SERVICE_KEY
- لا تشارك TELEGRAM_BOT_TOKEN
- لا تشارك CLIENT_SECRET
- لا تنشر .env على Git

---

## الدعم

### الملفات المهمة
- `README.md` - دليل كامل
- `DEPLOYMENT.md` - خطوات النشر التفصيلية
- `supabase-schema.sql` - جداول قاعدة البيانات

### روابط مفيدة
- [Supabase Docs](https://supabase.com/docs)
- [Render Docs](https://render.com/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Google OAuth](https://developers.google.com/identity/protocols/oauth2)
