import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  Filter,
  X,
  CalendarX,
  ClipboardList,
  Loader2,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  isBefore,
  startOfDay,
} from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────
type CallType = 'DISCOVERY' | 'ORIENTATION' | 'PROGRESS' | 'RENEWAL';
type CallStatus = 'UNSCHEDULED' | 'SCHEDULED' | 'BOOKED' | 'COMPLETED' | 'MISSED' | 'NOT_PICKED';

interface ScheduledCall {
  id: string;
  booking_id: string;
  client_name: string;
  call_type: CallType;
  status: CallStatus;
  scheduled_date: string; // ISO date string
  start_time: string; // HH:MM
  end_time: string;
  sequence_number?: number;
  deadline_date: string;
  delay_days: number;
  miss_count: number;
  priority_score: number;
  subscription_type?: '30' | '60' | '90';
}

interface AMLeave {
  id: string;
  am_id: string;
  leave_date: string;
  reason?: string;
  created_at: string;
}

type ViewMode = 'day' | 'week' | 'month';

// ─── Color Config ─────────────────────────────────────────────────────
const CALL_TYPE_CONFIG: Record<CallType, { bg: string; border: string; text: string; dot: string; label: string }> = {
  DISCOVERY: {
    bg: 'bg-purple-50',
    border: 'border-l-purple-500',
    text: 'text-purple-800',
    dot: 'bg-purple-500',
    label: 'Discovery',
  },
  ORIENTATION: {
    bg: 'bg-blue-50',
    border: 'border-l-blue-500',
    text: 'text-blue-800',
    dot: 'bg-blue-500',
    label: 'Orientation',
  },
  PROGRESS: {
    bg: 'bg-teal-50',
    border: 'border-l-teal-500',
    text: 'text-teal-800',
    dot: 'bg-teal-500',
    label: 'Progress',
  },
  RENEWAL: {
    bg: 'bg-orange-50',
    border: 'border-l-orange-500',
    text: 'text-orange-800',
    dot: 'bg-orange-500',
    label: 'Renewal',
  },
};

const STATUS_CONFIG: Record<CallStatus, { icon: React.ReactNode; label: string; color: string }> = {
  BOOKED: { icon: <Clock className="h-3.5 w-3.5" />, label: 'Booked', color: 'text-blue-600' },
  SCHEDULED: { icon: <Clock className="h-3.5 w-3.5" />, label: 'Booked', color: 'text-blue-600' },
  COMPLETED: { icon: <CheckCircle className="h-3.5 w-3.5" />, label: 'Completed', color: 'text-green-600' },
  MISSED: { icon: <XCircle className="h-3.5 w-3.5" />, label: 'Missed', color: 'text-red-600' },
  NOT_PICKED: { icon: <AlertCircle className="h-3.5 w-3.5" />, label: 'Not Picked', color: 'text-amber-600' },
  UNSCHEDULED: { icon: <Clock className="h-3.5 w-3.5" />, label: 'Unscheduled', color: 'text-gray-500' },
};

// (Removed mock data generator)

// ─── Sub-components ───────────────────────────────────────────────────

interface CallCardProps {
  call: ScheduledCall;
  compact?: boolean;
  onClick: (call: ScheduledCall) => void;
}

const CallCard: React.FC<CallCardProps> = ({ call, compact, onClick }) => {
  const cfg = CALL_TYPE_CONFIG[call.call_type];
  const isMissed = call.status === 'MISSED' || call.status === 'NOT_PICKED';

  return (
    <button
      onClick={() => onClick(call)}
      className={`
        w-full text-left rounded-lg border-l-4 p-2 transition-all duration-150
        hover:shadow-md hover:scale-[1.01] active:scale-100
        ${cfg.bg} ${cfg.border}
        ${isMissed ? 'ring-1 ring-red-300' : ''}
        ${compact ? 'py-1.5 px-2' : 'p-3'}
      `}
    >
      {!compact && (
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.text}`}>
            {cfg.label}{call.sequence_number ? ` #${call.sequence_number}` : ''}
          </span>
          <span className={`flex items-center gap-0.5 text-[10px] ${STATUS_CONFIG[call.status].color}`}>
            {STATUS_CONFIG[call.status].icon}
            {STATUS_CONFIG[call.status].label}
          </span>
        </div>
      )}
      <div className={`font-semibold text-gray-800 truncate ${compact ? 'text-xs' : 'text-sm'}`}>
        {call.client_name}
      </div>
      {!compact && (
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          {call.start_time} – {call.end_time}
        </div>
      )}
      {isMissed && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-red-500 font-medium">
          <AlertCircle className="h-3 w-3" />
          {call.miss_count} missed · +{call.delay_days}d delay
        </div>
      )}
    </button>
  );
};

