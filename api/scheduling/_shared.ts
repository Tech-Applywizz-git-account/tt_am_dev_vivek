// api/scheduling/_shared.ts
// Shared Supabase client + business logic for all scheduling Vercel functions.
// This replaces scheduling/supabaseClient.js + scheduling/utils.js for Vercel context.

import { createClient } from '@supabase/supabase-js';
import { addDays, format, getDay, parseISO } from 'date-fns';

export { addDays, format, getDay, parseISO };

// ─── Supabase Client (Service Role — bypasses RLS) ────────────
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY =
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Constants ────────────────────────────────────────────────

export const BASE_PRIORITY = {
  RENEWAL: 100,
  DISCOVERY: 80,
  PROGRESS: 50,
  ORIENTATION: 20,
} as const;

export const PROGRESS_DAYS: Record<string, number[]> = {
  '30': [15],
  '60': [15, 30, 45],
  '90': [15, 30, 45, 60, 75],
};

export const CALL_TEMPLATES: Record<string, { subject: string; context: string }> = {
  DISCOVERY: {
    subject: "Discovery Call Scheduled – Let’s Get Started",
    context: `Hi {{Client Name}},

Thank you for choosing to work with us. We’re delighted to begin this journey with you.

Your Discovery Call has been scheduled to better understand your goals, expectations, and requirements so we can tailor our approach to your needs.

Call Details:

Date: {{Date}}
Time: {{Time}}
Account Manager: {{AM Name}}

Please join the meeting using the link below:

Agenda for the Call:
- Understand your goals and expectations
- Discuss your background and specific requirements
- Align on the overall approach and next steps

Preparation for the Call:
- Join from a quiet, distraction-free environment
- Ensure a stable internet connection
- Keep any relevant information or questions ready
- Kindly inform us in advance if you are unable to attend

We look forward to speaking with you.

Warm regards,
Team`
  },
  ORIENTATION: {
    subject: "Orientation Call Scheduled – Getting You Set Up",
    context: `Hi {{Client Name}},

Welcome aboard! We’re excited to have you with us and look forward to supporting you throughout your journey.

Your Orientation Call has been scheduled to guide you through our processes, tools, and collaboration model.

Call Details:

Date: {{Date}}
Time: {{Time}}
Account Manager: {{AM Name}}

Please join the meeting using the link below:

Agenda for the Call:
- Overview of our services and workflow
- Introduction to key tools and platforms
- Communication channels and request processes
- Best practices to help you succeed

Preparation for the Call:
- Be in a calm and quiet environment
- Ensure a stable internet connection
- Keep a notebook or notes application handy

We look forward to helping you get started smoothly.

Warm regards,
Team`
  },
  PROGRESS: {
    subject: "Progress Review Call Scheduled – Reviewing Your Progress",
    context: `Hi {{Client Name}},

We hope you are doing well.

It’s time for your Progress Review Call, where we will assess your progress, share feedback, and discuss the way forward.

Call Details:

Date: {{Date}}
Time: {{Time}}
Account Manager: {{AM Name}}

Please join the meeting using the link below:

Agenda for the Call:
- Review your progress to date
- Share feedback and performance insights
- Identify areas of improvement
- Define the next action plan

Preparation for the Call:
- Join from a quiet and focused environment
- Ensure reliable internet connectivity
- Be prepared to discuss your experience and any challenges

We look forward to your continued progress.

Warm regards,
Team`
  },
  RENEWAL: {
    subject: "Subscription Renewal Discussion – Next Steps",
    context: `Hi {{Client Name}},

We hope you’ve had a valuable experience with us so far.

As your current subscription approaches its end, we would like to connect with you to review your journey and discuss the next steps.

Call Details:

Date: {{Date}}
Time: {{Time}}
Account Manager: {{AM Name}}

Please join the meeting using the link below:

Agenda for the Call:
- Review your overall progress and outcomes
- Discuss renewal and continuation options
- Address any questions or concerns
- Plan the next phase of your journey

Preparation for the Call:
- Be available in a quiet environment
- Ensure stable internet connectivity
- Keep any questions or concerns ready for discussion

We look forward to continuing our association with you.

Warm regards,
Team`
  }
};

