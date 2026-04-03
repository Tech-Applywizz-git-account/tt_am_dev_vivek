-- ============================================================
-- AM AUTO SCHEDULING & LIFECYCLE SYSTEM — MIGRATION SCRIPT
-- ============================================================
-- Run this in Supabase SQL Editor (or psql)
-- Order matters — create enums first, then tables, then indexes,
-- then triggers, then RLS policies.
-- ============================================================

-- ── SECTION 0: ENUMS ─────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE call_type_enum AS ENUM (
    'DISCOVERY', 'ORIENTATION', 'PROGRESS', 'RENEWAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE call_status_enum AS ENUM (
    'UNSCHEDULED', 'SCHEDULED', 'COMPLETED', 'MISSED', 'NOT_PICKED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE slot_status_enum AS ENUM (
    'AVAILABLE', 'BOOKED', 'BLOCKED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status_enum AS ENUM (
    'BOOKED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE call_history_status_enum AS ENUM (
    'COMPLETED', 'NOT_PICKED', 'MISSED_BY_AM'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE client_sentiment_enum AS ENUM (
    'HAPPY', 'NEUTRAL', 'FRUSTRATED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE feedback_submitter_enum AS ENUM (
    'client', 'am'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_type_enum AS ENUM (
    '30', '60', '90'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── SECTION 1: MODIFY EXISTING clients TABLE ─────────────────
-- Add scheduling columns. Safe to rerun (IF NOT EXISTS).

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS subscription_type       subscription_type_enum NULL,
  ADD COLUMN IF NOT EXISTS subscription_start_date DATE NULL,
  ADD COLUMN IF NOT EXISTS subscription_end_date   DATE NULL,
  ADD COLUMN IF NOT EXISTS service_start_date      DATE NULL;

-- Note:
--   service_start_date: auto-set by trigger when applywizz_id is first assigned.
--   This event signals the Node.js backend via Supabase Realtime to generate
--   the full client lifecycle (Orientation + Progress + Renewal calls).

CREATE INDEX IF NOT EXISTS idx_clients_subscription_end
  ON public.clients (subscription_end_date)
  WHERE subscription_end_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_service_start
  ON public.clients (service_start_date)
  WHERE service_start_date IS NOT NULL;


-- ── SECTION 2: time_slots ─────────────────────────────────────
-- Pre-generated 30-min slots per AM, IST local time.
-- Working hours: 20:45–05:00 IST, break 23:00–00:00, no Sundays.

CREATE TABLE IF NOT EXISTS public.time_slots (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  am_id       UUID             NOT NULL
                REFERENCES public.users(id) ON DELETE CASCADE,
  slot_date   DATE             NOT NULL,
  start_time  TIME             NOT NULL,
  end_time    TIME             NOT NULL,
  status      slot_status_enum NOT NULL DEFAULT 'AVAILABLE',
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT now(),

  CONSTRAINT time_slots_am_date_time_unique
    UNIQUE (am_id, slot_date, start_time)

) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_time_slots_available
  ON public.time_slots (am_id, status, slot_date, start_time)
  WHERE status = 'AVAILABLE';

CREATE INDEX IF NOT EXISTS idx_time_slots_date
  ON public.time_slots (slot_date, am_id);

COMMENT ON TABLE public.time_slots IS
  'Pre-generated 30-min availability windows per AM in IST. '
  'AVAILABLE = bookable, BOOKED = taken, BLOCKED = break/holiday.';


-- ── SECTION 3: call_requests (CORE TABLE) ────────────────────
-- The brain of the scheduling system. Every call that needs to
-- happen is a row here. Drives the scheduler engine.

CREATE TABLE IF NOT EXISTS public.call_requests (
  id                UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID               NOT NULL
                      REFERENCES public.clients(id) ON DELETE CASCADE,
  am_id             UUID               NOT NULL
                      REFERENCES public.users(id) ON DELETE RESTRICT,

  call_type         call_type_enum     NOT NULL,
  status            call_status_enum   NOT NULL DEFAULT 'UNSCHEDULED',
  sequence_number   INTEGER            NULL,

  earliest_date     DATE               NOT NULL,
  ideal_date        DATE               NOT NULL,
  deadline_date     DATE               NOT NULL,

  base_priority     INTEGER            NOT NULL,
  delay_days        INTEGER            NOT NULL DEFAULT 0,
  miss_count        INTEGER            NOT NULL DEFAULT 0,
  preemption_count  INTEGER            NOT NULL DEFAULT 0,

  last_scheduled_at TIMESTAMPTZ        NULL,
  created_at        TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ        NOT NULL DEFAULT now(),

  -- sequence_number only for PROGRESS calls
  CONSTRAINT call_requests_sequence_for_progress CHECK (
    (call_type = 'PROGRESS' AND sequence_number IS NOT NULL AND sequence_number > 0)
    OR (call_type != 'PROGRESS')
  ),

  -- SLA window must be consistent
  CONSTRAINT call_requests_date_order
    CHECK (earliest_date <= ideal_date AND ideal_date <= deadline_date),

  -- Only valid base priority values
  CONSTRAINT call_requests_base_priority_check
    CHECK (base_priority IN (20, 50, 80, 100)),

  CONSTRAINT call_requests_delay_days_check     CHECK (delay_days >= 0),
  CONSTRAINT call_requests_miss_count_check     CHECK (miss_count >= 0),
  CONSTRAINT call_requests_preemption_count_cap CHECK (preemption_count BETWEEN 0 AND 10)

) TABLESPACE pg_default;

-- Scheduler hot path: find schedulable calls per AM
CREATE INDEX IF NOT EXISTS idx_call_requests_scheduling
  ON public.call_requests (am_id, status, earliest_date, deadline_date)
  WHERE status = 'UNSCHEDULED';

-- Priority ordering for scheduler
CREATE INDEX IF NOT EXISTS idx_call_requests_priority
  ON public.call_requests (base_priority DESC, delay_days DESC, deadline_date ASC)
  WHERE status = 'UNSCHEDULED';

-- SLA breach detection
CREATE INDEX IF NOT EXISTS idx_call_requests_sla
  ON public.call_requests (deadline_date, status)
  WHERE status NOT IN ('COMPLETED');

-- Per-client timeline view
CREATE INDEX IF NOT EXISTS idx_call_requests_client
  ON public.call_requests (client_id, call_type, sequence_number);

COMMENT ON TABLE public.call_requests IS
  'Core scheduling table. priority_score = base_priority + (delay_days * 10). '
  'RENEWAL=100, DISCOVERY=80, PROGRESS=50, ORIENTATION=20. Never delete — mark COMPLETED.';


-- ── SECTION 4: call_bookings ──────────────────────────────────
-- Final slot assignment. Separates "planned" from "assigned".

CREATE TABLE IF NOT EXISTS public.call_bookings (
  id                        UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  call_request_id           UUID                 NOT NULL
                              REFERENCES public.call_requests(id) ON DELETE CASCADE,
  slot_id                   UUID                 NOT NULL
                              REFERENCES public.time_slots(id) ON DELETE RESTRICT,

  scheduled_date            DATE                 NOT NULL,
  scheduled_start_time      TIME                 NOT NULL,
  scheduled_end_time        TIME                 NOT NULL,

  status                    booking_status_enum  NOT NULL DEFAULT 'BOOKED',

  rescheduled_to_booking_id UUID                 NULL
                              REFERENCES public.call_bookings(id) ON DELETE SET NULL,

  created_at                TIMESTAMPTZ          NOT NULL DEFAULT now(),

  -- One slot = one active booking
  CONSTRAINT call_bookings_slot_unique UNIQUE (slot_id)

) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_call_bookings_request
  ON public.call_bookings (call_request_id, status);

CREATE INDEX IF NOT EXISTS idx_call_bookings_date
  ON public.call_bookings (scheduled_date, status);

COMMENT ON TABLE public.call_bookings IS
  'Final slot assignments. One active BOOKED row per call_request. '
  'Cancelled/rescheduled rows kept for history.';


-- ── SECTION 5: call_history ───────────────────────────────────
-- Immutable audit log. Append-only.

CREATE TABLE IF NOT EXISTS public.call_history (
  id               UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  call_request_id  UUID                       NOT NULL
                     REFERENCES public.call_requests(id) ON DELETE CASCADE,
  booking_id       UUID                       NOT NULL
                     REFERENCES public.call_bookings(id) ON DELETE RESTRICT,

  status           call_history_status_enum   NOT NULL,
  notes            TEXT                       NULL,
  client_sentiment client_sentiment_enum      NULL,

  created_at       TIMESTAMPTZ                NOT NULL DEFAULT now()

) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_call_history_created
  ON public.call_history (call_request_id, created_at DESC);

COMMENT ON TABLE public.call_history IS
  'Immutable call execution log. Never update or delete any row.';


-- ── SECTION 6: feedback ────────────────────────────────────────
-- Client and AM feedback per call, submitted independently.

CREATE TABLE IF NOT EXISTS public.feedback (
  id               UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  call_request_id  UUID                      NOT NULL
                     REFERENCES public.call_requests(id) ON DELETE CASCADE,

  submitted_by     feedback_submitter_enum   NOT NULL,
  submitted_by_id  UUID                      NOT NULL
                     REFERENCES public.users(id) ON DELETE SET NULL,

  rating           SMALLINT                  NULL
                     CHECK (rating >= 1 AND rating <= 5),
  comment          TEXT                      NULL,

  created_at       TIMESTAMPTZ               NOT NULL DEFAULT now(),

  CONSTRAINT feedback_not_empty CHECK (rating IS NOT NULL OR comment IS NOT NULL)

) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_feedback_call_request
  ON public.feedback (call_request_id, submitted_by);

COMMENT ON TABLE public.feedback IS
  'Client and AM feedback. submitted_by: ''client'' or ''am''.';


-- ── SECTION 7: am_leaves ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.am_leaves (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  am_id       UUID         NOT NULL
                REFERENCES public.users(id) ON DELETE CASCADE,
  leave_date  DATE         NOT NULL,
  reason      TEXT         NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT am_leaves_unique UNIQUE (am_id, leave_date)

) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_am_leaves_date
  ON public.am_leaves (am_id, leave_date);

COMMENT ON TABLE public.am_leaves IS
  'AM leave days. Slot generator excludes these when creating time_slots.';


-- ── SECTION 8: holidays ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.holidays (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date  DATE        NOT NULL UNIQUE,
  description   TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()

) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_holidays_date
  ON public.holidays (holiday_date);

COMMENT ON TABLE public.holidays IS
  'Global company holiday calendar. Slot generator skips all dates here.';


-- ── SECTION 9: TRIGGER FUNCTIONS ──────────────────────────────

-- 9a. Auto-set updated_at on call_requests
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_call_requests_updated_at ON public.call_requests;
CREATE TRIGGER trg_call_requests_updated_at
  BEFORE UPDATE ON public.call_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- 9b. Auto-set service_start_date when applywizz_id is first assigned
--     This fires the lifecycle call generation in the Node.js backend
--     via Supabase Realtime subscription on the clients table.
CREATE OR REPLACE FUNCTION public.set_service_start_on_applywizz_id()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.applywizz_id IS NULL AND NEW.applywizz_id IS NOT NULL) THEN
    NEW.service_start_date = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clients_service_start ON public.clients;
CREATE TRIGGER trg_clients_service_start
  BEFORE UPDATE OF applywizz_id ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_service_start_on_applywizz_id();

COMMENT ON FUNCTION public.set_service_start_on_applywizz_id IS
  'Sets service_start_date = CURRENT_DATE when applywizz_id transitions '
  'from NULL to a value. Backend listens for this via Supabase Realtime '
  'and creates Orientation + Progress + Renewal call_requests.';


-- ── SECTION 10: HELPER FUNCTION ───────────────────────────────

CREATE OR REPLACE FUNCTION public.get_priority_score(
  p_base_priority INTEGER,
  p_delay_days    INTEGER
)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_base_priority + (p_delay_days * 10);
$$;

COMMENT ON FUNCTION public.get_priority_score IS
  'Scheduler priority: base_priority + (delay_days * 10). '
  'RENEWAL=100, DISCOVERY=80, PROGRESS=50, ORIENTATION=20.';


-- ── SECTION 11: MONITORING VIEWS ──────────────────────────────

-- v_am_daily_summary: per-AM stats for today
CREATE OR REPLACE VIEW public.v_am_daily_summary AS
SELECT
  u.id                                                                        AS am_id,
  u.name                                                                      AS am_name,
  u.is_active,
  COUNT(DISTINCT c.id)                                                        AS total_clients,
  COUNT(cr.id)                                                                AS total_calls_today,
  COUNT(cr.id) FILTER (WHERE cr.status = 'COMPLETED')                        AS completed,
  COUNT(cr.id) FILTER (WHERE cr.status IN ('MISSED','NOT_PICKED'))           AS missed,
  COUNT(cr.id) FILTER (WHERE cr.status = 'SCHEDULED')                        AS pending,
  COUNT(cr.id) FILTER (WHERE cr.call_type = 'RENEWAL'
                          AND cr.status != 'COMPLETED')                      AS renewals_pending,
  COUNT(ts.id) FILTER (WHERE ts.status = 'BOOKED')                          AS slots_used,
  COUNT(ts.id)                                                                AS slots_total
FROM public.users u
LEFT JOIN public.clients c ON c.account_manager_id = u.id
LEFT JOIN public.call_requests cr
       ON cr.am_id = u.id
      AND EXISTS (
        SELECT 1 FROM public.call_bookings cb
        WHERE cb.call_request_id = cr.id
          AND cb.scheduled_date = CURRENT_DATE
      )
LEFT JOIN public.time_slots ts
       ON ts.am_id = u.id
      AND ts.slot_date = CURRENT_DATE
WHERE u.role = 'account_manager'
GROUP BY u.id, u.name, u.is_active;

COMMENT ON VIEW public.v_am_daily_summary IS
  'Per-AM today''s call summary. Powers the Admin Call Monitoring dashboard.';


-- v_sla_breaches: calls past deadline
CREATE OR REPLACE VIEW public.v_sla_breaches AS
SELECT
  cr.id                                                             AS call_request_id,
  c.full_name                                                       AS client_name,
  u.name                                                            AS am_name,
  cr.call_type,
  cr.status,
  cr.deadline_date,
  CURRENT_DATE - cr.deadline_date                                   AS days_overdue,
  public.get_priority_score(cr.base_priority, cr.delay_days)       AS priority_score,
  cr.miss_count
FROM public.call_requests cr
JOIN public.clients c ON c.id = cr.client_id
JOIN public.users u   ON u.id = cr.am_id
WHERE cr.status NOT IN ('COMPLETED')
  AND cr.deadline_date <= CURRENT_DATE
ORDER BY days_overdue DESC, priority_score DESC;

COMMENT ON VIEW public.v_sla_breaches IS
  'Active SLA breaches. days_overdue = 0 means due today.';


-- v_priority_queue: schedulable unscheduled calls ranked by priority
CREATE OR REPLACE VIEW public.v_priority_queue AS
SELECT
  cr.id,
  c.full_name                                                        AS client_name,
  u.name                                                             AS am_name,
  cr.call_type,
  cr.status,
  cr.deadline_date,
  cr.delay_days,
  cr.miss_count,
  cr.preemption_count,
  public.get_priority_score(cr.base_priority, cr.delay_days)        AS priority_score
FROM public.call_requests cr
JOIN public.clients c ON c.id = cr.client_id
JOIN public.users u   ON u.id = cr.am_id
WHERE cr.status = 'UNSCHEDULED'
  AND CURRENT_DATE >= cr.earliest_date
ORDER BY priority_score DESC, cr.deadline_date ASC;

COMMENT ON VIEW public.v_priority_queue IS
  'Schedulable calls ranked by priority. Polled by scheduler engine every 5 min.';


-- ── SECTION 12: ROW LEVEL SECURITY ────────────────────────────

ALTER TABLE public.time_slots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_bookings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.am_leaves      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays       ENABLE ROW LEVEL SECURITY;

-- Helper to get logged-in user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- SELECT policies
CREATE POLICY pol_time_slots_select ON public.time_slots FOR SELECT
  USING (am_id = auth.uid()
         OR public.current_user_role() IN ('cro','coo','ceo','system_admin'));

CREATE POLICY pol_call_requests_select ON public.call_requests FOR SELECT
  USING (am_id = auth.uid()
         OR public.current_user_role() IN ('cro','coo','ceo','system_admin'));

CREATE POLICY pol_call_bookings_select ON public.call_bookings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.call_requests cr
    WHERE cr.id = call_request_id
      AND (cr.am_id = auth.uid()
           OR public.current_user_role() IN ('cro','coo','ceo','system_admin'))
  ));

