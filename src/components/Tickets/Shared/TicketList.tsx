import React, { useState, useEffect } from 'react';
import { Ticket, User, TicketType, TicketStatus, TicketPriority } from '../../../types';
import { TicketCard } from '../Shared/TicketCard';
import { Search, Filter, SortAsc, X } from 'lucide-react';
import { ticketTypeLabels } from '../../../data/mockData';
import { supabase } from '../../../lib/supabaseClient';

interface AssignedUser {
  id: string;
  name: string;
}

interface CATeamLead {
  id: string;
  name: string;
}

interface TicketListProps {
  tickets: Ticket[];
  user: User;
  assignments: Record<string, AssignedUser[]>;
  onTicketClick: (ticket: Ticket) => void;
  initialFilterStatus?: TicketStatus | 'all';
  initialFilterType?: TicketType | 'all';
  initialFilterPriority?: TicketPriority | 'all';
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  user,
  assignments,
  onTicketClick,
  initialFilterStatus = 'all',
  initialFilterType = 'all',
  initialFilterPriority = 'all'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<TicketType | 'all'>(initialFilterType);
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>(initialFilterStatus);
  const [filterPriority, setFilterPriority] = useState<TicketPriority | 'all'>(initialFilterPriority);
  const [filterCATeamLead, setFilterCATeamLead] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created' | 'priority' | 'due'>('created');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [caTeamLeads, setCaTeamLeads] = useState<CATeamLead[]>([]);
  const [loadingCATeamLeads, setLoadingCATeamLeads] = useState(false);

  // Define roles that can see the CA Team Lead filter
  const canSeeCATeamLeadFilter = ['cro', 'ceo', 'coo', 'account_manager'].includes(user.role);

