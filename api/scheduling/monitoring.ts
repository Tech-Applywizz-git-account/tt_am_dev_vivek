// api/scheduling/monitoring.ts
// GET /api/scheduling/monitoring
// Returns admin monitoring data: AM summary, SLA breaches, priority queue.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [summaryRes, breachRes, queueRes] = await Promise.all([
      supabase.from('v_am_daily_summary').select('*'),
      supabase.from('v_sla_breaches').select('*').limit(20),
      supabase.from('v_priority_queue').select('*').limit(10),
    ]);

    if (summaryRes.error) throw summaryRes.error;
    if (breachRes.error)  throw breachRes.error;
    if (queueRes.error)   throw queueRes.error;

    return res.status(200).json({
      success: true,
      amSummary:     summaryRes.data || [],
      slaBreaches:   breachRes.data  || [],
      priorityQueue: queueRes.data   || [],
    });
  } catch (err: any) {
    console.error('[/api/scheduling/monitoring]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
