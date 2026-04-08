// api/scheduling/get-call-history.ts
// GET /api/scheduling/get-call-history?callRequestId=xxx
// Returns history and feedback for a specific call request.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { callRequestId } = req.query as Record<string, string>;
    if (!callRequestId) return res.status(400).json({ error: 'callRequestId is required' });

    try {
        // 1. Fetch call history
        const { data: history, error: historyError } = await supabase
            .from('call_history')
            .select(`
        id, status, notes, client_sentiment, created_at,
        call_bookings (scheduled_date, scheduled_start_time)
      `)
            .eq('call_request_id', callRequestId)
            .order('created_at', { ascending: false });

        if (historyError) throw historyError;

        // 2. Fetch feedback
        const { data: feedback, error: feedbackError } = await supabase
            .from('feedback')
            .select('id, rating, comment, submitted_by, created_at, call_request_id')
            .eq('call_request_id', callRequestId)
            .order('created_at', { ascending: false });

        if (feedbackError) throw feedbackError;

        return res.status(200).json({
            success: true,
            data: {
                history: history || [],
                feedback: feedback || []
            }
        });
    } catch (err: any) {
        console.error('[/api/scheduling/get-call-history]', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
}