  // Fetch CA Team Leads
  useEffect(() => {
    // Only fetch CA Team Leads if user can see the filter
    if (!canSeeCATeamLeadFilter) return;

    const fetchCATeamLeads = async () => {
      setLoadingCATeamLeads(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name')
          .eq('role', 'ca_team_lead')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;

        setCaTeamLeads(data || []);
      } catch (error) {
        console.error('Error fetching CA Team Leads:', error);
      } finally {
        setLoadingCATeamLeads(false);
      }
    };

    fetchCATeamLeads();
  }, [canSeeCATeamLeadFilter]);
  const filteredTickets = tickets
    .filter(ticket => {
      const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.short_code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || ticket.type === filterType;
      const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;

      // Filter by CA Team Lead assignment (only if user can see this filter)
      const matchesCATeamLead = !canSeeCATeamLeadFilter || filterCATeamLead === 'all' ||
        (assignments[ticket.id] && assignments[ticket.id].some(u => u.id === filterCATeamLead));
      const ticketDate = new Date(ticket.createdat).toISOString().split('T')[0];
      const matchesDateFrom = !filterDateFrom || ticketDate >= filterDateFrom;
      const matchesDateTo = !filterDateTo || ticketDate <= filterDateTo;

      return matchesSearch && matchesType && matchesStatus && matchesPriority && matchesCATeamLead && matchesDateFrom && matchesDateTo;
    })
    .sort((a, b) => {
      if (sortBy === 'created') {
        return new Date(b.createdat).getTime() - new Date(a.createdat).getTime();
      }
      if (sortBy === 'priority') {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      if (sortBy === 'due') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });

  // Get label for current filter values
  const getFilterLabel = (filterValue: string, filterType: 'type' | 'status' | 'priority' | 'ca_team_lead') => {
    if (filterValue === 'all') return '';

    switch (filterType) {
      case 'type':
        return ticketTypeLabels[filterValue as TicketType] || filterValue;
      case 'status':
        return filterValue.replace('_', ' ');
      case 'priority':
        return filterValue.charAt(0).toUpperCase() + filterValue.slice(1);
      case 'ca_team_lead':
        const lead = caTeamLeads.find(l => l.id === filterValue);
        return lead ? lead.name : 'Unknown Lead';
      default:
        return filterValue;
    }
  };

  // Check if any filters are active (excluding 'all')
  const hasActiveFilters = filterType !== 'all' || filterStatus !== 'all' || filterPriority !== 'all' ||
    (canSeeCATeamLeadFilter && filterCATeamLead !== 'all') || filterDateFrom !== '' || filterDateTo !== '';

  // Reset all filters
  const resetFilters = () => {
    setFilterType('all');
    setFilterStatus('all');
    setFilterPriority('all');
    // Only reset CA Team Lead filter if user can see it
    if (canSeeCATeamLeadFilter) {
      setFilterCATeamLead('all');
    }
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      {/* Search and Main Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${showFilters
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {['type', 'status', 'priority', 'ca_team_lead', 'date'].filter(type => {
                    if (type === 'type') return filterType !== 'all';
                    if (type === 'status') return filterStatus !== 'all';
                    if (type === 'priority') return filterPriority !== 'all';
                    if (type === 'ca_team_lead') return filterCATeamLead !== 'all';
                    if (type === 'date') return filterDateFrom !== '' || filterDateTo !== '';
                    return false;
                  }).length}
                </span>
              )}
            </button>

            <div className="relative">
              <select
                aria-label="Sort tickets"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'created' | 'priority' | 'due')}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="created">Sort by Created</option>
                <option value="priority">Sort by Priority</option>
                <option value="due">Sort by Due Date</option>
              </select>
              <SortAsc className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(hasActiveFilters || searchTerm) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {searchTerm && (
              <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                <span>Search: "{searchTerm}"</span>
                <button onClick={() => setSearchTerm('')} className="hover:bg-blue-200 rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {filterType !== 'all' && (
              <div className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                <span>Type: {getFilterLabel(filterType, 'type')}</span>
                <button onClick={() => setFilterType('all')} className="hover:bg-green-200 rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {filterStatus !== 'all' && (
              <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                <span>Status: {getFilterLabel(filterStatus, 'status')}</span>
                <button onClick={() => setFilterStatus('all')} className="hover:bg-yellow-200 rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {filterPriority !== 'all' && (
              <div className="flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                <span>Priority: {getFilterLabel(filterPriority, 'priority')}</span>
                <button onClick={() => setFilterPriority('all')} className="hover:bg-purple-200 rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {filterCATeamLead !== 'all' && (
              <div className="flex items-center gap-1 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                <span>CA Lead: {getFilterLabel(filterCATeamLead, 'ca_team_lead')}</span>
                <button onClick={() => setFilterCATeamLead('all')} className="hover:bg-indigo-200 rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {(filterDateFrom || filterDateTo) && (
              <div className="flex items-center gap-1 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                <span>
                  Date: {filterDateFrom || '...'} to {filterDateTo || '...'}
                </span>
                <button
                  onClick={() => {
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                  className="hover:bg-orange-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <button
              onClick={resetFilters}
              className="text-sm text-gray-500 hover:text-gray-700 underline ml-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Collapsible Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Type</label>
              <select
                aria-label="Filter by ticket type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as TicketType | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                {Object.entries(ticketTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                aria-label="Filter by priority"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as TicketPriority | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>


            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                aria-label="Filter by ticket status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as TicketStatus | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="forwarded">Forwarded</option>
                <option value="replied">Replied</option>
                <option value="manager_attention">Manager Attention</option>
                <option value="pending_client_review">Pending Client Review</option>
                <option value="reopen">Reopen</option>
                <option value="resolved">Resolved</option>
                <option value="escalated">Escalated</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            
            {/* CA Team Lead Filter - only shown to specific roles */}
            {canSeeCATeamLeadFilter && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CA Team Lead</label>
                <select
                  aria-label="Filter by CA Team Lead"
                  value={filterCATeamLead}
                  onChange={(e) => setFilterCATeamLead(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loadingCATeamLeads}
                >
                  <option value="all">All CA Team Leads</option>
                  {loadingCATeamLeads ? (
                    <option value="loading" disabled>Loading...</option>
                  ) : (
                    caTeamLeads.map(lead => (
                      <option key={lead.id} value={lead.id}>{lead.name}</option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ticket Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredTickets.length} of {tickets.length} tickets
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTickets.map(ticket => (
          <div key={ticket.id}>
            <TicketCard ticket={ticket} onClick={onTicketClick} />
          </div>
        ))}
      </div>

      {filteredTickets.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Filter className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria</p>

          {(hasActiveFilters || searchTerm) && (
            <button
              onClick={resetFilters}
              className="mt-4 text-blue-600 hover:text-blue-800 underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};
