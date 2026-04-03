#!/usr/bin/env node

/**
 * Generate a random AUTH_SECRET for the application
 */

const crypto = require('crypto');

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

console.log('\n🔐 Generated AUTH_SECRET:\n');
console.log(generateSecret());
console.log('\n📋 Copy this value to your .env file as AUTH_SECRET\n');
