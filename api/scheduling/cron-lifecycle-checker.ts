// api/scheduling/cron-lifecycle-checker.ts
// Vercel Cron: runs every 5 minutes
// REPLACES the Supabase Realtime listener.
//
// Polls the database for clients that:
//   - Have applywizz_id set (service started)
//   - Have service_start_date, subscription_type, subscription_end_date
//   - Do NOT yet have an ORIENTATION call_request
//
// When found, creates the full lifecycle (Orientation + Progress + Renewal).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { detectAndCreateLifecycles, validateCronSecret } from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!validateCronSecret(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const created = await detectAndCreateLifecycles();
    console.log(`[LifecycleChecker] ✅ Created lifecycles for ${created} client(s)`);
    return res.status(200).json({ success: true, lifecyclesCreated: created });
  } catch (err: any) {
    console.error('[LifecycleChecker] ❌', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
