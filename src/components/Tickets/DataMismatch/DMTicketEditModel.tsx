import React, { useState, useEffect } from 'react';
import { X, Clock, User, AlertTriangle, CheckCircle, MessageSquare, Calendar, Heading4 } from 'lucide-react';
import { Ticket, User as UserType, Client, TicketStatus } from '../../../types';
import { ticketTypeLabels } from '../../../data/mockData';
import { format } from 'date-fns';
import { supabase } from '../../../lib/supabaseClient';
import { id } from 'date-fns/locale';
// import { toast } from 'sonner';
import { toast } from 'react-toastify';
import TicketTimeline from '@/components/Tickets/DataMismatch/TicektTimeline';
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



export const DMTicketEditModal: React.FC<TicketEditModalProps> = ({
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
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [clientName, setClientName] = useState<string>('');
    const [clientEmail, setClientEamil] = useState<string>('');
    const [clientCA, setClientCA] = useState<string>('');
    const [resolution, setResolution] = useState('');
    const [ticketFiles, setTicketFiles] = useState<any[]>([]);
    // const [createdBy, setCreatedBy] = useState<string>('');
    const [createdByUser, setCreatedByUser] = useState<any>(null);
    // const userId = ticket.createdBy;
    const [client, setClient] = useState<Client>(null);

    const [userComment, setUserComment] = useState('');
    const [userFile, setUserFile] = useState<File | null>(null);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [alreadyAssignedIds, setAlreadyAssignedIds] = useState(new Set<string>());

    const [comment, setComment] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const currentUserRole = user?.role;
    const currentUserId = user?.id;
    const [ticketComments, setTicketComments] = useState<any[]>([]);
    const [resolutionComment, setResolutionComment] = useState('');
    const [resolutionFile, setResolutionFile] = useState<File | null>(null);
    const [volumeShortfallData, setVolumeShortfallData] = useState<any>([]);
    const [wantsToEscalate, setWantsToEscalate] = useState(false);
    const [escalationReason, setEscalationReason] = useState('');

    const [saprateCommnetID, setSaparateCommnetID] = useState<string>(uuidv4());

    const [showCallbackPopup, setShowCallbackPopup] = useState(false);
    const [wantsCallback, setWantsCallback] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            if (!ticket?.createdby) return;

            const { data, error } = await supabase
                .from('users')
                .select('name ,role')
                .eq('id', ticket.createdby)
                .single();

            // console.log('Fetching data d', data);
            if (error) {
                console.error('Error fetching user name:', error);
            } else {
                setCreatedByUser(data?.name || '');
            }
        };

        fetchUser();
        // console.log('Fetching ticket',ticket);
    }, [ticket ? ticket.createdby : null]);

    const fetchTicketFiles = async () => {
        if (!ticket?.id) return; // ✅ Fix: skip if ticket is null/undefined

        const { data, error } = await supabase
            .from('ticket_files')
            .select(`
      id,
      file_path,commentid, id, file_name,
      uploaded_at,
      foraf,
      users:uploaded_by (
        id,
        name
      )
    `)
            .eq('ticket_id', ticket.id)
            .order('uploaded_at', { ascending: false });

        if (error) {
            console.error('Error fetching ticket files:', error);
        } else {
            console.log('v1 : ', data);
            setTicketFiles(data || []);
        }
    };
    const fetchVolumeShortfallDetails = async () => {
        if (ticket?.type !== 'volume_shortfall') return;

        const { data, error } = await supabase
            .from('volume_shortfall_tickets')
            .select('*')
            .eq('ticket_id', ticket.id)
            .single();

        if (error) {
            console.error('Failed to fetch volume shortfall details:', error.message);
        } else {
            setVolumeShortfallData(data);
        }
    };

    useEffect(() => {
        if (ticket) {
            // Set the ticket status to the current ticket's status
            setStatus(ticket.status);
            // Reset the comment, resolution, and escalation reason
            setComment('');
            setResolution('');
            setEscalationReason('');
            fetchTicketFiles();
            fetchVolumeShortfallDetails();
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
        const fetchClientCA = async () => {
            if (!ticket) return;
            if (!ticket.clientId) return;

            const { data, error } = await supabase
                .from('clients')
                .select(`users:careerassociateid(name)`)
                .eq('id', ticket.clientId)
                .single(); // because only one client expected

            // console.log('Fetching client', data);
            if (error) {
                console.error('Error fetching client name:', error);
            } else {
                setClientCA(data?.users?.name || '');
            }
        };

        fetchClientCA();
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

            // Fetch Files
            const { data: files, error: fileError } = await supabase
                .from('ticket_files')
                .select('file_path, uploaded_at, commentid, id, file_name, uploaded_by, foraf')
                .eq('ticket_id', ticket.id)
                .order('uploaded_at', { ascending: true });

            if (fileError) console.error('Error fetching files:', fileError);
            else {
                console.log('v2 : ', files);
                setTicketFiles(files || []);
            }
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

    const handleCloseTicket = async () => {
        if (!ticket) return;
        if (!ticket.id || !user?.id) return;
        if (!comment) {
            alert("Please write a comment or attach a file to close this ticket.");
            return;
        }
        setIsSubmittingComment(true);
        try {
            setIsUploading(true);
            let uploadedFilePath = null;

            if (userFile) {
                // Upload file to Supabase storage
                const filePath = `${ticket.id}/${Date.now()}-${userFile.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('ticket-attachments')
                    .upload(filePath, userFile);

                if (uploadError) {
                    console.error("File upload failed:", uploadError);
                    alert("File upload failed.");
                    return;
                }
                uploadedFilePath = filePath;
                const { error: insertError } = await supabase.from('ticket_files').insert(
                    {
                        commentid: saprateCommnetID,
                        ticket_id: ticket.id,
                        uploaded_by: user.id,
                        file_path: uploadedFilePath,
                        uploaded_at: new Date().toISOString(),
                        file_name: userFile.name,
                    },
                );
                if (insertError) {
                    console.error("Failed to record uploaded file:", insertError);
                    alert("Error saving file info.");
                    return;
                }
            }

            // Insert comment with status at time
            if (comment.trim() !== '') {
                await supabase.from('ticket_comments').insert([
                    {
                        id: saprateCommnetID,
                        ticket_id: ticket.id,
                        user_id: user.id,
                        content: comment,
                        is_internal: false,
                        ticketStatusAtTime: 'closed',
                    },
                ]);
            }

            // Update ticket status
            const { error } = await supabase.from('tickets').update({
                status: 'closed',
                updatedAt: new Date().toISOString(),
            }).eq('id', ticket.id);
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('careerassociateid')
                .eq('id', ticket.clientId)
                .single();

            if (clientError) {
                console.error("Failed to fetch client info:", clientError);
                alert("Could not get assigned users for this client.");
                return;
            }

            const { careerassociateid } = clientData;
            if (
                ticket?.status === 'open' &&
                user?.role === 'ca_team_lead' &&
                wantsToEscalate &&
                escalationReason.trim().length > 0
            ) {
                const { error: escalationError } = await supabase
                    .from('ticket_escalations')
                    .insert([{
                        ticket_id: ticket.id,
                        escalated_by: user.id,
                        ca_id: careerassociateid, // assumes client info is already loaded
                        reason: escalationReason.trim(),
                    }]);

                if (escalationError) {
                    console.error("Escalation insert failed:", escalationError.message);
                    toast.error("Failed to escalate CA. Ticket was closed, but escalation not saved.");
                } else {
                    toast("Escalation raised on CA successfully.", {
                        position: "top-center",
                        autoClose: 4000,
                        hideProgressBar: false,
                        closeOnClick: false,
                        pauseOnHover: true,
                        draggable: true,
                        progress: undefined,
                        theme: "dark",
                    });
                }
            }

            // alert("Ticket closed successfully!");
            toast("Ticket closed successfully!", {
                position: "top-center",
                autoClose: 4000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
            onUpdate?.(); // notify parent component of update
            setUserComment('');
            setSaparateCommnetID(uuidv4());
            setUserFile(null);
            onClose(); // close modal
            if (clientEmail) {
                await fetch("https://ticketingtoolapplywizz.vercel.app/api/send-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: clientEmail,
                        subject: "Response form Applywizz Ticketing Tool",
                        htmlBody: `
            <html>
              <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
                <div style="text-align:center; margin-bottom:20px;">
                  <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                       alt="ApplyWizz Logo" 
                       style="width:150px;"/>
                </div>
                <h2 style="color:#1E90FF;">Hi ${clientName} (${clientEmail}),</h2>
                <p>Our team has responded to your ApplyWizz ticket ${ticket.short_code} — ${ticket.title}}.</p>
                <p>please review the update and close the ticket if your issue is resolved.</p>
                <p>You can manage your ticket here: <a href="https://ticketingtoolapplywizz.vercel.app/" target="_blank">ApplyWizz Ticketing Tool</a></p>
                <p style="background-color:#FFF3CD;padding:10px;border-left:4px solid #FFC107;">Kindly note that this ticket is now in the system for tracking and resolution. <br/>Updates will be shared as progress is made.</p>     
                <p>Thanks for your patience,<br/>- ApplyWizz Support</p>                
                <p>Best regards,<br/> <strong>ApplyWizz Ticketing Tool Support Team.</strong></p> 
                <hr style="border:none;border-top:1px solid #eee;" />
                <p style="font-size:12px;color:#777;">This is an automated message. Please do not reply to this email.</p>
              </body>
            </html>
          `
                    })
                });
            }
        } catch (error) {
            console.error(error);
            alert("Failed to close ticket.");
        } finally {
            setIsUploading(false);
            setIsSubmittingComment(false);
        }
    };

    const handleCommentSubmit = async () => {
        if (!ticket) return;
        if (!ticket.id || !user?.id) return;
        if (!userComment && !userFile) {
            alert("Please write a comment or attach a file.");
            return;
        }

        setIsSubmittingComment(true);

        try {
            // Step 1: Upload file if provided

            if (userFile) {
                const filePath = `${ticket.id}/${Date.now()}-${userFile.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('ticket-attachments')
                    .upload(filePath, userFile);

                if (uploadError) {
                    console.error("Upload failed:", uploadError);
                    alert("File upload failed.");
                    return;
                }
                const { error: insertError } = await supabase.from('ticket_files').insert(
                    {
                        commentid: saprateCommnetID,
                        ticket_id: ticket.id,
                        uploaded_by: user.id,
                        file_path: filePath,
                        uploaded_at: new Date().toISOString(),
                        file_name: userFile.name,
                    },
                );
                if (insertError) {
                    console.error("Failed to record uploaded file:", insertError);
                    alert("Error saving file info.");
                    return;
                }
            }

            // Step 2: Insert comment (if text provided)
            if (userComment.trim() !== '') {
                await supabase.from('ticket_comments').insert([
                    {
                        id: saprateCommnetID,
                        ticket_id: ticket.id,
                        user_id: user.id,
                        content: userComment,
                        ticketStatusAtTime: ticket.status,
                        is_internal: false,
                    }
                ]);
            }


            onUpdate?.();
            // alert("Comment submitted successfully.");
            toast("Comment submitted successfully!", {
                position: "top-center",
                autoClose: 4000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
            setUserComment('');
            setSaparateCommnetID(uuidv4());
            setUserFile(null);
            onClose();
        } catch (err) {
            console.error("Error submitting comment:", err);
            alert("Failed to submit comment.");
        } finally {
            setIsSubmittingComment(false);
        }
        // ✅ Only proceed if this is a data_mismatch ticket that was forwarded
        if (ticket.status === 'forwarded') {
            try {
                // 1. Fetch all comments for this ticket
                const { data: comments, error: commentError } = await supabase
                    .from('ticket_comments')
                    .select('user_id')
                    .eq('ticket_id', ticket.id);

                if (commentError) throw commentError;

                const uniqueUserIds = new Set<string>(comments.map(c => c.user_id).filter(Boolean));

                // const uniqueUserIds = [...new Set(comments.map(c => c.user_id).filter(Boolean))];

                // 2. Get the roles of all users who commented
                const { data: userRoles, error: userError } = await supabase
                    .from('users')
                    .select('id, role')
                    .in('id', Array.from(uniqueUserIds));

                // .in('id', uniqueUserIds);

                if (userError) throw userError;

                const hasCA = userRoles.some(u => u.role === 'career_associate');
                const hasScraper = userRoles.some(u => u.role === 'scraping_team');
                if (client?.careerassociateid === client?.careerassociatemanagerid) {
                    const updateRes = await supabase
                        .from('tickets')
                        .update({
                            status: 'replied',
                            updatedAt: new Date().toISOString()
                        })
                        .eq('id', ticket.id);

                    // ✅ 5. Insert (or skip) ticket assignment to CA Team Lead
                    const { error: assignError } = await supabase
                        .from('ticket_assignments')
                        .upsert([
                            {
                                ticket_id: ticket.id,
                                user_id: client?.careerassociatemanagerid,
                                assignedBy: user.id // current user
                            }
                        ], { onConflict: 'ticket_id,user_id' });

                    if (updateRes.error || assignError) {
                        throw updateRes.error || assignError;
                    }

                    onUpdate?.();
                    console.log('✅ Ticket auto-updated to replied and reassigned to CA Team Lead.');
                } else if (hasCA && hasScraper) {
                    // ✅ 3. Get CA Team Lead from the clients table using clientId
                    const caManagerId = client?.careerassociatemanagerid;

                    // ✅ 4. Update ticket status to 'replied'
                    const updateRes = await supabase
                        .from('tickets')
                        .update({
                            status: 'replied',
                            updatedAt: new Date().toISOString()
                        })
                        .eq('id', ticket.id);

                    // ✅ 5. Insert (or skip) ticket assignment to CA Team Lead
                    const { error: assignError } = await supabase
                        .from('ticket_assignments')
                        .upsert([
                            {
                                ticket_id: ticket.id,
                                user_id: caManagerId,
                                assignedBy: user.id // current user
                            }
                        ], { onConflict: 'ticket_id,user_id' });

                    if (updateRes.error || assignError) {
                        throw updateRes.error || assignError;
                    }

                    onUpdate?.();
                    console.log('✅ Ticket auto-updated to replied and reassigned to CA Team Lead.');
                }
            } catch (err) {
                console.error('❌ Auto-update failed:', err.message || err);
            }
        }

    };

    const handleResolveTicket = async () => {
        if (!ticket || !ticket.id || !user?.id) return;
        if (!resolutionComment && !resolutionFile) {
            alert("Please write a resolution comment or attach a resolution file.");
            return;
        }
        setIsSubmittingComment(true);
        try {
            // 1. Upload file (if exists)

            if (resolutionFile) {
                const filePath = `${ticket.id}/${Date.now()}-${resolutionFile.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('ticket-attachments')
                    .upload(filePath, resolutionFile);

                if (uploadError) {
                    console.error("Upload failed:", uploadError);
                    alert("File upload failed.");
                    return;
                }
                const { error: insertFileError } = await supabase
                    .from('ticket_files')
                    .insert({
                        commentid: saprateCommnetID,
                        ticket_id: ticket.id,
                        uploaded_by: user.id,
                        file_path: filePath,
                        uploaded_at: new Date().toISOString(),
                        file_name: resolutionFile.name,
                    });

                if (insertFileError) {
                    console.error("Failed to save file path:", insertFileError);
                }
            }

            // 2. Add resolution comment
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

            // 3. Update ticket status to resolved
            const { error: updateError } = await supabase
                .from('tickets')
                .update({ status: 'resolved', updatedAt: new Date().toISOString() })
                .eq('id', ticket.id);

            if (updateError) {
                alert("Failed to update ticket status.");
                return;
            }

            // alert("Ticket resolved.");
            // toast.success("Ticket resolved successfully!");
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
            setResolutionFile(null);
            onClose();
        } catch (error) {
            console.error("Resolution error:", error);
            alert("Unexpected error during resolution.");
        } finally {
            setIsSubmittingComment(false);
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
            escalationReason,
            updatedBy: user.id,
            updatedAt: new Date(),
        };

        if (selectedFile) {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${ticket.id}/${user.id}/${Date.now()}.${fileExt}`;

            // ✅ Upload file to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('ticket-attachments')
                .upload(fileName, selectedFile, {
                    cacheControl: '3600',
                    upsert: false, // avoid overwriting accidentally
                });

            if (uploadError) {
                console.error('File upload failed:', uploadError.message);
                alert('File upload failed: ' + uploadError.message);
                return;
            }

            // ✅ Store file record in DB
            const { error: insertError } = await supabase.from('ticket_files').insert({
                ticket_id: ticket.id,
                uploaded_by: user.id,
                file_path: fileName,
            });

            if (insertError) {
                console.error('Error saving file info in DB:', insertError.message);
                alert('Failed to store file info in database.');
                return;
            }

            await fetchTicketFiles(); // refresh file list
            setSelectedFile(null);
        }
        // Call the onSubmit function with the updated ticket data
        onSubmit(updateData);
        setSelectedFile(null);
        // Close the modal
        onClose();
    };

    const handleAssistanceResponse = async (needsHelp: boolean) => {
        if (!ticket) return;

        try {
            if (needsHelp) {
                setShowCallbackPopup(true);
                return;
            } else {
                // Update directly to resolved
                const { error } = await supabase
                    .from('tickets')
                    .update({
                        status: 'resolved',
                        updatedAt: new Date().toISOString()
                    })
                    .eq('id', ticket.id);

                if (error) throw error;
                // alert("Ticket marked as resolved");
                toast("Ticket marked as resolved! Thanks for your update.", {
                    position: "top-center",
                    autoClose: 4000,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "dark",
                });
            }

            // Refresh data
            onUpdate?.();
            onClose();
        } catch (error) {
            console.error("Error updating ticket:", error);
            alert("Failed to update ticket status");
        }
    };

    const handleCallbackResponse = async (needsCall: boolean) => {
        try {

            // setWantsCallback(needsCall);
            if (needsCall) {
                // Update to needs_manager_review status
                const { error } = await supabase
                    .from('tickets')
                    .update({
                        status: 'manager_attention',
                        requiredManagerAttention: true,
                        updatedAt: new Date().toISOString()
                    })
                    .eq('id', ticket.id);

                if (error) throw error;
                // alert("Account manager will contact you shortly");
                toast("Account manager will contact you shortly!", {
                    position: "top-center",
                    autoClose: 4000,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "dark",
                });

            } else {
                setShowCallbackPopup(false);
                return;
            }
            onUpdate?.();
            onClose();
        } catch (error) {
            console.error("Error updating ticket:", error);
            alert("Failed to update ticket status");
        } finally {
            setShowCallbackPopup(false);
        }
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

    let metadata = {};

    try {
        metadata =
            typeof ticket.metadata === 'string'
                ? JSON.parse(ticket.metadata)
                : ticket.metadata
    } catch (e) {
        console.error('Invalid metadata JSON:', ticket.metadata);
    }

    return (
        <div className="fixed inset-0 bg-black gap-6 bg-opacity-50 flex items-center justify-center z-50 p-4">
            {(['account_manager', 'coo', 'cro', 'ceo', 'client'].includes(user.role)) && <TicketTimeline ticket={ticket} />}
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
                            {Object.keys(metadata).length > 0 && (
                                <div className=" my-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(metadata).map(([key, value]) => (
                                        <div key={key}>
                                            <label className="text-sm font-medium text-blue-700">
                                                {key
                                                    .replace(/([A-Z])/g, ' $1')
                                                    .replace(/^./, (str) => str.toUpperCase())}
                                            </label>
                                            <p className="text-blue-900">
                                                {(key === 'faultType') ? String(value).replaceAll('_', ' ').replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()) : <a href={`${String(value)}`}>{String(value)}</a>}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-medium text-gray-500">Description</label>
                                <p className="text-gray-900">{ticket.description}</p>
                            </div>
                            {ticketFiles.filter((file) => file.foraf).length > 0 && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Uploaded File : </label>
                                    <ul className="space-y-2 text-sm">
                                        {ticketFiles.filter((file) => file.foraf).map((file, index) => (
                                            <li key={index}>
                                                <a
                                                    href={`https://zkebbnegghodwmgmkynt.supabase.co/storage/v1/object/public/ticket-attachments/${file.file_path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {file.file_name}
                                                </a>{' '}
                                                <span className="text-gray-400 text-xs">
                                                    ({new Date(file.uploaded_at).toLocaleString()})
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        {ticketComments.length > 0 && (
                            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mt-6">
                                <h3 className="text-md font-semibold mb-2">Comments:</h3>
                                <ul className="space-y-3">
                                    {ticketComments
                                        .filter((comment) => (comment.users.role !== 'scraping_team' && comment.users.role !== 'career_associate'))
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
                                                {/* --- Files --- */}
                                                {ticketFiles.filter((file) => file.commentid === comment.id).length > 0 && (
                                                    <div className="mt-6 border-t pt-4">
                                                        <h3 className="text-md font-semibold mb-2">Uploaded File :</h3>
                                                        <ul className="space-y-2 text-sm">
                                                            {ticketFiles.filter((file) => file.commentid === comment.id).map((file, index) => (
                                                                <li key={index}>
                                                                    <a
                                                                        href={`https://zkebbnegghodwmgmkynt.supabase.co/storage/v1/object/public/ticket-attachments/${file.file_path}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-600 hover:underline"
                                                                    >
                                                                        {file.file_name}
                                                                    </a>{' '}
                                                                    <span className="text-gray-400 text-xs">
                                                                        ({new Date(file.uploaded_at).toLocaleString()})
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        )}
                        {ticket.status === 'closed' && (
                            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mt-6">
                                <p className="text-gray-700 mb-4">
                                    Was your problem completely solved?
                                </p>

                                <div className="flex space-x-4">
                                    <button
                                        onClick={() => handleAssistanceResponse(false)}
                                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                    >
                                        Yes, I'm satisfied
                                    </button>
                                    <button
                                        onClick={() => handleAssistanceResponse(true)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        No, I need help
                                    </button>
                                </div>
                            </div>
                        )}
                        {showCallbackPopup && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div className="bg-gray-400 border-4 border-blue-100 p-16 rounded-lg max-w-xl w-full">
                                    <h3 className="text-xl font-semibold mb-4 text-center">Do you need a call from our Account Manager?</h3>
                                    <div className="flex justify-center space-x-4">
                                        <button
                                            onClick={() => handleCallbackResponse(true)}
                                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700"
                                        >
                                            Yes
                                        </button>
                                        <button
                                            onClick={() => handleCallbackResponse(false)}
                                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700"
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>
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
                            {Object.keys(metadata).length > 0 && (
                                <div className=" my-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(metadata).map(([key, value]) => (
                                        <div key={key}>
                                            <label className="text-sm font-medium text-blue-700">
                                                {key
                                                    .replace(/([A-Z])/g, ' $1')
                                                    .replace(/^./, (str) => str.toUpperCase())}
                                            </label>
                                            <p className="text-blue-900">
                                                {(key === 'faultType') ? String(value).replaceAll('_', ' ').replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()) : <a href={`${String(value)}`}>{String(value)}</a>}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-medium text-gray-500">Description</label>
                                <p className="text-gray-900">{ticket.description}</p>
                            </div>
                            {ticketFiles.filter((file) => file.foraf).length > 0 && (
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Uploaded File : </label>
                                    <ul className="space-y-2 text-sm">
                                        {ticketFiles.filter((file) => file.foraf).map((file, index) => (
                                            <li key={index}>
                                                <a
                                                    href={`https://zkebbnegghodwmgmkynt.supabase.co/storage/v1/object/public/ticket-attachments/${file.file_path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {file.file_name}
                                                </a>{' '}
                                                <span className="text-gray-400 text-xs">
                                                    ({new Date(file.uploaded_at).toLocaleString()})
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
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
                                            {/* --- Files --- */}
                                            {ticketFiles.filter((file) => file.commentid === comment.id).length > 0 && (
                                                <div className="mt-6 border-t pt-4">
                                                    <h3 className="text-md font-semibold mb-2">Uploaded File :</h3>
                                                    <ul className="space-y-2 text-sm">
                                                        {ticketFiles.filter((file) => file.commentid === comment.id).map((file, index) => (
                                                            <li key={index}>
                                                                <a
                                                                    href={`https://zkebbnegghodwmgmkynt.supabase.co/storage/v1/object/public/ticket-attachments/${file.file_path}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:underline"
                                                                >
                                                                    {file.file_name}
                                                                </a>{' '}
                                                                <span className="text-gray-400 text-xs">
                                                                    ({new Date(file.uploaded_at).toLocaleString()})
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Action Form */}
                        {canEdit() &&
                            (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {currentUserRole === 'ca_team_lead' && ticket.status === 'open' && (
                                        <>
                                            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                                                <h3 className="text-lg font-semibold text-green-900">Take Action</h3>
                                                <div className="space-y-2 mt-2" >
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Add a comment : <span className="text-red-800 text-xl relative top-1">*</span>
                                                    </label>
                                                    <textarea
                                                        className="w-full border p-2 rounded"
                                                        placeholder="Add a comment before closing..."
                                                        value={comment}
                                                        onChange={(e) => setComment(e.target.value)}
                                                        required
                                                    />
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Upload File (Only .pdf, .png, .jpg, .jpeg formats are supported) </label>
                                                        <input
                                                            type="file"
                                                            onChange={(e) => {
                                                                if (e.target.files && e.target.files[0]) {
                                                                    setUserFile(e.target.files[0])
                                                                }
                                                            }}
                                                            accept=".pdf,.png,.jpg,.jpeg"
                                                            className="block w-full border rounded px-3 py-2"
                                                            title="Upload a file (PDF, PNG, JPG, JPEG)"
                                                            placeholder="Choose a file"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={handleCloseTicket} disabled={!comment.trim() || isSubmittingComment}
                                                        className={`px-4 py-2 rounded-lg ml-4 ${(!comment.trim() || isSubmittingComment)
                                                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                                            }`}>
                                                        {isSubmittingComment ? 'Closing ticket...' : 'Close Ticket '}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="bg-red-50 border border-red-300 rounded-lg p-4 mt-4">
                                                <label className="flex items-center gap-2 mb-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={wantsToEscalate}
                                                        onChange={(e) => setWantsToEscalate(e.target.checked)}
                                                    />
                                                    <span className="text-red-700 font-medium">Escalate CA for this ticket</span>
                                                </label>
                                                {wantsToEscalate && (
                                                    <textarea
                                                        value={escalationReason}
                                                        onChange={(e) => setEscalationReason(e.target.value)}
                                                        placeholder="Write reason for escalation"
                                                        className="w-full p-2 border border-gray-300 rounded"
                                                        rows={3}
                                                    />
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {['account_manager', 'coo', 'cro', 'ceo'].includes(user.role) && alreadyAssignedIds.has(user?.id) &&
                                        ticket.status === 'manager_attention' && (
                                            <div className="mt-6 border-t pt-4">
                                                <h3 className="text-md font-semibold text-gray-800">Resolve Ticket</h3>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Final Comment <span className="text-red-800 text-xl relative top-1">*</span>
                                                </label>
                                                <textarea
                                                    value={resolutionComment}
                                                    onChange={(e) => setResolutionComment(e.target.value)}
                                                    rows={4}
                                                    className="w-full border px-3 py-2 rounded-lg"
                                                    placeholder="Add a final note before resolving..."
                                                    required
                                                />

                                                <div className="mt-4">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Optional File Upload (Only .pdf, .png, .jpg, .jpeg formats are supported)</label>
                                                    <input
                                                        title='Upload a resolution file (PDF, PNG, JPG, JPEG)'
                                                        type="file"
                                                        accept=".pdf,.png,.jpg,.jpeg"
                                                        placeholder="Choose a file"
                                                        onChange={(e) => {
                                                            if (e.target.files && e.target.files[0]) {
                                                                setResolutionFile(e.target.files[0]);
                                                            }
                                                        }}
                                                    />
                                                </div>

                                                <button
                                                    onClick={handleResolveTicket}
                                                    disabled={!resolutionComment.trim() || isSubmittingComment}
                                                    // className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"                     
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