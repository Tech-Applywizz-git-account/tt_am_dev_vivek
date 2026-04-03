// api/scheduling/not-picked.ts
// POST /api/scheduling/not-picked
// Client didn't answer. Requeues the call with delay_days++ and miss_count++.
// Body: { callRequestId, bookingId, notes? }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, nextWorkingDay, toDateStr } from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { callRequestId, bookingId, notes } = req.body || {};
  if (!callRequestId || !bookingId) {
    return res.status(400).json({ error: 'callRequestId and bookingId are required' });
  }

  try {
    const { data: call, error: fetchErr } = await supabase
      .from('call_requests')
      .select('miss_count, delay_days, am_id')
      .eq('id', callRequestId).single();
    if (fetchErr) throw fetchErr;

    const { data: booking } = await supabase
      .from('call_bookings').select('slot_id').eq('id', bookingId).single();

    const nextDay = await nextWorkingDay(new Date(), call.am_id);
    const newMiss  = (call.miss_count || 0) + 1;
    const newDelay = (call.delay_days  || 0) + 1;

    const [r, b, s, h] = await Promise.all([
      supabase.from('call_requests').update({
        status: 'UNSCHEDULED', miss_count: newMiss,
        delay_days: newDelay, earliest_date: toDateStr(nextDay), last_scheduled_at: null,
      }).eq('id', callRequestId),
      supabase.from('call_bookings').update({ status: 'CANCELLED' }).eq('id', bookingId),
      booking?.slot_id
        ? supabase.from('time_slots').update({ status: 'AVAILABLE' }).eq('id', booking.slot_id)
        : Promise.resolve({ error: null }),
      supabase.from('call_history').insert({
        call_request_id: callRequestId, booking_id: bookingId,
        status: 'NOT_PICKED', notes: notes || 'Client did not answer',
      }),
    ]);

    if (r.error) throw r.error;
    if (b.error) throw b.error;

    return res.status(200).json({ success: true, requeueDate: toDateStr(nextDay) });
  } catch (err: any) {
    console.error('[/api/scheduling/not-picked]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
