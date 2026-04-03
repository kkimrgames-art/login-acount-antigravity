#!/usr/bin/env node

/**
 * Test script to verify all configurations are correct
 */

const fs = require('fs');
const path = require('path');

console.log('\n🧪 Running configuration tests...\n');

let passed = 0;
let failed = 0;

function test(name, condition, errorMsg) {
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}: ${errorMsg}`);
    failed++;
  }
}

// Test 1: Check if .env exists
const envPath = path.join(__dirname, '..', '.env');
test(
  '.env file exists',
  fs.existsSync(envPath),
  'Run "npm run setup" to create .env file'
);

// Test 2: Check if .env has required variables
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_ADMIN_IDS',
    'ANTIGRAVITY_CLIENT_ID',
    'ANTIGRAVITY_CLIENT_SECRET',
    'ANTIGRAVITY_REDIRECT_URI',
    'AUTH_SECRET',
    'NEXT_PUBLIC_APP_URL'
  ];

  requiredVars.forEach(varName => {
    test(
      `${varName} is set`,
      !!process.env[varName],
      'Variable is missing or empty'
    );
  });

  // Test 3: Validate URLs
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    test(
      'Supabase URL is valid',
      process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://'),
      'URL should start with https://'
    );
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    test(
      'App URL is valid',
      process.env.NEXT_PUBLIC_APP_URL.startsWith('http'),
      'URL should start with http:// or https://'
    );
  }

  // Test 4: Validate Redirect URI
  if (process.env.ANTIGRAVITY_REDIRECT_URI && process.env.NEXT_PUBLIC_APP_URL) {
    const expectedRedirect = `${process.env.NEXT_PUBLIC_APP_URL}/api/callback`;
    test(
      'Redirect URI matches App URL',
      process.env.ANTIGRAVITY_REDIRECT_URI === expectedRedirect,
      `Should be ${expectedRedirect}`
    );
  }

  // Test 5: Check Telegram Admin IDs format
  if (process.env.TELEGRAM_ADMIN_IDS) {
    const ids = process.env.TELEGRAM_ADMIN_IDS.split(',');
    const allValid = ids.every(id => !isNaN(parseInt(id.trim())));
    test(
      'Telegram Admin IDs are valid',
      allValid,
      'IDs should be comma-separated numbers'
    );
  }
}

// Test 6: Check if node_modules exists
test(
  'Dependencies installed',
  fs.existsSync(path.join(__dirname, '..', 'node_modules')),
  'Run "npm install"'
);

// Test 7: Check if required files exist
const requiredFiles = [
  'package.json',
  'next.config.js',
  'supabase-schema.sql',
  'pages/index.js',
  'pages/api/health.js',
  'lib/supabase.js',
  'lib/telegram.js'
];

requiredFiles.forEach(file => {
  test(
    `${file} exists`,
    fs.existsSync(path.join(__dirname, '..', file)),
    'File is missing'
  );
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('='.repeat(50) + '\n');

if (failed === 0) {
  console.log('🎉 All tests passed! You\'re ready to go.\n');
  console.log('Next steps:');
  console.log('  1. Run "npm run dev" for local development');
  console.log('  2. Deploy to Render');
  console.log('  3. Visit /api/init-bot to activate the bot\n');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please fix the issues above.\n');
  process.exit(1);
}
