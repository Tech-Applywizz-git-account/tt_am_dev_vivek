// api/scheduling/submit-feedback.ts
// POST /api/scheduling/submit-feedback
// Client submits feedback for a completed call.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { callRequestId, rating, comment, clientId } = req.body || {};
    if (!callRequestId || !rating) {
        return res.status(400).json({ error: 'callRequestId and rating are required' });
    }

    try {
        // 1. Get the client's email from the clients table
        const { data: client, error: clientErr } = await supabase
            .from('clients')
            .select('company_email')
            .eq('id', clientId)
            .single();

        if (clientErr || !client) {
            throw new Error('Client record not found in system.');
        }

        // 2. Find the corresponding user in the users table by email
        const { data: user, error: userErr } = await supabase
            .from('users')
            .select('id')
            .eq('email', client.company_email)
            .single();

        if (userErr || !user) {
            throw new Error('User account not found for this client email.');
        }

        // 3. Insert feedback using the resolved User (not Client) ID
        const { error } = await supabase.from('feedback').insert({
            call_request_id: callRequestId,
            submitted_by: 'client',
            submitted_by_id: user.id,
            rating,
            comment: comment || null,
        });

        if (error) throw error;

        return res.status(200).json({ success: true });
    } catch (err: any) {
        console.error('[/api/scheduling/submit-feedback]', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
}