// IST time slots: 
// Evening Shift Starts (e.g. Monday Night)
export const EVENING_SLOTS = [
  '20:45', '21:15', '21:45', '22:15', '22:45'
];

// Morning Shift Ends (e.g. Tuesday Morning)
export const MORNING_SLOTS = [
  '00:00', '00:30', '01:00', '01:30', '02:00',
  '02:30', '03:00', '03:30', '04:00', '04:30'
];

// ─── Date Helpers ─────────────────────────────────────────────

/** Current date in IST (UTC+5:30). */
export function getISTDate(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 330 * 60000);
}

/** Format Date → 'yyyy-MM-dd'. */
export function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** True if date string is a Saturday or Sunday (no new shift starts). */
export function isWeekend(dateStr: string): boolean {
  const day = getDay(parseISO(dateStr));
  return day === 0 || day === 6; // 0=Sunday, 6=Saturday
}

/** Compute end_time given start_time (adds 30 min, wraps at midnight). */
export function addThirtyMin(startTime: string): string {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + 30;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Get all holiday dates as a Set<string>. */
export async function fetchHolidaySet(): Promise<Set<string>> {
  const { data } = await supabase.from('holidays').select('holiday_date');
  return new Set((data || []).map((h: any) => h.holiday_date));
}

/** Get AM leave dates for a specific AM as a Set<string>. */
export async function fetchAmLeaveSet(amId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('am_leaves')
    .select('leave_date')
    .eq('am_id', amId);
  return new Set((data || []).map((l: any) => l.leave_date));
}

/** True if a date is a working day (Shift can START on this day). 
 * Shifts start on Mon, Tue, Wed, Thu, Fri.
 */
export function isWorkingDay(
  dateStr: string,
  holidays: Set<string>,
  leaves: Set<string> = new Set()
): boolean {
  return !isWeekend(dateStr) && !holidays.has(dateStr) && !leaves.has(dateStr);
}

/** Get the next working day after a given date, checking AM leaves. */
export async function nextWorkingDay(from: Date, amId?: string): Promise<Date> {
  const holidays = await fetchHolidaySet();
  const leaves = amId ? await fetchAmLeaveSet(amId) : new Set<string>();
  let d = addDays(from, 1);
  for (let i = 0; i < 30; i++) {
    if (isWorkingDay(toDateStr(d), holidays, leaves)) return d;
    d = addDays(d, 1);
  }
  throw new Error('No working day found within 30 days.');
}

/** Get all active AMs. */
export async function fetchActiveAMs(): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from('users')
    .select('id, name')
    .eq('role', 'account_manager')
    .eq('is_active', true);
  return data || [];
}

/** Priority score formula. */
export function priorityScore(basePriority: number, delayDays: number): number {
  return basePriority + delayDays * 10;
}

// ─── Core Scheduling Logic ────────────────────────────────────

/** Slot Generator: generate slots for a given AM + date. 
 * morningActive: generate 00:00-04:30 (end of previous day's shift).
 * eveningActive: generate 20:45-22:45 (start of today's shift).
 */
export async function generateSlotsForAM(
  amId: string,
  dateStr: string,
  morningActive: boolean,
  eveningActive: boolean
): Promise<number> {
  const slots: any[] = [];

  if (morningActive) {
    MORNING_SLOTS.forEach(startTime => {
      slots.push({
        am_id: amId, slot_date: dateStr, start_time: startTime,
        end_time: addThirtyMin(startTime), status: 'AVAILABLE',
      });
    });
  }

  if (eveningActive) {
    EVENING_SLOTS.forEach(startTime => {
      slots.push({
        am_id: amId, slot_date: dateStr, start_time: startTime,
        end_time: addThirtyMin(startTime), status: 'AVAILABLE',
      });
    });
  }

  if (slots.length === 0) return 0;

  const { count, error } = await supabase
    .from('time_slots')
    .upsert(slots, { onConflict: 'am_id,slot_date,start_time', ignoreDuplicates: true, count: 'exact' });
  if (error) throw error;
  return count ?? slots.length;
}

