# API Documentation

## Base URL
```
https://your-app.onrender.com
```

---

## Endpoints

### 1. Health Check
**GET** `/api/health`

تحقق من حالة الخدمة.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-03T18:25:32.253Z",
  "service": "antigravity-auth-manager",
  "version": "1.0.0"
}
```

---

### 2. Initialize Bot
**POST** `/api/init-bot`

تفعيل Telegram Bot.

**Response:**
```json
{
  "success": true,
  "message": "Bot initialized"
}
```

---

### 3. Validate Auth Link
**GET** `/api/auth/validate?linkId={linkId}`

التحقق من صلاحية رابط التسجيل.

**Parameters:**
- `linkId` (string, required) - معرف الرابط

**Response (Success):**
```json
{
  "valid": true
}
```

**Response (Error):**
```json
{
  "error": "رابط غير صالح"
}
```

**Status Codes:**
- `200` - الرابط صالح
- `404` - الرابط غير موجود
- `410` - الرابط منتهي الصلاحية أو مستخدم

---

### 4. Start OAuth Flow
**GET** `/api/auth/authorize?linkId={linkId}`

بدء عملية OAuth مع Google.

**Parameters:**
- `linkId` (string, required) - معرف الرابط

**Response:**
- Redirect إلى Google OAuth

---

### 5. OAuth Callback
**GET** `/api/callback?code={code}&state={linkId}`

معالجة OAuth callback من Google.

**Parameters:**
- `code` (string, required) - Authorization code
- `state` (string, required) - Link ID

**Response:**
- Redirect إلى صفحة النجاح أو الخطأ

---

### 6. Create Auth Link (Telegram)
**POST** `/api/telegram/create-link`

إنشاء رابط تسجيل دخول جديد.

**Request Body:**
```json
{
  "chatId": 123456789
}
```

**Response:**
```json
{
  "success": true,
  "link": "https://your-app.onrender.com/auth/abc-123",
  "linkId": "abc-123",
  "expiresAt": "2026-04-04T18:25:32.253Z"
}
```

---

### 7. List Accounts (Telegram)
**GET** `/api/telegram/list-accounts`

عرض جميع الحسابات المسجلة.

**Response:**
```json
{
  "success": true,
  "accounts": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "created_at": "2026-04-03T15:09:48.909Z",
      "project_id": "project-id"
    }
  ]
}
```

---

### 8. Get Statistics (Telegram)
**GET** `/api/telegram/stats`

الحصول على إحصائيات النظام.

**Response:**
```json
{
  "success": true,
  "totalAccounts": 15,
  "activeLinks": 3,
  "todayAccounts": 2,
  "lastAccount": "user@example.com (03/04/2026, 18:25:32)"
}
```

---

### 9. Sync Status
**GET** `/api/sync-status`

التحقق من الحسابات المعلقة للمزامنة.

**Response:**
```json
{
  "success": true,
  "pendingSync": 5,
  "accounts": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "created_at": "2026-04-03T15:09:48.909Z",
      "synced_to_local": false
    }
  ]
}
```

---

## Error Responses

جميع الـ endpoints قد ترجع أخطاء بالصيغة التالية:

```json
{
  "error": "Error message in Arabic or English"
}
```

### Status Codes
- `200` - Success
- `400` - Bad Request (معاملات مفقودة أو غير صحيحة)
- `401` - Unauthorized (غير مصرح)
- `404` - Not Found (غير موجود)
- `405` - Method Not Allowed (طريقة غير مسموحة)
- `410` - Gone (منتهي الصلاحية)
- `500` - Internal Server Error (خطأ في الخادم)

---

## Authentication

### Telegram Bot Endpoints
تتطلب أن يكون `chatId` في قائمة `TELEGRAM_ADMIN_IDS`.

### OAuth Endpoints
تستخدم Google OAuth 2.0 flow.

---

## Rate Limiting

لا يوجد rate limiting حالياً، لكن يُنصح بـ:
- عدم إنشاء أكثر من 10 روابط في الدقيقة
- عدم استدعاء `/list-accounts` أكثر من مرة كل 5 ثواني

---

## Examples

### cURL Examples

#### Health Check
```bash
curl https://your-app.onrender.com/api/health
```

#### Validate Link
```bash
curl "https://your-app.onrender.com/api/auth/validate?linkId=abc-123"
```

#### Create Link
```bash
curl -X POST https://your-app.onrender.com/api/telegram/create-link \
  -H "Content-Type: application/json" \
  -d '{"chatId": 123456789}'
```

#### Get Stats
```bash
curl https://your-app.onrender.com/api/telegram/stats
```

#### Sync Status
```bash
curl https://your-app.onrender.com/api/sync-status
```

---

## Webhooks

حالياً لا يوجد webhooks، لكن يمكن إضافتها مستقبلاً لـ:
- إشعار عند تسجيل حساب جديد
- إشعار عند انتهاء صلاحية رابط
- إشعار عند فشل OAuth

---

## Database Schema

### Table: `antigravity_accounts`
```sql
id              UUID PRIMARY KEY
email           TEXT NOT NULL UNIQUE
access_token    TEXT NOT NULL
refresh_token   TEXT NOT NULL
expires_at      TIMESTAMP WITH TIME ZONE
scope           TEXT
project_id      TEXT
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
synced_to_local BOOLEAN DEFAULT FALSE
last_synced_at  TIMESTAMP WITH TIME ZONE
```

### Table: `auth_links`
```sql
id                  UUID PRIMARY KEY
link_id             TEXT NOT NULL UNIQUE
created_by_chat_id  BIGINT NOT NULL
used                BOOLEAN DEFAULT FALSE
used_at             TIMESTAMP WITH TIME ZONE
expires_at          TIMESTAMP WITH TIME ZONE
created_at          TIMESTAMP WITH TIME ZONE
```