CREATE POLICY pol_call_history_select ON public.call_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.call_requests cr
    WHERE cr.id = call_request_id
      AND (cr.am_id = auth.uid()
           OR public.current_user_role() IN ('cro','coo','ceo','system_admin'))
  ));

CREATE POLICY pol_feedback_select ON public.feedback FOR SELECT
  USING (submitted_by_id = auth.uid()
         OR public.current_user_role() IN ('cro','coo','ceo','system_admin','account_manager'));

CREATE POLICY pol_am_leaves_select ON public.am_leaves FOR SELECT
  USING (am_id = auth.uid()
         OR public.current_user_role() IN ('cro','coo','ceo','system_admin'));

CREATE POLICY pol_holidays_select ON public.holidays FOR SELECT USING (true);

-- INSERT/UPDATE policies (service_role = cron backend; bypasses RLS automatically)
CREATE POLICY pol_call_requests_insert ON public.call_requests FOR INSERT
  WITH CHECK (public.current_user_role() IN ('system_admin','account_manager'));

CREATE POLICY pol_call_requests_update ON public.call_requests FOR UPDATE
  USING (am_id = auth.uid()
         OR public.current_user_role() IN ('cro','coo','ceo','system_admin'));

CREATE POLICY pol_feedback_insert ON public.feedback FOR INSERT
  WITH CHECK (submitted_by_id = auth.uid());

