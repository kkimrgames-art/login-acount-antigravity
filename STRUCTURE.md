# Project Structure

```
antigravity-auth-manager/
│
├── pages/                          # Next.js pages
│   ├── api/                        # API routes
│   │   ├── auth/                   # Authentication endpoints
│   │   │   ├── validate.js         # التحقق من صلاحية الرابط
│   │   │   └── authorize.js        # بدء OAuth flow
│   │   ├── telegram/               # Telegram bot endpoints
│   │   │   ├── create-link.js      # إنشاء رابط تسجيل
│   │   │   ├── list-accounts.js    # عرض الحسابات
│   │   │   └── stats.js            # الإحصائيات
│   │   ├── callback.js             # OAuth callback handler
│   │   ├── init-bot.js             # تفعيل Telegram bot
│   │   ├── health.js               # Health check
│   │   └── sync-status.js          # حالة المزامنة
│   ├── auth/
│   │   └── [linkId].js             # صفحة تسجيل الدخول الديناميكية
│   ├── _app.js                     # Next.js App wrapper
│   └── index.js                    # الصفحة الرئيسية
│
├── lib/                            # Shared libraries
│   ├── supabase.js                 # Supabase client configuration
│   └── telegram.js                 # Telegram bot logic
│
├── scripts/                        # Utility scripts
│   ├── sync-accounts.js            # مزامنة الحسابات من Supabase
│   ├── generate-secret.js          # توليد AUTH_SECRET
│   ├── setup.js                    # معالج الإعداد التفاعلي
│   └── test-config.js              # اختبار التكوين
│
├── styles/                         # CSS styles
│   └── globals.css                 # Global styles
│
├── .env.example                    # مثال للمتغيرات البيئية
├── .gitignore                      # Git ignore rules
├── API.md                          # توثيق API
├── CHANGELOG.md                    # سجل التغييرات
├── DEPLOYMENT.md                   # دليل النشر التفصيلي
├── LICENSE                         # MIT License
├── next.config.js                  # Next.js configuration
├── package.json                    # NPM dependencies
├── QUICKSTART.md                   # دليل البدء السريع
├── README.md                       # الدليل الرئيسي
├── render.yaml                     # Render deployment config
└── supabase-schema.sql             # Database schema
```

## Core Components

### 1. Authentication Flow
```
User clicks link → validate.js → authorize.js → Google OAuth → 
callback.js → Save to Supabase → Success page
```

### 2. Telegram Bot Flow
```
Admin sends /create → create-link.js → Generate unique link → 
Store in Supabase → Return link to admin
```

### 3. Sync Flow
```
Run sync script → Fetch unsynced accounts from Supabase → 
Add to local db.json → Mark as synced in Supabase
```

## Key Files Explained

### `lib/supabase.js`
- Creates Supabase client instances
- Exports both public and admin clients
- Used by all API endpoints for database operations

### `lib/telegram.js`
- Initializes Telegram bot
- Defines bot commands (/start, /create, /list, /stats)
- Handles admin authentication
- Makes API calls to internal endpoints

### `pages/api/callback.js`
- Handles OAuth callback from Google
- Exchanges authorization code for tokens
- Fetches user info
- Stores account in Supabase
- Marks auth link as used

### `scripts/sync-accounts.js`
- Standalone Node.js script
- Connects to Supabase
- Fetches unsynced accounts
- Reads local db.json
- Adds new accounts
- Updates sync status

### `supabase-schema.sql`
- Defines database tables
- Creates indexes for performance
- Sets up Row Level Security
- Creates policies

## Environment Variables

### Required for Production
```
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Public anon key
SUPABASE_SERVICE_KEY              # Service role key (secret!)
TELEGRAM_BOT_TOKEN                # Bot token from @BotFather
TELEGRAM_ADMIN_IDS                # Comma-separated chat IDs
ANTIGRAVITY_CLIENT_ID             # Google OAuth client ID
ANTIGRAVITY_CLIENT_SECRET         # Google OAuth secret
ANTIGRAVITY_REDIRECT_URI          # OAuth callback URL
AUTH_SECRET                       # Random secret for security
NEXT_PUBLIC_APP_URL               # Your app's public URL
```

### Optional
```
NODE_VERSION                      # Node.js version (default: 18.17.0)
PORT                              # Server port (default: 3001)
```

## Database Tables

### `antigravity_accounts`
Stores OAuth credentials for Antigravity accounts.

**Columns:**
- `id` - UUID primary key
- `email` - User email (unique)
- `access_token` - OAuth access token
- `refresh_token` - OAuth refresh token
- `expires_at` - Token expiration timestamp
- `scope` - OAuth scopes
- `project_id` - Antigravity project ID
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp
- `synced_to_local` - Sync status flag
- `last_synced_at` - Last sync timestamp

### `auth_links`
Stores temporary authentication links.

**Columns:**
- `id` - UUID primary key
- `link_id` - Unique link identifier
- `created_by_chat_id` - Telegram chat ID of creator
- `used` - Whether link has been used
- `used_at` - When link was used
- `expires_at` - Link expiration timestamp
- `created_at` - Link creation timestamp

## Security Features

### 1. Link Security
- ✅ Unique UUID for each link
- ✅ 24-hour expiration
- ✅ Single-use only
- ✅ Validated before OAuth flow

### 2. Bot Security
- ✅ Admin-only access via Chat ID whitelist
- ✅ Commands rejected for non-admins
- ✅ No public endpoints

### 3. Data Security
- ✅ Encrypted at rest in Supabase
- ✅ HTTPS only
- ✅ Row Level Security enabled
- ✅ Service key never exposed to client

### 4. OAuth Security
- ✅ State parameter validation
- ✅ PKCE flow (future enhancement)
- ✅ Secure token storage
- ✅ Refresh token rotation

## Performance Considerations

### Render Free Tier
- ✅ Sleeps after 15 minutes of inactivity
- ✅ 750 hours/month free
- ✅ Cold start: 30-60 seconds
- ✅ Health check keeps it awake

### Optimization Tips
1. Use health check pings to keep service warm
2. Batch sync operations
3. Cache Supabase queries when possible
4. Minimize bot polling frequency

## Monitoring

### Health Checks
```bash
curl https://your-app.onrender.com/api/health
```

### Logs
- View in Render dashboard
- Check for errors in bot initialization
- Monitor OAuth callback failures

### Metrics to Track
- Number of accounts synced
- Active auth links
- Bot command usage
- OAuth success rate

## Future Enhancements

### Planned Features
- [ ] Webhook notifications
- [ ] Account expiration alerts
- [ ] Bulk account import
- [ ] Web dashboard for admins
- [ ] Docker support
- [ ] Automated testing
- [ ] PKCE OAuth flow
- [ ] Rate limiting
- [ ] Audit logs

### Possible Integrations
- [ ] Discord bot
- [ ] Slack bot
- [ ] Email notifications
- [ ] SMS alerts
- [ ] Prometheus metrics
