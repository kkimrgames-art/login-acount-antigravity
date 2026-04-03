import { supabaseAdmin } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get total accounts
    const { count: totalAccounts } = await supabaseAdmin
      .from('antigravity_accounts')
      .select('*', { count: 'exact', head: true });

    // Get active links (not used and not expired)
    const { count: activeLinks } = await supabaseAdmin
      .from('auth_links')
      .select('*', { count: 'exact', head: true })
      .eq('used', false)
      .gt('expires_at', new Date().toISOString());

    // Get today's accounts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayAccounts } = await supabaseAdmin
      .from('antigravity_accounts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Get last account
    const { data: lastAccountData } = await supabaseAdmin
      .from('antigravity_accounts')
      .select('email, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    const lastAccount = lastAccountData?.[0]
      ? `${lastAccountData[0].email} (${new Date(lastAccountData[0].created_at).toLocaleString('ar')})`
      : null;

    res.status(200).json({
      success: true,
      totalAccounts: totalAccounts || 0,
      activeLinks: activeLinks || 0,
      todayAccounts: todayAccounts || 0,
      lastAccount,
    });
  } catch (error) {
    console.error('Error in stats:', error);
    res.status(500).json({ error: error.message });
  }
}