/** Sync booking with Teams Meeting API. */
export async function triggerTeamsMeetingSync(bookingId: string) {
  const TEAMS_DOMAIN = process.env.TEAMS_DOMAIN;
  if (!TEAMS_DOMAIN) {
    console.error('[TeamsSync] Missing TEAMS_DOMAIN environment variable.');
    return;
  }

  try {
    // 1. Fetch all details for the booking
    const { data: b, error } = await supabase
      .from('call_bookings')
      .select(`
        scheduled_date, scheduled_start_time, scheduled_end_time,
        call_requests (
          call_type,
          clients (full_name, company_email),
          users (name, email)
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !b) throw new Error(error?.message || 'Booking not found');

    const req = b.call_requests as any;
    const client = req.clients;
    const am = req.users;
    const callType = req.call_type;

    const template = CALL_TEMPLATES[callType];
    if (!template) {
      console.warn(`[TeamsSync] No template found for call type: ${callType}`);
      return;
    }

    // 2. Prepare data for placeholders
    // Detect if this is an early morning slot (00:00 - 05:00) which belongs to the next calendar day
    const hour = parseInt(b.scheduled_start_time.split(':')[0]);
    let calendarDate = b.scheduled_date;
    if (hour >= 0 && hour < 5) {
      calendarDate = toDateStr(addDays(parseISO(b.scheduled_date), 1));
    }

    const dateFormatted = format(parseISO(calendarDate), 'dd MMM yyyy');
    const timeRange = `${b.scheduled_start_time.substring(0, 5)} - ${b.scheduled_end_time.substring(0, 5)} IST`;

    // 3. Fill template
    let subject = template.subject;
    let context = template.context
      .replace(/{{Client Name}}/g, client.full_name)
      .replace(/{{Date}}/g, dateFormatted)
      .replace(/{{Time}}/g, timeRange)
      .replace(/{{AM Name}}/g, am.name);

    // 4. Construct URL
    // Format: 2024-04-12T10:00:00
    const startIso = `${calendarDate}T${b.scheduled_start_time}`;
    const endIso = `${calendarDate}T${b.scheduled_end_time}`;

    const url = new URL(`${TEAMS_DOMAIN}/api/teams-meeting`);
    url.searchParams.append('from', am.email);
    url.searchParams.append('to', client.company_email);
    url.searchParams.append('start', startIso);
    url.searchParams.append('end', endIso);
    url.searchParams.append('subject', subject);
    url.searchParams.append('context', context);

    console.log(`[TeamsSync] Triggering sync for booking=${bookingId} type=${callType}`);

    // 5. Call API
    const res = await fetch(url.toString(), { method: 'GET' });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[TeamsSync] API Error (Status ${res.status}): ${errText}`);
    } else {
      console.log(`[TeamsSync] Success for booking=${bookingId}`);
    }

  } catch (err: any) {
    console.error(`[TeamsSync] Internal Error: ${err.message}`);
  }
}

