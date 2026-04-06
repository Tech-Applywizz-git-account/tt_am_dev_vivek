// api/scheduling/complete-call.ts
// POST /api/scheduling/complete-call
// AM marks a call as COMPLETED after finishing it.
// Body: { callRequestId, bookingId, notes?, clientSentiment?, rating?, comment? }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { callRequestId, bookingId, notes, clientSentiment, rating, comment } = req.body || {};
  if (!callRequestId || !bookingId) {
    return res.status(400).json({ error: 'callRequestId and bookingId are required' });
  }

  try {
    // Determine the AM's ID (for feedback submission) - we can get it from the call request
    const { data: callReq } = await supabase
      .from('call_requests')
      .select('am_id')
      .eq('id', callRequestId)
      .single();

    const amId = callReq?.am_id;

    // 1. Update call_requests
    const { error: r } = await supabase
      .from('call_requests').update({ status: 'COMPLETED' }).eq('id', callRequestId);
    if (r) throw r;

    // 2. Update call_bookings
    const { error: b } = await supabase
      .from('call_bookings').update({ status: 'COMPLETED' }).eq('id', bookingId);
    if (b) throw b;

    // 3. Insert into call_history
    const { error: h } = await supabase.from('call_history').insert({
      call_request_id: callRequestId,
      booking_id: bookingId,
      status: 'COMPLETED',
      notes: notes || null,
      client_sentiment: clientSentiment || null,
    });
    if (h) throw h;

    // 4. Insert formal feedback from AM (if rating or comment provided)
    if ((rating || comment) && amId) {
      const { error: f } = await supabase.from('feedback').insert({
        call_request_id: callRequestId,
        submitted_by: 'am',
        submitted_by_id: amId,
        rating: rating || null,
        comment: comment || null,
      });
      if (f) console.error('[complete-call] Feedback save error:', f.message);
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[/api/scheduling/complete-call]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
