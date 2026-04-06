// api/scheduling/get-leaves.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { amId } = req.query as Record<string, string>;
    if (!amId) return res.status(400).json({ error: 'amId is required' });

    try {
        const { data, error } = await supabase
            .from('am_leaves')
            .select('*')
            .eq('am_id', amId)
            .order('leave_date', { ascending: false });

        if (error) throw error;

        return res.status(200).json({ success: true, data: data || [] });
    } catch (err: any) {
        console.error('[/api/scheduling/get-leaves]', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
}
