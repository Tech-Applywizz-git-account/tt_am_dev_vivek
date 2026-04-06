// api/scheduling/apply-leave.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, getISTDate } from './_shared.js';
import { addDays, parseISO, isBefore, startOfDay } from 'date-fns';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { amId, leaveDate, reason } = req.body || {};

    if (!amId || !leaveDate) {
        return res.status(400).json({ error: 'amId and leaveDate are required' });
    }

    try {
        // 1. Validation: Must be at least 3 days in advance (T+3)
        const istNow = getISTDate();
        const minAllowedDate = startOfDay(addDays(istNow, 3));
        const targetDate = startOfDay(parseISO(leaveDate));

        if (isBefore(targetDate, minAllowedDate)) {
            return res.status(400).json({
                success: false,
                error: 'To ensure a smooth transition of your client calls, please apply for leaves at least 3 days in advance.'
            });
        }

        // 2. Insert into am_leaves
        const { error: insertErr } = await supabase
            .from('am_leaves')
            .insert({
                am_id: amId,
                leave_date: leaveDate,
                reason: reason || null
            });

        if (insertErr) {
            if (insertErr.code === '23505') { // Unique constraint violation
                return res.status(400).json({ success: false, error: 'You have already applied for leave on this date.' });
            }
            throw insertErr;
        }

        // 3. Block existing slots if any were already generated for this date
        await supabase
            .from('time_slots')
            .update({ status: 'BLOCKED' })
            .eq('am_id', amId)
            .eq('slot_date', leaveDate);

        // Note: If there were BOOKED calls on this day, the scheduler cron handles the requeuing 
        // when it realizes the manager is not available (due to am_leaves check in nextWorkingDay).
        // The cron-sla-monitor or cron-missed-call-handler should ideally trigger this.

        return res.status(200).json({ success: true });
    } catch (err: any) {
        console.error('[/api/scheduling/apply-leave]', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
}
