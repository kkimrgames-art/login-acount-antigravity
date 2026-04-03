#!/usr/bin/env node

/**
 * Quick setup script to help configure the project
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
  console.log('\n🚀 Antigravity Auth Manager - Setup Wizard\n');
  console.log('This wizard will help you configure your .env file\n');

  const envPath = path.join(__dirname, '..', '.env');
  
  if (fs.existsSync(envPath)) {
    const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('\n❌ Setup cancelled\n');
      rl.close();
      return;
    }
  }

  console.log('\n📝 Please provide the following information:\n');

  const supabaseUrl = await question('Supabase URL: ');
  const supabaseAnonKey = await question('Supabase Anon Key: ');
  const supabaseServiceKey = await question('Supabase Service Key: ');
  
  console.log('');
  const telegramToken = await question('Telegram Bot Token: ');
  const telegramAdminIds = await question('Telegram Admin IDs (comma-separated): ');
  
  console.log('');
  const clientId = await question('Antigravity Client ID: ');
  const clientSecret = await question('Antigravity Client Secret: ');
  const appUrl = await question('App URL (e.g., https://your-app.onrender.com): ');

  // Generate random secret
  const crypto = require('crypto');
  const authSecret = crypto.randomBytes(32).toString('hex');

  const redirectUri = `${appUrl}/api/callback`;

  const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_SERVICE_KEY=${supabaseServiceKey}

# Telegram Bot
TELEGRAM_BOT_TOKEN=${telegramToken}
TELEGRAM_ADMIN_IDS=${telegramAdminIds}

# OAuth Configuration (Antigravity)
ANTIGRAVITY_CLIENT_ID=${clientId}
ANTIGRAVITY_CLIENT_SECRET=${clientSecret}
ANTIGRAVITY_REDIRECT_URI=${redirectUri}

# Security
AUTH_SECRET=${authSecret}

# App URL
NEXT_PUBLIC_APP_URL=${appUrl}
`;

  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ .env file created successfully!\n');
  console.log('📋 Summary:');
  console.log(`   - Supabase URL: ${supabaseUrl}`);
  console.log(`   - Telegram Bot: Configured`);
  console.log(`   - OAuth Redirect URI: ${redirectUri}`);
  console.log(`   - Auth Secret: Generated (${authSecret.substring(0, 8)}...)`);
  console.log('\n⚠️  Important: Add this Redirect URI to your Google Cloud Console:');
  console.log(`   ${redirectUri}\n`);
  console.log('🎉 Setup complete! Run "npm run dev" to start the development server\n');

  rl.close();
}

setup().catch(error => {
  console.error('\n❌ Setup failed:', error.message);
  rl.close();
  process.exit(1);
});