// ─── Call Detail Modal ────────────────────────────────────────────────

interface CallDetailModalProps {
  call: ScheduledCall | null;
  onClose: () => void;
  onComplete: (callId: string, bookingId: string) => void;
  onNotPicked: (callId: string, bookingId: string) => void;
  loading: boolean;
}

const CallDetailModal: React.FC<CallDetailModalProps> = ({ call, onClose, onComplete, onNotPicked, loading }) => {
  if (!call) return null;
  const cfg = CALL_TYPE_CONFIG[call.call_type];
  const statusCfg = STATUS_CONFIG[call.status];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${cfg.bg} border-b-4 ${cfg.border} p-5`}>
          <div className="flex items-start justify-between">
            <div>
              <span className={`text-xs font-bold uppercase tracking-widest ${cfg.text}`}>
                {cfg.label} Call{call.sequence_number ? ` #${call.sequence_number}` : ''}
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-1">{call.client_name}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Status Row */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
            <span className="text-sm text-gray-500 font-medium">Status</span>
            <span className={`flex items-center gap-1.5 font-semibold text-sm ${statusCfg.color}`}>
              {statusCfg.icon} {statusCfg.label}
            </span>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Scheduled</p>
              <p className="font-semibold text-sm text-gray-800">
                {format(parseISO(call.scheduled_date), 'dd MMM yyyy')}
              </p>
              <p className="text-sm text-gray-600">{call.start_time} – {call.end_time} IST</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Deadline</p>
              <p className="font-semibold text-sm text-gray-800">
                {format(parseISO(call.deadline_date), 'dd MMM yyyy')}
              </p>
            </div>
          </div>

          {/* Priority */}
          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-gray-500 font-medium">Priority Score</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-orange-500 rounded-full"
                  style={{ width: `${Math.min((call.priority_score / 150) * 100, 100)}%` }}
                />
              </div>
              <span className="font-bold text-gray-800 text-sm">{call.priority_score}</span>
            </div>
          </div>

          {/* Delay/Miss info */}
          {(call.delay_days > 0 || call.miss_count > 0) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
              {call.delay_days > 0 && (
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Delayed by <strong>{call.delay_days} day{call.delay_days > 1 ? 's' : ''}</strong>
                </p>
              )}
              {call.miss_count > 0 && (
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Missed / Not picked <strong>{call.miss_count} time{call.miss_count > 1 ? 's' : ''}</strong>
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          {call.status === 'BOOKED' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                disabled={loading}
                onClick={() => onComplete(call.id, call.booking_id)}
                className="py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Mark Completed'}
              </button>
              <button
                disabled={loading}
                onClick={() => onNotPicked(call.id, call.booking_id)}
                className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Not Picked'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── AM Leave Components ──────────────────────────────────────────────

interface ApplyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (date: string, reason: string) => Promise<void>;
  loading: boolean;
}

const ApplyLeaveModal: React.FC<ApplyLeaveModalProps> = ({ isOpen, onClose, onSubmit, loading }) => {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!date) {
      setError('Please select a date.');
      return;
    }

    const istNow = new Date();
    const minAllowedDate = startOfDay(addDays(istNow, 3));
    const targetDate = startOfDay(parseISO(date));

    if (isBefore(targetDate, minAllowedDate)) {
      setError('Leaves must be applied at least 3 days in advance.');
      return;
    }

    try {
      await onSubmit(date, reason);
      setDate('');
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to apply for leave.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-blue-600 p-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <CalendarX className="h-5 w-5" />
            <h2 className="text-lg font-bold">Apply for Leave</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Leave Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={format(addDays(new Date(), 3), 'yyyy-MM-dd')}
              className="w-full rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <p className="text-[10px] text-gray-500 italic">
              * Shifts are IST night. Leave for "2026-04-10" means you are off for the shift starting on the night of the 10th.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Reason (Optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief reason for your leave..."
              className="w-full rounded-xl border border-gray-200 p-3 h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Submit Leave Request'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

interface LeavesSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  leaves: AMLeave[];
  loading: boolean;
}

const LeavesSlideOver: React.FC<LeavesSlideOverProps> = ({ isOpen, onClose, leaves, loading }) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-[70] w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Your Leaves</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Loading your leaves...</p>
              </div>
            ) : leaves.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <CalendarX className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No leaves applied yet.</p>
                <p className="text-xs mt-1">Applied leaves will show up here.</p>
              </div>
            ) : (
              leaves.map((leave) => (
                <div key={leave.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-blue-700">
                      {format(parseISO(leave.leave_date), 'EEEE, dd MMM yyyy')}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400">
                      Applied on {format(parseISO(leave.created_at), 'dd MMM')}
                    </span>
                  </div>
                  {leave.reason ? (
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg italic">
                      "{leave.reason}"
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No reason provided</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Main Calendar Component ──────────────────────────────────────────

interface AMCallCalendarProps {
  amId?: string;
  amName?: string;
}

export const AMCallCalendar: React.FC<AMCallCalendarProps> = ({ amId: initialAmId, amName = 'You' }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCall, setSelectedCall] = useState<ScheduledCall | null>(null);
  const [filterType, setFilterType] = useState<CallType | 'ALL'>('ALL');
  const [calls, setCalls] = useState<ScheduledCall[]>([]);
  const [leaves, setLeaves] = useState<AMLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showLeavesSlideOver, setShowLeavesSlideOver] = useState(false);

  // Use amId from props or current user (hardcoded for now as per current app style)
  const amId = initialAmId || '83296684-2a1d-400a-9d9e-17631779ba3d';

  const fetchCalls = async () => {
    try {
      setLoading(true);

      // Determine fetch range based on viewMode
      let start, end;
      if (viewMode === 'month') {
        // Fetch full month grid
        start = format(startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        end = format(endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      } else if (viewMode === 'week') {
        start = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        end = format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      } else {
        // day view — still fetch the whole week for smoother transitions
        start = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        end = format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      }

      const res = await fetch(`/api/scheduling/am-calls?amId=${amId}&from=${start}&to=${end}`);
      const result = await res.json();

      if (result.success) {
        // Map backend response to frontend types
        const mapped = result.data.map((b: any) => ({
          id: b.call_requests.id,
          booking_id: b.id, // Keep track of booking ID for actions
          client_name: b.call_requests.clients.full_name,
          call_type: b.call_requests.call_type,
          status: b.status,
          scheduled_date: b.scheduled_date,
          // Normalize times: Database might return 'HH:mm:ss', we need 'HH:mm' for comparisons
          start_time: b.scheduled_start_time?.substring(0, 5),
          end_time: b.scheduled_end_time?.substring(0, 5),
          sequence_number: b.call_requests.sequence_number,
          deadline_date: b.call_requests.deadline_date,
          delay_days: b.call_requests.delay_days,
          miss_count: b.call_requests.miss_count,
          priority_score: b.call_requests.base_priority + (b.call_requests.delay_days * 10),
          subscription_type: b.call_requests.clients.subscription_type
        }));
        setCalls(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch calls:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaves = async () => {
    try {
      setLeavesLoading(true);
      const res = await fetch(`/api/scheduling/get-leaves?amId=${amId}`);
      const result = await res.json();
      if (result.success) {
        setLeaves(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
    } finally {
      setLeavesLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
    fetchLeaves();
  }, [currentDate, amId, viewMode]);

  const handleComplete = async (callId: string, bookingId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/scheduling/complete-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callRequestId: callId, bookingId }),
      });
      if (res.ok) {
        setSelectedCall(null);
        fetchCalls();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleNotPicked = async (callId: string, bookingId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/scheduling/not-picked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callRequestId: callId, bookingId }),
      });
      if (res.ok) {
        setSelectedCall(null);
        fetchCalls();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyLeave = async (date: string, reason: string) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/scheduling/apply-leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amId, leaveDate: date, reason }),
      });
      const result = await res.json();
      if (res.ok) {
        fetchLeaves();
        fetchCalls(); // Re-fetch calls as some might have been re-scheduled
      } else {
        throw new Error(result.error || 'Failed to apply for leave.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Navigation helpers
  const navigate = (dir: 1 | -1) => {
    if (viewMode === 'week') setCurrentDate(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else if (viewMode === 'month') setCurrentDate(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else setCurrentDate(addDays(currentDate, dir));
  };

  const goToday = () => setCurrentDate(new Date());

  // Week days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Filtered calls
  const filteredCalls = useMemo(() =>
    calls.filter(c => filterType === 'ALL' || c.call_type === filterType),
    [calls, filterType]
  );

  const getCallsForDate = (date: Date) =>
    filteredCalls.filter(c => isSameDay(parseISO(c.scheduled_date), date));

  const amLeaveSet = useMemo(() => new Set(leaves.map(l => l.leave_date)), [leaves]);
  const isDateOnLeave = (date: Date) => amLeaveSet.has(format(date, 'yyyy-MM-dd'));

  // Stats
  const todaysCalls = calls.filter(c => isSameDay(parseISO(c.scheduled_date), new Date()));
  const stats = {
    today: todaysCalls.length,
    completed: calls.filter(c => c.status === 'COMPLETED').length,
    pending: calls.filter(c => c.status === 'SCHEDULED').length,
    missed: calls.filter(c => c.status === 'MISSED' || c.status === 'NOT_PICKED').length,
  };

  // Range label
  const rangeLabel = viewMode === 'week'
    ? `${format(weekStart, 'dd MMM')} – ${format(addDays(weekStart, 6), 'dd MMM yyyy')}`
    : viewMode === 'month'
      ? format(currentDate, 'MMMM yyyy')
      : format(currentDate, 'EEEE, dd MMMM yyyy');

  // IST time slots for week view (simplified for display)
  const timeSlots = ['20:45', '21:15', '21:45', '22:15', '22:45', '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30'];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your scheduled client calls — IST night shift</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLeavesSlideOver(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <ClipboardList className="h-4 w-4 text-blue-600" />
            Show My Leaves
          </button>
          <button
            onClick={() => setShowApplyModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95"
          >
            <CalendarX className="h-4 w-4" />
            Apply Leave
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Today's Calls", value: stats.today, icon: <Phone className="h-4 w-4" />, color: 'bg-blue-50 text-blue-700' },
          { label: 'Completed', value: stats.completed, icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-50 text-green-700' },
          { label: 'Pending', value: stats.pending, icon: <Clock className="h-4 w-4" />, color: 'bg-amber-50 text-amber-700' },
          { label: 'Missed', value: stats.missed, icon: <XCircle className="h-4 w-4" />, color: 'bg-red-50 text-red-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color} flex items-center justify-between`}>
            <div>
              <p className="text-xs font-medium opacity-70">{s.label}</p>
              <p className="text-2xl font-bold mt-0.5">{s.value}</p>
            </div>
            <div className="opacity-60">{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Calendar Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          {/* Left: navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Today
            </button>
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-900 ml-1">{rangeLabel}</span>
          </div>

          {/* Center: type filter */}
          <div className="flex items-center gap-1.5">
            {(['ALL', 'DISCOVERY', 'ORIENTATION', 'PROGRESS', 'RENEWAL'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${filterType === t
                  ? t === 'ALL' ? 'bg-gray-800 text-white' : `${CALL_TYPE_CONFIG[t as CallType]?.dot} text-white`
                  : 'text-gray-500 hover:bg-gray-100'
                  }`}
                style={filterType === t && t !== 'ALL' ? { backgroundColor: undefined } : {}}
              >
                {t === 'ALL' ? 'All' :
                  t === 'DISCOVERY' ? '🔮 Discovery' :
                    t === 'ORIENTATION' ? '🔵 Orientation' :
                      t === 'PROGRESS' ? '🟢 Progress' : '🟠 Renewal'}
              </button>
            ))}
          </div>

          {/* Right: view toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${viewMode === v ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Week Grid */}
        {viewMode === 'week' && (
          <div className="overflow-x-auto">
            {/* Day headers */}
            <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
              <div className="p-3" />
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`p-3 text-center border-l border-gray-100 ${isToday(day) ? 'bg-blue-50' : ''}`}
                >
                  <p className="text-xs font-medium text-gray-500 uppercase">{format(day, 'EEE')}</p>
                  <p className={`text-lg font-bold mt-0.5 ${isToday(day) ? 'text-blue-600' : 'text-gray-900'}`}>
                    {format(day, 'd')}
                  </p>
                  {isDateOnLeave(day) && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase">
                      Leave
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Time rows */}
            {timeSlots.map((slot) => (
              <div key={slot} className="grid border-b border-gray-50" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
                {/* Time label */}
                <div className="px-3 py-2 text-xs text-gray-400 text-right font-mono">{slot}</div>
                {weekDays.map((day) => {
                  const dayCalls = getCallsForDate(day).filter(c => c.start_time === slot);
                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[52px] p-1 border-l border-gray-100 relative ${isToday(day) ? 'bg-blue-50/30' : ''}`}
                    >
                      {isDateOnLeave(day) && (
                        <div className="absolute inset-0 bg-orange-50/40 backdrop-blur-[1px] flex items-center justify-center">
                          {slot === '20:45' && (
                            <span className="text-[10px] font-black text-orange-400 rotate-[-15deg] tracking-widest border border-orange-200 px-2 py-0.5 rounded uppercase">On Leave</span>
                          )}
                        </div>
                      )}
                      {dayCalls.map((call) => (
                        <CallCard key={call.id} call={call} compact onClick={setSelectedCall} />
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Day View */}
        {viewMode === 'day' && (
          <div className="p-6 space-y-3">
            <p className="text-sm text-gray-500 font-medium mb-4">
              {getCallsForDate(currentDate).length} calls scheduled
            </p>
            {getCallsForDate(currentDate).length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No calls scheduled for this day</p>
              </div>
            ) : (
              getCallsForDate(currentDate)
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((call) => (
                  <CallCard key={call.id} call={call} onClick={setSelectedCall} />
                ))
            )}
          </div>
        )}

        {/* Month View */}
        {viewMode === 'month' && (
          <div className="p-4">
            {/* Month day labels */}
            <div className="grid grid-cols-7 mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
              ))}
            </div>
            {/* Month days */}
            {(() => {
              const msStart = startOfMonth(currentDate);
              const msEnd = endOfMonth(currentDate);
              const gridStart = startOfWeek(msStart, { weekStartsOn: 1 });
              const gridEnd = endOfWeek(msEnd, { weekStartsOn: 1 });
              const days: Date[] = [];
              let d = gridStart;
              while (d <= gridEnd) {
                days.push(d);
                d = addDays(d, 1);
              }
              return (
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day) => {
                    const daysCalls = getCallsForDate(day);
                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[80px] p-1.5 rounded-xl border transition-colors
                          ${isToday(day) ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-gray-300'}
                          ${!isSameMonth(day, currentDate) ? 'opacity-30' : ''}
                          ${isDateOnLeave(day) ? 'bg-orange-50/50 border-orange-100' : ''}
                        `}
                      >
                        <div className="flex justify-between items-start">
                          <p className={`text-xs font-semibold mb-1 ${isToday(day) ? 'text-blue-600' : 'text-gray-600'}`}>
                            {format(day, 'd')}
                          </p>
                          {isDateOnLeave(day) && (
                            <span className="text-[8px] font-bold text-orange-600 bg-orange-100 px-1 rounded">LEAVE</span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {daysCalls.slice(0, 2).map((c) => (
                            <button
                              key={c.id}
                              onClick={() => setSelectedCall(c)}
                              className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded font-medium truncate
                                ${CALL_TYPE_CONFIG[c.call_type].bg} ${CALL_TYPE_CONFIG[c.call_type].text}
                              `}
                            >
                              {c.client_name}
                            </button>
                          ))}
                          {daysCalls.length > 2 && (
                            <p className="text-[9px] text-gray-400 pl-1">+{daysCalls.length - 2} more</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Legend */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-4 flex-wrap">
          {Object.entries(CALL_TYPE_CONFIG).map(([type, cfg]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
              <span className="text-xs text-gray-500">{cfg.label}</span>
            </div>
          ))}
          <div className="ml-auto text-xs text-gray-400">All times in IST</div>
        </div>
      </div>

      {/* Call Detail Modal */}
      <CallDetailModal
        call={selectedCall}
        onClose={() => setSelectedCall(null)}
        onComplete={handleComplete}
        onNotPicked={handleNotPicked}
        loading={actionLoading}
      />

      {/* AM Leave Modals */}
      <ApplyLeaveModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onSubmit={handleApplyLeave}
        loading={actionLoading}
      />

      <LeavesSlideOver
        isOpen={showLeavesSlideOver}
        onClose={() => setShowLeavesSlideOver(false)}
        leaves={leaves}
        loading={leavesLoading}
      />
    </div>
  );
};

export default AMCallCalendar;
