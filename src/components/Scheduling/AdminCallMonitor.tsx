import React, { useState, useMemo, useEffect } from 'react';
import {
  Phone,
  CheckCircle,
  XCircle,
  Users,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────
type CallType = 'DISCOVERY' | 'ORIENTATION' | 'PROGRESS' | 'RENEWAL';
type CallStatus = 'UNSCHEDULED' | 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'NOT_PICKED';

interface AMSummary {
  am_id: string;
  am_name: string;
  is_active: boolean;
  total_clients: number;
  slots_used: number;
  slots_total: number;
  total_calls_today: number;
  completed: number;
  missed: number;
  pending: number;
  renewals_pending: number;
}

interface SLABreachCall {
  call_request_id: string;
  client_name: string;
  call_type: CallType;
  deadline_date: string;
  days_overdue: number;
  am_name: string;
  priority_score: number;
  miss_count: number;
}

interface PriorityQueueItem {
  id: string;
  client_name: string;
  call_type: CallType;
  am_name: string;
  priority_score: number;
  deadline_date: string;
  delay_days: number;
  status: CallStatus;
}

// (Dummy data removed)

// ─── Color Config ─────────────────────────────────────────────────────
const CALL_TYPE_COLORS: Record<CallType, { bg: string; text: string; dot: string }> = {
  DISCOVERY: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  ORIENTATION: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  PROGRESS: { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
  RENEWAL: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
};

// ─── Sub-components ───────────────────────────────────────────────────

const PriorityBadge: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 100 ? 'bg-red-100 text-red-700' : score >= 80 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
  return <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${color}`}>{score}</span>;
};

const SlotBar: React.FC<{ used: number; total: number }> = ({ used, total }) => {
  if (total === 0) return <span className="text-xs text-gray-400">On Leave</span>;
  const pct = Math.round((used / total) * 100);
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 font-mono w-14">{used}/{total}</span>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────

export const AdminCallMonitor: React.FC = () => {
  const [expandedAM, setExpandedAM] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'sla' | 'queue' | 'distribution'>('overview');
  const [data, setData] = useState<{
    amSummary: AMSummary[],
    slaBreaches: SLABreachCall[],
    priorityQueue: PriorityQueueItem[],
    callTypeDistribution: { type: CallType, count: number }[]
  }>({ amSummary: [], slaBreaches: [], priorityQueue: [], callTypeDistribution: [] });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/scheduling/monitoring');
      const result = await res.json();
      if (result.success) {
        setData({
          amSummary: result.amSummary,
          slaBreaches: result.slaBreaches,
          priorityQueue: result.priorityQueue,
          callTypeDistribution: result.callTypeDistribution
        });
      }
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Aggregate stats
  const totalStats = useMemo(() => {
    const summary = data.amSummary.map(am => ({
      ...am,
      completion_rate: am.total_calls_today > 0 ? Math.round((am.completed / am.total_calls_today) * 100) : 0
    }));

    return {
      totalCallsToday: summary.reduce((s, a) => s + a.total_calls_today, 0),
      completedToday: summary.reduce((s, a) => s + a.completed, 0),
      missedToday: summary.reduce((s, a) => s + a.missed, 0),
      pendingToday: summary.reduce((s, a) => s + a.pending, 0),
      slaBreaches: data.slaBreaches.length,
      avgCompletionRate: summary.reduce((s, a) => s + a.total_calls_today, 0) > 0
        ? Math.round((summary.reduce((s, a) => s + a.completed, 0) / summary.reduce((s, a) => s + a.total_calls_today, 0)) * 100)
        : 0,
      unscheduledHighPriority: data.priorityQueue.filter(q => q.priority_score >= 80).length,
      renewalsDue: summary.reduce((s, a) => s + a.renewals_pending, 0),
      processedSummary: summary
    };
  }, [data]);

  const callTypeDistribution = useMemo(() => {
    const raw = data.callTypeDistribution || [];
    const total = raw.reduce((s, v) => s + v.count, 0);
    if (total === 0) return [];
    return raw.map(({ type, count }) => ({
      type,
      count,
      pct: Math.round((count / total) * 100),
    }));
  }, [data.callTypeDistribution]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Monitoring</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time AM scheduling & lifecycle overview</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
            <Activity className="h-3.5 w-3.5 text-green-500" />
            Live · Updated just now
          </span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 px-3 py-1.5 rounded-full transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Overall KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Calls Today", value: totalStats.totalCallsToday, sub: `${totalStats.avgCompletionRate}% completion rate`, icon: <Phone className="h-5 w-5" />, color: 'from-blue-500 to-blue-600', light: 'bg-blue-50', iconColor: 'text-blue-600' },
          { label: "Completed", value: totalStats.completedToday, sub: `${totalStats.missedToday} missed today`, icon: <CheckCircle className="h-5 w-5" />, color: 'from-green-500 to-emerald-600', light: 'bg-green-50', iconColor: 'text-green-600' },
          { label: "SLA Breaches", value: totalStats.slaBreaches, sub: `${totalStats.unscheduledHighPriority} high-priority unscheduled`, icon: <AlertTriangle className="h-5 w-5" />, color: 'from-red-500 to-red-600', light: 'bg-red-50', iconColor: 'text-red-600' },
          { label: "Renewals Due", value: totalStats.renewalsDue, sub: "Across all AMs", icon: <Zap className="h-5 w-5" />, color: 'from-orange-500 to-amber-600', light: 'bg-orange-50', iconColor: 'text-orange-600' },
        ].map((card) => (
          <div key={card.label} className={`${card.light} rounded-2xl p-5 border border-white shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`${card.iconColor} opacity-80`}>{card.icon}</span>
              <span className="text-3xl font-black text-gray-900">{card.value}</span>
            </div>
            <p className="text-sm font-semibold text-gray-700">{card.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { id: 'overview', label: 'AM Overview', icon: <Users className="h-3.5 w-3.5" /> },
          { id: 'sla', label: 'SLA Breaches', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
          { id: 'queue', label: 'Priority Queue', icon: <Zap className="h-3.5 w-3.5" /> },
          { id: 'distribution', label: 'Call Types', icon: <BarChart3 className="h-3.5 w-3.5" /> },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${selectedTab === tab.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'sla' && totalStats.slaBreaches > 0 && (
              <span className="ml-0.5 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {totalStats.slaBreaches}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: AM Overview */}
      {selectedTab === 'overview' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Account Manager Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Account Manager', 'Status', 'Clients', 'Slot Usage', "Today's Calls", 'Completed', 'Missed', 'Renewals Due', 'Rate'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {totalStats.processedSummary.map((am) => (
                  <React.Fragment key={am.am_id}>
                    <tr
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${!am.is_active ? 'opacity-50' : ''}`}
                      onClick={() => setExpandedAM(expandedAM === am.am_id ? null : am.am_id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                            {am.am_name?.split(' ').map(n => n[0]).join('') || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-gray-900">{am.am_name || 'Unknown Manager'}</p>
                          </div>
                          {expandedAM === am.am_id
                            ? <ChevronUp className="h-4 w-4 text-gray-400 ml-auto" />
                            : <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${am.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {am.is_active ? 'Active' : 'On Leave'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{am.total_clients}</td>
                      <td className="px-4 py-3 w-36">
                        <SlotBar used={am.slots_used} total={am.slots_total} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{am.total_calls_today}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-sm text-green-700 font-medium">
                          <CheckCircle className="h-3.5 w-3.5" /> {am.completed}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {am.missed > 0
                          ? <span className="flex items-center gap-1 text-sm text-red-700 font-medium"><XCircle className="h-3.5 w-3.5" />{am.missed}</span>
                          : <span className="text-sm text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {am.renewals_pending > 0
                          ? <span className="flex items-center gap-1 text-sm text-orange-700 font-semibold"><Zap className="h-3.5 w-3.5" />{am.renewals_pending}</span>
                          : <span className="text-sm text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${am.completion_rate >= 80 ? 'bg-green-500' : am.completion_rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${am.completion_rate}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold ${am.completion_rate >= 80 ? 'text-green-700' : am.completion_rate >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                            {am.completion_rate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded row */}
                    {expandedAM === am.am_id && (
                      <tr>
                        <td colSpan={9} className="px-6 pb-4 pt-0 bg-gray-50">
                          <div className="grid grid-cols-4 gap-3 pt-3">
                            {[
                              { label: 'Calls Today', value: am.total_calls_today, color: 'text-blue-700' },
                              { label: 'Completed', value: am.completed, color: 'text-green-700' },
                              { label: 'Pending', value: am.pending, color: 'text-amber-700' },
                              { label: 'Missed', value: am.missed, color: 'text-red-700' },
                            ].map((s) => (
                              <div key={s.label} className="bg-white rounded-xl p-3 border border-gray-200 text-center">
                                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: SLA Breaches */}
      {selectedTab === 'sla' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">SLA Breach Alerts</h2>
            <span className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-full font-medium">
              {data.slaBreaches.length} active breaches
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {data.slaBreaches.map((breach) => {
              const typeCfg = CALL_TYPE_COLORS[breach.call_type];
              return (
                <div key={breach.call_request_id} className="px-6 py-4 hover:bg-red-50/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-red-100 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{breach.client_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{breach.am_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${typeCfg.bg} ${typeCfg.text}`}>
                        {breach.call_type}
                      </span>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${breach.days_overdue === 0 ? 'text-amber-600' : 'text-red-600'}`}>
                          {breach.days_overdue === 0 ? '⚠️ Due Today' : `🔴 ${breach.days_overdue}d overdue`}
                        </p>
                        <p className="text-xs text-gray-400">Deadline: {format(parseISO(breach.deadline_date), 'dd MMM')}</p>
                      </div>
                      <PriorityBadge score={breach.priority_score} />
                      {breach.miss_count > 0 && (
                        <span className="text-xs text-gray-500">{breach.miss_count}× missed</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Priority Queue */}
      {selectedTab === 'queue' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Top Unscheduled Calls (Priority Order)</h2>
            <span className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full font-medium">
              Sorted by priority score
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {[...data.priorityQueue].sort((a, b) => b.priority_score - a.priority_score).map((item, idx) => {
              const typeCfg = CALL_TYPE_COLORS[item.call_type];
              return (
                <div key={item.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-gray-300 w-5">#{idx + 1}</span>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{item.client_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.am_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${typeCfg.bg} ${typeCfg.text}`}>
                        {item.call_type}
                      </span>
                      {item.delay_days > 0 && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                          +{item.delay_days}d delay
                        </span>
                      )}
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Deadline: {format(parseISO(item.deadline_date), 'dd MMM')}</p>
                      </div>
                      <PriorityBadge score={item.priority_score} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Call Type Distribution */}
      {selectedTab === 'distribution' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Call Type Distribution</h2>
          <div className="space-y-4">
            {callTypeDistribution.map(({ type, count, pct }) => {
              const cfg = CALL_TYPE_COLORS[type];
              return (
                <div key={type} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-28">
                    <div className={`h-3 w-3 rounded-full ${cfg.dot}`} />
                    <span className="text-sm font-medium text-gray-700">{type}</span>
                  </div>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${cfg.dot}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 w-20 text-right">
                    <span className="text-sm text-gray-500 ml-auto">{count} calls</span>
                    <span className={`text-sm font-bold ${cfg.text}`}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Cards */}
          <div className="mt-8 grid grid-cols-4 gap-3">
            {callTypeDistribution.map(({ type, count, pct }) => {
              const cfg = CALL_TYPE_COLORS[type];
              return (
                <div key={type} className={`${cfg.bg} rounded-xl p-4 text-center`}>
                  <p className={`text-2xl font-black ${cfg.text}`}>{count}</p>
                  <p className="text-xs font-medium text-gray-600 mt-1">{type}</p>
                  <p className={`text-xs font-bold ${cfg.text} mt-0.5`}>{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCallMonitor;
