import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS for cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only accept GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check if required environment variables are set
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(500).json({ error: 'Server configuration error', details: 'Missing Supabase environment variables' });
    }

    try {

        // Extract the applywizz_id from the query parameters
        const applywizz_id = Array.isArray(req.query.applywizz_id)
            ? req.query.applywizz_id[0]
            : req.query.applywizz_id;

        if (!applywizz_id) {
            return res.status(400).json({ error: 'applywizz_id is required in the payload' });
        }

        // Query clients table
        const { data: clientData, error: clientError } = await supabaseAdmin
            .from('clients')
            .select('*')
            .eq('applywizz_id', applywizz_id)
            .single();

        if (clientError) {
            // If client not found, return 404
            if (clientError.code === 'PGRST116') { // Code for no rows returned
                return res.status(404).json({ error: 'Client not found' });
            }
            console.error('Error fetching client:', clientError);
            return res.status(500).json({ error: 'Failed to fetch client data', details: clientError.message });
        }

        // Query clients_additional_information table
        // We try to fetch it, but if it doesn't exist, we just return null for it
        const { data: additionalData, error: additionalError } = await supabaseAdmin
            .from('clients_additional_information')
            .select('*')
            .eq('applywizz_id', applywizz_id)
            .maybeSingle();

        if (additionalError) {
            console.error('Error fetching additional info:', additionalError);
            // We don't fail the whole request if additional info fetch fails, but maybe we should?
            // For now, let's return what we have, or error out. 
            // Given the user wants "this tables data", I'll assume they want both if possible.
            return res.status(500).json({ error: 'Failed to fetch additional client information', details: additionalError.message });
        }

        // Return combined response
        return res.status(200).json({
            client: clientData,
            additional_information: additionalData || null
        });

    } catch (err) {
        console.error('Unexpected error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
