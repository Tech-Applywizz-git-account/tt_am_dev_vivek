// api/scheduling/cron-slot-generator.ts
// Vercel Cron: runs daily at 6 PM IST (12:30 UTC)
// Generates 15 time_slots for the next working day for all active AMs.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  supabase, fetchActiveAMs, fetchHolidaySet, fetchAmLeaveSet,
  generateSlotsForAM, getISTDate, toDateStr, isWorkingDay,
  validateCronSecret,
} from './_shared.js';
import { addDays } from 'date-fns';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Validate cron secret (Vercel injects Authorization: Bearer <CRON_SECRET>)
  if (!validateCronSecret(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ist = getISTDate();
    const tomorrow = addDays(ist, 1);
    const tomorrowStr = toDateStr(tomorrow);
    const holidays = await fetchHolidaySet();
    const ams = await fetchActiveAMs();

    let totalSlots = 0;
    let skippedAMs = 0;
    const results: Record<string, any>[] = [];

    for (const am of ams) {
      const leaves = await fetchAmLeaveSet(am.id);
      if (!isWorkingDay(tomorrowStr, holidays, leaves)) {
        skippedAMs++;
        results.push({ am: am.name, status: 'skipped', reason: 'leave/holiday/sunday' });
        continue;
      }
      const count = await generateSlotsForAM(am.id, tomorrowStr);
      totalSlots += count;
      results.push({ am: am.name, status: 'generated', slots: count });
    }

    console.log(`[SlotGenerator] ✅ ${totalSlots} slots, ${skippedAMs} AMs skipped for ${tomorrowStr}`);
    return res.status(200).json({ success: true, date: tomorrowStr, totalSlots, skippedAMs, results });
  } catch (err: any) {
    console.error('[SlotGenerator] ❌', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
