import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { User, Ticket } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { X, ExternalLink } from 'lucide-react';
import { ClientTicketsModal } from './Tickets/CallSupport/ClientTicketsModal';

type FeedbackType = 'bug' | 'feature' | 'general';
type TicketType = 'jobBoard_call_support' | 'jobBoard_subscription_cancellation';

interface FeedbackProps {
    user: User;
    optedJobLinks?: boolean;
}

const FeedbackButton: React.FC<FeedbackProps> = ({ user, optedJobLinks }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [comment, setComment] = useState<string>('');
    const [feedbackType, setFeedbackType] = useState<FeedbackType | TicketType>(optedJobLinks ? 'jobBoard_call_support' : 'general');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clientTickets, setClientTickets] = useState<Ticket[]>([]);
    const [isTicketsModalOpen, setIsTicketsModalOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFeedbackType(optedJobLinks ? 'jobBoard_call_support' : 'general');
        }
    }, [isOpen, optedJobLinks]);

    useEffect(() => {
        if (optedJobLinks && user?.email) {
            fetchClientTickets();
        }
    }, [optedJobLinks, user?.email]);

    const fetchClientTickets = async () => {
        if (!user?.email) return;

        try {
            const { data: clientData } = await supabase
                .from('clients')
                .select('id')
                .eq('company_email', user.email)
                .single();

            if (clientData) {
                const { data: tickets, error } = await supabase
                    .from('tickets')
                    .select('*')
                    .eq('clientId', clientData.id)
                    .order('createdat', { ascending: false });

                if (!error && tickets) {
                    setClientTickets(tickets);
                }
            }
        } catch (error) {
            console.error('Error fetching client tickets:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (comment.trim() === '') {
            toast.error('Please enter a description');
            return;
        }

        setIsSubmitting(true);

        try {
            if (optedJobLinks) {
                const { data: clientData } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('company_email', user.email)
                    .single();

                const clientId = clientData?.id || null;

                const newTicket = {
                    id: uuidv4(),
                    title: feedbackType === 'jobBoard_call_support' ? 'Call Support Request' : 'Subscription Cancellation Request',
                    description: comment,
                    type: feedbackType,
                    clientId: clientId,
                    createdby: user.id,
                    priority: 'medium',
                    status: 'open',
                    createdat: new Date().toISOString(),
                    dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                    short_code: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
                    createdbyclient: true
                };

                const { error: ticketError } = await supabase.from('tickets').insert([newTicket]);

                if (ticketError) throw ticketError;

                // WORKAROUND for Supabase Trigger:
                // The database automatically assigns the client's Account Manager to any new ticket.
                // For Job Board tickets, we don't want the Account Manager assigned by default.
                // So we immediately delete any assignments made to other users (like the Account Manager).
                if (clientId) {
                    await supabase
                        .from('ticket_assignments')
                        .delete()
                        .eq('ticket_id', newTicket.id)
                        .neq('user_id', user.id); // keep the client if they were auto-assigned, but remove the AM
                }

                const emailSubject = feedbackType === 'jobBoard_call_support' ? "call support ticket raised" : "cancel subscription ticket raised";
                const emailTo = "bhanuteja@applywizz.com";
                const emailCc = ["bhanutejathouti@gmail.com"];

                try {
                    await fetch(`${import.meta.env.VITE_TICKETING_TOOL_API_URL}/api/send-email`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            to: emailTo,
                            cc: emailCc,
                            subject: emailSubject,
                            htmlBody: `
                             <html>
                              <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
                                <div style="text-align:center; margin-bottom:20px;">
                                  <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                                       alt="ApplyWizz Logo" 
                                       style="width:150px;"/>
                                </div>
                                <p><strong>Client Name:</strong> ${user.name}</p>
                                <p><strong>Client Email:</strong> ${user.email}</p>
                                <p><strong>Description:</strong> ${comment}</p>
                                <p>Best regards,<br/> <strong>ApplyWizz Support Team.</strong></p> 
                              </body>
                            </html>
                          `
                        })
                    });
                } catch (emailError) {
                    console.error("Failed to send support email:", emailError);
                }

                // Send confirmation email to the client
                try {
                    const clientEmailSubject = feedbackType === 'jobBoard_call_support' ? "Call Support Ticket Received" : "Subscription Cancellation Request Received";
                    await fetch(`${import.meta.env.VITE_TICKETING_TOOL_API_URL}/api/send-email`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            to: user.email,
                            subject: clientEmailSubject,
                            htmlBody: `
                             <html>
                              <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
                                <div style="text-align:center; margin-bottom:20px;">
                                  <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                                       alt="ApplyWizz Logo" 
                                       style="width:150px;"/>
                                </div>
                                <p>Hi <strong>${user.name}</strong>,</p>
                                <p>Thank you for raising the ticket.</p>
                                <p>Your ticket (<strong>${newTicket.short_code}</strong>) has been successfully created. You can track your ticket in your dashboard at <strong>View Tickets</strong> in the Need Help section.</p>
                                <p>Best regards,<br/> <strong>ApplyWizz Support Team</strong></p> 
                              </body>
                            </html>
                          `
                        })
                    });
                } catch (clientEmailError) {
                    console.error("Failed to send client confirmation email:", clientEmailError);
                }

                toast.success('Ticket submitted successfully!');
                fetchClientTickets();
            } else {
                const { error } = await supabase.from('feedback').insert([
                    {
                        type: feedbackType,
                        content: comment,
                        user_id: user.id,
                        created_at: new Date().toISOString(),
                    },
                ]);

                if (error) throw error;
                toast.success('Feedback submitted successfully!');
            }
        } catch (error: any) {
            console.error('Error submitting feedback:', error);
            toast.error('Failed to submit. Please try again.');
        }

        setIsSubmitting(false);
        setComment('');
        setIsOpen(false);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {isOpen && (
                <div className="mb-4 w-80 bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className={`p-4 text-white flex items-center justify-between ${optedJobLinks ? 'bg-[#171717]' : 'bg-blue-600'}`}>
                        <h3 className="text-lg font-semibold">{optedJobLinks ? 'Submit a Ticket' : 'Submit Feedback'}</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white hover:text-gray-300 transition-colors focus:outline-none"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-4">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {optedJobLinks ? 'Ticket Type' : 'Feedback Type'}
                            </label>
                            <select
                                value={feedbackType}
                                onChange={(e) => setFeedbackType(e.target.value as any)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                                {optedJobLinks ? (
                                    <>
                                        <option value="jobBoard_call_support">Call support</option>
                                        <option value="jobBoard_subscription_cancellation">Cancel Subscription</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="bug">Bug Report</option>
                                        <option value="feature">Feature Request</option>
                                        <option value="general">General Feedback for our tool</option>
                                    </>
                                )}
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Your Feedback
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="What would you like to share with us?"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
                                required
                            />
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            {optedJobLinks && clientTickets.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        setIsTicketsModalOpen(true);
                                    }}
                                    className="px-4 py-2 text-[#171717] bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors font-medium text-sm flex items-center space-x-2"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    <span>View My tickets</span>
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`px-4 py-2 text-white rounded-md transition-colors ${optedJobLinks && clientTickets.length > 1 ? '' : 'ml-auto'} ${optedJobLinks ? 'bg-[#171717] hover:bg-black' : 'bg-blue-600 hover:bg-blue-700'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Floating Buttons Area */}
            <div className="flex items-center justify-end space-x-3">
                {!isOpen && (
                    <button
                        onClick={() => setIsOpen(true)}
                        className={`${optedJobLinks ? 'bg-black hover:bg-gray-800' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-3 rounded-full shadow-lg flex items-center justify-center space-x-2 transition-all`}
                    >
                        {optedJobLinks ? (
                            <>
                                <img src="/customer-support.png" alt="Support" className="h-5 w-5 brightness-0 invert" />
                                <span>Need help</span>
                            </>
                        ) : (
                            <span>💬 Feedback</span>
                        )}
                    </button>
                )}
            </div>

            <ClientTicketsModal
                isOpen={isTicketsModalOpen}
                onClose={() => setIsTicketsModalOpen(false)}
                user={user}
                clientTickets={clientTickets}
                fetchTickets={fetchClientTickets}
            />
        </div>
    );
};

export default FeedbackButton;
