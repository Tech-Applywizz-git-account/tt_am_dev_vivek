// api/scheduling/get-available-slots.ts
// GET /api/scheduling/get-available-slots?amId=xxx&date=yyyy-MM-dd
// Returns available time slots for an AM on a specific date.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, getISTDate, addDays, parseISO, toDateStr } from './_shared.js';

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
        const { data: rawSlots, error } = await supabase
            .from('time_slots')
            .select('id, start_time, end_time, slot_date')
            .eq('am_id', amId)
            .eq('slot_date', date)
            .eq('status', 'AVAILABLE');

        if (error) throw error;

        const nowIST = getISTDate();
        const sorted = (rawSlots || []).map(s => {
            const hour = parseInt(s.start_time.split(':')[0]);
            const [sh, sm] = s.start_time.split(':').map(Number);
            let realDateStr = s.slot_date;
            if (hour < 5) {
                realDateStr = toDateStr(addDays(parseISO(s.slot_date), 1));
            }
            const d = parseISO(realDateStr);
            d.setHours(sh, sm, 0, 0);
            return { ...s, slotDateTime: d };
        })
            .filter(s => s.slotDateTime > nowIST)
            .sort((a, b) => a.slotDateTime.getTime() - b.slotDateTime.getTime());

        const finalData = sorted.map(({ slotDateTime, slot_date, ...rest }) => rest);

        return res.status(200).json({ success: true, data: finalData });
    } catch (err: any) {
        console.error('[/api/scheduling/get-available-slots]', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
}
