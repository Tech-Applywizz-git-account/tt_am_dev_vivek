// api/scheduling/service-start.ts
// POST /api/scheduling/service-start
// Called directly from the frontend/AM dashboard when applywizz_id is assigned.
// Creates the full lifecycle (Orientation + Progress + Renewal) immediately,
// without waiting for the 5-minute lifecycle-checker cron.
//
// Body: { clientId }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, createLifecycleForClient } from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { applywizzId } = req.body || {};
  if (!applywizzId) return res.status(400).json({ error: 'applywizzId is required' });

  try {
    // Lookup client by applywizzId
    const { data: client, error: lookupError } = await supabase
      .from('clients')
      .select('id, account_manager_id, service_start_date, subscription_type, subscription_end_date')
      .eq('applywizz_id', applywizzId)
      .single();

    if (lookupError || !client) {
      return res.status(404).json({ error: 'Client not found with this applywizzId' });
    }

    const clientId = client.id;
    // Idempotency check — don't create twice
    const { count } = await supabase
      .from('call_requests')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('call_type', 'ORIENTATION');

    if (count && count > 0) {
      return res.status(200).json({ success: true, message: 'Lifecycle already exists', skipped: true });
    }

    if (!client.service_start_date || !client.subscription_type || !client.subscription_end_date) {
      return res.status(400).json({
        error: 'Client is missing service_start_date, subscription_type, or subscription_end_date',
        hint: 'Ensure applywizz_id is set and subscription fields are populated',
      });
    }

    await createLifecycleForClient(client);
    console.log(`[service-start] ✅ Lifecycle created for client=${clientId}`);
    return res.status(200).json({ success: true, clientId });
  } catch (err: any) {
    console.error('[/api/scheduling/service-start]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
