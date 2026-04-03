// api/scheduling/discovery-start.ts
// POST /api/scheduling/discovery-start
// Triggered when a new sale is made or a client is added.
// Creates a DISCOVERY call within a 2-day deadline.
//
// Body: { clientId, amId }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, createDiscoveryCall, allocateBestAM } from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Custom-Header');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let { applywizzId, email, amId } = req.body || {};
  if (!applywizzId) return res.status(400).json({ error: 'applywizzId is required' });

  try {
    // 1. Lookup internal clientId if they already exist
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, account_manager_id')
      .eq('applywizz_id', applywizzId)
      .maybeSingle();

    // 2. Check for existing mapping or allocate new AM
    if (!amId) {
      // Try mapping table first
      const { data: mapping } = await supabase
        .from('temp_clients_am_mapping')
        .select('am_id')
        .eq('applywizz_id', applywizzId)
        .maybeSingle();

      if (mapping) {
        amId = mapping.am_id;
      } else if (existingClient?.account_manager_id) {
        amId = existingClient.account_manager_id;
      } else {
        amId = await allocateBestAM();
        console.log(`[discovery-start] Auto-allocated AM ${amId} for ${applywizzId}`);
      }
    }

    // 3. Store/Update the mapping
    const { error: mapError } = await supabase
      .from('temp_clients_am_mapping')
      .upsert({
        applywizz_id: applywizzId,
        email: email || null,
        am_id: amId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'applywizz_id' });

    if (mapError) console.error('[discovery-start] Mapping save error:', mapError.message);

    // 4. Create Discovery Call ONLY if client exists in main clients table
    // (call_requests requires a valid client_id foreign key)
    if (existingClient) {
      const { count } = await supabase
        .from('call_requests')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', existingClient.id)
        .eq('call_type', 'DISCOVERY');

      if (count && count > 0) {
        return res.status(200).json({ success: true, message: 'Discovery call already exists', amId, skipped: true });
      }

      const discoveryId = await createDiscoveryCall(existingClient.id, amId);
      return res.status(200).json({ success: true, discoveryId, amId });
    }

    // If client doesn't exist yet, we just return the assigned AM.
    // They will be scheduled when the direct-onboard or sync-client runs.
    return res.status(200).json({
      success: true,
      message: 'Client not found in main table. AM assigned and mapping stored for future onboarding.',
      amId
    });

  } catch (err: any) {
    console.error('[/api/scheduling/discovery-start]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