CREATE POLICY pol_am_leaves_insert ON public.am_leaves FOR INSERT
  WITH CHECK (am_id = auth.uid()
              OR public.current_user_role() IN ('cro','coo','ceo','system_admin'));

CREATE POLICY pol_am_leaves_delete ON public.am_leaves FOR DELETE
  USING (am_id = auth.uid()
         OR public.current_user_role() IN ('cro','coo','ceo','system_admin'));

CREATE POLICY pol_holidays_manage ON public.holidays FOR ALL
  USING (public.current_user_role() IN ('cro','coo','ceo','system_admin'));


-- ── SECTION 13: SEED — 2026 Indian Holidays ───────────────────

INSERT INTO public.holidays (holiday_date, description) VALUES
  ('2026-01-26', 'Republic Day'),
  ('2026-03-10', 'Holi'),
  ('2026-04-14', 'Dr. B.R. Ambedkar Jayanti'),
  ('2026-08-15', 'Independence Day'),
  ('2026-10-02', 'Gandhi Jayanti'),
  ('2026-10-20', 'Dussehra'),
  ('2026-11-11', 'Diwali'),
  ('2026-12-25', 'Christmas')
ON CONFLICT (holiday_date) DO NOTHING;


-- ── SECTION 14: GRANTS ─────────────────────────────────────────

