// api/scheduling/cron-missed-call-handler.ts
// Vercel Cron: runs every 10 minutes
// Detects missed calls (SCHEDULED but booking date < today) and requeues them.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runMissedCallCycle, validateCronSecret } from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!validateCronSecret(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await runMissedCallCycle();
    if (result.alerts > 0) {
      console.warn(`[MissedCallHandler] 🚨 ${result.alerts} supervisor alerts triggered!`);
    }
    console.log(`[MissedCallHandler] ✅ Requeued:${result.handled} Alerts:${result.alerts}`);
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    console.error('[MissedCallHandler] ❌', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
