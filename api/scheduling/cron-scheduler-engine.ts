// api/scheduling/cron-scheduler-engine.ts
// Vercel Cron: runs every 5 minutes
// Assigns available slots to UNSCHEDULED calls (with preemption fallback).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runSchedulerCycle, validateCronSecret } from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!validateCronSecret(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await runSchedulerCycle();
    console.log(`[SchedulerEngine] ✅ Scheduled:${result.scheduled} Preempted:${result.preempted} Skipped:${result.skipped}`);
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    console.error('[SchedulerEngine] ❌', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
