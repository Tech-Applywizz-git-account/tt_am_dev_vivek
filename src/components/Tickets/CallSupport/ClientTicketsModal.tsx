import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Clock, AlertTriangle } from 'lucide-react';
import { Ticket, User } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { JobBoardTicketEditModal } from './JobBoardTicketEditModal';
import { format } from 'date-fns';
import { ticketTypeLabels } from '@/data/mockData';

interface ClientTicketsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    clientTickets: Ticket[];
    fetchTickets: () => void;
}

export const ClientTicketsModal: React.FC<ClientTicketsModalProps> = ({
    isOpen,
    onClose,
    user,
    clientTickets,
    fetchTickets
}) => {
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    if (!isOpen) return null;

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            open: 'bg-blue-100 text-blue-800',
            in_progress: 'bg-purple-100 text-purple-800',
            resolved: 'bg-green-100 text-green-800',
            escalated: 'bg-red-100 text-red-800',
            closed: 'bg-gray-100 text-gray-800',
            manager_attention: 'bg-indigo-100 text-indigo-800',
            forwarded: 'bg-yellow-100 text-yellow-800',
            replied: 'bg-orange-100 text-orange-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Your Tickets</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {clientTickets.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-gray-500">You don't have any tickets yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {clientTickets.map(ticket => (
                                <div
                                    key={ticket.id}
                                    className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gray-50 hover:bg-white"
                                    onClick={() => setSelectedTicket(ticket)}
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-900 truncate max-w-[250px]">
                                                {ticket.title}
                                            </span>
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                                                {ticket.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                            {ticket.status === 'closed' && (
                                                <span className="px-2 py-0.5 text-xs font-medium flex items-center gap-1 bg-green-100 text-green-800 rounded-full border border-green-200">
                                                    Action Required
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500 flex items-center gap-4">
                                            <span>Type: {ticketTypeLabels[ticket.type] || ticket.type}</span>
                                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                                                <Clock className="h-3 w-3" />
                                                {format(new Date(ticket.createdat), 'MMM dd, yyyy')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center text-blue-600 font-medium text-sm gap-1 hover:text-blue-700">
                                        View Details <ExternalLink className="h-4 w-4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Individual ticket view modal */}
            {selectedTicket && (
                <JobBoardTicketEditModal
                    ticket={selectedTicket}
                    user={user}
                    isOpen={!!selectedTicket}
                    assignments={{}} /* empty assignments for client */
                    onClose={() => setSelectedTicket(null)}
                    onSubmit={() => { }} /* we do not update ticket details here directly */
                    onUpdate={() => {
                        fetchTickets();
                        setSelectedTicket(null);
                    }}
                />
            )}
        </div>
    );
};
