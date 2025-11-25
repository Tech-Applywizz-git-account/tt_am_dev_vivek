import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  Target,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';
import { User, Ticket } from '../../types';

type Escalation = {
  id: string;
  ticket_id: string;
  ca_id: string;
  escalated_by: string;
  reason: string;
  created_at: string;
  tickets: { title: string; type: string; short_code: string };
  ca: { name: string };
  escalated_by_user: { name: string };
};


interface ExecutiveDashboardProps {
  user: User;
  tickets: Ticket[];
  escalations: Escalation[];
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ user, tickets, escalations }) => {
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const escalatedTickets = tickets.filter(t => t.status === 'escalated').length;
  const criticalTickets = tickets.filter(t => t.priority === 'critical').length;
  const slaBreaches = tickets.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'resolved').length;

  const [filterType, setFilterType] = useState('');


  const recentEscalations = tickets
    .filter(t => t.escalationLevel > 0)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const criticalIssues = tickets
    .filter(t => t.priority === 'critical' && t.status !== 'resolved')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const isExecutive = ['ceo', 'coo', 'cro'].includes(user.role);

  return (

    <div className="space-y-8">
      <div className="mb-4">
        <label htmlFor="ticket-type-filter" className="text-sm font-medium text-gray-700 mr-2">Filter by Ticket Type:</label>
        <select
          id="ticket-type-filter"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border px-3 py-1 rounded text-sm"
        >
          <option value="">All</option>
          <option value="volume_shortfall">Volume Shortfall</option>
          <option value="resume_update">Resume Update</option>
          <option value="data_mismatch">Data Mismatch</option>
          {/* Add more as needed */}
        </select>
      </div>
      {/* Executive Summary */}
      {/* <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Executive Overview</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-600">{criticalTickets}</div>
            <div className="text-sm text-red-700">Critical Issues</div>
          </div>

          <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
            <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-600">{slaBreaches}</div>
            <div className="text-sm text-orange-700">SLA Breaches</div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
            <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600">{escalatedTickets}</div>
            <div className="text-sm text-purple-700">Escalated</div>
          </div>

          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">{openTickets}</div>
            <div className="text-sm text-blue-700">Open Tickets</div>
          </div>
        </div>
      </div> */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4 text-red-800">🚨 Escalated Tickets</h2>

        {escalations === null ? (
          <p className="text-gray-500">Loading escalations...</p>
        ) : escalations.length === 0 ? (
          <p className="text-gray-500">No escalations found.</p>
        ) : (
          <div className="space-y-4">
            {escalations
              .filter((esc) => !filterType || esc.tickets?.type === filterType)
              .map((esc) => (
                <div key={esc.id} className="border border-red-300 bg-red-50 p-4 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-600">
                      Ticket: <span className="text-black">{esc.tickets?.title}</span> ({esc.tickets?.short_code})
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(esc.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm mb-2">
                    <strong>CA:</strong> {esc.ca?.name || 'Unknown'}
                  </p>
                  <p className="text-sm mb-2">
                    <strong>Escalated By:</strong> {esc.escalated_by_user?.name || 'Unknown'}
                  </p>
                  <p className="text-sm text-red-700">
                    <strong>Reason:</strong> {esc.reason}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Critical Issues Requiring Attention */}
      {/* {isExecutive && criticalIssues.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Critical Issues Requiring Immediate Attention</h2>
          </div>

          <div className="space-y-4">
            {criticalIssues.map(ticket => {
              const timeOverdue = new Date().getTime() - new Date(ticket.dueDate).getTime();
              const hoursOverdue = Math.floor(timeOverdue / (1000 * 60 * 60));

              return (
                <div key={ticket.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900">{ticket.title}</h3>
                    <p className="text-sm text-red-700 mt-1">{ticket.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-red-600">
                      <span>Escalation Level: {ticket.escalationLevel}</span>
                      {hoursOverdue > 0 && <span>Overdue by: {hoursOverdue} hours</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                      {ticket.priority.toUpperCase()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )} */}

      {/* Recent Escalations */}
      {/* {isExecutive && recentEscalations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Escalations</h2>

          <div className="space-y-4">
            {recentEscalations.map(ticket => (
              <div key={ticket.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{ticket.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>Level {ticket.escalationLevel}</span>
                    <span>Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${ticket.status === 'escalated' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {ticket.status.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )} */}

      {/* SLA Performance */}
      {/* <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">SLA Performance</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 border border-green-200 rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">87%</div>
            <div className="text-sm text-green-700">On-time Resolution</div>
          </div>

          <div className="text-center p-4 border border-yellow-200 rounded-lg">
            <Calendar className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-600">18.5</div>
            <div className="text-sm text-yellow-700">Avg Resolution (hrs)</div>
          </div>

          <div className="text-center p-4 border border-red-200 rounded-lg">
            <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-600">{slaBreaches}</div>
            <div className="text-sm text-red-700">SLA Breaches</div>
          </div>
        </div>
      </div> */}

      {/* Role-Specific Insights */}
      {/* {user.role === 'ceo' && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">CEO Strategic Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Operational Health</h3>
              <p className="text-sm text-gray-600">
                Customer satisfaction at risk with {slaBreaches} SLA breaches this week.
                {criticalTickets > 0 && ` ${criticalTickets} critical issues require immediate attention.`}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Escalation Trends</h3>
              <p className="text-sm text-gray-600">
                {escalatedTickets} tickets escalated to leadership level.
                Focus needed on credential management and volume delivery.
              </p>
            </div>
          </div>
        </div>
      )}

      {user.role === 'coo' && (
        <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">COO Operations Dashboard</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Team Performance</span>
              <span className="text-green-600 font-semibold">Good</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">SLA Compliance</span>
              <span className="text-yellow-600 font-semibold">Needs Attention</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Escalation Rate</span>
              <span className="text-red-600 font-semibold">High</span>
            </div>
          </div>
        </div>
      )}

      {user.role === 'cro' && (
        <div className="bg-gradient-to-r from-teal-50 to-green-50 rounded-xl border border-teal-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">CRO Client Operations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Client Impact</h3>
              <p className="text-sm text-gray-600">
                Monitor {criticalTickets} critical client issues. Focus on volume shortfalls and credential management.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Team Accountability</h3>
              <p className="text-sm text-gray-600">
                Review CA performance and issue warning emails for policy violations.
              </p>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};