GRANT SELECT ON public.time_slots, public.call_requests, public.call_bookings,
               public.call_history, public.feedback, public.am_leaves,
               public.holidays, public.v_am_daily_summary,
               public.v_sla_breaches, public.v_priority_queue
  TO authenticated;

GRANT INSERT, UPDATE ON public.feedback, public.call_requests TO authenticated;
GRANT INSERT, DELETE ON public.am_leaves TO authenticated;

GRANT ALL ON public.time_slots, public.call_requests, public.call_bookings,
            public.call_history, public.feedback, public.am_leaves,
            public.holidays
  TO service_role;


-- ── MIGRATION COMPLETE ─────────────────────────────────────────
-- MODIFIED : public.clients (+4 columns, +2 indexes, +1 trigger)
-- NEW TABLE : public.time_slots
-- NEW TABLE : public.call_requests  [CORE]
-- NEW TABLE : public.call_bookings
-- NEW TABLE : public.call_history
-- NEW TABLE : public.feedback
-- NEW TABLE : public.am_leaves
-- NEW TABLE : public.holidays
-- NEW VIEW  : public.v_am_daily_summary
-- NEW VIEW  : public.v_sla_breaches
-- NEW VIEW  : public.v_priority_queue
-- NEW FUNC  : public.get_priority_score()
-- NEW FUNC  : public.set_updated_at()
-- NEW FUNC  : public.set_service_start_on_applywizz_id()
-- NEW FUNC  : public.current_user_role()
-- NEW ENUMS : 8 custom enum types
-- SEEDED    : 8 Indian national holidays (2026)
-- ────────────────────────────────────────────────────────────────
