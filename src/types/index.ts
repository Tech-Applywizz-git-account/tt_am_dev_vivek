export type UserRole =
  | 'client'
  | 'sales'
  | 'account_manager'
  | 'career_associate'
  | 'ca_team_lead'
  | 'resume_team'
  | 'resume_team_head'
  | 'resume_team_member'
  | 'scraping_team'
  | 'cro'
  | 'coo'
  | 'ceo'
  | 'system_admin';

export type TicketType =
  | 'volume_shortfall'
  | 'data_mismatch'
  | 'call_support'
  | 'resume_update'
  | 'jobBoard_call_support'
  | 'jobBoard_subscription_cancellation';
// | 'high_rejections'
// | 'no_interviews'
// | 'profile_data_issue'
// | 'credential_issue'
// | 'bulk_complaints'
// | 'early_application_request'
// | 'job_feed_empty'
// | 'system_technical_failure'
// | 'am_not_responding';

export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'escalated' | 'manager_attention' | 'reopen' | 'pending_client_review' | 'closed' | 'forwarded' | 'replied';

export type AssignedUser = {
  id: string;
  name: string;
  role: string;
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  is_active: boolean;
}

export interface MCQResults {
  totalAttempted: number;
  passed: number;
  failed: number;
  notAttempted: number;
  points: number;
  totalQuestions: number;
}

export interface TestResult {
  contestId: string;
  contestName: string;
  lab_id_1?: string | null;
  lab_id_2?: string | null;
  mcq_results?: MCQResults | null;
}

export interface Client {
  id: string;
  full_name: string;
  personal_email: string;
  whatsapp_number: string;
  callable_phone: string;
  company_email: string;
  job_role_preferences: string[];
  salary_range: string;
  location_preferences: string[];
  work_auth_details: string;
  account_manager_id: string;
  onboarded_by: string;
  created_at: Date;
  update_at?: Date;
  careerassociatemanagerid: string;
  careerassociateid: string;
  scraperid: string;
  visa_type: string;
  sponsorship: boolean;
  applywizz_id: string;
  badge_value?: number;
  onboardingdate?: string;
  // Legacy columns (for backward compatibility during migration)
  lab_id_1?: string;
  lab_id_2?: string;
  mcq_results?: MCQResults | null;
  // New consolidated column
  test_results?: TestResult[] | null;
  coding_lab_url?: string;
  role_last_updated?: string;
  opted_job_links?: boolean;
  // ── Scheduling / Lifecycle fields ──────────────────────────
  subscription_type?: '30' | '60' | '90' | null;
  subscription_start_date?: string | null;  // DATE yyyy-MM-dd
  subscription_end_date?: string | null;    // DATE yyyy-MM-dd
  service_start_date?: string | null;       // Set when applywizz_id is assigned
}

// ════════════════════════════════════════════════════════════════
//  AM AUTO SCHEDULING SYSTEM TYPES
// ════════════════════════════════════════════════════════════════

export type CallType    = 'DISCOVERY' | 'ORIENTATION' | 'PROGRESS' | 'RENEWAL';
export type CallStatus  = 'UNSCHEDULED' | 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'NOT_PICKED';
export type SlotStatus  = 'AVAILABLE' | 'BOOKED' | 'BLOCKED';
export type BookingStatus = 'BOOKED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
export type CallHistoryStatus = 'COMPLETED' | 'NOT_PICKED' | 'MISSED_BY_AM';
export type ClientSentiment   = 'HAPPY' | 'NEUTRAL' | 'FRUSTRATED';
export type FeedbackSubmitter  = 'client' | 'am';

export interface TimeSlot {
  id:           string;
  am_id:        string;
  slot_date:    string;       // yyyy-MM-dd
  start_time:   string;       // HH:MM (IST)
  end_time:     string;       // HH:MM (IST)
  status:       SlotStatus;
  created_at:   string;
}

export interface CallRequest {
  id:                string;
  client_id:         string;
  am_id:             string;
  call_type:         CallType;
  status:            CallStatus;
  sequence_number?:  number | null;   // Only for PROGRESS calls

