// api/scheduling/manual-book.ts
// POST /api/scheduling/manual-book
// Manually books a call request into a specific time slot.
// Body: { callRequestId, slotId }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { callRequestId, slotId } = req.body || {};
    if (!callRequestId || !slotId) {
        return res.status(400).json({ error: 'callRequestId and slotId are required' });
    }

    try {
        // 1. Fetch slot details and check availability
        const { data: slot, error: slotErr } = await supabase
            .from('time_slots')
            .select('*')
            .eq('id', slotId)
            .single();

        if (slotErr || !slot) throw new Error('Slot not found');
        if (slot.status !== 'AVAILABLE') throw new Error('Slot is no longer available');

        // 2. Create the booking
        const { error: bookingErr } = await supabase.from('call_bookings').insert({
            call_request_id: callRequestId,
            slot_id: slotId,
            scheduled_date: slot.slot_date,
            scheduled_start_time: slot.start_time,
            scheduled_end_time: slot.end_time,
            status: 'BOOKED',
        });
        if (bookingErr) throw bookingErr;

        // 3. Update slot status
        await supabase.from('time_slots').update({ status: 'BOOKED' }).eq('id', slotId);

        // 4. Update request status
        await supabase.from('call_requests').update({
            status: 'SCHEDULED',
            last_scheduled_at: new Date().toISOString()
        }).eq('id', callRequestId);

        return res.status(200).json({ success: true });
    } catch (err: any) {
        console.error('[/api/scheduling/manual-book]', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
}
