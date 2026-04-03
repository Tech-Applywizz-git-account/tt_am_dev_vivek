// api/scheduling/am-calls.ts
// GET /api/scheduling/am-calls?amId=xxx&date=yyyy-MM-dd
// GET /api/scheduling/am-calls?amId=xxx&from=yyyy-MM-dd&to=yyyy-MM-dd
// Returns booked calls for an AM on a specific date or date range.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, toDateStr, getISTDate } from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { amId, date, from, to } = req.query as Record<string, string>;
  if (!amId) return res.status(400).json({ error: 'amId is required' });

  try {
    let query = supabase
      .from('call_bookings')
      .select(`
        id, scheduled_date, scheduled_start_time, scheduled_end_time, status,
        call_requests!inner (
          id, call_type, status, sequence_number,
          delay_days, miss_count, deadline_date, base_priority,
          clients!inner (id, full_name, subscription_type)
        )
      `)
      .eq('call_requests.am_id', amId)
      .neq('status', 'CANCELLED')
      .order('scheduled_date', { ascending: true })
      .order('scheduled_start_time', { ascending: true });

    if (from && to) {
      query = query.gte('scheduled_date', from).lte('scheduled_date', to);
    } else {
      const targetDate = date || toDateStr(getISTDate());
      query = query.eq('scheduled_date', targetDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.status(200).json({ success: true, data: data || [] });
  } catch (err: any) {
    console.error('[/api/scheduling/am-calls]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