/** Scheduler Engine: one full assignment cycle. Returns { scheduled, preempted, skipped }. */
export async function runSchedulerCycle(): Promise<{ scheduled: number; preempted: number; skipped: number }> {
  const todayStr = toDateStr(getISTDate());
  let scheduled = 0, preempted = 0, skipped = 0;
  const MAX_PREEMPTIONS = 20;
  let preemptionOps = 0;

  // 1. Fetch all schedulable calls
  const { data: calls, error } = await supabase
    .from('call_requests')
    .select('id, client_id, am_id, call_type, base_priority, delay_days, deadline_date, preemption_count')
    .eq('status', 'UNSCHEDULED')
    .lte('earliest_date', todayStr);
  if (error) throw error;
  if (!calls || calls.length === 0) return { scheduled, preempted, skipped };

  const sorted = [...calls].sort((a, b) => {
    const pa = priorityScore(a.base_priority, a.delay_days);
    const pb = priorityScore(b.base_priority, b.delay_days);
    if (pb !== pa) return pb - pa;
    return a.deadline_date.localeCompare(b.deadline_date);
  });

  for (const call of sorted) {
    // Find available slot
    const { data: rawSlots } = await supabase
      .from('time_slots')
      .select('id, slot_date, start_time, end_time')
      .eq('am_id', call.am_id)
      .eq('status', 'AVAILABLE')
      .gte('slot_date', todayStr)
      .order('slot_date')
      .limit(50);

    const nowIST = getISTDate();
    const sortedSlots = (rawSlots || []).map(s => {
      const hour = parseInt(s.start_time.split(':')[0]);
      const [sh, sm] = s.start_time.split(':').map(Number);
      let realDateStr = s.slot_date;
      if (hour < 5) {
        realDateStr = toDateStr(addDays(parseISO(s.slot_date), 1));
      }
      const d = parseISO(realDateStr);
      d.setHours(sh, sm, 0, 0);
      return { ...s, slotDateTime: d };
    })
      .filter(s => s.slotDateTime > nowIST)
      .sort((a, b) => a.slotDateTime.getTime() - b.slotDateTime.getTime());

    const slot = sortedSlots[0] || null;

    if (slot) {
      // Direct booking
      const { data: newBooking } = await supabase.from('call_bookings').insert({
        call_request_id: call.id, slot_id: slot.id,
        scheduled_date: slot.slot_date, scheduled_start_time: slot.start_time,
        scheduled_end_time: slot.end_time, status: 'BOOKED',
      }).select('id').single();

      await supabase.from('time_slots').update({ status: 'BOOKED' }).eq('id', slot.id);
      await supabase.from('call_requests').update({ status: 'SCHEDULED', last_scheduled_at: new Date().toISOString() }).eq('id', call.id);

      if (newBooking) triggerTeamsMeetingSync(newBooking.id).catch(() => { });

      scheduled++;
    } else if (preemptionOps < MAX_PREEMPTIONS) {
      // Try preemption
      const newPri = priorityScore(call.base_priority, call.delay_days);
      const { data: booked } = await supabase
        .from('call_requests')
        .select('id, base_priority, delay_days, preemption_count, call_bookings!inner(id, slot_id, scheduled_date, scheduled_start_time, scheduled_end_time)')
        .eq('am_id', call.am_id)
        .eq('status', 'SCHEDULED');

      const victim = (booked || [])
        .filter((c: any) => priorityScore(c.base_priority, c.delay_days) < newPri && c.preemption_count < 3)
        .sort((a: any, b: any) => priorityScore(a.base_priority, a.delay_days) - priorityScore(b.base_priority, b.delay_days))[0];

      if (victim) {
        const vb = victim.call_bookings[0];
        await supabase.from('call_bookings').update({ status: 'CANCELLED' }).eq('id', vb.id);
        await supabase.from('time_slots').update({ status: 'AVAILABLE' }).eq('id', vb.slot_id);
        await supabase.from('call_requests').update({
          status: 'UNSCHEDULED', preemption_count: victim.preemption_count + 1,
          delay_days: victim.delay_days + 1, last_scheduled_at: null,
        }).eq('id', victim.id);
        const { data: newBooking } = await supabase.from('call_bookings').insert({
          call_request_id: call.id, slot_id: vb.slot_id,
          scheduled_date: vb.scheduled_date, scheduled_start_time: vb.scheduled_start_time,
          scheduled_end_time: vb.scheduled_end_time, status: 'BOOKED',
        }).select('id').single();
        await supabase.from('time_slots').update({ status: 'BOOKED' }).eq('id', vb.slot_id);
        await supabase.from('call_requests').update({ status: 'SCHEDULED', last_scheduled_at: new Date().toISOString() }).eq('id', call.id);

        if (newBooking) triggerTeamsMeetingSync(newBooking.id).catch(() => { });

        scheduled++;
        preempted++;
        preemptionOps++;
      } else {
        skipped++;
      }
    } else {
      skipped++;
    }
  }
  return { scheduled, preempted, skipped };
}

