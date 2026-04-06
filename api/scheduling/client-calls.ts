// api/scheduling/client-calls.ts
// GET /api/scheduling/client-calls?clientId=xxx
// Returns all booked and history calls for a specific client.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { clientId } = req.query as Record<string, string>;
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });

    try {
        // 1. Fetch all bookings for this client (Upcoming or in-progress)
        const { data: bookings, error: bookingsError } = await supabase
            .from('call_bookings')
            .select(`
        id, scheduled_date, scheduled_start_time, scheduled_end_time, status,
        call_requests!inner (
          id, call_type, status, sequence_number,
          am_id, users!am_id (name)
        )
      `)
            .eq('call_requests.client_id', clientId)
            .neq('status', 'CANCELLED')
            .order('scheduled_date', { ascending: false })
            .order('scheduled_start_time', { ascending: false });

        if (bookingsError) throw bookingsError;

        // 2. Fetch call history for this client (Completed, Missed, etc.)
        const { data: history, error: historyError } = await supabase
            .from('call_history')
            .select(`
        id, status, notes, client_sentiment, created_at,
        call_requests!inner (
          id, call_type, sequence_number, am_id, users!am_id (name)
        )
      `)
            .eq('call_requests.client_id', clientId)
            .order('created_at', { ascending: false });

        if (historyError) throw historyError;

        return res.status(200).json({
            success: true,
            data: {
                bookings: bookings || [],
                history: history || []
            }
        });
    } catch (err: any) {
        console.error('[/api/scheduling/client-calls]', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
}
