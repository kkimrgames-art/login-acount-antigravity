import { supabaseAdmin } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get accounts that need syncing
    const { data: accounts, error } = await supabaseAdmin
      .from('antigravity_accounts')
      .select('id, email, created_at, synced_to_local')
      .eq('synced_to_local', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sync status:', error);
      return res.status(500).json({ error: 'Failed to fetch sync status' });
    }

    res.status(200).json({
      success: true,
      pendingSync: accounts?.length || 0,
      accounts: accounts || [],
    });
  } catch (error) {
    console.error('Error in sync-status:', error);
    res.status(500).json({ error: error.message });
  }
}
