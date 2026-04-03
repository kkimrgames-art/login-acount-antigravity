# 🚀 Antigravity Auth Manager - نظام آمن ومحسّن

[![Production Ready](https://img.shields.io/badge/status-production%20ready-brightgreen)]()
[![Security](https://img.shields.io/badge/security-hardened-blue)]()
[![Performance](https://img.shields.io/badge/performance-optimized-orange)]()

نظام خفيف وآمن لإدارة تسجيل حسابات Antigravity عبر Telegram Bot مع تخزين سحابي في Supabase ومزامنة تلقائية مع الأداة المحلية.

---

## ✨ الميزات الرئيسية

### 🔒 أمان متقدم
- ✅ **Rate Limiting** - حماية من DDoS والطلبات الزائدة
- ✅ **Circuit Breaker** - حماية من الفشل المتتالي
- ✅ **Input Validation** - منع SQL Injection و XSS
- ✅ **Security Headers** - HSTS, CSP, X-Frame-Options
- ✅ **Audit Logging** - تسجيل جميع الأحداث الأمنية
- ✅ **IP Blacklist** - حظر IPs المشبوهة

### ⚡ أداء عالي
- ✅ **Retry Logic** - إعادة محاولة تلقائية مع Exponential Backoff
- ✅ **Timeout Protection** - منع التعليق (10-15 ثانية)
- ✅ **Message Queue** - معالجة منظمة للرسائل
- ✅ **Keep-Alive** - منع النوم على Render Free
- ✅ **Connection Pooling** - إدارة فعالة للاتصالات

### 📊 مراقبة شاملة
- ✅ **Performance Monitoring** - تتبع مدة الطلبات والذاكرة
- ✅ **Error Tracking** - تسجيل ومراقبة الأخطاء
- ✅ **Automatic Alerts** - تنبيهات عند المشاكل
- ✅ **Health Checks** - فحص صحة النظام

### 🤖 Telegram Bot
- ✅ **4 أوامر رئيسية** - /create, /list, /stats, /health
- ✅ **Admin-only** - وصول محدود للمصرح لهم
- ✅ **Webhook Support** - أفضل من polling
- ✅ **Message Queue** - منع الفيضان

---

## 📦 التثبيت السريع

```bash
# 1. استنساخ المشروع
cd antigravity-auth-manager

# 2. تثبيت المكتبات
npm install

# 3. الإعداد التفاعلي
npm run setup

# 4. اختبار التكوين
npm run test-config

# 5. تشغيل محلي
npm run dev
```

---

## 🔧 الإعداد

### 1. Supabase
```bash
# 1. أنشئ مشروع على https://supabase.com
# 2. في SQL Editor، نفّذ supabase-schema.sql
# 3. احصل على المفاتيح من Settings > API
```

### 2. Telegram Bot
```bash
# 1. تحدث مع @BotFather
# 2. أرسل /newbot
# 3. احصل على Token
# 4. احصل على Chat ID من @userinfobot
```

### 3. Google OAuth
```bash
# 1. اذهب إلى console.cloud.google.com
# 2. أنشئ OAuth client
# 3. أضف Redirect URI: https://your-app.onrender.com/api/callback
# 4. احصل على Client ID و Secret
```

### 4. Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
TELEGRAM_BOT_TOKEN=123456789:ABC...
TELEGRAM_ADMIN_IDS=123456789
ANTIGRAVITY_CLIENT_ID=xxx.apps.googleusercontent.com
ANTIGRAVITY_CLIENT_SECRET=GOCSPX-xxx
ANTIGRAVITY_REDIRECT_URI=https://your-app.onrender.com/api/callback
AUTH_SECRET=random_32_char_string
NEXT_PUBLIC_APP_URL=https://your-app.onrender.com
```

---

## 🚀 النشر على Render

### 1. Push إلى GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/repo.git
git push -u origin main
```

### 2. إنشاء Web Service
```
1. اذهب إلى render.com
2. New → Web Service
3. Connect GitHub repo
4. Settings:
   - Build Command: npm install && npm run build
   - Start Command: npm start
   - Environment: Node
```

### 3. إضافة Environment Variables
```
أضف جميع المتغيرات من .env
```

### 4. Deploy
```
انقر Deploy وانتظر 5-10 دقائق
```

### 5. تفعيل البوت
```bash
curl https://your-app.onrender.com/api/init-bot
```

---

## 📖 الاستخدام

### Telegram Bot Commands

```bash
/start   # عرض المساعدة
/create  # إنشاء رابط تسجيل دخول جديد
/list    # عرض جميع الحسابات المسجلة
/stats   # إحصائيات النظام
/health  # حالة النظام
```

### سير العمل

```
1. المسؤول يرسل /create للبوت
   ↓
2. البوت يُنشئ رابط فريد (صالح 24 ساعة)
   ↓
3. المسؤول يرسل الرابط لأي شخص
   ↓
4. المستخدم يفتح الرابط ويسجل دخول بـ Google
   ↓
5. النظام يحفظ البيانات في Supabase
   ↓
6. المسؤول يشغل npm run sync محلياً
   ↓
7. الحسابات تُضاف إلى ../data/db.json
```

### المزامنة المحلية

```bash
# مزامنة يدوية
npm run sync

# مزامنة تلقائية (Cron)
0 * * * * cd /path/to/project && npm run sync
```

---

## 🔒 الأمان

### الحماية المطبقة

| الهجوم | الحماية |
|--------|---------|
| SQL Injection | ✅ Prepared statements + Sanitization |
| XSS | ✅ HTML escaping + React protection |
| CSRF | ✅ Origin validation |
| DDoS | ✅ Rate limiting + Circuit breaker |
| Brute Force | ✅ Rate limiting per IP |
| MITM | ✅ HTTPS + HSTS |

### Rate Limits

```javascript
/api/callback        → 10 requests/minute per IP
/api/create-link     → 5 requests/minute per IP
/api/validate        → 20 requests/minute per IP
/api/telegram/webhook → 100 requests/minute per IP
```

### Security Headers

```
Strict-Transport-Security: max-age=63072000
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 📊 المراقبة

### Health Check
```bash
curl https://your-app.onrender.com/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-03T18:39:25.726Z",
  "uptime": 3600,
  "responseTime": "45ms",
  "checks": {
    "supabase": "ok",
    "memory": "ok"
  }
}
```

### Monitoring
```bash
curl https://your-app.onrender.com/api/monitoring
```

**Response:**
```json
{
  "metrics": {
    "request_duration": { "avg": 120, "min": 50, "max": 500 },
    "memory_heap_used": { "avg": 250 }
  },
  "alerts": [],
  "memory": {
    "heapUsed": 245.67,
    "percentage": "48.23"
  }
}
```

---

## 🛠️ الأوامر المتاحة

```bash
npm install              # تثبيت المكتبات
npm run dev              # تشغيل محلي (port 3001)
npm run build            # بناء للإنتاج
npm start                # تشغيل الإنتاج
npm run sync             # مزامنة الحسابات من Supabase
npm run setup            # معالج إعداد تفاعلي
npm run generate-secret  # توليد AUTH_SECRET
npm run test-config      # اختبار التكوين
npm run verify           # التحقق من النشر
```

---

## 📁 البنية

```
antigravity-auth-manager/
├── pages/api/           # API endpoints (12 endpoints)
│   ├── auth/           # OAuth endpoints
│   ├── telegram/       # Telegram bot endpoints
│   ├── callback.js     # OAuth callback (محسّن)
│   ├── health.js       # Health check (محسّن)
│   └── monitoring.js   # Performance monitoring (جديد)
├── lib/                # Shared libraries
│   ├── security.js     # Security utilities (جديد)
│   ├── monitoring.js   # Monitoring utilities (جديد)
│   ├── supabase.js     # Supabase client (محسّن)
│   └── telegram.js     # Telegram bot (محسّن)
├── scripts/            # Utility scripts (5 scripts)
├── styles/             # CSS styles
└── *.md                # Documentation (11 files)
```

---

## 📚 التوثيق

| الملف | الوصف |
|------|-------|
| `README.md` | الدليل الرئيسي (هذا الملف) |
| `QUICKSTART.md` | ابدأ في 5 دقائق |
| `DEPLOYMENT.md` | خطوات النشر التفصيلية |
| `API.md` | توثيق جميع الـ endpoints |
| `STRUCTURE.md` | بنية المشروع |
| `SECURITY.md` | دليل الأمان الشامل |
| `TROUBLESHOOTING.md` | حل المشاكل الشائعة |
| `IMPROVEMENTS.md` | التحسينات المطبقة |
| `FINAL.md` | الملخص النهائي |

---

## 🔧 استكشاف الأخطاء

### البوت لا يستجيب
```bash
# تفعيل البوت
curl https://your-app.onrender.com/api/init-bot

# التحقق من Logs
# في Render Dashboard → Logs
```

### خطأ في OAuth
```bash
# تحقق من Redirect URI في Google Console
# يجب أن يكون: https://your-app.onrender.com/api/callback
```

### فشل المزامنة
```bash
# تحقق من المسار
ls ../data/db.json

# اختبار الاتصال بـ Supabase
npm run test-config
```

راجع `TROUBLESHOOTING.md` للمزيد.

---

## 📊 الإحصائيات

| المقياس | القيمة |
|---------|--------|
| **إجمالي الملفات** | 39 ملف |
| **أسطر الكود** | 3500+ سطر |
| **API Endpoints** | 12 endpoint |
| **Security Features** | 20+ ميزة |
| **Performance Features** | 15+ ميزة |
| **Documentation Files** | 11 ملف |

---

## 🎯 المتطلبات

- Node.js 18+
- npm 9+
- حساب Supabase (مجاني)
- حساب Render (مجاني)
- Telegram Bot Token
- Google OAuth credentials

---

## 🤝 المساهمة

المساهمات مرحب بها! يرجى:
1. Fork المشروع
2. إنشاء branch للميزة
3. Commit التغييرات
4. Push إلى Branch
5. فتح Pull Request

---

## 📄 الترخيص

MIT License - استخدم بحرية!

---

## 🙏 شكر خاص

- [Next.js](https://nextjs.org) - React framework
- [Supabase](https://supabase.com) - Backend as a Service
- [Render](https://render.com) - Cloud hosting
- [Telegram](https://telegram.org) - Bot API

---

## 📞 الدعم

- 📖 راجع التوثيق في المجلد
- 🐛 أبلغ عن المشاكل في GitHub Issues
- 💬 اطرح الأسئلة في Discussions

---

## 🎉 ابدأ الآن!

```bash
cd antigravity-auth-manager
npm install
npm run setup
npm run test-config
npm run dev
```

**ثم انشر على Render واستمتع! 🚀**

---

**الإصدار:** 1.0.0  
**الحالة:** ✅ Production Ready  
**آخر تحديث:** 2026-04-03

**صُنع بـ ❤️ للمجتمع العربي**