  // SLA window (all yyyy-MM-dd)
  earliest_date:     string;
  ideal_date:        string;
  deadline_date:     string;

  // Priority engine
  base_priority:     number;   // 100=RENEWAL, 80=DISCOVERY, 50=PROGRESS, 20=ORIENTATION
  delay_days:        number;   // +10 pts per day to priority
  miss_count:        number;
  preemption_count:  number;

  last_scheduled_at?: string | null;
  created_at:         string;
  updated_at:         string;

  // Computed (from get_priority_score view/function)
  priority_score?:    number;

  // Joined fields (when fetched with relations)
  client_name?:       string;
  am_name?:           string;
}

export interface CallBooking {
  id:                         string;
  call_request_id:            string;
  slot_id:                    string;
  scheduled_date:             string;    // yyyy-MM-dd
  scheduled_start_time:       string;    // HH:MM
  scheduled_end_time:         string;    // HH:MM
  status:                     BookingStatus;
  rescheduled_to_booking_id?: string | null;
  created_at:                 string;
}

export interface CallHistory {
  id:               string;
  call_request_id:  string;
  booking_id:       string;
  status:           CallHistoryStatus;
  notes?:           string | null;
  client_sentiment?: ClientSentiment | null;
  created_at:       string;
}

export interface Feedback {
  id:               string;
  call_request_id:  string;
  submitted_by:     FeedbackSubmitter;
  submitted_by_id:  string;
  rating?:          number | null;   // 1–5
  comment?:         string | null;
  created_at:       string;
}

export interface AMLeave {
  id:          string;
  am_id:       string;
  leave_date:  string;   // yyyy-MM-dd
  reason?:     string | null;
  created_at:  string;
}

export interface Holiday {
  id:            string;
  holiday_date:  string;    // yyyy-MM-dd
  description:   string;
  created_at:    string;
}

// ─── Monitoring View Types ────────────────────────────────────

export interface AMDailySummary {
  am_id:             string;
  am_name:           string;
  is_active:         boolean;
  total_clients:     number;
  total_calls_today: number;
  completed:         number;
  missed:            number;
  pending:           number;
  renewals_pending:  number;
  slots_used:        number;
  slots_total:       number;
}

export interface SLABreach {
  call_request_id: string;
  client_name:     string;
  am_name:         string;
  call_type:       CallType;
  status:          CallStatus;
  deadline_date:   string;
  days_overdue:    number;
  priority_score:  number;
  miss_count:      number;
}

export interface PriorityQueueItem {
  id:                string;
  client_name:       string;
  am_name:           string;
  call_type:         CallType;
  status:            CallStatus;
  deadline_date:     string;
  delay_days:        number;
  miss_count:        number;
  preemption_count:  number;
  priority_score:    number;
}

export interface Ticket {
  id: string;
  type: TicketType;
  title: string;
  short_code: string;
  description: string;
  clientId: string;
  createdby: string;
  assignedTo: string[];
  priority: TicketPriority;
  status: TicketStatus;
  slaHours: number;
  createdat: Date;
  updatedAt: Date;
  dueDate: Date;
  escalationLevel: number;
  metadata: Record<string, any>;
  comments: TicketComment[];
  createdbyclient: boolean;
  requiredManagerAttention: boolean;
  clientName?: string; // resolved from clients table — avoids per-card fetch
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  createdAt: Date;
  isInternal: boolean;
  show_to_client: boolean;
}

export type SLAConfig = {
  [key in TicketType]: {
    priority: TicketPriority;
    hours: number;
  };
}

export interface RolePermissions {
  canCreateTickets: TicketType[];
  canViewTickets: boolean;
  canEditTickets: boolean;
  canResolveTickets: boolean;
  canEscalateTickets: boolean;
  canViewClients: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canOnboardClients: boolean;
}

export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  escalatedTickets: number;
  slaBreaches: number;
  avgResolutionTime: number;
  criticalTickets: number;
}