import { supabaseAdmin } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('antigravity_accounts')
      .select('id, email, created_at, project_id')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      return res.status(500).json({ error: 'Failed to fetch accounts' });
    }

    res.status(200).json({
      success: true,
      accounts: data || [],
    });
  } catch (error) {
    console.error('Error in list-accounts:', error);
    res.status(500).json({ error: error.message });
  }
}
