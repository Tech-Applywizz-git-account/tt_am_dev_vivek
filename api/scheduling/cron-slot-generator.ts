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
    const { date } = req.query as Record<string, string>;
    const ist = getISTDate();

    // Use provided date OR default to day after tomorrow (2-day lookahead)
    const targetDate = date ? date : toDateStr(addDays(ist, 2));
    const targetDateObj = date ? new Date(date) : addDays(ist, 2);

    const targetDateStr = targetDate;
    const prevDateStr = toDateStr(addDays(new Date(targetDateStr), -1));

    const holidays = await fetchHolidaySet();
    const ams = await fetchActiveAMs();

    let totalSlots = 0;
    let skippedAMs = 0;
    const results: any[] = [];

    for (const am of ams) {
      const leaves = await fetchAmLeaveSet(am.id);

      // Evening slots on T active if T is working day
      const eveningActive = isWorkingDay(targetDateStr, holidays, leaves);

      // Morning slots on T active if T-1 was a working day
      const morningActive = isWorkingDay(prevDateStr, holidays, leaves);

      if (!eveningActive && !morningActive) {
        skippedAMs++;
        results.push({ am: am.name, status: 'skipped', reason: 'holiday/weekend/leave for both shift segments' });
        continue;
      }

      const count = await generateSlotsForAM(am.id, targetDateStr, morningActive, eveningActive);
      totalSlots += count;
      results.push({
        am: am.name,
        status: 'generated',
        slots: count,
        segments: { morning: morningActive, evening: eveningActive }
      });
    }

    console.log(`[SlotGenerator] ✅ ${totalSlots} slots for ${targetDateStr}`);
    return res.status(200).json({ success: true, date: targetDateStr, totalSlots, skippedAMs, results });
  } catch (err: any) {
    console.error('[SlotGenerator] ❌', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
