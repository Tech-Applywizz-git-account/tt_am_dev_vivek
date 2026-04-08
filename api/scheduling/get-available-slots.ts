// api/scheduling/get-available-slots.ts
// GET /api/scheduling/get-available-slots?amId=xxx&date=yyyy-MM-dd
// Returns available time slots for an AM on a specific date.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { amId, date } = req.query as Record<string, string>;
    if (!amId || !date) {
        return res.status(400).json({ error: 'amId and date are required' });
    }

    try {
        const { data, error } = await supabase
            .from('time_slots')
            .select('id, start_time, end_time')
            .eq('am_id', amId)
            .eq('slot_date', date)
            .eq('status', 'AVAILABLE')
            .order('start_time', { ascending: true });

        if (error) throw error;

        return res.status(200).json({ success: true, data: data || [] });
    } catch (err: any) {
        console.error('[/api/scheduling/get-available-slots]', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
}