/** Missed Call Handler: requeue past-due SCHEDULED calls. */
export async function runMissedCallCycle(): Promise<{ handled: number; alerts: number }> {
  const istDate = getISTDate();
  const istHour = istDate.getHours();

  // Exit if we are in the shift window or buffer window (00:00 to 05:59 IST)
  if (istHour < 6) {
    console.log('[MissedCallHandler] 😴 System is quiet during active shift/buffer (00:00-06:00 IST).');
    return { handled: 0, alerts: 0 };
  }

  const todayStr = toDateStr(istDate);
  let handled = 0, alerts = 0;

  const { data: missed } = await supabase
    .from('call_requests')
    .select('id, am_id, call_type, delay_days, miss_count, call_bookings!inner(id, slot_id, scheduled_date, status)')
    .eq('status', 'SCHEDULED')
    .lt('call_bookings.scheduled_date', todayStr)
    .eq('call_bookings.status', 'BOOKED');

  for (const call of (missed || [])) {
    const booking = call.call_bookings?.[0];
    if (!booking) continue;
    const newMiss = (call.miss_count || 0) + 1;
    const newDelay = (call.delay_days || 0) + 1;
    const nextDay = await nextWorkingDay(new Date(), call.am_id);

    await supabase.from('call_bookings').update({ status: 'CANCELLED' }).eq('id', booking.id);
    if (booking.slot_id) {
      await supabase.from('time_slots').update({ status: 'AVAILABLE' }).eq('id', booking.slot_id);
    }
    await supabase.from('call_history').insert({
      call_request_id: call.id, booking_id: booking.id,
      status: 'MISSED_BY_AM',
      notes: `Auto-detected. miss_count=${newMiss}`,
    }).then(() => { });
    await supabase.from('call_requests').update({
      status: 'UNSCHEDULED', miss_count: newMiss,
      delay_days: newDelay, earliest_date: toDateStr(nextDay), last_scheduled_at: null,
    }).eq('id', call.id);

    handled++;
    if (newMiss >= 3) alerts++;
  }
  return { handled, alerts };
}

/** Lifecycle Checker: find clients with service started but no lifecycle calls yet. */
export async function detectAndCreateLifecycles(): Promise<number> {
  // 1. Get client IDs that already have any lifecycle call
  const { data: existing } = await supabase
    .from('call_requests')
    .select('client_id')
    .in('call_type', ['ORIENTATION', 'PROGRESS', 'RENEWAL']);
  const existingClientIds = new Set((existing || []).map((r: any) => r.client_id));

  // 2. Get clients with service started but no lifecycle yet
  const { data: clients } = await supabase
    .from('clients')
    .select('id, account_manager_id, service_start_date, subscription_type, subscription_end_date, full_name')
    .not('applywizz_id', 'is', null)
    .not('service_start_date', 'is', null)
    .not('subscription_type', 'is', null)
    .not('subscription_end_date', 'is', null)
    .not('account_manager_id', 'is', null);

  const toCreate = (clients || []).filter((c: any) => !existingClientIds.has(c.id));
  if (toCreate.length === 0) return 0;

  let created = 0;
  for (const client of toCreate) {
    try {
      await createLifecycleForClient(client);
      created++;
      console.log(`✅ Lifecycle created for client=${client.id} (${client.full_name})`);
    } catch (err: any) {
      console.error(`❌ Lifecycle creation failed for client=${client.id}:`, err.message);
    }
  }
  return created;
}

/** Create DISCOVERY call for a new sale. */
export async function createDiscoveryCall(clientId: string, amId: string): Promise<string> {
  const ist = getISTDate();
  const hours = ist.getHours(), mins = ist.getMinutes();
  const totalMins = hours * 60 + mins;
  const inWorkingHours = totalMins >= 1245 || totalMins < 300; // 20:45–05:00 IST

  const holidays = await fetchHolidaySet();
  const todayStr = toDateStr(ist);
  let earliest: Date;

  // If it's a working day AND we haven't passed tonight's shift end (approx 11:15 PM IST)
  // then "Today" is the earliest valid date.
  if (isWorkingDay(todayStr, holidays) && totalMins < 1395) { // 1395 mins = 23:15 IST
    earliest = ist;
  } else {
    // Otherwise, move to the next available working day
    earliest = await nextWorkingDay(ist);
  }
  const earliestStr = toDateStr(earliest);
  const deadlineStr = toDateStr(addDays(earliest, 2));

  const { data, error } = await supabase
    .from('call_requests')
    .insert({
      client_id: clientId, am_id: amId, call_type: 'DISCOVERY',
      status: 'UNSCHEDULED', earliest_date: earliestStr,
      ideal_date: earliestStr, deadline_date: deadlineStr,
      base_priority: BASE_PRIORITY.DISCOVERY,
    })
    .select('id').single();

  if (error) throw error;
  return data.id;
}

