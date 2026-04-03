#!/usr/bin/env node

/**
 * Script to sync accounts from Supabase to local 9router database
 * Usage: node scripts/sync-accounts.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Path to local 9router db.json (using an absolute path if run from project root, or relative)
const LOCAL_DB_PATH = path.resolve(process.cwd(), '../data/db.json');

async function syncAccounts() {
  console.log('🔄 Starting account sync from Supabase...\n');

  try {
    // Fetch unsynced accounts from Supabase
    const { data: accounts, error } = await supabase
      .from('antigravity_accounts')
      .select('*')
      .eq('synced_to_local', false)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }

    if (!accounts || accounts.length === 0) {
      console.log('✅ No new accounts to sync');
      return;
    }

    console.log(`📥 Found ${accounts.length} new account(s) to sync\n`);

    // Read local database
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      console.error(`❌ Local database not found at: ${LOCAL_DB_PATH}`);
      console.log('💡 Tip: Run this script from the antigravity-auth-manager directory, assuming it is next to the data directory.');
      process.exit(1);
    }

    const dbContent = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
    const db = JSON.parse(dbContent);

    if (!db.providerConnections) {
      db.providerConnections = [];
    }

    let addedCount = 0;
    let skippedCount = 0;

    // Process each account
    for (const account of accounts) {
      // Check if account already exists
      const exists = db.providerConnections.some(
        conn => conn.provider === 'antigravity' && 
                conn.email === account.email
      );

      if (exists) {
        console.log(`⏭️  Skipped: ${account.email} (already exists)`);
        skippedCount++;
        
        // Mark as synced even if it exists locally to prevent re-syncing
        await supabase
          .from('antigravity_accounts')
          .update({
            synced_to_local: true,
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', account.id);
          
        continue;
      }

      // Generate UUID for the connection
      const connectionId = uuidv4();

      // Calculate priority (highest priority + 1)
      const antigravityConnections = db.providerConnections.filter(
        c => c.provider === 'antigravity'
      );
      const maxPriority = antigravityConnections.length > 0
        ? Math.max(...antigravityConnections.map(c => c.priority || 0))
        : 0;

      // Ensure proper scope formatting for 9router
      const defaultScope = "https://www.googleapis.com/auth/cclog https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/experimentsandconfigs https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid";
      
      // Create connection object matching exactly the 9router format
      const connection = {
        id: connectionId,
        provider: 'antigravity',
        authType: 'oauth',
        name: account.email,
        priority: maxPriority + 1,
        isActive: true,
        createdAt: account.created_at,
        updatedAt: account.updated_at || new Date().toISOString(),
        email: account.email,
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        expiresAt: account.expires_at,
        scope: account.scope || defaultScope,
        projectId: account.project_id || '',
        testStatus: 'unavailable', // Start as unavailable, 9router will test it
        expiresIn: account.expires_in || 3599,
        errorCode: null,
        lastError: null,
        lastErrorAt: null,
        backoffLevel: 0
      };

      // Add to database
      db.providerConnections.push(connection);
      addedCount++;

      console.log(`✅ Added: ${account.email} (Priority: ${connection.priority})`);

      // Mark as synced in Supabase
      await supabase
        .from('antigravity_accounts')
        .update({
          synced_to_local: true,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', account.id);
    }

    // Save updated database
    if (addedCount > 0) {
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    }

    console.log('\n📊 Sync Summary:');
    console.log(`   ✅ Added: ${addedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   📝 Total Antigravity accounts in local DB: ${db.providerConnections.filter(c => c.provider === 'antigravity').length}`);
    console.log('\n✨ Sync completed successfully!');

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// Run sync
syncAccounts();
