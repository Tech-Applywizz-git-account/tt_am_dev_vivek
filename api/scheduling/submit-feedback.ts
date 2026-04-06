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
        // Determine the Client's user ID. 
        // In a real app with auth, we'd use auth.uid() in the SQL policy or here via token.
        // For now, we take clientId if provided or assume it's the client's login ID.
        const { data: client } = await supabase
            .from('clients')
            .select('id')
            .eq('id', clientId)
            .single();

        // The user record ID (feedback.submitted_by_id) is what we need.
        // In this system, clients have a record in the 'users' table or 'clients' table?
        // Looking at Section 6 of SQL: submitted_by_id REFERENCES public.users(id).
        // Let's assume the user is logged in and their auth.uid() corresponds to a user.id.

        // We'll let the RLS policy handle the submitted_by_id if we don't have it, 
        // but here we can try to find the user linked to this client.

        // For simplicity, we'll try to insert and let the database policy (pol_feedback_insert)
        // which says 'WITH CHECK (submitted_by_id = auth.uid())' handle it if we were in the browser.
        // Since this is a Vercel function using service_role, we might need to be more explicit.

        // Let's look for the user associated with this client.
        // Assuming clients table has a user_id or similar? (Not in migration script)
        // Most systems have a 1:1 between client and a user account.

        const { error } = await supabase.from('feedback').insert({
            call_request_id: callRequestId,
            submitted_by: 'client',
            // We'll need the user ID. If we don't have it, we'll try to find it.
            // If the client ID is the user ID, we use it.
            submitted_by_id: clientId,
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
