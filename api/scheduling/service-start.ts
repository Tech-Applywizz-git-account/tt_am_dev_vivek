// api/scheduling/service-start.ts
// POST /api/scheduling/service-start
// Called directly from the frontend/AM dashboard when applywizz_id is assigned.
// Creates the full lifecycle (Orientation + Progress + Renewal) immediately,
// without waiting for the 5-minute lifecycle-checker cron.
//
// Body: { clientId }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, createLifecycleForClient } from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { applywizzId, serviceStartDate } = req.body || {};
  if (!applywizzId) return res.status(400).json({ error: 'applywizzId is required' });

  try {
    // 1. Lookup client by applywizzId
    const { data: client, error: lookupError } = await supabase
      .from('clients')
      .select('id, account_manager_id, service_start_date, subscription_type, subscription_end_date')
      .eq('applywizz_id', applywizzId)
      .single();

    if (lookupError || !client) {
      return res.status(404).json({ error: 'Client not found with this applywizzId' });
    }

    // 2. If serviceStartDate is provided, calculate end date and UPDATE client
    let finalClient = { ...client };
    if (serviceStartDate) {
      if (!client.subscription_type) {
        return res.status(400).json({ error: 'Client subscription_type is missing in database. Cannot calculate end date.' });
      }

      const days = parseInt(client.subscription_type as string);
      const start = new Date(serviceStartDate);
      const end   = new Date(start.getTime());
      end.setDate(start.getDate() + days);
      
      const endStr = end.toISOString().split('T')[0];

      const { data: updated, error: updateErr } = await supabase
        .from('clients')
        .update({
          service_start_date: serviceStartDate,
          subscription_start_date: serviceStartDate,
          subscription_end_date: endStr
        })
        .eq('id', client.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      finalClient = updated;
      console.log(`[service-start] Updated client ${applywizzId} with dates: ${serviceStartDate} -> ${endStr}`);
    }

    const clientId = finalClient.id;
    // 3. Idempotency check — don't create twice
    const { count } = await supabase
      .from('call_requests')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('call_type', 'ORIENTATION');

    if (count && count > 0) {
      return res.status(200).json({ success: true, message: 'Lifecycle already exists', skipped: true });
    }

    if (!finalClient.service_start_date || !finalClient.subscription_type || !finalClient.subscription_end_date) {
      return res.status(400).json({
        error: 'Client is missing service_start_date (or it wasnt provided), subscription_type, or subscription_end_date',
        hint: 'Ensure applywizz_id is set and subscription fields are populated',
      });
    }

    await createLifecycleForClient(finalClient);
    console.log(`[service-start] ✅ Lifecycle created for client=${clientId}`);
    return res.status(200).json({ success: true, clientId, serviceStartDate: finalClient.service_start_date, subscriptionEndDate: finalClient.subscription_end_date });
  } catch (err: any) {
    console.error('[/api/scheduling/service-start]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
