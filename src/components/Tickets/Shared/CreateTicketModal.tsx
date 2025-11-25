import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, Clock, User, Calendar } from 'lucide-react';
import { User as UserType, TicketType } from '../../../types';
import { rolePermissions, ticketTypeLabels } from '../../../data/mockData';
import { fetchSLAConfig, SLAConfig } from '../../../services/slaService';
import { supabase } from '../../../lib/supabaseClient'; // your Supabase client instance
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';
import { set } from 'date-fns';
import { ca } from 'date-fns/locale';

interface CreateTicketModalProps {
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ticketData: any) => void;
  onTicketCreated: () => void;
}
interface Client {
  id: any;
  full_name: any;
  job_role_preferences: any;
  careerassociatemanagerid: {
    id: any;
    name: any;
    email: any;
  }[];
  careerassociateid: {
    id: any;
    name: any;
    email: any;
  }[];
  account_manager_id: {
    id: any;
    name: any;
    email: any;
  }[];
}


export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  user,
  isOpen,
  onClose,
  onTicketCreated,
  onSubmit
}) => {
  // console.log("us",user);
  const [clients, setClients] = useState<any[]>([]);
  const [ticketType, setTicketType] = useState<TicketType | ''>('');
  const [clientId, setClientId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('');
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [slaConfigs, setSlaConfigs] = useState<SLAConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [file, setFile] = useState<File | null>(null);
  const [catlEmail, setCatlEmail] = useState<string>('');
  const [caEmail, setCaEmail] = useState<string>('');
  const [amEmail, setAmEmail] = useState<string>('');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  const permissions = rolePermissions[user.role];
  const allowedTicketTypes = permissions.canCreateTickets;

  useEffect(() => {
    const loadData = async () => {
      try {
        const slaConfig = await fetchSLAConfig()
        setSlaConfigs(slaConfig)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])
  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, job_role_preferences')
        .order('full_name', { ascending: true });
      // console.log(data);
      if (error) {
        console.error('Failed to fetch clients:', error);
      } else {
        setClients(data || []);
      }
    };

    fetchClients();
  }, []);


  if (user.role === 'client') {
    useEffect(() => {
      const fetchClientId = async () => {
        if (!user) return;
        const { data, error } = await supabase.from('clients').select('id').eq('company_email', user.email).single();
        if (error) {
          console.error('Error fetching client ID:', error);
          return;
        } else {
          setClientId(data?.id || '');
        }
      };
      fetchClientId();
    }, [user]);
  }

  useEffect(() => {
    const fetchClientsdata = async () => {
      if (!clientId) return;
      const { data, error } = await supabase
        .from('clients')
        .select(`id,
           full_name,
           job_role_preferences,
           careerassociatemanagerid:careerassociatemanagerid (
            id,
            name,
            email
          ),
           careerassociateid:careerassociateid (
            id,
            name,
            email
          ),
          account_manager_id:account_manager_id (
            id,
            name,
            email
          )`)
        .eq('id', clientId)
        .single(); // Since you're fetching only one row;

      if (error) {
        console.error('Error fetching selected client:', error);
      } else {
        setSelectedClient(data); // You can create a state like const [selectedClient, setSelectedClient] = useState(null)
        setCatlEmail(data.careerassociatemanagerid?.email);
        setAmEmail(data.account_manager_id?.email);
        setCaEmail(data.careerassociateid?.email);
      }
    };

    fetchClientsdata();
  }, [clientId]);
  useEffect(() => {
    if (catlEmail) console.log('selected client 2 (state catlEmail):');
    if (amEmail) console.log('selected client 2 (state catlEmail):');
    if (caEmail) console.log('selected client 2 (state catlEmail):');
  }, [catlEmail, amEmail, caEmail]);

  if (!isOpen) return null;

  const handleTicketTypeChange = (type: TicketType) => {
    setTicketType(type);
    setTitle(getDefaultTitle(type));
    setDescription('');
    setMetadata({});
    setFile(null);
  };

  const getDefaultTitle = (type: TicketType): string => {
    const titles: Record<TicketType, string> = {
      volume_shortfall: 'Volume Shortfall - Applications below expectation',
      data_mismatch: 'Data Mismatch - Mistake in application process',
      resume_update: 'Client Resume Update Required',
      call_support: 'Need a call from support team',
      // high_rejections: 'High Rejection Rate - Client feedback needed',
      // no_interviews: 'No Interview Calls - Client concern',
      // profile_data_issue: 'Profile Data Correction Required',
      // credential_issue: 'Client Credential Access Problem',
      // bulk_complaints: 'Multiple Client Complaints',
      // early_application_request: 'Client Requests Faster Processing',
      // job_feed_empty: 'No Jobs Available in Feed',
      // system_technical_failure: 'System Technical Issue',
      // am_not_responding: 'Account Manager Not Responding to New Client',
    };
    return titles[type] || '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('You must be logged in to submit a ticket');
      return;
    }

    // Validate required fields
    if (!ticketType || !title || !description) {
      alert("Please fill in all required fields.");
      return;
    }

    // Get the correct SLA config for this ticket type
    const slaConfig = getSLAForTicketType(ticketType);
    if (!slaConfig) {
      alert("Could not find SLA configuration for this ticket type.");
      return;
    }
    setIsCreatingTicket(true);

    const calculateDueDate = (hours: number) => {
      const now = new Date();
      now.setHours(now.getHours() + hours);
      return now.toISOString();
    };
    const now = new Date();
    const isoNow = now.toISOString();
    let clientLogginId: { data: { id: string } | null } = { data: { id: '' } };
    let clientEmail: { data: { company_email: string, full_name: string } | null } = { data: { company_email: '', full_name: '' } };
    if (user.role === 'client') {
      clientLogginId = await supabase.from('clients').select('id').eq('company_email', user.email).single();
      setClientId(clientLogginId.data?.id);
      // clientEmail = await supabase.from('clients').select('company_email,full_name').eq('company_email', user.email).single();
    }
    // Build the ticket data
    const newTicket = {
      id: uuidv4(),
      type: ticketType,
      title,
      description,
      clientId: user.role !== 'client' ? clientId : clientLogginId.data?.id, // Only set clientId if the user is not a client
      // clientId: clientId || null,
      createdby: user.id,
      priority: slaConfig.priority, // Fixed: Now uses correct priority
      status: 'open',
      sla_hours: slaConfig.hours, // Fixed: Now uses correct hours
      createdat: now,
      updatedAt: isoNow,
      dueDate: calculateDueDate(slaConfig.hours), // Fixed: Now uses correct hours
      escalation_level: 0,
      metadata: JSON.stringify(metadata),
      comments: JSON.stringify([]),
      createdbyclient: user.role === 'client',
    };

    // Send to Supabase
    try {
      const { error: ticketError } = await supabase
        .from('tickets')
        .insert(newTicket)
        .select('id') // Ensure we get the ID back
        .single();

      if (ticketError) {
        console.error("Supabase insert error:", ticketError);
        alert("Failed to create ticket.");
        return;
      }
      const ticketId = newTicket.id;

      if (file) {
        const filePath = `${ticketId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(filePath, file);

        if (uploadError) {
          toast.error("Ticket was created, but file upload failed.");
          console.error("File upload failed:", uploadError);
        } else {
          // Step 3: Record the uploaded file in the 'ticket_files' table
          const { error: fileInsertError } = await supabase.from('ticket_files').insert({
            ticket_id: ticketId,
            uploaded_by: user.id,
            file_path: filePath,
            file_name: file.name,
            foraf: true,
          });
          if (fileInsertError) {
            toast.error("Ticket created, but failed to link the uploaded file.");
            console.error("Failed to record file in DB:", fileInsertError);
          }
        }
      }

      if (ticketType === 'volume_shortfall') {
        const { error: vsError } = await supabase
          .from('volume_shortfall_tickets')
          .insert([{
            ticket_id: ticketId,
            expected_applications: metadata.expectedApplications,
            actual_applications: metadata.actualApplications,
            time_period: metadata.timePeriod,
            notes: description,
            forwarded_to_ca_scraping: false
          }]);

        if (vsError) {
          console.error("Failed to insert volume shortfall fields", vsError.message);
          alert("Failed to save volume shortfall-specific data.");
          return;
        }
      }
      // alert("Ticket created successfully!");
      // toast.success("Ticket created successfully!");
      toast("Ticket created successfully!", {
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
      onTicketCreated();
      // Reset form
      setTicketType('');
      setClientId('');
      setTitle('');
      setDescription('');
      setUrgency('');
      setMetadata({});
      setFile(null);
      onClose();
      setIsCreatingTicket(false);

      console.log("client email", clientEmail.data?.company_email);
      // Send email notification 
      if (user.role === 'client') {
        await fetch("https://ticketingtoolapplywizz.vercel.app/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: user.email,
            subject: "Ticket Created Successfully in ApplyWizz Ticketing Tool",
            htmlBody: `
      <html>
         <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
          <div style="text-align:center; margin-bottom:20px;">
            <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                 alt="ApplyWizz Logo" 
                 style="width:150px;"/>
          </div>
          <h2 style="color:#1E90FF;">Hello ${user.name} (${user.email})</h2>
          <p>Thank you for reaching out to us.Your ticket has been created successfully in the Applywizz Ticketing Tool.</p>
          <hr style="border:none;border-top:1px solid #eee;" />
          <p><strong>Ticket Type:</strong> ${ticketTypeLabels[newTicket.type]}</p>
          <h3 style="color:#1E90FF;">Here are the details of your ticket:</h3>
          <ul>
            <li><strong>Title:</strong> ${newTicket.title}</li>
            <li><strong>Description:</strong> ${newTicket.description}</li>
            <li><strong>Priority:</strong> ${newTicket.priority.toUpperCase()}</li>
            <li><strong>Status:</strong> ${newTicket.status.charAt(0).toUpperCase() + newTicket.status.slice(1)}</li>
            <li><strong>SLA Hours:</strong> ${newTicket.sla_hours} hours</li>
            <li><strong>Due Date:</strong> ${new Date(newTicket.dueDate).toLocaleString()}</li>
            <li><strong>Created At:</strong> ${new Date(newTicket.createdat).toLocaleString()}</li>
          </ul>
           <p style="background-color:#FFF3CD;padding:10px;border-left:4px solid #FFC107;">Our support team will review the ${newTicket.type} details and get back to you shortly.</p>
          <p>Thank you for using <strong>ApplyWizz Ticketing Tool</strong>!</p>
          <hr style="border:none;border-top:1px solid #eee;" />
          <p style="font-size:12px;color:#777;">This is an automated message. Please do not reply to this email.</p>
        </body>
      </html>
    `
          })
        });
        if (amEmail) {
          await fetch("https://ticketingtoolapplywizz.vercel.app/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: amEmail,
              subject: "New Ticket raised in ApplyWizz Ticketing Tool",
              htmlBody: `
      <html>
         <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
          <div style="text-align:center; margin-bottom:20px;">
            <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                 alt="ApplyWizz Logo" 
                 style="width:150px;"/>
          </div>
          <h2 style="color:#1E90FF;">Hello ${selectedClient.account_manager_id?.name} (${selectedClient.account_manager_id?.email})</h2>
          <p>A new ticket has been raised in the Applywizz Ticketing Tool by ${user.name} (client).</p>
          <hr style="border:none;border-top:1px solid #eee;" />
          <p><strong>Ticket Type:</strong> ${ticketTypeLabels[newTicket.type]}</p>
          <h3 style="color:#1E90FF;">Here are the Ticket Details:</h3>
          <ul>
            <li><strong>Title:</strong> ${newTicket.title}</li>
            <li><strong>Description:</strong> ${newTicket.description}</li>
            <li><strong>Priority:</strong> ${newTicket.priority.toUpperCase()}</li>
            <li><strong>Status:</strong> ${newTicket.status.charAt(0).toUpperCase() + newTicket.status.slice(1)}</li>
            <li><strong>SLA Hours:</strong> ${newTicket.sla_hours} hours</li>
            <li><strong>Due Date:</strong> ${new Date(newTicket.dueDate).toLocaleString()}</li>
            <li><strong>Created At:</strong> ${new Date(newTicket.createdat).toLocaleString()}</li>
          </ul>
           <p style="background-color:#FFF3CD;padding:10px;border-left:4px solid #FFC107;">Kindly note that this ticket is now in the system for tracking and resolution. <br/>           Updates will be shared as progress is made.</p>
                
          <p>Best regards,<br/> <strong>ApplyWizz Ticketing Tool Support Team.</strong></p> 
          <hr style="border:none;border-top:1px solid #eee;" />
          <p style="font-size:12px;color:#777;">This is an automated message. Please do not reply to this email.</p>
        </body>
      </html>
    `
            })
          });
        }
      }
      if (ticketType === "volume_shortfall") {
        await fetch("https://ticketingtoolapplywizz.vercel.app/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: catlEmail,
            subject: "New Ticket raised in ApplyWizz Ticketing Tool",
            htmlBody: `
      <html>
         <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
          <div style="text-align:center; margin-bottom:20px;">
            <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                 alt="ApplyWizz Logo" 
                 style="width:150px;"/>
          </div>
          <h2 style="color:#1E90FF;">Hello ${selectedClient.careerassociatemanagerid?.name} (${catlEmail})</h2>
          <p>A new ticket has been raised in the Applywizz Ticketing Tool by ${user.name} (client)</p>
          <hr style="border:none;border-top:1px solid #eee;" />
          <p><strong>Ticket Type:</strong> ${ticketTypeLabels[newTicket.type]}</p>
          <h3 style="color:#1E90FF;">Ticket Details:</h3>
          <ul>
            <li><strong>Title:</strong> ${newTicket.title}</li>
            <li><strong>Description:</strong> ${newTicket.description}</li>
            <li><strong>Priority:</strong> ${newTicket.priority.toUpperCase()}</li>
            <li><strong>Status:</strong> ${newTicket.status.charAt(0).toUpperCase() + newTicket.status.slice(1)}</li>
            <li><strong>SLA Hours:</strong> ${newTicket.sla_hours} hours</li>
            <li><strong>Due Date:</strong> ${new Date(newTicket.dueDate).toLocaleString()}</li>
            <li><strong>Created At:</strong> ${new Date(newTicket.createdat).toLocaleString()}</li>
          </ul>
          ${ticketType === "volume_shortfall"
                ? '<p style="background-color:#FFF3CD;padding:10px;border-left:4px solid #FFC107;">Our team will review the volume shortfall details and get back to you shortly.</p>'
                : ''
              }
          <p>Thank you for using <strong>ApplyWizz Ticketing Tool</strong>!</p>
          <hr style="border:none;border-top:1px solid #eee;" />
          <p style="font-size:12px;color:#777;">This is an automated message. Please do not reply to this email.</p>
        </body>
      </html>
    `
          })
        });
      } else if (ticketType === "data_mismatch") {  // added catlEmail  to keep in loop 
        if (caEmail) {
          await fetch("https://ticketingtoolapplywizz.vercel.app/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: caEmail,
              subject: "New Ticket raised in ApplyWizz Ticketing Tool regarding Data Mismatch",
              htmlBody: `
      <html>    
         <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
          <div style="text-align:center; margin-bottom:20px;">
            <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                 alt="ApplyWizz Logo" 
                 style="width:150px;"/>
          </div> 
          <h2 style="color:#1E90FF;">Hello ${selectedClient?.careerassociateid?.name}(${caEmail}) </h2>
          <p>A ticket has been created by ${user.name} (client).</p>
          <hr style="border:none;border-top:1px solid #eee;" />
          <p><strong>Ticket Type:</strong> ${ticketTypeLabels[newTicket.type]}</p>
          <h3 style="color:#1E90FF;">Ticket Details:</h3>
          <ul>
            <li><strong>Title:</strong> ${newTicket.title}</li>
            <li><strong>Description:</strong> ${newTicket.description}</li>
            <li><strong>Priority:</strong> ${newTicket.priority.toUpperCase()}</li>
            <li><strong>Status:</strong> ${newTicket.status.charAt(0).toUpperCase() + newTicket.status.slice(1)}</li>
            <li><strong>SLA Hours:</strong> ${newTicket.sla_hours} hours</li>
            <li><strong>Due Date:</strong> ${new Date(newTicket.dueDate).toLocaleString()}</li>
            <li><strong>Created At:</strong> ${new Date(newTicket.createdat).toLocaleString()}</li>
          </ul>
          ${ticketType === "data_mismatch"
                  ? '<p style="background-color:#FFF3CD;padding:10px;border-left:4px solid #FFC107;">Kindly note that this ticket is now in the system for tracking and resolution. </p>'
                  : ''
                }
          <p>Best regards,<br/> <strong>ApplyWizz Ticketing Tool Support Team.</strong></p> 
          <hr style="border:none;border-top:1px solid #eee;" />
          <p style="font-size:12px;color:#777;">This is an automated message. Please do not reply to this email.</p>
        </body>
      </html>
    `
            })
          });

        }
        if (catlEmail) {
          await fetch("https://ticketingtoolapplywizz.vercel.app/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: catlEmail,
              subject: "New Ticket raised in ApplyWizz Ticketing Tool regarding Data Mismatch",
              htmlBody: `
      <html>    
         <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
          <div style="text-align:center; margin-bottom:20px;">
            <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                 alt="ApplyWizz Logo" 
                 style="width:150px;"/>
          </div> 
          <h2 style="color:#1E90FF;">Hello ${selectedClient?.careerassociatemanagerid?.name || ''} (${catlEmail}) </h2>
          <p>A ticket has been created by ${user.name} (client).</p>
          <hr style="border:none;border-top:1px solid #eee;" />
          <p><strong>Ticket Type:</strong> ${ticketTypeLabels[newTicket.type]}</p>
          <h3 style="color:#1E90FF;">Ticket Details:</h3>
          <ul>
            <li><strong>Title:</strong> ${newTicket.title}</li>
            <li><strong>Description:</strong> ${newTicket.description}</li>
            <li><strong>Priority:</strong> ${newTicket.priority.toUpperCase()}</li>
            <li><strong>Status:</strong> ${newTicket.status.charAt(0).toUpperCase() + newTicket.status.slice(1)}</li>
            <li><strong>SLA Hours:</strong> ${newTicket.sla_hours} hours</li>
            <li><strong>Due Date:</strong> ${new Date(newTicket.dueDate).toLocaleString()}</li>
            <li><strong>Created At:</strong> ${new Date(newTicket.createdat).toLocaleString()}</li>
          </ul>
          ${ticketType === "data_mismatch"
                  ? '<p style="background-color:#FFF3CD;padding:10px;border-left:4px solid #FFC107;">Kindly note that this ticket is now in the system for tracking and resolution. </p>'
                  : ''
                }
          <p>Best regards,<br/> <strong>ApplyWizz Ticketing Tool Support Team.</strong></p> 
          <hr style="border:none;border-top:1px solid #eee;" />
          <p style="font-size:12px;color:#777;">This is an automated message. Please do not reply to this email.</p>
        </body>
      </html>
    `
            })
          });
        }
      } else if (ticketType === "resume_update") {  // 
        // Logic for resume_update email notifications can be added here
        await fetch("https://ticketingtoolapplywizz.vercel.app/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "sriketh@Applywizz.com",
            subject: "New Ticket raised in ApplyWizz Ticketing Tool For Resume Update",
            htmlBody: `
      <html>
         <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
          <div style="text-align:center; margin-bottom:20px;">
            <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                 alt="ApplyWizz Logo" 
                 style="width:150px;"/>
          </div>
          <h2 style="color:#1E90FF;">Hello Sriketh (sriketh@applywizz.com)</h2>
          <p>A ticket has been created by ${user.name} (client) to make changes in resume</p>
          <hr style="border:none;border-top:1px solid #eee;" />
          <p><strong>Ticket Type:</strong> ${ticketTypeLabels[newTicket.type]}</p>
          <h3 style="color:#1E90FF;">Ticket Details:</h3>
          <ul>
            <li><strong>Title:</strong> ${newTicket.title}</li>
            <li><strong>Description:</strong> ${newTicket.description}</li>
            <li><strong>Priority:</strong> ${newTicket.priority.toUpperCase()}</li>
            <li><strong>Status:</strong> ${newTicket.status.charAt(0).toUpperCase() + newTicket.status.slice(1)}</li>
            <li><strong>SLA Hours:</strong> ${newTicket.sla_hours} hours</li>
            <li><strong>Due Date:</strong> ${new Date(newTicket.dueDate).toLocaleString()}</li>
            <li><strong>Created At:</strong> ${new Date(newTicket.createdat).toLocaleString()}</li>
          </ul>
          ${ticketType === "resume_update"
                ? '<p style="background-color:#FFF3CD;padding:10px;border-left:4px solid #FFC107;">Kindly note that this ticket is now in the system for tracking and resolution. </p>'
                : ''
              }
          <p>Best regards,<br/> <strong>ApplyWizz Ticketing Tool Support Team.</strong></p> 
          <hr style="border:none;border-top:1px solid #eee;" />
          <p style="font-size:12px;color:#777;">This is an automated message. Please do not reply to this email.</p>
        </body>
      </html>
    `
          })
        });
        await fetch("https://ticketingtoolapplywizz.vercel.app/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: caEmail,
            subject: "New Ticket raised in ApplyWizz Ticketing Tool For Resume Update",
            htmlBody: `
      <html>
         <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
          <div style="text-align:center; margin-bottom:20px;">
            <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                 alt="ApplyWizz Logo" 
                 style="width:150px;"/>
          </div>
          <h2 style="color:#1E90FF;">Hello ${selectedClient?.careerassociateid?.name}(${caEmail}) </h2>
          <p>A ticket has been created by ${user.name} (client) to make changes in resume</p>
          <hr style="border:none;border-top:1px solid #eee;" />
          <p><strong>Ticket Type:</strong> ${ticketTypeLabels[newTicket.type]}</p>
          <h3 style="color:#1E90FF;">Ticket Details:</h3>
          <ul>
            <li><strong>Title:</strong> ${newTicket.title}</li>
            <li><strong>Description:</strong> ${newTicket.description}</li>
            <li><strong>Priority:</strong> ${newTicket.priority.toUpperCase()}</li>
            <li><strong>Status:</strong> ${newTicket.status.charAt(0).toUpperCase() + newTicket.status.slice(1)}</li>
            <li><strong>SLA Hours:</strong> ${newTicket.sla_hours} hours</li>
            <li><strong>Due Date:</strong> ${new Date(newTicket.dueDate).toLocaleString()}</li>
            <li><strong>Created At:</strong> ${new Date(newTicket.createdat).toLocaleString()}</li>
          </ul>
          <p style="background-color:#FFF3CD;padding:10px;border-left:4px solid #FFC107;">Kindly note that this ticket is now in the system for tracking and resolution. </p>
          <p>Best regards,<br/> <strong>ApplyWizz Ticketing Tool Support Team.</strong></p> 
          <hr style="border:none;border-top:1px solid #eee;" />
          <p style="font-size:12px;color:#777;">This is an automated message. Please do not reply to this email.</p>
        </body>
      </html>
    `
          })
        });
        await fetch("https://ticketingtoolapplywizz.vercel.app/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: catlEmail,
            subject: "New Ticket raised in ApplyWizz Ticketing Tool For Resume Update",
            htmlBody: `
      <html>
         <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
          <div style="text-align:center; margin-bottom:20px;">
            <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                 alt="ApplyWizz Logo" 
                 style="width:150px;"/>
          </div>
          <h2 style="color:#1E90FF;">Hello ${selectedClient?.careerassociatemanagerid?.name || ''} (${catlEmail}) </h2>
          <p>A ticket has been created by ${user.name} (client) to make changes in resume</p>
          <hr style="border:none;border-top:1px solid #eee;" />
          <p><strong>Ticket Type:</strong> ${ticketTypeLabels[newTicket.type]}</p>
          <h3 style="color:#1E90FF;">Ticket Details:</h3>
          <ul>
            <li><strong>Title:</strong> ${newTicket.title}</li>
            <li><strong>Description:</strong> ${newTicket.description}</li>
            <li><strong>Priority:</strong> ${newTicket.priority.toUpperCase()}</li>
            <li><strong>Status:</strong> ${newTicket.status.charAt(0).toUpperCase() + newTicket.status.slice(1)}</li>
            <li><strong>SLA Hours:</strong> ${newTicket.sla_hours} hours</li>
            <li><strong>Due Date:</strong> ${new Date(newTicket.dueDate).toLocaleString()}</li>
            <li><strong>Created At:</strong> ${new Date(newTicket.createdat).toLocaleString()}</li>
          </ul>
          <p style="background-color:#FFF3CD;padding:10px;border-left:4px solid #FFC107;">Kindly note that this ticket is now in the system for tracking and resolution. </p>
          <p>Best regards,<br/> <strong>ApplyWizz Ticketing Tool Support Team.</strong></p> 
          <hr style="border:none;border-top:1px solid #eee;" />
          <p style="font-size:12px;color:#777;">This is an automated message. Please do not reply to this email.</p>
        </body>
      </html>
    `
          })
        });
      }
    } catch (error: any) {
      console.error("Supabase insert error:", error);
      toast.error(`Failed to create ticket: ${error.message}`);
    }
  };

  const renderTicketSpecificFields = () => {
    switch (ticketType) {
      // case 'credential_issue':
      //   return (
      //     <div className="space-y-4">
      //       <div>
      //         <label className="block text-sm font-medium text-gray-700 mb-2">
      //           Credential Issue Type
      //         </label>
      //         <select
      //           value={metadata.issueType || ''}
      //           onChange={(e) => setMetadata({ ...metadata, issueType: e.target.value })}
      //           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      //           required
      //           title="Credential Issue Type"
      //           <option value="">Select issue type</option>
      //           <option value="password_changed">Password Changed</option>
      //           <option value="account_locked">Account Locked</option>
      //           <option value="2fa_enabled">2FA Enabled</option>
      //           <option value="email_access_denied">Email Access Denied</option>
      //         </select>
      //       </div>
      //       <div>
      //         <label className="block text-sm font-medium text-gray-700 mb-2">
      //           Last Successful Access
      //         </label>
      //         <input
      //           type="datetime-local"
      //           value={metadata.lastAccess || ''}
      //           onChange={(e) => setMetadata({ ...metadata, lastAccess: e.target.value })}
      //           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      //           title="Enter the last successful access date and time"
      //           placeholder="YYYY-MM-DDThh:mm"
      //         />
      //       </div>
      //     </div>
      //   );

      case 'volume_shortfall':
        return (
          <div className="space-y-4">
            <>

              {getCAMInfo()}</>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Applications
                </label>
                <input
                  type="number"
                  value={metadata.expectedApplications || ''}
                  onChange={(e) => setMetadata({ ...metadata, expectedApplications: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="25"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actual Applications
                </label>
                <input
                  type="number"
                  value={metadata.actualApplications || ''}
                  onChange={(e) => setMetadata({ ...metadata, actualApplications: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="15"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <input
                type="date"
                value={metadata.timePeriod || ''}
                onChange={(e) => setMetadata({ ...metadata, timePeriod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                title="Select the time period"
                placeholder="YYYY-MM-DD"
              />
            </div>
          </div>
        );

      case 'data_mismatch':
        return (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
            <h3 className="font-medium text-gray-800">Data Mismatch Details</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application URL (if available)
              </label>
              <input
                type="url"
                value={metadata.applicationUrl || ''}
                onChange={(e) => setMetadata({ ...metadata, applicationUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://www.linkedin.com/jobs/view/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Please Attach a Screenshot/File (Optional)</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
        );

      // case 'job_feed_empty':
      //   return (
      //     <div className="space-y-4">
      //       <div>
      //         <label className="block text-sm font-medium text-gray-700 mb-2">
      //           Job Categories Affected
      //         </label>
      //         <div className="space-y-2">
      //           {['Software Engineer', 'Data Scientist', 'Product Manager', 'DevOps Engineer'].map(category => (
      //             <label key={category} className="flex items-center">
      //               <input
      //                 type="checkbox"
      //                 checked={metadata.jobCategories?.includes(category) || false}
      //                 onChange={(e) => {
      //                   const categories = metadata.jobCategories || [];
      //                   if (e.target.checked) {
      //                     setMetadata({ ...metadata, jobCategories: [...categories, category] });
      //                   } else {
      //                     setMetadata({ ...metadata, jobCategories: categories.filter((c: string) => c !== category) });
      //                   }
      //                 }}
      //                 className="mr-2"
      //               />
      //               <span className="text-sm">{category}</span>
      //             </label>
      //           ))}
      //         </div>
      //       </div>
      //       <div>
      //         <label className="block text-sm font-medium text-gray-700 mb-2">
      //           Locations Affected
      //         </label>
      //         <input
      //           type="text"
      //           value={metadata.locations || ''}
      //           onChange={(e) => setMetadata({ ...metadata, locations: e.target.value })}
      //           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      //           placeholder="New York, San Francisco"
      //         />
      //       </div>
      //       <div>
      //         <label className="block text-sm font-medium text-gray-700 mb-2">
      //           Last Job Found Date
      //         </label>
      //         <input
      //           type="date"
      //           value={metadata.lastJobFound || ''}
      //           onChange={(e) => setMetadata({ ...metadata, lastJobFound: e.target.value })}
      //           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      //           title="Select the time period"
      //           placeholder="YYYY-MM-DD"
      //         />
      //       </div>
      //     </div>
      //   );

      // case 'profile_data_issue':
      //   return (
      //     <div className="space-y-4">
      //       <div>
      //         <label className="block text-sm font-medium text-gray-700 mb-2">
      //           Incorrect Field
      //         </label>
      //         <select
      //           value={metadata.incorrectField || ''}
      //           onChange={(e) => setMetadata({ ...metadata, incorrectField: e.target.value })}
      //           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      //           required
      //           aria-label="Incorrect Field"
      //         >
      //           <option value="">Select field</option>
      //           <option value="job_role">Job Role</option>
      //           <option value="salary_range">Salary Range</option>
      //           <option value="location">Location</option>
      //           <option value="experience_level">Experience Level</option>
      //         </select>
      //       </div>
      //       <div className="grid grid-cols-2 gap-4">
      //         <div>
      //           <label className="block text-sm font-medium text-gray-700 mb-2">
      //             Current (Incorrect) Value
      //           </label>
      //           <input
      //             type="text"
      //             value={metadata.currentValue || ''}
      //             onChange={(e) => setMetadata({ ...metadata, currentValue: e.target.value })}
      //             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      //             placeholder="Current incorrect value"
      //             title="Enter the current incorrect value"
      //           />
      //         </div>
      //         <div>
      //           <label className="block text-sm font-medium text-gray-700 mb-2">
      //             Correct Value
      //           </label>
      //           <input
      //             type="text"
      //             value={metadata.correctValue || ''}
      //             onChange={(e) => setMetadata({ ...metadata, correctValue: e.target.value })}
      //             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      //             placeholder="Correct value"
      //             title="Enter the correct value"
      //           />
      //         </div>
      //       </div>
      //     </div>
      //   );

      // case 'am_not_responding':
      //   return (
      //     <div className="space-y-4">
      //       <div>
      //         <label className="block text-sm font-medium text-gray-700 mb-2">
      //           Onboarding Date
      //         </label>
      //         <input
      //           type="date"
      //           value={metadata.onboardingDate || ''}
      //           onChange={(e) => setMetadata({ ...metadata, onboardingDate: e.target.value })}
      //           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      //           required
      //           title="Select the onboarding date"
      //           placeholder="YYYY-MM-DD"
      //         />
      //       </div>
      //       <div>
      //         <label className="block text-sm font-medium text-gray-700 mb-2">
      //           Assigned Account Manager
      //         </label>
      //         <input
      //           type="text"
      //           value={metadata.assignedAM || 'Naveen'}
      //           onChange={(e) => setMetadata({ ...metadata, assignedAM: e.target.value })}
      //           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      //           placeholder="Account Manager Name"
      //           title="Enter the assigned Account Manager's name"
      //           required
      //         />
      //       </div>
      //       <div>
      //         <label className="block text-sm font-medium text-gray-700 mb-2">
      //           Days Since Onboarding
      //         </label>
      //         <input
      //           type="number"
      //           value={metadata.daysSinceOnboarding || ''}
      //           onChange={(e) => setMetadata({ ...metadata, daysSinceOnboarding: Number(e.target.value) })}
      //           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      //           placeholder="2"
      //           required
      //         />
      //       </div>
      //     </div>
      //   );

      default:
        return null;
    }
  };

  const getSLAForTicketType = (type: TicketType | '') => {
    if (!type) return null;
    return slaConfigs.find(config => config.ticket_type === type);
  };

  const getSLAInfo = () => {
    if (!ticketType) return null;
    const slaConfig = getSLAForTicketType(ticketType);
    if (!slaConfig) return null;

    return (
      <div className="flex items-center space-x-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Clock className="h-5 w-5 text-blue-600" />
        <div className="text-sm">
          <span className="font-medium text-blue-900">SLA: {slaConfig.hours} hours</span>
          <span className="text-blue-700 ml-2">Priority: {slaConfig.priority.toUpperCase()}</span>
        </div>
      </div>
    );
  };
  const getCAMInfo = () => {
    if (!selectedClient) return null;
    return (
      <div className="flex items-center space-x-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-sm">
          <span className="font-medium text-blue-900">Client : {selectedClient.full_name} has </span>
          <span className="text-blue-700 ml-2">CA Team Lead : {(selectedClient.careerassociatemanagerid?.name) || 'Not assigned'}</span>
          {/* <span className="text-blue-700 ml-2">
            CA Team Lead : {Array.isArray(selectedClient.careerassociatemanagerid) && selectedClient.careerassociatemanagerid.length > 0
              ? selectedClient.careerassociatemanagerid.map((cam) => cam.name).join(', ')
              : 'Not assigned'}
          </span> */}
        </div>
      </div>
    )
  };
  const isExecutive = user && ['ceo', 'coo', 'cro'].includes(user.role);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create New Ticket</h2>
            {(user.role !== 'client') && (<p className="text-sm text-gray-600">Role: {user.name} - {user.role.replace('_', ' ').toUpperCase()}</p>)}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client Selection - for roles that can select clients */}
          {(user.role === 'account_manager' || user.role === 'sales' || user.role == 'resume_team_head' || user.role == 'ca_team_lead' || isExecutive) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                title="Select Client"
              >
                <option value="">Choose a client</option>
                {clients.map(client => (

                  <option key={client.id} value={client.id}>
                    {client.full_name} - {(client.job_role_preferences || []).join(', ')}
                  </option>

                ))}
              </select>
            </div>
          )}

          {/* Ticket Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ticket Type
            </label>
            <select
              value={ticketType}
              onChange={(e) => handleTicketTypeChange(e.target.value as TicketType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              aria-label="Ticket Type"
            >
              <option value="">Select ticket type</option>
              {allowedTicketTypes.map(type => (
                <option key={type} value={type}>
                  {ticketTypeLabels[type]}
                </option>
              ))}
            </select>

            {ticketType === 'data_mismatch' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 my-2">
                  Type of Data Mismatch
                </label>
                <select
                  value={metadata.faultType || ''}
                  onChange={(e) => setMetadata({ ...metadata, faultType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select the type of mistake</option>
                  <option value="applied_wrong_domain">Applied with Wrong Name</option>
                  <option value="spelling_mistake_in_name_or_cover_letter">Spelling Mistake in Name/Cover Letter</option>
                  <option value="incorrect_information_submitted">Incorrect Information Submitted</option>
                  <option value="wrong_document_attached">Wrong Document Attached (e.g., Resume)</option>
                  <option value="other">Other</option>
                </select>
              </div>
            )}

            {/* Role-specific restrictions notice */}
            {user.role === 'career_associate' && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Career Associate ({user.name}):</strong> You can only create Credential Issue and Job Feed Empty tickets.
                </p>
              </div>
            )}

            {user.role === 'sales' && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Sales ({user.name}):</strong> You can only create AM Not Responding tickets during client onboarding.
                </p>
              </div>
            )}
          </div>

          {/* SLA Information */}
          {getSLAInfo()}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the issue"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Detailed description of the issue..."
              required
            />
          </div>

          {/* Ticket-specific fields */}
          {renderTicketSpecificFields()}

          {/* Urgency for critical issues - NOW USING CORRECT PRIORITY CHECK */}
          {ticketType && getSLAForTicketType(ticketType)?.priority === 'critical' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Urgency Justification
              </label>
              <textarea
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Explain why this issue is critical and requires immediate attention..."
                required
              />
              <div className="flex items-center space-x-2 mt-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Critical issues require immediate escalation</span>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={(!ticketType || !title || !description || (user.role !== 'client' && !clientId) || isCreatingTicket)}
              className={`px-4 py-2 rounded-lg ml-4 ${(!ticketType || !title || !description || (user.role !== 'client' && !clientId) || isCreatingTicket)
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
              {isCreatingTicket ? 'Creating Ticket... ' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
