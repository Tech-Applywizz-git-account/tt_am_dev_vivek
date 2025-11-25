import React, { useState, useEffect } from 'react';
import { X, Clock, User, AlertTriangle, CheckCircle, MessageSquare, Calendar, Heading4 } from 'lucide-react';
import { Ticket, User as UserType, Client, TicketStatus } from '../../../types';
import { ticketTypeLabels } from '../../../data/mockData';
import { format, set } from 'date-fns';
import { supabase } from '../../../lib/supabaseClient';
import { id } from 'date-fns/locale';
// import { toast } from 'sonner';
import { toast } from 'react-toastify';
import TicketTimeline from './TicektTimeline';
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

export const RUTicketEditModal: React.FC<TicketEditModalProps> = ({
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
  const [clientEmail, setClientEmail] = useState<string>('');
  const [resolution, setResolution] = useState('');
  const [ticketFiles, setTicketFiles] = useState<any[]>([]);
  const [createdByUser, setCreatedByUser] = useState<any>(null);
  const [client, setClient] = useState<Client>(null);

  const [RTMs, setRTMs] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [RTMId, setRTMId] = useState<string>('');

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

  const [saprateCommnetID, setSaparateCommnetID] = useState<string>(uuidv4());

  const [showCallbackPopup, setShowCallbackPopup] = useState(false);
  const [resumeSatisfaction, setResumeSatisfaction] = useState<'yes' | 'no' | null>(null);

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
      setTicketFiles(data || []);
    }
  };

  useEffect(() => {
    if (ticket) {
      // Set the ticket status to the current ticket's status
      setStatus(ticket.status);
      // Reset the comment, resolution, and escalation reason
      setComment('');
      setResolution('');
      fetchTicketFiles();
    }
  }, [ticket]);

  useEffect(() => {
    const fetchRTMs = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'resume_team_member')
        .order('name', { ascending: true });
      // console.log(data);
      if (error) {
        console.error('Failed to fetch RTMs:', error);
      } else {
        setRTMs(data || []);
      }
    };

    fetchRTMs();
  }, []);


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
        .single();

      if (error) {
        console.error('Error fetching client name:', error);
      } else {
        setClientName(data?.full_name || '');
        setClientEmail(data?.company_email || '');
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
          ),          
          show_to_client
        `)
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (commentError) console.error('Error fetching comments:', commentError);
      else setTicketComments(comments || []);

      // Fetch Files
      const { data: files, error: fileError } = await supabase
        .from('ticket_files')
        .select('file_path, uploaded_at, commentid, id, file_name, uploaded_by')
        .eq('ticket_id', ticket.id)
        .order('uploaded_at', { ascending: true });

      if (fileError) console.error('Error fetching files:', fileError);
      else {
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
      const { data: Emails, error: EmailsEmails } = await supabase
        .from('users')
        .select('id, name, email')
        .in('role', ['career_associate', 'ca_team_lead'])
        .in('id', Array.from(assignedIds));
      if (EmailsEmails) {
        console.error('Failed to fetch RTM details:', EmailsEmails);
        return;
      }
      if (Emails && Emails.length > 0) {
        console.log("Emails1", Emails.map(e => e.email));
        setEmails(Emails);
      }
    };

    fetchTicketAssignments();
  }, [ticket?.id]);

  const handleForwardToClientTicket = async () => {
    if (!ticket) return;
    if (!ticket.id || !user?.id) return;
    // if (!comment) {
    //   // alert("Please write a comment before forwarding to client");
    //   toast("Please write a comment before forwarding to client!", {
    //     position: "top-center",
    //     autoClose: 4000,
    //     hideProgressBar: false,
    //     closeOnClick: false,
    //     pauseOnHover: true,
    //     draggable: true,
    //     progress: undefined,
    //     theme: "dark",
    //   });
    //   return;
    // }
    // if (!userFile) {
    //   toast("Please attach a updated resume file before forwarding to client!", {
    //     position: "top-center",
    //     autoClose: 4000,
    //     hideProgressBar: false,
    //     closeOnClick: false,
    //     pauseOnHover: true,
    //     draggable: true,
    //     progress: undefined,
    //     theme: "dark",
    //   });
    //   return;
    // }
    // setIsSubmittingComment(true);
    try {
      setIsUploading(true);
      // let uploadedFilePath = null;

      // if (userFile) {
      //   // Upload file to Supabase storage
      //   const filePath = `${ticket.id}/${Date.now()}-${userFile.name}`;
      //   const { error: uploadError } = await supabase.storage
      //     .from('ticket-attachments')
      //     .upload(filePath, userFile);

      //   if (uploadError) {
      //     console.error("File upload failed:", uploadError);
      //     alert("File upload failed.");
      //     return;
      //   }
      //   uploadedFilePath = filePath;
      //   const { error: insertError } = await supabase.from('ticket_files').insert(
      //     {
      //       commentid: saprateCommnetID,
      //       ticket_id: ticket.id,
      //       uploaded_by: user.id,
      //       file_path: uploadedFilePath,
      //       uploaded_at: new Date().toISOString(),
      //       file_name: userFile.name,
      //     },
      //   );
      //   if (insertError) {
      //     console.error("Failed to record uploaded file:", insertError);
      //     alert("Error saving file info.");
      //     return;
      //   }
      // }

      // Insert comment with status at time
      // if (comment.trim() !== '') {
       const { error:verr } = await supabase.from('ticket_comments').update(
          {
            show_to_client: true,
          }).eq('ticket_id', ticket.id).eq('ticketStatusAtTime','forwarded');
      // }

      console.log("verr",verr);
      // Update ticket status
      const { error } = await supabase.from('tickets').update({
        status: 'pending_client_review',
        updatedAt: new Date().toISOString(),
      }).eq('id', ticket.id);

      toast("We have sent the updated resume to the client for review!", {
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
                <p>Our team has responded to your ApplyWizz ticket ${ticket.short_code} — ${ticket.title}.</p>
                <p>We've updated your resume. Review it and if you're satisfied, conform it. If not, click on need some more changes.</p>
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
  const handleReforwardTicket = async () => {
    if (!ticket) return;
    if (!ticket.id || !user?.id) return;
    if (!comment) {
      alert("Please write a comment to update the resume.");
      return;
    }
    setIsSubmittingComment(true);
    try {
      setIsUploading(true);
      let uploadedFilePath = null;

      // Insert comment with status at time
      if (comment.trim() !== '') {
        await supabase.from('ticket_comments').insert([
          {
            id: saprateCommnetID,
            ticket_id: ticket.id,
            user_id: user.id,
            content: comment,
            is_internal: false,
            ticketStatusAtTime: ticket.status,
            show_to_client: true,
          },
        ]);
      }

      // Update ticket status
      const { error } = await supabase.from('tickets').update({
        status: 'reopen',
        updatedAt: new Date().toISOString(),
      }).eq('id', ticket.id);

      toast("Our team will update the resume in accordance with the new request. You will receive a response from us shortly. Thank You !", {
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
    } catch (error) {
      console.error(error);
      alert("Failed to close ticket.");
    } finally {
      setIsUploading(false);
      setIsSubmittingComment(false);
    }
  };
  const handleForwardTicket = async () => {
    setIsSubmittingComment(true);
    try {
      if (!ticket) return;
      if (!ticket.clientId) {
        alert("Client ID missing from ticket.");
        return;
      }

      // Insert comment with status at time
      if (comment && comment.trim() !== '') {
        await supabase.from('ticket_comments').insert([
          {
            id: saprateCommnetID,
            ticket_id: ticket.id,
            user_id: currentUserId,
            content: comment,
            is_internal: false,
            ticketStatusAtTime: ticket.status,
          },
        ]);
      }
      if (assignments[ticket.id].filter((u) => u.role === 'resume_team_member').length !== 1) {
        const { error: insertError } = await supabase
          .from('ticket_assignments')
          .insert({
            ticket_id: ticket.id,
            user_id: RTMId,
            assignedBy: user?.id,
          });
        if (insertError) {
          console.error("Failed to assign users:", insertError);
          ("Error while assigning new users.");
          return;
        }
      }
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status: 'forwarded',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', ticket.id)
      if (updateError) {
        console.error("Failed to update ticket status:", updateError);
        return;
      }
      else {
        toast("Ticket successfully forwarded to Resume Team Member!", {
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
      onUpdate?.();
      onClose();
      setUserComment('');
      setSaparateCommnetID(uuidv4());
      setUserFile(null);
      setRTMId('');
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("Unexpected error occurred while forwarding.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleTransferTicket = async () => {
    setIsSubmittingComment(true);
    try {
      if (!ticket) return;
      if (!ticket.clientId) {
        alert("Client ID missing from ticket.");
        return;
      }

      // Step 1: Fetch the current user with the 'resume_team_member' role from the 'users' table
      const { data: resumeTeamMembers, error: fetchUsersError } = await supabase
        .from('users')
        .select('id, role')
        .eq('role', 'resume_team_member');  // Fetch users with 'resume_team_member' role

      if (fetchUsersError) {
        console.error("Error fetching resume_team_member users:", fetchUsersError);
        return;
      }

      // Step 2: Fetch the current assignment for the ticket (old user_id) where the role is 'resume_team_member'
      const { data: currentAssignments, error: fetchAssignmentsError } = await supabase
        .from('ticket_assignments')
        .select('user_id')
        .eq('ticket_id', ticket.id); // Fetch assignments for the current ticket

      if (fetchAssignmentsError) {
        console.error("Error fetching ticket assignments:", fetchAssignmentsError);
        return;
      }

      // Step 3: Find the old user_id with the 'resume_team_member' role in the assignment
      const oldAssignment = currentAssignments?.find(
        (assignment) => resumeTeamMembers?.some((user) => user.id === assignment.user_id)
      );

      if (oldAssignment) {
        // Step 4: Update the assignment's user_id to the new RTMId (replace the old one)
        const { error: updateError } = await supabase
          .from('ticket_assignments')
          .update({
            user_id: RTMId,  // Replace the old user_id with the new RTMId
            assignedBy: user?.id,  // Track who is updating this assignment
            assigned_at: new Date().toISOString()  // Update timestamp
          })
          .eq('ticket_id', ticket.id)  // Ensure we're updating the correct ticket
          .eq('user_id', oldAssignment.user_id);  // Only update the specific row

        if (updateError) {
          console.error("Failed to update ticket assignment:", updateError);
          return;
        }

        toast("Ticket transfer to Resume Team Member!", {
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
        console.error("No matching assignment found for resume_team_member role.");
        return;  // If no matching assignment found, do nothing
      }

      // Step 6: Reset form state and notify parent component
      onUpdate?.();
      onClose();
      setUserComment('');
      setSaparateCommnetID(uuidv4());
      setUserFile(null);
      setRTMId('');

    } catch (error) {
      console.error("Unexpected error:", error);
      alert("Unexpected error occurred while transferring.");
    } finally {
      setIsSubmittingComment(false);
    }
  };


  const handleCommentSubmit = async () => {
    if (!ticket) return;
    if (!ticket.id || !user?.id) return;
    if (!userComment || !userFile) {
      toast("Please write a comment and attach updated resume file.", {
        position: "top-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });
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
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status: 'replied',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', ticket.id)
      if (updateError) {
        console.error("Failed to update ticket status:", updateError);
        return;
      }
      else {
        toast("Updated resume forwarded to Resume team head !", {
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

      onUpdate?.();
      setUserComment('');
      setSaparateCommnetID(uuidv4());
      setUserFile(null);
      onClose();
    } catch (err) {
      alert("Failed to submit comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };
  const handleCASubmit = async () => {
    if (!ticket) return;
    if (!ticket.id || !user?.id) return;
    try {
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          comments: "ca clicked yes"
        })
        .eq('id', ticket.id)
      if (updateError) {
        console.error("Failed to update ticket status:", updateError);
        return;
      }
      else {
        // alert("Comment submitted successfully.");
        toast("Thanks for update !", {
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

      onUpdate?.();
      onClose();
    } catch (err) {
      console.error("Error submitting comment:", err);
      alert("Failed to submit comment.");
    }
  };
  const downloadFile = async (filePath, fileName) => {
    try {
      const response = await fetch(`https://zkebbnegghodwmgmkynt.supabase.co/storage/v1/object/public/ticket-attachments/${filePath}`);
      const blob = await response.blob(); // Convert the file content to a Blob object
      const url = URL.createObjectURL(blob); // Create a temporary URL for the Blob

      const a = document.createElement('a'); // Create an <a> element
      a.href = url;
      a.download = fileName; // Set the file name for the download
      document.body.appendChild(a);
      a.click(); // Trigger the download
      document.body.removeChild(a); // Clean up after download

      // Optionally, revoke the URL after download
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };
  const handleCATLSubmit = async () => {
    if (!ticket) return;
    if (!ticket.id || !user?.id) return;
    try {
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          metadata: "ca TL clicked yes"
        })
        .eq('id', ticket.id)
      if (updateError) {
        console.error("Failed to update ticket status:", updateError);
        return;
      }
      else {
        // alert("Comment submitted successfully.");
        toast("Thanks for update !", {
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

      onUpdate?.();
      onClose();
    } catch (err) {
      console.error("Error submitting comment:", err);
      alert("Failed to submit comment.");
    }
  };

  const handleForwardToCATL = async () => {
    if (!ticket || !ticket.id) return;
    setIsSubmittingComment(true);
    try {
      // 3. Update ticket status to resolved
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ status: 'resolved', updatedAt: new Date().toISOString() })
        .eq('id', ticket.id);

      if (updateError) {
        alert("Failed to update ticket status.");
        return;
      }
      toast("Updated resume is forward to our Carrer Associate team.", {
        position: "top-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });
      onClose();
      if (emails && emails.length > 0) {
        emails.forEach(async (email) => {
          await fetch("https://ticketingtoolapplywizz.vercel.app/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: email.email,
              subject: "Response form Applywizz Ticketing Tool",
              htmlBody: `      
            <html>
            <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
                <div style="text-align:center; margin-bottom:20px;">
                  <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                       alt="ApplyWizz Logo" 
                       style="width:150px;"/>
                </div>
                <p>Resume team has updated the resume for ApplyWizz ticket ${ticket.short_code} — ${ticket.title}.</p>
                <p>Client name : ${clientName}</p>
                <p>Client email : ${clientEmail}</p>
                <p>Please apply with updated resume.</p>
                <p>You can find updated resume in ticket tool : <a href="https://ticketingtoolapplywizz.vercel.app/" target="_blank">ApplyWizz Ticketing Tool</a></p>
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
    });
  }
  onUpdate?.();
} catch (error) {
  console.error("Forward to CATL error:", error);
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
      pending_client_review: 'bg-purple-100 text-purple-800',
      forwarded: 'bg-yellow-100 text-yellow-800',
      replied: 'bg-orange-100 text-orange-800',
      reopen: 'bg-orange-100 text-orange-800',
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
      {(['account_manager', 'coo', 'cro', 'ceo', 'client', 'resume_team_head'].includes(user.role)) && <TicketTimeline ticket={ticket} />}
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
            {ticketComments.filter((comment) => (comment.show_to_client)).length > 0 && (
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mt-6">
                <h3 className="text-md font-semibold mb-2">Comments:</h3>
                <ul className="space-y-3">
                  {ticketComments
                    .filter((comment) => (comment.show_to_client))
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
                            <h3 className="text-md font-semibold mb-2">Uploaded File(Updated resume) :</h3>
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
            {ticket.status === 'pending_client_review' && (
              <>
                {resumeSatisfaction === null && (
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mt-6">
                    <p className="text-gray-700 mb-4">
                      Are you satisfied with Updated Resume ?
                    </p>
                    <div className="flex space-x-4">
                      <button
                        onClick={handleForwardToCATL}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Yes, I'm satisfied
                      </button>
                      <button
                        onClick={() => setResumeSatisfaction('no')}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        No, I need some more changes
                      </button>
                    </div>
                  </div>
                )}
                {resumeSatisfaction !== null && resumeSatisfaction === 'no' && (
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <div className="space-y-2 mt-2" >
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        What are the changes you expecting : <span className="text-red-800 text-xl relative top-1">*</span>
                      </label>
                      <textarea
                        className="w-full border p-2 rounded"
                        placeholder="Write changes here..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        required
                      />
                      <button
                        onClick={handleReforwardTicket}
                        disabled={(!comment.trim() || isSubmittingComment) && (!RTMId)}
                        // className={`bg-blue-500 text-white px-4 py-2 rounded ml-4`}
                        className={`px-4 py-2 rounded-lg ml-4 ${(!comment.trim() || isSubmittingComment)
                          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                      >
                        {isSubmittingComment ? ' Forwarding to Resume team member ... ' : ' Forward to Resume Team '}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            {ticket.status === 'resolved' && ticket.metadata.length !== undefined && ticket.comments.length !== 2 && (
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mt-6">
                <p className="text-gray-700">
                  We are applying with your updated resume
                </p>
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
              <div className='my-2'>
                <label className="text-sm font-medium text-gray-500 ">Assigned To</label>
                <div className="space-y-1">
                  {' '}
                  {assignments[ticket.id]?.length
                    ? assignments[ticket.id].map((u, i) => (
                      <span key={u.id}>
                        {u.name} ({u.role?.replaceAll('_', ' ') || 'Unknown Role'})
                        {i < assignments[ticket.id].length - 1 && ', '}
                      </span>
                    ))
                    : 'Unassigned'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900">{ticket.description}</p>
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
                                <button
                                  onClick={() => downloadFile(file.file_path, file.file_name)}
                                  className="ml-2 text-xs text-blue-500 hover:underline"
                                >
                                  Download
                                </button>
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
                  {currentUserRole === 'resume_team_head' && (ticket.status === 'open' || ticket.status === 'reopen') && (
                    <>
                      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                        <h3 className="text-lg font-semibold text-green-900">Take Action</h3>
                        <div className="space-y-2 mt-2" >
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Add a comment : <span className="text-red-800 text-xl relative top-1">*</span>
                          </label>
                          <textarea
                            className="w-full border p-2 rounded"
                            placeholder="Add a comment before closing or forwarding..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            required
                          />
                          {ticket.status === 'open' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Resume team member
                              </label>
                              <select
                                value={RTMId}
                                onChange={(e) => setRTMId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                                title="Select Resume team member"
                              >
                                <option value="">Choose a Resume team member</option>
                                {RTMs.map(RTM => (

                                  <option key={RTM.id} value={RTM.id}>
                                    {RTM.name}
                                  </option>

                                ))}
                              </select>
                            </div>
                          )}
                          <button
                            onClick={handleForwardTicket}
                            disabled={(!comment.trim() || isSubmittingComment) && (!RTMId)}
                            className={`px-4 py-2 rounded-lg ml-4 ${(!comment.trim() || isSubmittingComment)
                              ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                          >
                            {isSubmittingComment ? ' Forwarding to Resume team member ... ' : ' Forward to Resume Team '}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  {currentUserRole === 'resume_team_head' && ticket.status === 'pending_client_review' && (
                    <>
                      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                        <h3 className="text-lg font-semibold text-green-900">Close the ticket as client</h3>
                        <div className="space-y-2 mt-2" >
                          <button
                            onClick={handleForwardToCATL}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Click here to Close Ticket
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {['resume_team_head'].includes(user?.role) && ticket.status === 'forwarded' && (

                    <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                      <h3 className="text-lg font-semibold text-green-900 mb-4">Transfer to other team member</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Resume team member
                        </label>
                        <select
                          value={RTMId}
                          onChange={(e) => setRTMId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
                          required
                          title="Select Resume team member"
                        >
                          <option value="">Choose a Resume team member</option>
                          {RTMs.map(RTM => (

                            <option key={RTM.id} value={RTM.id}>
                              {RTM.name}
                            </option>

                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleTransferTicket}
                        disabled={(!RTMId || isSubmittingComment)}
                        className={`px-4 py-2 rounded-lg mt-2 ${(!RTMId || isSubmittingComment)
                          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                      >
                        {isSubmittingComment ? ' Forwarding to Resume team member ... ' : ' Forward to Resume Team '}
                      </button>
                    </div>
                  )}

                  {['resume_team_member'].includes(user?.role) && ticket.status === 'forwarded' && (

                    <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                      <h3 className="text-lg font-semibold text-green-900 mb-4">Take Action</h3>
                      <div className="mt-6 border-t pt-6">
                        <h3 className="text-md font-semibold mb-2">Reply with your comment and Updated Resume (Only .pdf, .png, .jpg, .jpeg formats are supported) :</h3>

                        <textarea
                          className="w-full border p-2 rounded mb-3"
                          placeholder="Add your comment..."
                          value={userComment}
                          onChange={(e) => setUserComment(e.target.value)}
                        />

                        <input
                          type="file"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setUserFile(e.target.files[0])
                            }
                          }}
                          className="mb-4"
                          title="Upload a file"
                          placeholder="Choose a file"
                        />

                        <button
                          onClick={handleCommentSubmit}
                          disabled={!userFile || (!userComment.trim() || isSubmittingComment)}
                          // className={`bg-blue-500 text-white px-4 py-2 rounded ml-4`}
                          className={`px-4 py-2 rounded-lg ml-4 ${(!userFile || !userComment.trim() || isSubmittingComment)
                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                          {isSubmittingComment ? 'Submitting...' : 'Submit Updated Resume'}
                        </button>
                      </div>
                    </div>
                  )}
                  {['career_associate'].includes(user?.role) && ticket.comments.length === 2 && ticket.status === 'resolved' && (
                    <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                      <h3 className="text-md font-semibold mb-2">Are you applying with updated resume of client </h3>
                      <button
                        onClick={handleCASubmit}
                        className={`px-4 py-2 rounded-lg ml-4 bg-blue-600 text-white hover:bg-blue-700`}
                      >Yes
                      </button>
                    </div>
                  )}
                  {['ca_team_lead'].includes(user?.role) && ticket.metadata.length === 2 && ticket.status === 'resolved' && (
                    <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                      <h3 className="text-md font-semibold mb-2">Are you applying with updated resume of client </h3>
                      <button
                        onClick={handleCATLSubmit}
                        className={`px-4 py-2 rounded-lg ml-4 bg-blue-600 text-white hover:bg-blue-700`}
                      >Yes
                      </button>
                    </div>
                  )}

                  {currentUserRole === 'resume_team_head' && (ticket.status === 'replied') && (
                    <>
                      {resumeSatisfaction === null && (
                        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mt-6">
                          <p className="text-gray-700 mb-4">
                            Are you satisfied with Updated Resume ?
                          </p>

                          <div className="flex space-x-4">
                            <button
                              // onClick={() => setResumeSatisfaction('yes')}
                              onClick={handleForwardToClientTicket}
                              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setResumeSatisfaction('no')}
                              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              No
                            </button>
                          </div>
                        </div>
                      )}
                      {resumeSatisfaction !== null && (
                        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                          <h3 className="text-lg font-semibold text-green-900">Take Action</h3>
                          {/* {resumeSatisfaction === 'yes' && (
                            <div className="space-y-2 mt-2" >
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Add a comment : <span className="text-red-800 text-xl relative top-1">*</span>
                              </label>
                              <textarea
                                className="w-full border p-2 rounded"
                                placeholder="Add a comment before closing or forwarding..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                required
                              />
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Please add updated resume (It will visible to client) : <span className="text-red-800 text-xl relative top-1">*</span>
                              </label>
                              <input
                                type="file"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setUserFile(e.target.files[0])
                                  }
                                }}
                                className="mb-4"
                                title="Upload a file"
                                placeholder="Choose a file"
                              />

                              <button
                                onClick={handleForwardToClientTicket} disabled={!userFile || !comment.trim() || isSubmittingComment}
                                className={`px-4 py-2 rounded-lg ml-4 ${(!userFile || !comment.trim() || isSubmittingComment)
                                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                                  }`}>
                                {isSubmittingComment ? 'Forwarding updated resume to client ...' : 'Forward updated resume to client '}
                              </button>
                            </div>
                          )} */}
                          {resumeSatisfaction === 'no' && (
                            <div className="space-y-2 mt-2" >
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Add a comment : <span className="text-red-800 text-xl relative top-1">*</span>
                              </label>
                              <textarea
                                className="w-full border p-2 rounded"
                                placeholder="Add a comment before closing or forwarding..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                required
                              />
                              <button
                                onClick={handleForwardTicket}
                                disabled={(!comment.trim() || isSubmittingComment) && (!RTMId)}
                                // className={`bg-blue-500 text-white px-4 py-2 rounded ml-4`}
                                className={`px-4 py-2 rounded-lg ml-4 ${(!comment.trim() || isSubmittingComment)
                                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                                  }`}
                              >
                                {isSubmittingComment ? ' Forwarding to Resume team member ... ' : ' Forward to Resume Team '}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
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
