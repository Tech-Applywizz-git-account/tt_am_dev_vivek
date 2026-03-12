import React, { useState, useEffect } from 'react';
import { X, Clock, User, AlertTriangle, CheckCircle, MessageSquare, Calendar, Heading4 } from 'lucide-react';
import { Ticket, User as UserType, Client, TicketStatus } from '../../../types';
import { ticketTypeLabels } from '../../../data/mockData';
import { format } from 'date-fns';
import { supabase } from '../../../lib/supabaseClient';
import { id } from 'date-fns/locale';
// import { toast } from 'sonner';
import { toast } from 'react-toastify';
import JobBoardTicketTimeline from '@/components/Tickets/CallSupport/JobBoardTicketTimeline';
import { v4 as uuidv4 } from 'uuid';

interface AssignedUser {
    id: string;
    name: string;
    role: string;
}

interface TicketEditModalProps {
    ticket: Ticket | null;
    user: UserType;
    isOpen: boolean;
    assignments: Record<string, AssignedUser[]>;
    onClose: () => void;
    onSubmit: (ticketData: any) => void;
    onUpdate: () => void;
}

export const JobBoardTicketEditModal: React.FC<TicketEditModalProps> = ({
    ticket,
    user,
    isOpen,
    assignments,
    onClose,
    onSubmit,
    onUpdate
}) => {
    // State variables to store ticket status, comment, resolution, and escalation reason
    const [status, setStatus] = useState<TicketStatus>('open');
    const [clientEmail, setClientEamil] = useState<string>('');
    const [clientName, setClientName] = useState<string>('');
    const [resolution, setResolution] = useState('');
    const [createdByUser, setCreatedByUser] = useState<any>(null);
    const [client, setClient] = useState<Client>(null);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [alreadyAssignedIds, setAlreadyAssignedIds] = useState(new Set<string>());
    const [comment, setComment] = useState('');
    const [ticketComments, setTicketComments] = useState<any[]>([]);
    const [resolutionComment, setResolutionComment] = useState('');
    const [saprateCommnetID, setSaparateCommnetID] = useState<string>(uuidv4());
    const [salesUsers, setSalesUsers] = useState<UserType[]>([]);
    const [selectedSalesUser, setSelectedSalesUser] = useState<string>('');
    const [isAssigning, setIsAssigning] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            if (!ticket?.createdby) return;
            const { data, error } = await supabase
                .from('users')
                .select('name ,role')
                .eq('id', ticket.createdby)
                .single();
            if (error) {
                console.error('Error fetching user name:', error);
            } else {
                setCreatedByUser(data?.name || '');
            }
        };
        fetchUser();

        const fetchSalesUsers = async () => {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'sales')
                .eq('is_active', true);
            if (!error && data) {
                setSalesUsers(data);
            }
        };
        fetchSalesUsers();
    }, [ticket ? ticket.createdby : null]);

    useEffect(() => {
        if (ticket) {
            setStatus(ticket.status);
            setComment('');
            setResolution('');
        }
    }, [ticket]);

    useEffect(() => {
        const fetchClient = async () => {
            if (!ticket) return;
            if (!ticket.clientId) return;

            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id', ticket.clientId)
                .single(); // because only one client expected

            // console.log('Fetching client', data);
            if (error) {
                console.error('Error fetching client name:', error);
            } else {
                setClient(data || '');
            }
        };
        fetchClient();
    }, [ticket ? ticket.clientId : null])

    useEffect(() => {
        const fetchClientData = async () => {
            if (!ticket) return;
            if (!ticket.clientId) return;
            const { data, error } = await supabase
                .from('clients')
                .select(`full_name,company_email`)
                .eq('id', ticket.clientId)
                .single(); // because only one client expected

            // console.log('Fetching client', data);
            if (error) {
                console.error('Error fetching client name:', error);
            } else {
                setClientName(data?.full_name || '');
                setClientEamil(data?.company_email || '');
            }
        };
        fetchClientData();
    }, [ticket ? ticket.clientId : null]);

    useEffect(() => {
        const fetchTicketActivity = async () => {
            if (!ticket || !ticket.id) return;

            // Fetch Comments
            const { data: comments, error: commentError } = await supabase
                .from('ticket_comments')
                .select(`
          id,
    content,
    created_at,
    user_id,
    is_internal,
    users (
      name,
      role
    )
  `)
                .eq('ticket_id', ticket.id)
                .order('created_at', { ascending: true });
            if (commentError) console.error('Error fetching comments:', commentError);
            else setTicketComments(comments || []);
        };
        fetchTicketActivity();
    }, [ticket]);

    useEffect(() => {
        const fetchTicketAssignments = async () => {
            if (!ticket?.id) return;
            const { data, error } = await supabase
                .from('ticket_assignments')
                .select('user_id')
                .eq('ticket_id', ticket.id);
            if (error) {
                console.error('Failed to fetch ticket assignments:', error);
                return;
            }
            const assignedIds = new Set(data.map(assignment => assignment.user_id));
            setAlreadyAssignedIds(assignedIds);
        };
        fetchTicketAssignments();
    }, [ticket?.id]);

    const handleResolveTicket = async () => {
        if (!ticket || !ticket.id || !user?.id) return;
        if (!resolutionComment) {
            alert("Please write a resolution comment or attach a resolution file.");
            return;
        }
        setIsSubmittingComment(true);
        try {
            if (resolutionComment.trim()) {
                const { error: commentError } = await supabase.from('ticket_comments').insert({
                    id: saprateCommnetID,
                    ticket_id: ticket.id,
                    user_id: user.id,
                    content: resolutionComment,
                    is_internal: false,
                });
                if (commentError) {
                    console.error("Failed to save comment:", commentError);
                    alert("Failed to save comment.");
                    return;
                }
            }

            // 3. Update ticket status to closed
            const { error: updateError } = await supabase
                .from('tickets')
                .update({ status: 'closed', updatedAt: new Date().toISOString() })
                .eq('id', ticket.id);

            if (updateError) {
                alert("Failed to update ticket status.");
                return;
            }

            // Send email to client
            if (ticket.createdby) {
                try {
                    // Fetch client email from the users table because job board clients might not have a reliable 1:1 mapping in the clients table
                    const { data: userData } = await supabase
                        .from('users')
                        .select('email, name')
                        .eq('id', ticket.createdby)
                        .single();

                    if (userData?.email) {
                        const emailSubject = `Ticket Closed: ${ticket.title} (Action Required)`;
                        const emailHtml = `
                            <html>
                            <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
                                <div style="text-align:center; margin-bottom:20px;">
                                <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                                    alt="ApplyWizz Logo" 
                                    style="width:150px;"/>
                                </div>
                                <p>Hi <strong>${userData.name || 'Client'}</strong>,</p>
                                <p>Your ticket <strong>${ticket.short_code || ticket.id}</strong> has been marked as closed by our team.</p>
                                <p>Please log in to your dashboard to review the resolution and mark the ticket as Resolved.</p>
                                <p>Best regards,<br/> <strong>ApplyWizz Support Team</strong></p> 
                            </body>
                            </html>
                        `;
                        await fetch(`${import.meta.env.VITE_TICKETING_TOOL_API_URL_DEV}/api/send-email`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: userData.email,
                                subject: emailSubject,
                                htmlBody: emailHtml
                            })
                        });
                    }
                } catch (emailErr) {
                    console.error("Failed to send client resolution email:", emailErr);
                }
            }

            // Send internal email to support team with resolution details
            try {
                const internalEmailSubject = `Ticket Closed by Sales: ${ticket.title}`;
                const internalEmailTo = "bhanuteja@applywizz.com";
                const internalEmailCc = ["bhanutejathouti@gmail.com"];
                const internalEmailHtml = `
                    <html>
                    <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
                        <div style="text-align:center; margin-bottom:20px;">
                        <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                            alt="ApplyWizz Logo" 
                            style="width:150px;"/>
                        </div>
                        <p>Ticket <strong>${ticket.short_code || ticket.id}</strong> has been marked as closed by <strong>${user.name}</strong>.</p>
                        <p><strong>Title:</strong> ${ticket.title}</p>
                        <p><strong>Resolution Description:</strong> ${resolutionComment}</p>
                    </body>
                    </html>
                `;
                await fetch(`${import.meta.env.VITE_TICKETING_TOOL_API_URL_DEV}/api/send-email`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: internalEmailTo,
                        cc: internalEmailCc,
                        subject: internalEmailSubject,
                        htmlBody: internalEmailHtml
                    })
                });
            } catch (emailErr) {
                console.error("Failed to send internal resolution email:", emailErr);
            }

            toast("Ticket resolved successfully!", {
                position: "top-center",
                autoClose: 4000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });

            onUpdate?.();
            setResolutionComment('');
            setSaparateCommnetID(uuidv4());
            onClose();
        } catch (error) {
            console.error("Resolution error:", error);
            alert("Unexpected error during resolution.");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleClientResolveTicket = async () => {
        if (!ticket || !ticket.id || !user?.id) return;
        setIsSubmittingComment(true);
        try {
            const { error: updateError } = await supabase
                .from('tickets')
                .update({ status: 'resolved', updatedAt: new Date().toISOString() })
                .eq('id', ticket.id);

            if (updateError) {
                alert("Failed to update ticket status.");
                return;
            }

            // Look up the resolution comment to send it to the support team
            let lastSupportComment = "No description provided.";
            try {
                // Find the latest comment made by a non-client before this resolution
                const { data: latestComments } = await supabase
                    .from('ticket_comments')
                    .select('content')
                    .eq('ticket_id', ticket.id)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (latestComments && latestComments.length > 0) {
                    lastSupportComment = latestComments[0].content;
                }
            } catch (e) {
                console.error("Error fetching latest comment for email:", e);
            }

            // Send email to support team
            try {
                const emailSubject = `Ticket Resolved by Client: ${ticket.title}`;
                const emailTo = "bhanuteja@applywizz.com";
                const emailCc = ["bhanutejathouti@gmail.com"];
                const emailHtml = `
                    <html>
                    <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
                        <div style="text-align:center; margin-bottom:20px;">
                        <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                            alt="ApplyWizz Logo" 
                            style="width:150px;"/>
                        </div>
                        <p>The client has confirmed resolution for ticket <strong>${ticket.short_code || ticket.id}</strong>.</p>
                        <p><strong>Title:</strong> ${ticket.title}</p>
                        <p><strong>Description from Sales Person:</strong> ${lastSupportComment}</p>
                    </body>
                    </html>
                `;

                await fetch(`${import.meta.env.VITE_TICKETING_TOOL_API_URL_DEV}/api/send-email`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: emailTo,
                        cc: emailCc,
                        subject: emailSubject,
                        htmlBody: emailHtml
                    })
                });
            } catch (emailErr) {
                console.error("Failed to send support team resolution email:", emailErr);
            }

            toast("Ticket marked as resolved successfully!", {
                position: "top-center",
                autoClose: 4000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                theme: "dark",
            });
            onUpdate?.();
            onClose();
        } catch (error) {
            console.error("Resolution error:", error);
            alert("Unexpected error.");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleAssignTicket = async () => {
        if (!selectedSalesUser || !ticket || !user) return;
        setIsAssigning(true);
        try {
            const { error } = await supabase.from('ticket_assignments').insert({
                ticket_id: ticket.id,
                user_id: selectedSalesUser,
                assignedBy: user.id,
            });

            await supabase.from('tickets').update({ status: 'forwarded' }).eq('id', ticket.id);

            if (error) {
                console.error("Assignment error:", error);
                alert("Failed to assign ticket.");
            } else {
                // Send email notification to the assigned user
                const assignedUserObj = salesUsers.find(u => u.id === selectedSalesUser);
                if (assignedUserObj?.email) {
                    try {
                        const emailSubject = `New Ticket Assigned: ${ticket.title}`;
                        const emailHtml = `
                            <html>
                            <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
                                <div style="text-align:center; margin-bottom:20px;">
                                <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                                    alt="ApplyWizz Logo" 
                                    style="width:150px;"/>
                                </div>
                                <p>Hi <strong>${assignedUserObj.name}</strong>,</p>
                                <p>You have been assigned a new ticket by <strong>${user.name}</strong>.</p>
                                <p><strong>Ticket ID:</strong> ${ticket.short_code || ticket.id}</p>
                                <p><strong>Title:</strong> ${ticket.title}</p>
                                <p><strong>Description:</strong> ${ticket.description}</p>
                                <p>Please log in to the dashboard to resolve it.</p>
                                <p>Best regards,<br/> <strong>ApplyWizz Support Team</strong></p> 
                            </body>
                            </html>
                        `;
                        await fetch(`${import.meta.env.VITE_TICKETING_TOOL_API_URL_DEV}/api/send-email`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: assignedUserObj.email,
                                subject: emailSubject,
                                htmlBody: emailHtml
                            })
                        });
                    } catch (emailErr) {
                        console.error("Failed to send assignment email:", emailErr);
                    }
                }
                toast("Ticket assigned successfully!", {
                    position: "top-center",
                    autoClose: 4000,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    theme: "dark",
                });
                const assignedIds = new Set(alreadyAssignedIds);
                assignedIds.add(selectedSalesUser);
                setAlreadyAssignedIds(assignedIds);
                onUpdate?.();
                setSelectedSalesUser('');
            }
        } finally {
            setIsAssigning(false);
        }
    };

    // If the modal is not open or there is no ticket, return null
    if (!isOpen || !ticket) return null;

    // Function to handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Create an object to store the updated ticket data
        const updateData = {
            status,
            comment,
            resolution,
            updatedBy: user.id,
            updatedAt: new Date(),
        };
        // Call the onSubmit function with the updated ticket data
        onSubmit(updateData);
        // Close the modal
        onClose();
    };

    // Function to check if the user can edit the ticket
    const canEdit = () => {
        // Check if user can edit this ticket based on role and assignment
        if (user.role === 'cro' || user.role === 'coo' || user.role === 'ceo') return true;
        if (alreadyAssignedIds.has(user?.id)) return true;
        return false;
    };

    // Function to get the color of the ticket status
    const getStatusColor = (status: TicketStatus) => {
        const colors = {
            open: 'bg-blue-100 text-blue-800',
            in_progress: 'bg-purple-100 text-purple-800',
            resolved: 'bg-green-100 text-green-800',
            escalated: 'bg-red-100 text-red-800',
            closed: 'bg-gray-100 text-gray-800',
            manager_attention: 'bg-purple-100 text-purple-800',
            forwarded: 'bg-yellow-100 text-yellow-800',
            replied: 'bg-orange-100 text-orange-800',
        };
        return colors[status];
    };

    // Calculate the time until the ticket is due
    const timeUntilDue = new Date(ticket.dueDate).getTime() - new Date().getTime();
    // Check if the ticket is overdue
    const isOverdue = timeUntilDue < 0;
    // Calculate the number of hours remaining until the ticket is due
    const hoursRemaining = Math.abs(Math.floor(timeUntilDue / (1000 * 60 * 60)));

    return (
        <div className="fixed inset-0 bg-black gap-6 bg-opacity-50 flex items-center justify-center z-50 p-4">
            {(['account_manager', 'coo', 'cro', 'ceo', 'client'].includes(user.role)) && <JobBoardTicketTimeline ticket={ticket} />}
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Ticket Details & Actions</h2>
                        {user.role !== 'client' && (
                            <p className="text-sm text-gray-600">Editing as: {user.name} ({user.role.replace('_', ' ').toUpperCase()})</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Close modal"
                        title="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {user.role === 'client' && (
                    <div className="px-6 py-4">
                        {/* Ticket Information */}
                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Ticket Information</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Type</label>
                                        <p className="text-gray-900">{ticketTypeLabels[ticket.type]}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Title</label>
                                        <p className="text-gray-900">{ticket.title}</p>
                                    </div>
                                    {ticket.status !== 'resolved' ? (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">SLA Status</label>
                                            <div className={`flex items-center space-x-2 ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                                                {isOverdue ? (
                                                    <AlertTriangle className="h-4 w-4" />
                                                ) : (
                                                    <Clock className="h-4 w-4" />
                                                )}
                                                <span className="font-medium">
                                                    {isOverdue ? `${hoursRemaining}h overdue` : `${hoursRemaining}h remaining`}
                                                </span>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Ticket Sort Code</label>
                                        <p className="text-gray-900">{ticket.short_code}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Created At</label>
                                        <p className="text-gray-900">{format(new Date(ticket.createdat), 'yyyy-MM-dd hh:mm a')}</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Description</label>
                                <p className="text-gray-900">{ticket.description}</p>
                            </div>
                        </div>
                        {ticketComments.filter(comment => comment.users?.role !== 'sales').length > 0 && (
                            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mt-6">
                                <h3 className="text-md font-semibold mb-2">Comments:</h3>
                                <ul className="space-y-3">
                                    {ticketComments
                                        .filter(comment => comment.users?.role !== 'sales')
                                        .map((comment, index) => (
                                            <li key={index} className="bg-gray-50 p-3 rounded border text-sm">
                                                <div className="text-gray-700">
                                                    {comment.content}
                                                    {' '}<span className="text-gray-600 italic">
                                                        — {comment.users?.name || 'Unknown'} ({comment.users?.role?.replace('_', ' ') || 'Unknown Role'})
                                                    </span>
                                                </div>
                                                <div className="text-gray-500 text-xs mt-1">
                                                    {new Date(comment.created_at).toLocaleString()}
                                                </div>
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        )}

                        {ticket.status === 'closed' && (
                            <div className="bg-green-50 rounded-lg p-6 border border-green-200 mt-6">
                                <h3 className="text-lg font-semibold mb-2 text-green-900">Has your issue been resolved?</h3>
                                <p className="text-sm text-green-800 mb-4">Please confirm if the resolution works for you so we can close this ticket.</p>
                                <button
                                    onClick={handleClientResolveTicket}
                                    type="button"
                                    disabled={isSubmittingComment}
                                    className="px-6 py-2 bg-green-600 text-white font-medium hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {isSubmittingComment ? 'Marking...' : 'Mark As Resolved'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {user.role !== 'client' && (
                    <div className="p-6 space-y-6">
                        {/* Ticket Information */}
                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Ticket Information</h3>
                                <div className="flex items-center space-x-3">
                                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                                        {ticket.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${ticket.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                        ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {ticket.priority.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Client name</label>
                                        <p className="text-gray-900">{clientName}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Type</label>
                                        <p className="text-gray-900">{ticketTypeLabels[ticket.type]}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Title</label>
                                        <p className="text-gray-900">{ticket.title}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Created At</label>
                                        <p className="text-gray-900">{format(new Date(ticket.createdat), 'yyyy-MM-dd hh:mm a')}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Created By</label>
                                        <p className="text-gray-900">{createdByUser} </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Ticket Sort Code</label>
                                        <p className="text-gray-900">{ticket.short_code}</p>
                                    </div>

                                    {ticket.status !== 'resolved' ? (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">SLA Status</label>
                                            <div className={`flex items-center space-x-2 ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                                                {isOverdue ? (
                                                    <AlertTriangle className="h-4 w-4" />
                                                ) : (
                                                    <Clock className="h-4 w-4" />
                                                )}
                                                <span className="font-medium">
                                                    {isOverdue ? `${hoursRemaining}h overdue` : `${hoursRemaining}h remaining`}
                                                </span>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Description</label>
                                <p className="text-gray-900">{ticket.description}</p>
                            </div>
                            <div className='my-2'>
                                <label className="text-sm font-medium text-gray-500 ">Assigned To</label>
                                <div className="space-y-1">
                                    {' '}
                                    {assignments[ticket.id]?.length
                                        ? assignments[ticket.id].map((u, i) => (
                                            <span key={u.id}>
                                                {u.name} ({u.role?.replace('_', ' ') || 'Unknown Role'})
                                                {i < assignments[ticket.id].length - 1 && ', '}
                                            </span>
                                        ))
                                        : 'Unassigned'}
                                </div>
                            </div>
                        </div>
                        {/* --- Comments --- */}
                        {ticketComments.length > 0 && (
                            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mt-6">
                                <h3 className="text-md font-semibold mb-2">Comments:</h3>
                                <ul className="space-y-3">
                                    {ticketComments.map((comment, index) => (
                                        <li key={index} className="bg-gray-50 p-3 rounded border text-sm">
                                            <div className="text-gray-700">
                                                {comment.content}
                                                {' '}<span className="text-gray-600 italic">
                                                    — {comment.users?.name || 'Unknown'} ({comment.users?.role?.replace('_', ' ') || 'Unknown Role'})
                                                </span>
                                            </div>
                                            <div className="text-gray-500 text-xs mt-1">
                                                {new Date(comment.created_at).toLocaleString()}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Action Form */}
                        {canEdit() &&
                            (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {['account_manager', 'coo', 'cro', 'ceo', 'sales'].includes(user.role) && alreadyAssignedIds.has(user?.id) &&
                                        (ticket.status === 'open' || ticket.status === 'forwarded') && (
                                            <div className="mt-6 border-t pt-4">
                                                <h3 className="text-md font-semibold text-gray-800">Resolve Ticket</h3>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Resolving Comment <span className="text-red-800 text-xl relative top-1">*</span>
                                                </label>
                                                <textarea
                                                    value={resolutionComment}
                                                    onChange={(e) => setResolutionComment(e.target.value)}
                                                    rows={4}
                                                    className="w-full border px-3 py-2 rounded-lg"
                                                    placeholder="Add a final note before resolving..."
                                                    required
                                                />                                                <button
                                                    onClick={handleResolveTicket}
                                                    type="button"
                                                    disabled={!resolutionComment.trim() || isSubmittingComment}
                                                    className={`px-4 py-2 rounded-lg mt-4 ${(!resolutionComment.trim() || isSubmittingComment)
                                                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                                        : 'bg-green-600 text-white hover:bg-green-700 rounded'
                                                        }`}
                                                >
                                                    {isSubmittingComment ? 'Resolving Ticket...' : 'Resolve Ticket'}
                                                </button>
                                            </div>
                                        )
                                    }

                                    {/* Assignment Section */}
                                    {['cro', 'coo', 'ceo', 'system_admin'].includes(user.role) && ticket.status === 'open' && (
                                        <div className="mt-6 border-t pt-4">
                                            <h3 className="text-md font-semibold text-gray-800 mb-2">Assign Ticket</h3>
                                            <div className="flex gap-4 items-end">
                                                <div className="flex-1">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Select Sales Agent
                                                    </label>
                                                    <select
                                                        value={selectedSalesUser}
                                                        onChange={(e) => setSelectedSalesUser(e.target.value)}
                                                        className="w-full border px-3 py-2 rounded-lg"
                                                    >
                                                        <option value="">-- Select Sales Agent --</option>
                                                        {salesUsers.filter(u => !alreadyAssignedIds.has(u.id)).map((u) => (
                                                            <option key={u.id} value={u.id}>
                                                                {u.name} ({u.email})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleAssignTicket}
                                                    disabled={!selectedSalesUser || isAssigning}
                                                    className={`px-4 py-2 rounded-lg ${(!selectedSalesUser || isAssigning)
                                                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                        }`}
                                                >
                                                    {isAssigning ? 'Assigning...' : 'Assign Ticket'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}

                        {!canEdit() && (
                            <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
                                <div className="flex items-center space-x-2">
                                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                    <p className="text-yellow-800">You don't have permission to edit this ticket. You can only view the details.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
};