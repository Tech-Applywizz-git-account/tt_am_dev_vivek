// api/scheduling/cron-sla-monitor.ts
// Vercel Cron: runs every hour
// Reports SLA breaches (calls past their deadline_date).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, validateCronSecret } from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!validateCronSecret(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: breaches, error } = await supabase
      .from('v_sla_breaches')
      .select('*');

    if (error) throw error;

    const critical  = (breaches || []).filter((b: any) => b.days_overdue >= 1);
    const dueToday  = (breaches || []).filter((b: any) => b.days_overdue === 0);

    if (critical.length > 0) {
      console.warn(`[SLAMonitor] 🔴 ${critical.length} overdue calls`);
    }
    if (dueToday.length > 0) {
      console.warn(`[SLAMonitor] ⚠️  ${dueToday.length} calls due today`);
    }

    console.log(`[SLAMonitor] ✅ Breaches:${(breaches || []).length}, Critical:${critical.length}, DueToday:${dueToday.length}`);
    return res.status(200).json({
      success: true,
      total: (breaches || []).length,
      critical: critical.length,
      dueToday: dueToday.length,
      breaches: breaches || [],
    });
  } catch (err: any) {
    console.error('[SLAMonitor] ❌', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
