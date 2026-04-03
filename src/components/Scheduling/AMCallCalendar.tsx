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
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Use amId from props or current user (hardcoded for now as per current app style)
  const amId = initialAmId || '83296684-2a1d-400a-9d9e-17631779ba3d';

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const start = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const end = format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      
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
          start_time: b.scheduled_start_time,
          end_time: b.scheduled_end_time,
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

  useEffect(() => {
    fetchCalls();
  }, [currentDate, amId]);

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Call Calendar</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your scheduled client calls — IST night shift</p>
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
                      className={`min-h-[52px] p-1 border-l border-gray-100 ${isToday(day) ? 'bg-blue-50/30' : ''}`}
                    >
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
                        `}
                      >
                        <p className={`text-xs font-semibold mb-1 ${isToday(day) ? 'text-blue-600' : 'text-gray-600'}`}>
                          {format(day, 'd')}
                        </p>
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
    </div>
  );
};

export default AMCallCalendar;