/** Create Orientation + Progress + Renewal calls for a client. */
export async function createLifecycleForClient(client: {
  id: string;
  account_manager_id: string;
  service_start_date: string;
  subscription_type: string;
  subscription_end_date: string;
}): Promise<void> {
  const { id: clientId, account_manager_id: amId, service_start_date: startStr,
    subscription_type, subscription_end_date: endStr } = client;

  const start = parseISO(startStr);
  const end = parseISO(endStr);

  const istToday = getISTDate();
  const yesterdayStr = toDateStr(addDays(istToday, -1));

  const calls: any[] = [];

  // 1. ORIENTATION
  const orientationIdeal = startStr;
  if (orientationIdeal >= yesterdayStr) {
    calls.push({
      client_id: clientId, am_id: amId, call_type: 'ORIENTATION',
      status: 'UNSCHEDULED', earliest_date: startStr, ideal_date: orientationIdeal,
      deadline_date: toDateStr(addDays(start, 2)), base_priority: BASE_PRIORITY.ORIENTATION,
    });
  }

  // 2. PROGRESS calls
  const days = PROGRESS_DAYS[subscription_type] || [];
  days.forEach((offset, idx) => {
    const progressIdeal = toDateStr(addDays(start, offset));
    if (progressIdeal >= yesterdayStr) {
      calls.push({
        client_id: clientId, am_id: amId, call_type: 'PROGRESS',
        status: 'UNSCHEDULED',
        earliest_date: toDateStr(addDays(start, offset - 1)),
        ideal_date: progressIdeal,
        deadline_date: toDateStr(addDays(start, offset + 3)),
        base_priority: BASE_PRIORITY.PROGRESS,
        sequence_number: idx + 1,
      });
    }
  });

  // 3. RENEWAL
  const renewalIdeal = toDateStr(addDays(end, -3));
  if (renewalIdeal >= yesterdayStr) {
    calls.push({
      client_id: clientId, am_id: amId, call_type: 'RENEWAL',
      status: 'UNSCHEDULED',
      earliest_date: toDateStr(addDays(end, -3)),
      ideal_date: renewalIdeal,
      deadline_date: endStr,
      base_priority: BASE_PRIORITY.RENEWAL,
    });
  }

  if (calls.length === 0) {
    console.log(`[createLifecycleForClient] No future calls to create for client=${clientId}`);
    return;
  }

  const { error } = await supabase.from('call_requests').insert(calls);
  if (error) throw error;
}

/** Validate Vercel cron secret (prevents unauthorized triggers). */
export function validateCronSecret(authHeader: string | undefined): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // No secret configured = open (dev mode)
  return authHeader === `Bearer ${secret}`;
}

/** Allocate the best AM based on load and upcoming renewals. */
export async function allocateBestAM(): Promise<string> {
  const todayStr = toDateStr(getISTDate());
  const nextWeekStr = toDateStr(addDays(getISTDate(), 7));

  // 1. Get all active AMs
  const ams = await fetchActiveAMs();
  if (ams.length === 0) throw new Error('No active Account Managers available for allocation.');

  // 2. Fetch counts for all AMs in parallel
  const amLoadData = await Promise.all(
    ams.map(async (am) => {
      // Current active client count
      const { count: activeClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('account_manager_id', am.id)
        .eq('status', 'active');

      // Pending discovery/onboarding mapping count
      const { count: mappingCount } = await supabase
        .from('temp_clients_am_mapping')
        .select('*', { count: 'exact', head: true })
        .eq('am_id', am.id);

      // Upcoming renewal count (within 7 days)
      const { count: upcomingRenewals } = await supabase
        .from('call_requests')
        .select('*', { count: 'exact', head: true })
        .eq('am_id', am.id)
        .eq('call_type', 'RENEWAL')
        .neq('status', 'COMPLETED')
        .lte('deadline_date', nextWeekStr);

      return {
        id: am.id,
        // Combined load: Active + Pending Discovery
        active_clients: (activeClients || 0) + (mappingCount || 0),
        upcoming_renewals: upcomingRenewals || 0,
        random_val: Math.random(),
      };
    })
  );

  // 3. Sort based on user logic: active_clients ASC, upcoming_renewals ASC, RANDOM()
  amLoadData.sort((a, b) => {
    if (a.active_clients !== b.active_clients) return a.active_clients - b.active_clients;
    if (a.upcoming_renewals !== b.upcoming_renewals) return a.upcoming_renewals - b.upcoming_renewals;
    return a.random_val - b.random_val;
  });

  return amLoadData[0].id;
}
