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
    clientId?: string;
}

const FeedbackButton: React.FC<FeedbackProps> = ({ user, optedJobLinks, clientId }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [comment, setComment] = useState<string>('');
    const [feedbackType, setFeedbackType] = useState<FeedbackType | TicketType>(optedJobLinks ? 'jobBoard_call_support' : 'general');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clientTickets, setClientTickets] = useState<Ticket[]>([]);
    const [isTicketsModalOpen, setIsTicketsModalOpen] = useState(false);

    // Cancel subscription flow
    const [cancelPreviewData, setCancelPreviewData] = useState<{ name: string; subscription_id: string; provider: string; transaction_id: string | null } | null>(null);
    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
    const [isFetchingPreview, setIsFetchingPreview] = useState(false);
    const [isCancellingNow, setIsCancellingNow] = useState(false);
    const [cancelEmail, setCancelEmail] = useState(user?.email || '');

    useEffect(() => {
        if (isOpen) {
            setFeedbackType(optedJobLinks ? 'jobBoard_call_support' : 'general');
            setCancelEmail(user?.email || '');
        }
    }, [isOpen, optedJobLinks, user?.email]);

    useEffect(() => {
        if (optedJobLinks && user?.email) {
            fetchClientTickets();
        }
    }, [optedJobLinks, user?.email]);

    const fetchClientTickets = async () => {
        try {
            // Use passed clientId prop directly; fall back to email-based lookup
            let resolvedClientId = clientId;

            if (!resolvedClientId) {
                if (!user?.email) return;
                const { data: clientData } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('company_email', user.email)
                    .single();
                resolvedClientId = clientData?.id;
            }

            if (resolvedClientId) {
                const { data: tickets, error } = await supabase
                    .from('tickets')
                    .select('*')
                    .eq('clientId', resolvedClientId)
                    .order('createdat', { ascending: false });

                if (!error && tickets) {
                    setClientTickets(tickets);
                }
            }
        } catch (error) {
            console.error('Error fetching client tickets:', error);
        }
    };

    // Step 1: Fetch preview and open confirmation modal
    const handleCancelSubscriptionPreview = async () => {
        setIsFetchingPreview(true);
        try {
            const res = await fetch('https://apply-wizz.com/api/cancel-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: cancelEmail, preview: true })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Could not fetch subscription details.');
            setCancelPreviewData(data.data);
            setIsOpen(false);
            setIsCancelConfirmOpen(true);
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch subscription details.');
        } finally {
            setIsFetchingPreview(false);
        }
    };

    // Step 2: Actually cancel, then create ticket + send emails
    const handleConfirmCancel = async () => {
        setIsCancellingNow(true);
        try {
            // 2a. Call the real cancellation endpoint
            const res = await fetch('https://apply-wizz.com/api/cancel-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: cancelEmail,
                    reason: comment.trim() || 'User requested cancellation via portal'
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Cancellation failed.');

            // 2b. Resolve clientId for ticket
            let resolvedClientId = clientId || null;
            if (!resolvedClientId) {
                const { data: clientData } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('company_email', user.email)
                    .single();
                resolvedClientId = clientData?.id || null;
            }

            // 2c. Create ticket in Supabase
            const newTicket = {
                id: uuidv4(),
                title: 'Subscription Cancellation Request',
                description: comment.trim() || 'Client cancelled subscription via portal.',
                type: 'jobBoard_subscription_cancellation',
                clientId: resolvedClientId,
                createdby: user.id,
                priority: 'medium',
                status: 'open',
                createdat: new Date().toISOString(),
                dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                short_code: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
                createdbyclient: true
            };
            await supabase.from('tickets').insert([newTicket]);

            // 2d. Fetch end_date from jobboard_transactions to include in email
            let formattedEndDate = 'the end of your current billing cycle';
            try {
                const { data: jobboardTx } = await supabase
                    .from('jobboard_transactions')
                    .select('end_date')
                    .eq('email', cancelEmail)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                
                if (jobboardTx?.end_date) {
                    formattedEndDate = new Date(jobboardTx.end_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                }
            } catch (err) {
                console.error('Failed to fetch end_date:', err);
            }

            // 2e. Notify internal team
            try {
                await fetch(`${import.meta.env.VITE_TICKETING_TOOL_API_URL_DEV}/api/send-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: 'bhanuteja@applywizz.com',
                        cc: ['bhanutejathouti@gmail.com'],
                        subject: 'job board cancel subscription ticket raised',
                        htmlBody: `
                         <html>
                          <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">
                            <div style="text-align:center; margin-bottom:20px;">
                              <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" alt="ApplyWizz Logo" style="width:150px;"/>
                            </div>
                            <p><strong>Client Name:</strong> ${user.name}</p>
                            <p><strong>Client Email:</strong> ${user.email}</p>
                            <p><strong>Subscription ID:</strong> ${cancelPreviewData?.subscription_id || 'N/A'}</p>
                            <p><strong>Provider:</strong> ${cancelPreviewData?.provider || 'N/A'}</p>
                            <p><strong>Reason:</strong> ${comment.trim() || 'No reason provided'}</p>
                            <p>Best regards,<br/> <strong>ApplyWizz Support Team.</strong></p>
                          </body>
                         </html>
                        `
                    })
                });
            } catch (emailErr) {
                console.error('Failed to send internal cancel email:', emailErr);
            }

            // 2f. Confirm email to client
            try {
                await fetch(`${import.meta.env.VITE_TICKETING_TOOL_API_URL_DEV}/api/send-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: user.email,
                        subject: 'Subscription Cancellation Confirmed',
                        htmlBody: `
                         <html>
                          <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">
                            <div style="text-align:center; margin-bottom:20px;">
                              <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" alt="ApplyWizz Logo" style="width:150px;"/>
                            </div>
                            <p>Hi <strong>${user.name}</strong>,</p>
                            <p>Your subscription has been successfully cancelled.</p>
                            <p>You can continue using the services until <strong>${formattedEndDate}</strong>, after which your access will be stopped.</p>
                            <p>Ticket <strong>${newTicket.short_code}</strong> has been created for your records. You can track it under <strong>View Tickets</strong> in the Help & Support section.</p>
                            <p>Best regards,<br/> <strong>ApplyWizz Support Team</strong></p>
                          </body>
                         </html>
                        `
                    })
                });
            } catch (clientEmailErr) {
                console.error('Failed to send client cancel confirmation email:', clientEmailErr);
            }

            toast.success('Subscription cancelled successfully!');
            fetchClientTickets();
        } catch (err: any) {
            console.error('Cancellation error:', err);
            toast.error(err.message || 'Failed to cancel subscription. Please try again.');
        } finally {
            setIsCancellingNow(false);
            setIsCancelConfirmOpen(false);
            setCancelPreviewData(null);
            setComment('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Cancel Subscription: use the two-step preview+confirm flow
        if (feedbackType === 'jobBoard_subscription_cancellation') {
            await handleCancelSubscriptionPreview();
            return;
        }

        if (comment.trim() === '') {
            toast.error('Please enter a description');
            return;
        }

        setIsSubmitting(true);

        try {
            if (optedJobLinks) {
                // Use passed clientId prop directly; fall back to email-based lookup
                let resolvedClientId = clientId || null;

                if (!resolvedClientId) {
                    const { data: clientData } = await supabase
                        .from('clients')
                        .select('id')
                        .eq('company_email', user.email)
                        .single();
                    resolvedClientId = clientData?.id || null;
                }

                const newTicket = {
                    id: uuidv4(),
                    title: feedbackType === 'jobBoard_call_support' ? 'Call Support Request' : 'Subscription Cancellation Request',
                    description: comment,
                    type: feedbackType,
                    clientId: resolvedClientId,
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
                // if (resolvedClientId) {
                //     await supabase
                //         .from('ticket_assignments')
                //         .delete()
                //         .eq('ticket_id', newTicket.id)
                //         .neq('user_id', user.id); // keep the client if they were auto-assigned, but remove the AM
                // }

                const emailSubject = feedbackType === 'jobBoard_call_support' ? "job board call support ticket raised" : "job board cancel subscription ticket raised";
                const emailTo = "bhanuteja@applywizz.com";
                const emailCc = ["bhanutejathouti@gmail.com"];

                try {
                    await fetch(`${import.meta.env.VITE_TICKETING_TOOL_API_URL_DEV}/api/send-email`, {
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
                    await fetch(`${import.meta.env.VITE_TICKETING_TOOL_API_URL_DEV}/api/send-email`, {
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
                        {feedbackType === 'jobBoard_subscription_cancellation' && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Account Email (for cancellation)
                                </label>
                                <input
                                    type="email"
                                    value={cancelEmail}
                                    onChange={(e) => setCancelEmail(e.target.value)}
                                    placeholder="Enter associated email"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">Verify this is the email used for subscription.</p>
                            </div>
                        )}
                        {feedbackType !== 'jobBoard_subscription_cancellation' && (
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
                        )}
                        <div className="flex justify-between items-center mt-4">
                            {optedJobLinks && clientTickets.length > 0 && (
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

            {/* Cancel Subscription Confirmation Modal */}
            {isCancelConfirmOpen && cancelPreviewData && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        {/* Header */}
                        <div className="bg-red-600 p-4 flex items-center justify-between">
                            <h3 className="text-white text-lg font-semibold">Confirm Cancellation</h3>
                            <button
                                onClick={() => { setIsCancelConfirmOpen(false); setCancelPreviewData(null); }}
                                className="text-white hover:text-red-200 transition-colors"
                                disabled={isCancellingNow}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Subscription Details */}
                        <div className="p-5">
                            <p className="text-sm text-gray-500 mb-4">Please review your subscription details before confirming cancellation.</p>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg divide-y divide-gray-200">
                                <div className="flex justify-between px-4 py-3">
                                    <span className="text-sm text-gray-500 font-medium">Name</span>
                                    <span className="text-sm text-gray-800 font-semibold">{cancelPreviewData.name}</span>
                                </div>
                                <div className="flex justify-between px-4 py-3">
                                    <span className="text-sm text-gray-500 font-medium">Provider</span>
                                    <span className="text-sm text-gray-800 font-semibold">{cancelPreviewData.provider}</span>
                                </div>
                                <div className="flex justify-between px-4 py-3">
                                    <span className="text-sm text-gray-500 font-medium">Subscription ID</span>
                                    <span className="text-sm text-gray-800 font-mono break-all">{cancelPreviewData.subscription_id}</span>
                                </div>
                                {cancelPreviewData.transaction_id && (
                                    <div className="flex justify-between px-4 py-3">
                                        <span className="text-sm text-gray-500 font-medium">Transaction ID</span>
                                        <span className="text-sm text-gray-800 font-mono break-all">{cancelPreviewData.transaction_id}</span>
                                    </div>
                                )}
                            </div>

                            {/* Optional Reason */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Tell us why you're cancelling..."
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 min-h-[80px] text-sm"
                                    disabled={isCancellingNow}
                                />
                            </div>

                            <p className="mt-3 text-xs text-red-500 font-medium">⚠️ This action is irreversible. Your subscription will be cancelled immediately.</p>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 px-5 pb-5">
                            <button
                                onClick={() => { setIsCancelConfirmOpen(false); setCancelPreviewData(null); }}
                                disabled={isCancellingNow}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                            >
                                Go Back
                            </button>
                            <button
                                onClick={handleConfirmCancel}
                                disabled={isCancellingNow}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isCancellingNow ? (
                                    <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Cancelling...</>
                                ) : 'Confirm Cancellation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fetching Preview Overlay */}
            {isFetchingPreview && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-xl px-8 py-6 shadow-xl flex flex-col items-center gap-3">
                        <span className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-black rounded-full"></span>
                        <p className="text-sm font-medium text-gray-700">Fetching subscription details...</p>
                    </div>
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
                                <span>Help & Support</span>
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
