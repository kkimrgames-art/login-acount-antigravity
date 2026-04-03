#!/usr/bin/env node

/**
 * Post-deployment verification script
 * Run this after deploying to Render to verify everything works
 */

const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', reject);
  });
}

async function verify() {
  console.log('\n🔍 Post-Deployment Verification\n');
  
  const appUrl = await question('Enter your Render app URL (e.g., https://your-app.onrender.com): ');
  
  if (!appUrl.startsWith('http')) {
    console.log('\n❌ Invalid URL. Must start with https://\n');
    rl.close();
    return;
  }

  console.log('\n📋 Running checks...\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Health check
  try {
    console.log('1️⃣  Testing health endpoint...');
    const health = await makeRequest(`${appUrl}/api/health`);
    if (health.status === 200 && health.data.status === 'healthy') {
      console.log('   ✅ Health check passed');
      passed++;
    } else {
      console.log('   ❌ Health check failed');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Health check failed:', error.message);
    failed++;
  }

  // Test 2: Init bot
  try {
    console.log('\n2️⃣  Testing bot initialization...');
    const init = await makeRequest(`${appUrl}/api/init-bot`);
    if (init.status === 200) {
      console.log('   ✅ Bot initialization successful');
      passed++;
    } else {
      console.log('   ❌ Bot initialization failed');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Bot initialization failed:', error.message);
    failed++;
  }

  // Test 3: Stats endpoint
  try {
    console.log('\n3️⃣  Testing stats endpoint...');
    const stats = await makeRequest(`${appUrl}/api/telegram/stats`);
    if (stats.status === 200 && stats.data.success) {
      console.log('   ✅ Stats endpoint working');
      console.log(`   📊 Total accounts: ${stats.data.totalAccounts}`);
      passed++;
    } else {
      console.log('   ❌ Stats endpoint failed');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Stats endpoint failed:', error.message);
    failed++;
  }

  // Test 4: Sync status
  try {
    console.log('\n4️⃣  Testing sync status endpoint...');
    const sync = await makeRequest(`${appUrl}/api/sync-status`);
    if (sync.status === 200 && sync.data.success !== undefined) {
      console.log('   ✅ Sync status endpoint working');
      console.log(`   🔄 Pending sync: ${sync.data.pendingSync}`);
      passed++;
    } else {
      console.log('   ❌ Sync status endpoint failed');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Sync status endpoint failed:', error.message);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Passed: ${passed}/4`);
  console.log(`❌ Failed: ${failed}/4`);
  console.log('='.repeat(50) + '\n');

  if (failed === 0) {
    console.log('🎉 All checks passed! Your deployment is successful.\n');
    console.log('Next steps:');
    console.log('  1. Open Telegram and send /start to your bot');
    console.log('  2. Send /create to generate a login link');
    console.log('  3. Test the OAuth flow');
    console.log('  4. Run "npm run sync" locally to sync accounts\n');
  } else {
    console.log('⚠️  Some checks failed. Please review the errors above.\n');
    console.log('Troubleshooting tips:');
    console.log('  - Check Render logs for errors');
    console.log('  - Verify all environment variables are set');
    console.log('  - Ensure Supabase tables are created');
    console.log('  - Check TELEGRAM_BOT_TOKEN is valid\n');
  }

  rl.close();
}

verify().catch(error => {
  console.error('\n❌ Verification failed:', error.message);
  rl.close();
  process.exit(1);
});
