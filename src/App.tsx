import React, { useState, useEffect } from 'react';
import { User, Ticket, Client, AssignedUser, DashboardStats, TicketStatus, TicketType } from './types';
import { LoginForm } from './components/Login/LoginForm';
import { Navbar } from './components/Layout/Navbar';
import { DashboardStats as DashboardStatsComponent } from './components/Dashboard/DashboardStats';
import { ExecutiveDashboard } from './components/Dashboard/ExecutiveDashboard';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { TicketList } from './components/Tickets/Shared/TicketList';
import { CreateTicketModal } from './components/Tickets/Shared/CreateTicketModal';
import { VLTicketEditModal } from './components/Tickets/VolumeShortfall/VLTicketEditModal';
import { DMTicketEditModal } from '@/components/Tickets/DataMismatch/DMTicketEditModel';
import { RUTicketEditModal } from './components/Tickets/ResumeUpdate/RUTicketEditModel';
import { CSTicketEditModal } from './components/Tickets/CallSupport/CSTicketEditModel';
import { ClientOnboardingModal } from './components/Clients/ClientOnboardingModal';
import { PendingOnboardingList } from './components/Clients/PendingOnboardingList';
import { OnboardingSuccessModal } from './components/Clients/OnboardingSuccessModal';
import { ClientEditModal } from './components/Clients/ClientEditModal';
import { ClientProfileView } from './components/Clients/ClientProfileView';
import { ClientsListView } from './components/Clients/ClientsListView';
import { ClientApplicationsView } from './components/Clients/ClientApplicationsView';
import { UserManagementModal } from './components/Admin/UserManagementModal';
import { LabResultsModal } from './components/LabResults/LabResultsModal';
import { Plus, Users, FileText, BarChart3, UserPlus, Search, Edit, Settings, Mail, LayoutDashboard, AlertCircle, Clock, Send, CheckCircle } from 'lucide-react';
import { supabase, supabase1, supabase2 } from './lib/supabaseClient';
import { DialogProvider } from './context/DialogContext';
import { supabaseAdmin } from './lib/supabaseAdminClient';
import EmailConfirmed from './components/Auth/EmailConfirmed';
import LinkExpired from './components/Auth/link-expired';
import EmailVerifyRedirect from './components/Auth/EmailVerifyRedirect';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import FeedbackButton from './components/FeedbackButton';
import { ClientSearchBar } from './components/ClientSearchBar';
import { ca } from 'date-fns/locale';
import { SupabaseAdminCreateClient } from './lib/supabaseAdminCreateClient';
import ApplicationsOverTime, { ChartItem } from './components/ClientDashboard/ApplicationsOverTime';
import ApplicationSummaryList, { TaskCount } from './components/ClientDashboard/ApplicationSummaryList';
import EasyApplySummaryList from './components/ClientDashboard/EasyApplySummaryList';
import AppliedJobsList from './components/ClientDashboard/AppliedJobsList';
import JobLinksList from './components/ClientDashboard/JobLinksList';
import JobScoringFloatingButton from "./components/ClientDashboard/JobScoringFloatingButton";
import JobCalendar from "./components/ClientDashboard/Calendar";
import ScoredJobsDashboard from './components/ClientDashboard/ScoredJobsDashboard';
import ScoredJobsRegularList, { ScoredJobsRegularListRef } from './components/ClientDashboard/ScoredJobsRegularList';
import ScoredJobsAppliedList from './components/ClientDashboard/ScoredJobsAppliedList';
import LinkedInEasyApplyDashboard from './components/ClientDashboard/LinkedInEasyApplyDashboard';
import LinkedInEasyApplyRegularList, { LinkedInEasyApplyRegularListRef } from './components/ClientDashboard/LinkedInEasyApplyRegularList';
import IndeedEasyApplyDashboard from './components/ClientDashboard/IndeedEasyApplyDashboard';
import IndeedEasyApplyRegularList, { IndeedEasyApplyRegularListRef } from './components/ClientDashboard/IndeedEasyApplyRegularList';
import StaffingAgenciesDashboard from './components/ClientDashboard/StaffingAgenciesDashboard';
import StaffingAgenciesRegularList from './components/ClientDashboard/StaffingAgenciesRegularList';
import C2CJobsDashboard from './components/ClientDashboard/C2CJobsDashboard';
import C2CJobsRegularList from './components/ClientDashboard/C2CJobsRegularList';
import W2JobsDashboard from './components/ClientDashboard/W2JobsDashboard';
import W2JobsRegularList from './components/ClientDashboard/W2JobsRegularList';
import C2CW2JobsDashboard from './components/ClientDashboard/C2CW2JobsDashboard';
import C2CW2JobsRegularList from './components/ClientDashboard/C2CW2JobsRegularList';
import JobTrackingDashboard from './components/ClientDashboard/JobTrackingDashboard';
import { useAccount } from './contexts/AccountContext';
import ReportPage from './components/Report/ReportPage';
import PricingSection from './components/Pricing/PricingSection';
import JobScoringOverlay from './components/ClientDashboard/JobScoringOverlay';
import LoadingOverlay from './components/ClientDashboard/LoadingOverlay';
import SuccessPage from './components/Payment/SuccessPage';
import JobBoardSignUpForm from './components/JobBoard/JobBoardSignUpForm';
import ClientOnboarding from './components/JobBoard/ClientOnboarding';
import KarmafyPendingOverlay from './components/ClientDashboard/KarmafyPendingOverlay';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';


function App() {
  const fetchData = async () => {
    // 1. Get all tickets
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .order('createdat', { ascending: false });
    if (ticketError) console.error(ticketError);

    // 2. Get all users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });
    // if(userData) console.log(userData);
    if (userError) console.error(userError);

    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientError) {
      console.error("Error loading clients:", clientError.message);
    } else {
      // Convert string dates to Date objects
      const processedClientData = (clientData || []).map(client => ({
        ...client,
        created_at: client.created_at ? new Date(client.created_at) : undefined,
        update_at: client.update_at ? new Date(client.update_at) : undefined
      }));
      // console.log("Clients:", clientData);
      setClients(processedClientData);
    }

    // 3. Get all ticket assignments
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('ticket_assignments')
      .select('ticket_id, user_id');

    if (assignmentError) console.error(assignmentError);

    // 4. Map ticket_id → [user objects]
    const userMap = new Map(
      (userData ?? []).map(u => [u.id, u.name])
    );

    const assignmentMap: Record<string, AssignedUser[]> = {};
    assignmentData?.forEach(({ ticket_id, user_id }) => {
      if (!assignmentMap[ticket_id]) assignmentMap[ticket_id] = [];
      // assignmentMap[ticket_id].push({ id: user_id, name: userMap.get(user_id) });
      assignmentMap[ticket_id].push({
        id: user_id,
        name: userMap.get(user_id) ?? 'Unknown',
        role: userData.find(u => u.id === user_id)?.role || 'Unknown Role'
      });
    });

    const { data: escalationData, error: escalationError } = await supabase
      .from('ticket_escalations')
      .select(`
        id, reason, created_at, ticket_id, ca_id, escalated_by,
        tickets ( id, title, type, short_code ),
        ca: users!ticket_escalations_ca_id_fkey ( name ),
        escalated_by_user: users!ticket_escalations_escalated_by_fkey ( name )
        `);

    if (escalationError) {
      console.error('Failed to fetch escalations:', escalationError);
    } else {
      setEscalations(escalationData || []);
    }

    const { data: pendingClientsData, error: pendingClientsError } = await supabase
      .from('pending_clients')
      .select('*');

    if (pendingClientsError) {
      console.error("Error loading pending clients:", pendingClientsError.message);
    } else {
      setPendingClients(pendingClientsData || []);
    }

    setTickets(ticketData || []);
    setUsers(userData || []);
    setAssignments(assignmentMap);
  };

  // Function to handle view lab results
  const handleViewLabResults = (labId: string) => {
    setSelectedLabId(labId);
    setIsLabResultsModalOpen(true);
  };

  const handleTicketUpdated = async () => {
    await fetchData(); // Refreshes tickets and assignments
  };
  // State to store the current user
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pendingClients, setPendingClients] = useState<any[]>([]);
  const [filterPriority, setFilterPriority] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  // State to store the clients
  const [clients, setClients] = useState<Client[]>([]);
  // State to store the active view (load from localStorage if available)
  const [activeView, setActiveView] = useState(() => {
    const savedView = localStorage.getItem('activeView');
    return savedView || 'dashboard';
  });
  // State to store whether the create ticket modal is open
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
  // State to store whether the client onboarding modal is open
  const [isClientOnboardingModalOpen, setIsClientOnboardingModalOpen] = useState(false);
  // State to store whether the user management modal is open
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  // State to store whether the lab results modal is open
  const [isLabResultsModalOpen, setIsLabResultsModalOpen] = useState(false);
  // State to store the lab ID for viewing results
  const [selectedLabId, setSelectedLabId] = useState<string>('');
  // State to store the selected ticket
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  // State to store the selected client
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Lifted state for LinkedInEasyApplyRegularList
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [isScoringTriggered, setIsScoringTriggered] = useState(false);

  // Shared calendar states for all job list components
  const [showCalendar, setShowCalendar] = useState(false);
  const [filteredDate, setFilteredDate] = useState<string | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const linkedInEasyApplyRef = React.useRef<LinkedInEasyApplyRegularListRef>(null);
  const indeedEasyApplyRef = React.useRef<IndeedEasyApplyRegularListRef>(null);
  const scoredJobsRef = React.useRef<ScoredJobsRegularListRef>(null);

  // State to store whether the ticket edit modal is open
  const [isTicketEditModalOpen, setIsTicketEditModalOpen] = useState(false);
  // State to store whether the client edit modal is open
  const [isClientEditModalOpen, setIsClientEditModalOpen] = useState(false);
  // State to store whether the client profile view modal is open


  const [assignments, setAssignments] = useState<Record<string, AssignedUser[]>>({});

  const [escalations, setEscalations] = useState<any[]>([]);

  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<TicketType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [optedJobLinks, setOptedJobLinks] = useState<boolean>(false);
  const [clientExists, setClientExists] = useState<boolean | null>(null);
  const [isPendingReview, setIsPendingReview] = useState(false);
  const [pendingReviewData, setPendingReviewData] = useState<any>(null);
  const [isKarmafyPending, setIsKarmafyPending] = useState(false);
  const [isNewRoleClient, setIsNewRoleClient] = useState(false);

  // Client dashboard data
  const [clientDashboardData, setClientDashboardData] = useState<TaskCount[]>([]);
  const [clientDashboardLoading, setClientDashboardLoading] = useState(false);
  const [clientDashboardError, setClientDashboardError] = useState("");
  const [applywizzId, setApplywizzId] = useState<string | undefined>();

  // State for job scoring overlay
  const [showJobScoringOverlay, setShowJobScoringOverlay] = useState(false);
  const [hasShownOverlayThisSession, setHasShownOverlayThisSession] = useState(false);
  const [isJobsLoading, setIsJobsLoading] = useState(true);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
  const [hasCompletedInitialLoad, setHasCompletedInitialLoad] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);

  // Selected client for viewing applications
  const [selectedClientForApplications, setSelectedClientForApplications] = useState<Client | null>(null);

  const [isSendMailModalOpen, setIsSendMailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('vivek@applywizz.com');
  const [emailSubject, setEmailSubject] = useState('Subject');
  const [emailMessage, setEmailMessage] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);

  // New state variables for email with attachment
  const [isSendMailWithAttachmentModalOpen, setIsSendMailWithAttachmentModalOpen] = useState(false);
  const [emailToAttachment, setEmailToAttachment] = useState('vivek@applywizz.com');
  const [emailSubjectAttachment, setEmailSubjectAttachment] = useState('Subject with Attachment');
  const [emailMessageAttachment, setEmailMessageAttachment] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // Success modal state for direct onboarding
  const [isOnboardingSuccessModalOpen, setIsOnboardingSuccessModalOpen] = useState(false);
  const [onboardingSuccessData, setOnboardingSuccessData] = useState<{
    fullName: string;
    email: string;
    jbId: string;
  } | null>(null);

  // Payment popup state (shown when a Google user tries to sign up without paying)
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [blockedGoogleEmail, setBlockedGoogleEmail] = useState<string | null>(null);

  // Get selectedAccountId and clearSelection from context for multi-account support
  const { selectedAccountId, clearSelection } = useAccount();

  useEffect(() => {
    fetchData();
  }, []);
  useEffect(() => {
    const allChannels = [
      { name: 'tickets', table: 'tickets' },
      { name: 'ticket_comments', table: 'ticket_comments' },
      { name: 'ticket_files', table: 'ticket_files' },
      { name: 'ticket_assignments', table: 'ticket_assignments' },
      { name: 'ticket_escalations', table: 'ticket_escalations' },
      { name: 'volume_shortfall_tickets', table: 'volume_shortfall_tickets' },
      { name: 'clients', table: 'clients' },
      { name: 'pending_clients', table: 'pending_clients' },
      { name: 'rolepermissions', table: 'rolepermissions' },
      { name: 'sla_config', table: 'sla_config' },
      { name: 'ticket_status_flow', table: 'ticket_status_flow' },
      { name: 'ticket_type', table: 'ticket_type' },
      { name: 'users', table: 'users' },
    ];

    const activeChannels = allChannels.map(({ name, table }) =>
      supabase
        .channel(`realtime-${name}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
          },
          async (payload) => {
            console.log(`📡 ${table} updated:`, payload);
            await fetchData(); // re-fetch the latest view
          }
        )
        .subscribe()
    );

    return () => {
      activeChannels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, []);

  // useEffect(() => {
  //   // 📡 1. Tickets Realtime Listener
  //   const ticketsChannel = supabase
  //     .channel('realtime-tickets')
  //     .on(
  //       'postgres_changes',
  //       {
  //         event: '*',
  //         schema: 'public',
  //         table: 'tickets',
  //       },
  //       async (payload) => {
  //         console.log('📡 Ticket event:', payload);
  //         await fetchData();
  //       }
  //     )
  //     .subscribe();

  //   // 📡 2. Comments Realtime Listener
  //   const commentsChannel = supabase
  //     .channel('realtime-comments')
  //     .on(
  //       'postgres_changes',
  //       {
  //         event: '*',
  //         schema: 'public',
  //         table: 'ticket_comments',
  //       },
  //       async (payload) => {
  //         console.log('💬 Comment event:', payload);
  //         await fetchData();
  //       }
  //     )
  //     .subscribe();

  //   // 🔁 Cleanup both channels on component unmount
  //   return () => {
  //     supabase.removeChannel(ticketsChannel);
  //     supabase.removeChannel(commentsChannel);
  //   };
  // }, []);
  // assignments: Record<string, { id: string; name: string; role: string }[]>

  // Function to handle user login
  // const handleLogin = (user: User) => {
  //   setCurrentUser(user);
  //   // console.log('Logged in user:', user.name, 'with role:', user.role);
  // };
  // // console.log('Logged in user:', currentUser?.name, currentUser?.role);

  // // Function to handle logout
  // const handleLogout = () => {
  //   setCurrentUser(null);
  //   setActiveView('dashboard');
  // };
  useEffect(() => {
    // Restore user from localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }

    // Restore active view from sessionStorage
    const storedView = sessionStorage.getItem('activeView');
    if (storedView) {
      setActiveView(storedView);
    }

    fetchData();

    // 🔐 Auth state sync removed.
    // Login and Signup components now handle session creation, validation,
    // and DB synchronization explicitly via handleLogin/handleSignUp.
  }, []);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchClientStatus = async () => {
      if (!currentUser?.email || currentUser?.role !== 'client') return;

      try {
        // 1. Check if they exist in the regular 'clients' table
        const { data: clientData, error: clientErr } = await supabase
          .from('clients')
          .select('id, opted_job_links, applywizz_id')
          .eq('company_email', currentUser.email);

        if (clientErr) throw clientErr;

        if (clientData && clientData.length > 0) {
          setClientExists(true);
          setIsPendingReview(false);
          setOptedJobLinks(clientData.some(c => c.opted_job_links));
          setApplywizzId(clientData[0].applywizz_id);
          return;
        }

        // 2. If not in 'clients', check 'pending_clients'
        const { data: pendingData, error: pendingErr } = await supabase
          .from('pending_clients')
          .select('*')
          .eq('company_email', currentUser.email);

        if (pendingErr) throw pendingErr;

        if (pendingData && pendingData.length > 0) {
          setClientExists(true); // Treat as exists so form doesn't show
          setIsPendingReview(true);
          setPendingReviewData(pendingData[0]);
        } else {
          setClientExists(false);
          setIsPendingReview(false);
        }
      } catch (err) {
        console.error('Failed to fetch client status:', err);
      }
    };

    fetchClientStatus();
  }, [currentUser?.email, currentUser?.role]);

  // 🚪 Auto-close popup windows after successful login
  useEffect(() => {
    if (window.opener && currentUser) {
      // Add a tiny delay to ensure everything is synced before closing
      const timer = setTimeout(() => {
        window.close();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  const getRemainingTimeForReminder = () => {
    if (!pendingReviewData?.client_form_fill_date) return 0;
    const lastSent = new Date(pendingReviewData.client_form_fill_date).getTime();
    const now = currentTime.getTime();
    const cooldown = 24 * 60 * 60 * 1000; // 24 hours
    const remaining = lastSent + cooldown - now;
    return remaining > 0 ? remaining : 0;
  };

  const handleSendReminder = async () => {
    if (!pendingReviewData || isSendingReminder || reminderSent) return;

    setIsSendingReminder(true);
    try {
      const { error: fnError } = await supabase.functions.invoke('send-onboarding-reminder', {
        body: {
          to: 'vivek@applywizz.com',
          clientEmail: pendingReviewData.email,
          clientName: pendingReviewData.full_name || 'Valued Customer',
          jobRole: pendingReviewData.job_role_preferences?.[0] || 'Custom Role',
        },
      });

      if (fnError) throw fnError;

      // Update the timestamp in the database
      const { error: updateError } = await supabase
        .from('pending_clients')
        .update({ onboarding_reminder_sent_at: new Date().toISOString() })
        .eq('id', pendingReviewData.id);

      if (updateError) throw updateError;

      setReminderSent(true);
      // Update local state to reflect the new timestamp
      setPendingReviewData({
        ...pendingReviewData,
        onboarding_reminder_sent_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to send reminder:', error);
      alert('Failed to send reminder. Please try again later.');
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Fetch client dashboard data when user changes
  const fetchClientDashboardData = async () => {
    // Early return if not a client
    if (!currentUser?.email || currentUser?.role !== 'client') {
      setClientDashboardData([]);
      setApplywizzId(undefined);
      return;
    }

    setClientDashboardLoading(true);
    setClientDashboardError("");

    try {
      // Get the applywizz_id from Supabase based on the user's email
      // This is needed for ALL clients (both regular and opted_job_links)
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('applywizz_id,opted_job_links,status')
        .eq('company_email', currentUser.email);

      if (clientError) {
        throw new Error(`Failed to fetch client data: ${clientError.message}`);
      }

      if (!clientData || clientData.length === 0) {
        throw new Error("Applywizz ID not found for this user");
      }

      // Use the first client account found
      const activeClient = clientData[0];
      console.log("activeClient data:", activeClient);

      // Check if this is a new role client
      const isNewRole = activeClient.status === 'new_role';
      setIsNewRoleClient(isNewRole);
      console.log("isNewRoleClient:", isNewRole);

      // Set applywizzId for BOTH client types (regular and opted_job_links)
      const fetchedApplywizzId = activeClient.applywizz_id;
      setApplywizzId(fetchedApplywizzId);
      console.log("fetchedApplywizzId:", fetchedApplywizzId);

      // Only fetch summary data for regular clients (not opted_job_links)
      // Scored jobs clients (opted_job_links = true) fetch their own data in components
      if (!activeClient.opted_job_links) {
        // Fetch the actual data from the external API for regular clients
        const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL;
        if (!apiUrl) {
          throw new Error('VITE_EXTERNAL_API_URL is not defined in environment variables');
        }

        const response = await fetch(`${apiUrl}/api/client-tasks?lead_id=${fetchedApplywizzId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch data from external API: ${response.status} ${response.statusText}`);
        }

        const apiData = await response.json();

        // Transform the new API data format
        // API returns: { completed_tasks: { "date": count }, easy_apply_tasks: { "date": count } }
        const allDates = new Set([
          ...Object.keys(apiData.completed_tasks || {}),
          ...Object.keys(apiData.easy_apply_tasks || {})
        ]);

        const formattedData: TaskCount[] = Array.from(allDates).map(date => ({
          date,
          regularCount: Number(apiData.completed_tasks[date] || 0),
          easyApplyCount: Number(apiData.easy_apply_tasks[date] || 0)
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setClientDashboardData(formattedData);
      } else {
        // For opted_job_links clients, clear dashboard data but keep applywizzId
        console.log("Scored jobs client detected - checking for today's jobs...");
        setClientDashboardData([]);

        // const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL1;
        // if (apiUrl && fetchedApplywizzId) {
        //   try {
        //     const summaryResponse = await fetch(`${apiUrl}/api/job-links?lead_id=${fetchedApplywizzId}&source=LINKEDIN&apply_type=EASY_APPLY`);

        //     if (summaryResponse.ok) {
        //       const data = await summaryResponse.json();
        //       const summaryData = data.easy_apply_jobs || {};

        //       // Determine if this is a brand new client (Phase 3)
        //       const totalScoredJobs = Object.keys(summaryData).length;
        //       if (totalScoredJobs === 0) {
        //         setIsKarmafyPending(true);
        //       } else {
        //         setIsKarmafyPending(false);

        //         // Check if today's date exists in the summary (Format: YYYY-MM-DD)
        //         const today = new Date().toISOString().split('T')[0];
        //         const hasTodayJobs = summaryData.hasOwnProperty(today);

        //         if (!hasTodayJobs) {
        //           await fetch(`${apiUrl}/api/trigger-easyapply-scoring/?apw_id=${fetchedApplywizzId}`);
        //           setIsScoringTriggered(true);
        //         }
        //       }
        //     }
        //   } catch (err) {
        //     console.error("Error checking or triggering jobs for opted_job_links client:", err);
        //   }
        // }
      }
    } catch (err) {
      console.error("Error fetching client dashboard data:", err);
      setClientDashboardError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setClientDashboardLoading(false);
    }
  };

  useEffect(() => {
    fetchClientDashboardData();
  }, [currentUser?.email, currentUser?.role, optedJobLinks]);

  // Update applywizzId when selectedAccountId changes (for multi-account scored jobs clients)
  useEffect(() => {
    const fetchApplywizzIdForSelectedAccount = async () => {
      // Only fetch if selectedAccountId exists and this is a scored jobs client
      if (selectedAccountId && optedJobLinks) {
        try {
          console.log("Fetching applywizz_id for selected account:", selectedAccountId);

          const { data, error } = await supabase
            .from('clients')
            .select('applywizz_id')
            .eq('id', selectedAccountId)
            .single();

          if (error) {
            console.error("Error fetching applywizz_id:", error);
            return;
          }

          if (data && data.applywizz_id) {
            console.log("Updated applywizzId to:", data.applywizz_id);
            setApplywizzId(data.applywizz_id);
          }
        } catch (err) {
          console.error("Error in fetchApplywizzIdForSelectedAccount:", err);
        }
      }
    };

    fetchApplywizzIdForSelectedAccount();
  }, [selectedAccountId, optedJobLinks]);

  // Save activeView to storage when it changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('activeView', activeView); // Persist across reloads
      sessionStorage.setItem('activeView', activeView);
      setSearchTerm('');
    }
  }, [activeView, currentUser]); // Runs whenever activeView or currentUser changes

  // Reset expanded dates when tab changes
  useEffect(() => {
    // Reset expandedDate state when user switches tabs
    setExpandedDate(null);
  }, [activeView]); // Runs whenever activeView changes

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    // console.log('Logged in user:', user.name, 'with role:', user.role, 'with email :', user.email);
  };
  // console.log('Logged in user:', currentUser?.name, currentUser?.role);

  // Function to handle logout
  const handleLogout = async () => {
    try {
      // 1. Clear React state first
      setCurrentUser(null);
      setActiveView('dashboard');
      setHasShownOverlayThisSession(false);
      setIsJobsLoading(true); // Reset loading state for next login
      setLoadingStartTime(null); // Reset loading timer
      setHasCompletedInitialLoad(false); // Reset initial load flag

      // 2. Clear account selection using context (handles selectedAccountId in localStorage)
      clearSelection();

      // 3. Clear all other localStorage items
      localStorage.removeItem('currentUser');
      localStorage.removeItem('applywizz_user_email');
      localStorage.removeItem('activeView'); // Clear saved view

      // 4. Clear all sessionStorage items
      sessionStorage.removeItem('activeView');
      sessionStorage.removeItem('signup_email');

      // 5. Sign out from Supabase (clears auth tokens and session)
      // This is CRITICAL for security - prevents session hijacking
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Error signing out from Supabase:', error.message);
        // Continue with logout even if Supabase signOut fails
      }

      console.log('✅ User logged out successfully - all auth data cleared');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, we've cleared the critical data
    }
  };

  // Handler for jobs loading state with minimum 1-second display
  const handleJobsLoading = (isLoading: boolean) => {
    if (isLoading) {
      // Only show loading overlay if this is the first load
      if (!hasCompletedInitialLoad) {
        setLoadingStartTime(Date.now());
        setIsJobsLoading(true);
      }
    } else {
      // Loading finished - mark initial load as complete
      setHasCompletedInitialLoad(true);

      // Only apply minimum time if we're actually showing the loading overlay
      if (isJobsLoading) {
        const currentTime = Date.now();
        const elapsedTime = loadingStartTime ? currentTime - loadingStartTime : 0;
        const minimumLoadingTime = 1000; // 1 second in milliseconds

        if (elapsedTime < minimumLoadingTime) {
          // Wait for the remaining time to reach 1 second
          const remainingTime = minimumLoadingTime - elapsedTime;
          setTimeout(() => {
            setIsJobsLoading(false);
            setLoadingStartTime(null);
          }, remainingTime);
        } else {
          // Already been 1+ seconds, hide immediately
          setIsJobsLoading(false);
          setLoadingStartTime(null);
        }
      }
    }
  };

  // Handler for when jobs list is empty (shows overlay)
  const handleJobsEmpty = (isEmpty: boolean) => {
    // Only show overlay if:
    // 1. User is client AND opted for job links
    // 2. Jobs list is empty
    // 3. Overlay hasn't been shown yet in this session
    // 4. NOT currently loading (to prevent flash during initial load)
    // 5. User is actually on the dashboard view
    if (currentUser?.role === 'client' && optedJobLinks && isEmpty && !hasShownOverlayThisSession && !isJobsLoading && activeView === 'dashboard') {
      setShowJobScoringOverlay(true);
      setHasShownOverlayThisSession(true); // Mark as shown for this session
    } else if (!isEmpty) {
      // If jobs are now available, hide the overlay
      setShowJobScoringOverlay(false);
    }
  };

  // Handler for refresh button in overlay
  const handleRefreshJobs = () => {
    // Trigger a re-fetch by calling the ref method if available
    if (scoredJobsRef.current) {
      // Force a page reload to refresh all data
      window.location.reload();
    }
  };

  const getVisibleTickets = (): Ticket[] => {
    if (!currentUser) return [];

    // Executive/Managerial roles see all tickets
    if (['ceo', 'coo', 'cro', 'account_manager'].includes(currentUser.role)) {
      return tickets;
    }

    // For other roles, filter tickets based on assignments
    return tickets.filter(ticket => {
      const assignedUsers = assignments[ticket.id] || [];
      return assignedUsers.some(assignedUser => assignedUser.id === currentUser.id);
    });
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    await fetch(`${import.meta.env.VITE_TICKETING_TOOL_API_URL}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: emailTo,
        subject: emailSubject,
        htmlBody: `
             <html>
              <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
                <div style="text-align:center; margin-bottom:20px;">
                  <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                       alt="ApplyWizz Logo" 
                       style="width:150px;"/>
                </div>
                <p>${emailMessage}</p>               
                <p>Best regards,<br/> <strong>ApplyWizz Support Team.</strong></p> 
              </body>
            </html>
          `
      })
    });

    setIsEmailSent(true);
    // Reset form after submission
    setEmailTo('vivek@applywizz.com');
    setEmailSubject('Response form Applywizz Ticketing Tool');
    setEmailMessage('');

    // Close modal after 2 seconds
    setTimeout(() => {
      setIsSendMailModalOpen(false);
      setIsEmailSent(false);
    }, 2000);
  };

  // New handler for sending email with attachment
  const handleSendEmailWithAttachment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!attachmentFile) {
      alert('Please select a file to attach');
      return;
    }

    try {
      // Convert file to base64
      const base64File = await fileToBase64(attachmentFile);

      // Prepare attachment data
      const attachmentData = {
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: attachmentFile.name,
        contentType: attachmentFile.type || 'application/octet-stream',
        contentBytes: base64File.split(',')[1] // Remove data URL prefix
      };

      // Send email with attachment using the send-email-a API
      const response = await fetch(`${import.meta.env.VITE_TICKETING_TOOL_API_URL}/api/send-email-a`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailToAttachment,
          subject: emailSubjectAttachment,
          htmlBody: `
            <html>
              <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
                <div style="text-align:center; margin-bottom:20px;">
                  <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                       alt="ApplyWizz Logo" 
                       style="width:150px;"/>
                </div>
                <p>${emailMessageAttachment}</p>                
                <p>Best regards,<br/> <strong>ApplyWizz Support Team.</strong></p> 
              </body>
            </html>
          `,
          attachments: [attachmentData]
        })
      });

      if (response.ok) {
        setIsEmailSent(true);
        // Reset form after submission
        setEmailToAttachment('vivek@applywizz.com');
        setEmailSubjectAttachment('Response form Applywizz Ticketing Tool');
        setEmailMessageAttachment('');
        setAttachmentFile(null);

        // Close modal after 2 seconds
        setTimeout(() => {
          setIsSendMailWithAttachmentModalOpen(false);
          setIsEmailSent(false);
        }, 2000);
      } else {
        const errorData = await response.json();
        alert(`Failed to send email: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error sending email with attachment:', error);
      alert('Failed to send email with attachment. Please try again.');
    }
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Handler for file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachmentFile(e.target.files[0]);
    }
  };

  // Function to send onboarding welcome email
  const sendOnboardingWelcomeEmail = async (data: { fullName: string; email: string; jbId: string }) => {
    const { fullName, email: to, jbId } = data;
    const isJobBoard = jbId?.startsWith('JB-');
    const subject = isJobBoard
      ? `🚀 Welcome to ApplyWizz - Your Profile is Ready (${jbId})`
      : `🚀 Welcome to ApplyWizz - Your Login Credentials (${jbId || 'ApplyWizz'})`;

    const htmlBody = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: auto; background: #fff; padding: 30px; border-radius: 10px; border: 1px solid #ddd;">
                <div style="text-align:center; margin-bottom:20px;">
                  <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                       alt="ApplyWizz Logo" 
                       style="max-width: 100%; height: auto; width: 150px;"/>
                </div>
                <h2 style="color: #1e3a8a;">Welcome to ApplyWizz!</h2>
                <p>Hi <strong>${fullName}</strong>,</p>
                <p>${isJobBoard
        ? 'Your profile setup is complete. You can now access your dashboard using your existing credentials:'
        : 'Your profile registration is successful. Use the credentials below to access your dashboard:'}</p>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${to}</p>
                    ${isJobBoard
        ? '<p style="margin: 5px 0;"><strong>Password:</strong> (Use the password you chose during signup)</p>'
        : '<p style="margin: 5px 0;"><strong>Password:</strong> Applywizz@2026</p>'}
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <a href="https://apply-wizz.me/login" style="background: #2563eb; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to your Account</a>
                </div>

                ${!isJobBoard ? `
                <p style="font-size: 12px; color: #777; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
                    For security, we recommend changing your password after your first login.
                </p>` : ''}
            </div>
        </body>
        </html>`;

    const response = await fetch(`${import.meta.env.VITE_TICKETING_TOOL_API_URL}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        subject,
        htmlBody
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to send email: ${response.status}`);
    }
  };

  const handleCreateTicket = async (ticketData: any) => {
    const newTicket = {
      ...ticketData,
      created_by: currentUser!.id,
      status: 'open',
      escalation_level: 0,
      // createdat: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: JSON.stringify([]),
      metadata: JSON.stringify(ticketData.metadata || {}),
    };

    const { error } = await supabase.from('tickets').insert(newTicket);

    if (error) {
      console.error('Failed to create ticket:', error);
      alert('Could not create ticket.');
    }
    else {
      await fetchData();
      setIsCreateTicketModalOpen(false);
    }
  };

  const handleAssignRoles = async (
    pendingClientId: string,
    clientData: any,
    rolesData: any
  ) => {
    const { data: caEmail, error: caEmailError } = await supabase.from('users').select('email').eq('id', rolesData.careerassociateid).single();
    if (caEmailError) {
      console.log("ca id", rolesData.careerassociateid)
    }
    const { data: cad, error: cadError } = await supabase1.from('users').select(
      'id,name,team_id'
    ).eq('email', caEmail.email)
      .single();
    if (cadError) {
      console.log("verror", cadError)
      alert("Failed to complete onboarding, Selected CA not found in CA Management tool");
      return;
    }

    const { error: insertError } = await supabase.from('clients').insert({
      id: pendingClientId,
      full_name: clientData.full_name,
      personal_email: clientData.personal_email.trim().toLowerCase(),
      whatsapp_number: clientData.whatsapp_number,
      callable_phone: clientData.callable_phone,
      company_email: clientData.company_email.trim().toLowerCase(),
      job_role_preferences: clientData.job_role_preferences,
      salary_range: clientData.salary_range,
      location_preferences: clientData.location_preferences,
      work_auth_details: clientData.work_auth_details,
      visa_type: clientData.visa_type,
      account_manager_id: rolesData.accountManagerId,
      careerassociatemanagerid: rolesData.careerassociatemanagerid,
      careerassociateid: rolesData.careerassociateid,
      scraperid: "51ce13f8-52fa-4e74-b346-450643b6a376",
      badge_value: clientData.badge_value,
      onboarded_by: currentUser!.id,
      sponsorship: clientData.sponsorship,
      applywizz_id: clientData.applywizz_id,
      created_at: new Date().toISOString(),
      update_at: new Date().toISOString()
    });


    if (insertError) {
      alert("Failed to complete onboarding");
      console.error("Onboarding failed:", insertError.message);
      return;
    }

    // Make API call to external database after successful client insertion
    try {
      const apiUrl = `${import.meta.env.VITE_EXTERNAL_API_URL}/api/client-create`;

      // Validate required fields before sending
      if (!clientData.company_email || !clientData.full_name) {
        console.error('❌ Missing required fields:', {
          email: clientData.company_email,
          name: clientData.full_name
        });
        alert('Cannot sync to external database: Missing email or name');
        return;
      }

      // Map data to match external database schema exactly
      // Based on external schema: yearsExp (integer), willingToRelocate (boolean), servicesOpted (jsonb)
      const payload = {
        // Core identification
        "email": clientData.company_email.trim().toLowerCase(),
        "name": clientData.full_name.trim(),

        // Experience and location
        "years_experience": clientData.experience ? parseInt(String(clientData.experience)) : 0,
        "location": clientData.state_of_residence,
        "country": clientData.zip_or_country || "",

        // Job preferences
        "services_opted": (() => {
          // Handle if services_opted is a string (from database)
          if (typeof clientData.add_ons_info === 'string') {
            try {
              return JSON.parse(clientData.add_ons_info);
            } catch {
              return [];
            }
          }
          // If it's already an array, use it
          if (Array.isArray(clientData.add_ons_info)) {
            return clientData.add_ons_info;
          }
          // Default to empty array
          return [];
        })(),
        "alternate_job_roles": (() => {
          // Handle if alternate_job_roles is a string (from database)
          if (typeof clientData.alternate_job_roles === 'string') {
            // First try to parse as JSON
            try {
              return JSON.parse(clientData.alternate_job_roles);
            } catch {
              // If not JSON, split by comma and trim whitespace
              return clientData.alternate_job_roles
                .split(',')
                .map(role => role.trim())
                .filter(role => role.length > 0);
            }
          }
          // If it's already an array, use it
          if (Array.isArray(clientData.alternate_job_roles)) {
            return clientData.alternate_job_roles;
          }
          // Default to empty array
          return [];
        })(),

        // Service dates
        "start_date": clientData.start_date,
        // "end_date": clientData.end_date || null,

        // Work preferences
        "willing_to_relocate": Boolean(clientData.willing_to_relocate),
        "work_auth": (() => {
          const visaType = clientData.visa_type || "";
          // Map visa types to work auth values
          switch (visaType) {
            case "OPT":
              return "F1";
            case "CPT":
              return "F1";
            case "H4 EAD":
              return "H4EAD";
            default:
              return visaType;
          }
        })(),
        "work_preference": (() => {
          const pref = clientData.work_preferences;
          if (pref === "All") {
            return "All";
          }
          return "Remote";
        })(),
        "sponsorship": clientData.sponsorship ? "yes" : "No",

        // Personal details
        "gender": clientData.gender || "",

        // Company and resume details  
        "exclude_companies": (() => {
          // Handle if exclude_companies is a string (from database)
          if (typeof clientData.exclude_companies === 'string') {
            try {
              return JSON.parse(clientData.exclude_companies);
            } catch {
              return ["NA"];
            }
          }
          // If it's already an array, use it
          if (Array.isArray(clientData.exclude_companies)) {
            return clientData.exclude_companies;
          }
          // Default to facebook
          return ["NA"];
        })(),
        "resume_s3_path": clientData.resume_path,
        "resume_url": clientData.resume_path ? `https://applywizz-prod.s3.us-east-2.amazonaws.com/${clientData.resume_path}` : "",

        // Salary and applications
        "expected_salary": clientData.salary_range || "",
        "number_of_applications": clientData.no_of_applications ? `${clientData.no_of_applications}+` : "0",

        // Social profiles
        "github_url": clientData.github_url || "",
        "linkedin_url": clientData.linked_in_url || "",

        // Status and plan
        "status": "Active",
        "career_associate": caEmail.email || "",
        "apw_id": clientData.applywizz_id,
        "target_role": Array.isArray(clientData.job_role_preferences) ? clientData.job_role_preferences[0] || "" : clientData.job_role_preferences || "",
        "plan": "Standard",
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorDetails = 'Unknown error';
        try {
          const errorData = await response.json();
          errorDetails = JSON.stringify(errorData, null, 2);
          // console.error('❌ API Error Response (JSON):', errorData);
        } catch {
          errorDetails = await response.text();
          // console.error('❌ API Error Response (Text):', errorDetails);
        }

        alert(`Failed to sync with external database: ${response.status}    Error: ${errorDetails}   Check console for full details.`);
        return;
      }

      // Handle successful sync
      const djangoResponse = await response.json().catch(() => ({}));
      let karmafyUserId = null;
      let karmafyLeadId = null;

      if (djangoResponse && djangoResponse.user_id) {
        karmafyUserId = djangoResponse.user_id;
      }
      if (djangoResponse && djangoResponse.lead_id) {
        karmafyLeadId = djangoResponse.lead_id;
      }

      console.log('✅ Django sync successful for', clientData.applywizz_id, {
        karmafy_user_id: karmafyUserId,
        karmafy_lead_id: karmafyLeadId
      });

      // Extract lead data (optional - don't fail if this doesn't work)
      if (karmafyLeadId) {
        try {
          const authString = `${import.meta.env.VITE_KARMAFY_USERNAME}:${import.meta.env.VITE_KARMAFY_PASSWORD}`;
          const authHeader = `Basic ${btoa(authString)}`;
          const extractApiUrl = `${import.meta.env.VITE_EXTERNAL_API_URL}/api/v1/leads/${karmafyLeadId}/extract-data/`;

          await fetch(extractApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader
            },
            body: JSON.stringify({})
          });
          // console.log('✅ Lead data extraction successful for lead ID:', karmafyLeadId);
        } catch (extractError) {
          // console.error('⚠️ Lead data extraction failed:', extractError);
        }
      }
    } catch (error) {
      console.error('Error making external API call:', error);
      // Handle network errors or other exceptions
      // Insert additional client information into clients_additional_information table
    }
    const { error: additionalInfoError } = await supabase.from('clients_additional_information').insert({
      id: pendingClientId,
      applywizz_id: clientData.applywizz_id,
      resume_url: clientData.resume_url,
      resume_path: clientData.resume_path,
      start_date: clientData.start_date,
      end_date: clientData.end_date,
      no_of_applications: clientData.no_of_applications,
      is_over_18: clientData.is_over_18,
      eligible_to_work_in_us: clientData.eligible_to_work_in_us,
      authorized_without_visa: clientData.authorized_without_visa,
      require_future_sponsorship: clientData.require_future_sponsorship,
      can_perform_essential_functions: clientData.can_perform_essential_functions,
      worked_for_company_before: clientData.worked_for_company_before,
      discharged_for_policy_violation: clientData.discharged_for_policy_violation,
      referred_by_agency: clientData.referred_by_agency,
      highest_education: clientData.highest_education,
      university_name: clientData.university_name,
      cumulative_gpa: clientData.cumulative_gpa,
      desired_start_date: clientData.desired_start_date,
      willing_to_relocate: clientData.willing_to_relocate,
      can_work_3_days_in_office: clientData.can_work_3_days_in_office,
      role: clientData.role,
      experience: clientData.experience,
      work_preferences: clientData.work_preferences,
      alternate_job_roles: clientData.alternate_job_roles,
      exclude_companies: clientData.exclude_companies,
      convicted_of_felony: clientData.convicted_of_felony,
      felony_explanation: clientData.felony_explanation,
      pending_investigation: clientData.pending_investigation,
      willing_background_check: clientData.willing_background_check,
      willing_drug_screen: clientData.willing_drug_screen,
      failed_or_refused_drug_test: clientData.failed_or_refused_drug_test,
      uses_substances_affecting_duties: clientData.uses_substances_affecting_duties,
      substances_description: clientData.substances_description,
      can_provide_legal_docs: clientData.can_provide_legal_docs,
      gender: clientData.gender,
      is_hispanic_latino: clientData.is_hispanic_latino,
      race_ethnicity: clientData.race_ethnicity,
      veteran_status: clientData.veteran_status,
      disability_status: clientData.disability_status,
      has_relatives_in_company: clientData.has_relatives_in_company,
      relatives_details: clientData.relatives_details,
      state_of_residence: clientData.state_of_residence,
      zip_or_country: clientData.zip_or_country,
      main_subject: clientData.main_subject,
      graduation_year: clientData.graduation_year,
      add_ons_info: clientData.add_ons_info,
      github_url: clientData.github_url,
      linked_in_url: clientData.linked_in_url,
      client_form_fill_date: clientData.client_form_fill_date,
      cover_letter_path: clientData.cover_letter_path,
      full_address: clientData.full_address,
      date_of_birth: clientData.date_of_birth,
      primary_phone: clientData.primary_phone,

    });

    if (additionalInfoError) {
      console.error("Failed to insert additional client information:", additionalInfoError.message);
    }

    const name = clientData.full_name?.trim();
    const email = clientData.company_email?.trim().toLowerCase();
    const password = "Created@123";
    const role = 'client';
    const department = 'Client Services';


    const { data: userData, error } = await SupabaseAdminCreateClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // User can login immediately
    });
    if (userData) console.log("Created user:", userData.user);

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log("Error", error)
        console.error(`❌ Error creating ${clientData.company_email} : Already registered`);
      } else {
        console.log("Error", error)
        console.error(`❌ Error creating ${clientData.company_email} : ${error.message}`);
      }
    }

    const { error: userInsertError } = await supabase.from('users').insert({
      id: userData.user.id, // must match auth.users.id
      name: name,
      email: email,
      role: 'client',
      department: 'Client Services',
      is_active: true,
    });

    if (userInsertError) {
      console.error(`❌ Error inserting into users table for ${clientData.company_email} : ${userInsertError.message}`);
      console.error(userInsertError);
    }

    const { data: fetchedClientData, error: fetchedClientError } = await supabase
      .from('pending_clients')  // Fetch from pending_clients table
      .select('badge_value, full_name, company_email, applywizz_id') // Add other necessary fields
      .eq('id', pendingClientId)  // Use the pending client ID
      .single();

    if (fetchedClientError) {
      console.error("Failed to fetch client data:", fetchedClientError);
      return;
    }

    // Check if badge_value > 0 before proceeding
    if (fetchedClientData.badge_value > 0) {
      try {
        // Generate alphanumeric username (remove special characters from ApplyWizz ID)
        const cleanUsername = fetchedClientData.applywizz_id
          ? fetchedClientData.applywizz_id.replace(/[^a-zA-Z0-9]/g, '')
          : fetchedClientData.company_email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');

        // Call the Fermion API to create the user
        const fermionResponse = await fetch(`${import.meta.env.VITE_TICKETING_TOOL_API_URL}/api/create-fermion-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: fetchedClientData.applywizz_id, // Use ApplyWizz ID for Fermion
            name: fetchedClientData.full_name,
            email: fetchedClientData.company_email,
            username: cleanUsername // Alphanumeric only username
          }),
        });

        const fermionResult = await fermionResponse.json();

        if (fermionResponse.ok && fermionResult.success) {
          alert(`Client onboarded successfully. Login details sent to ${fetchedClientData.company_email}`);
        } else {
          alert(`Client created but Fermion user creation failed. Check server logs.`);
        }

      } catch (fermionError) {
        console.error('❌ Error calling Fermion API (but client was created):', fermionError);
        alert(`Client onboarded, but failed to create Fermion user. Login details sent to ${fetchedClientData.company_email}`);
      }
    } else {
      console.log("❌ Client badge_value is not greater than 0, skipping Fermion user creation.");
    }



    const { data: tid, error: b } = await supabase1.from('teams')
      .select('name').eq('id', cad.team_id).single();
    if (b) {
      console.log("Error", b)
      return;
    }
    const { error: verror } = await supabase1.from('clients').insert({
      name: clientData.full_name,
      email: clientData.company_email,
      status: 'Not Started',
      assigned_ca_id: cad.id,
      team_id: cad.team_id,
      emails_required: 25,
      assigned_ca_name: cad.name,
      team_lead_name: tid.name.replace(' Team', ' '),
      emails_submitted: 0,
      jobs_applied: 0,
      visa_type: clientData.visa_type,
      work_auth_details: clientData.work_auth_details,
      sponsorship: clientData.sponsorship,
      applywizz_id: clientData.applywizz_id,
    })

    if (verror) {
      alert("Failed to complete onboarding3");
      console.log("Failed to complete onboarding in ca management", verror);
      return;
    }
    alert("Client onboarding completed");
    await supabase.from('pending_clients').delete().eq('id', pendingClientId);
    await fetchData();
  };

  // Function to handle direct onboarding without role assignment
  const handleDirectOnboard = async (client: any) => {
    try {
      console.log('🚀 Starting direct onboarding for:', client.applywizz_id);

      // Prepare payload for the API
      const payload = {
        // Required fields
        full_name: client.full_name,
        email: client.company_email.trim().toLowerCase(),
        phone: client.whatsapp_number || client.callable_phone,
        experience: client.experience,
        applywizz_id: client.applywizz_id,
        gender: client.gender,
        state_of_residence: client.state_of_residence,
        zip_or_country: client.zip_or_country,
        resume_s3_path: client.resume_path,
        start_date: client.start_date,
        job_role_preferences: client.job_role_preferences,
        visa_type: client.visa_type,
        location_preferences: client.location_preferences,

        // Optional fields
        personal_email: client.personal_email.trim().toLowerCase(),
        work_preferences: client.work_preferences,
        salary_range: client.salary_range,
        work_auth_details: client.work_auth_details,
        sponsorship: client.sponsorship,
        github_url: client.github_url,
        linked_in_url: client.linked_in_url,
        end_date: client.end_date,
        willing_to_relocate: client.willing_to_relocate,
        alternate_job_roles: client.alternate_job_roles,
        no_of_applications: client.no_of_applications,
        highest_education: client.highest_education,
        university_name: client.university_name,
        cumulative_gpa: client.cumulative_gpa,
        main_subject: client.main_subject,
        graduation_year: client.graduation_year,
        badge_value: client.badge_value,
        is_over_18: client.is_over_18,
        eligible_to_work_in_us: client.eligible_to_work_in_us,
        authorized_without_visa: client.authorized_without_visa,
        require_future_sponsorship: client.require_future_sponsorship,
        can_perform_essential_functions: client.can_perform_essential_functions,
        worked_for_company_before: client.worked_for_company_before,
        discharged_for_policy_violation: client.discharged_for_policy_violation,
        referred_by_agency: client.referred_by_agency,
        desired_start_date: client.desired_start_date,
        can_work_3_days_in_office: client.can_work_3_days_in_office,
        role: client.role,
        convicted_of_felony: client.convicted_of_felony,
        felony_explanation: client.felony_explanation,
        pending_investigation: client.pending_investigation,
        willing_background_check: client.willing_background_check,
        willing_drug_screen: client.willing_drug_screen,
        failed_or_refused_drug_test: client.failed_or_refused_drug_test,
        uses_substances_affecting_duties: client.uses_substances_affecting_duties,
        substances_description: client.substances_description,
        can_provide_legal_docs: client.can_provide_legal_docs,
        is_hispanic_latino: client.is_hispanic_latino,
        race_ethnicity: client.race_ethnicity,
        veteran_status: client.veteran_status,
        disability_status: client.disability_status,
        has_relatives_in_company: client.has_relatives_in_company,
        relatives_details: client.relatives_details,
        add_ons_info: client.add_ons_info,
        exclude_companies: client.exclude_companies,
        client_form_fill_date: client.client_form_fill_date,
        cover_letter_path: client.cover_letter_path,
        full_address: client.full_address,
        date_of_birth: client.date_of_birth,
        primary_phone: client.primary_phone,
        is_new_domain: client.is_new_domain,
      };

      // Determine which API to call based on applywizz_id prefix
      const isJobBoard = client.applywizz_id?.startsWith('JB-');
      const apiEndpoint = isJobBoard ? '/api/jobboard-onboard' : '/api/direct-onboard';

      console.log(`🚀 Dispatching onboarding request to: ${apiEndpoint} for ${client.applywizz_id}`);

      // Call the appropriate onboard API
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Direct onboard API error:', result);
        alert(`Failed to onboard client: ${result.error}\n${Array.isArray(result.details) ? result.details.join('\n') : result.details || ''}`);
        return;
      }

      console.log('✅ Client onboarded successfully:', result);

      // Store success data for the modal
      setOnboardingSuccessData({
        fullName: client.full_name,
        email: client.company_email.trim().toLowerCase(),
        jbId: result.applywizz_id || client.applywizz_id
      });

      // Remove from pending clients and refresh
      await supabase.from('pending_clients').delete().eq('id', client.id);
      await fetchData();

      // Open the success modal (which triggers the email workflow)
      setIsOnboardingSuccessModalOpen(true);

    } catch (error: any) {
      console.error('❌ Error calling direct-onboard API:', error);
      alert(`Failed to onboard client: ${error.message || 'Unknown error occurred'}`);
    }
  };

  const handleUpdateTicket = async (ticketId: string, updateData: any) => {
    // 1. Update in Supabase
    const { error } = await supabase
      .from('tickets')
      .update({
        ...updateData,
        updatedAt: new Date().toISOString()
      })
      .eq('id', ticketId);

    if (error) {
      console.error('Failed to update ticket:', error);
      // alert('Could not update ticket.');
      return;
    }

    // 2. Refresh tickets after update
    await fetchData();
  };

  const renderTicketEditModal = (selectedTicket: Ticket | null, selectedView: string) => {
    if (!selectedTicket || selectedView !== "edit") return null;

    switch (selectedTicket.type) {
      case "volume_shortfall":
        return (
          <VLTicketEditModal
            ticket={selectedTicket}
            user={currentUser}
            isOpen={isTicketEditModalOpen}
            assignments={assignments}
            onClose={() => {
              setIsTicketEditModalOpen(false);
              setSelectedTicket(null);
            }}
            onSubmit={(updateData) => {
              if (selectedTicket) {
                handleUpdateTicket(selectedTicket.id, updateData);
              }
            }}
            onUpdate={() => {
              fetchData(); // ⬅️ refresh data when modal updates a ticket
              setIsTicketEditModalOpen(false);
              setSelectedTicket(null);
            }}
          />
        );
      case "data_mismatch":
        return (
          <DMTicketEditModal
            ticket={selectedTicket}
            user={currentUser}
            isOpen={isTicketEditModalOpen}
            assignments={assignments}
            onClose={() => {
              setIsTicketEditModalOpen(false);
              setSelectedTicket(null);
            }}
            onSubmit={(updateData) => {
              if (selectedTicket) {
                handleUpdateTicket(selectedTicket.id, updateData);
              }
            }}
            onUpdate={() => {
              fetchData(); // ⬅️ refresh data when modal updates a ticket
              setIsTicketEditModalOpen(false);
              setSelectedTicket(null);
            }}
          />
        );
      case "resume_update":
        return (
          <RUTicketEditModal
            ticket={selectedTicket}
            user={currentUser}
            isOpen={isTicketEditModalOpen}
            assignments={assignments}
            onClose={() => {
              setIsTicketEditModalOpen(false);
              setSelectedTicket(null);
            }}
            onSubmit={(updateData) => {
              if (selectedTicket) {
                handleUpdateTicket(selectedTicket.id, updateData);
              }
            }}
            onUpdate={() => {
              fetchData(); // ⬅️ refresh data when modal updates a ticket
              setIsTicketEditModalOpen(false);
              setSelectedTicket(null);
            }}
          // onTicketUpdated={handleTicketUpdated} // Add this line
          />
        )
      case "call_support":
        return (
          <CSTicketEditModal
            ticket={selectedTicket}
            user={currentUser}
            isOpen={isTicketEditModalOpen}
            assignments={assignments}
            onClose={() => {
              setIsTicketEditModalOpen(false);
              setSelectedTicket(null);
            }}
            onSubmit={(updateData) => {
              if (selectedTicket) {
                handleUpdateTicket(selectedTicket.id, updateData);
              }
            }}
            onUpdate={() => {
              fetchData(); // ⬅️ refresh data when modal updates a ticket
              setIsTicketEditModalOpen(false);
              setSelectedTicket(null);
            }}
          // onTicketUpdated={handleTicketUpdated} // Add this line
          />
        )
      default:
        return null;
    }
  };


  // Function to update a client
  const handleUpdateClient = async (updatedClient: Client) => {
    // Convert string dates to Date objects in the updated client
    const processedUpdatedClient = {
      ...updatedClient,
      created_at: updatedClient.created_at ? new Date(updatedClient.created_at as any) : undefined,
      update_at: updatedClient.update_at ? new Date(updatedClient.update_at as any) : undefined
    };

    // Map through the clients array and update the client with the matching id
    setClients(clients.map(client =>
      client.id === updatedClient.id ? processedUpdatedClient : client
    ));

    await fetchData();
  };

  // This function takes in a userId and userData and updates the user with the given userId in the users array

  const handleUpdateUser = (userId: string, userData: any) => {
    // Map through the users array and return a new array with the user with cthe given userId updated with the new userData
    setUsers(users.map(user =>
      user.id === userId ? { ...user, ...userData } : user
    ));
  };
  // const createdbyUser = users.find(u => u.id === ticket.createdby);
  // Function to handle deleting a user
  const handleDeleteUser = (userId: string) => {
    // Confirm with the user if they want to delete the user
    if (window.confirm('Are you sure you want to delete this user?')) {
      // Filter out the user with the given userId from the users array
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  // Function to handle ticket click
  const handleTicketClick = (ticket: Ticket) => {
    // Set the selected ticket to the clicked ticket
    setSelectedTicket(ticket);
    // Set the isTicketEditModalOpen state to true
    setIsTicketEditModalOpen(true);
  };

  // Function to handle client edit
  const handleClientEdit = (client: Client) => {
    // Set the selected client to the client passed in as a parameter
    setSelectedClient(client);
    // Set the isClientEditModalOpen state to true
    setIsClientEditModalOpen(true);
  };

  // Function to handle viewing client applications
  const handleViewClientApplications = (client: Client) => {
    setSelectedClientForApplications(client);
    setActiveView('client-applications');
  };

  // Function to get dashboard statistics
  const getDashboardStats = (): DashboardStats => {
    const visibleTickets = getVisibleTickets();
    // Filter tickets by status and get the length of each array
    const openTickets = visibleTickets.filter(t => t.status === 'open').length;
    const inProgressTickets = visibleTickets.filter(t => t.status === 'in_progress').length;
    const resolvedTickets = visibleTickets.filter(t => t.status === 'resolved').length;
    const escalatedTickets = visibleTickets.filter(t => t.status === 'escalated').length;
    const criticalTickets = visibleTickets.filter(t => t.priority === 'critical').length;
    // Filter tickets by due date and status and get the length of the array
    const slaBreaches = tickets.filter(t =>
      new Date(t.dueDate) < new Date() && t.status !== 'resolved'
    ).length;

    // Return an object containing the dashboard statistics
    return {
      totalTickets: visibleTickets.length,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      escalatedTickets,
      criticalTickets,
      slaBreaches,
      avgResolutionTime: 18.5,
    };
  };

  const renderMainContent = () => {
    const stats = getDashboardStats();

    switch (activeView) {
      case 'profile':
        return (
          <ClientProfileView
            currentUser={currentUser}
            isOpen={true}
            isModal={false}
            onClose={() => setActiveView('dashboard')}
          />
        );

      case 'pricing':
        return <PricingSection user={currentUser} />;

      case 'dashboard':
        const isExecutive = currentUser && ['ceo', 'coo', 'cro'].includes(currentUser.role);

        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Dashboard
                <LayoutDashboard className="h-7 w-7" />
              </h1>
              <div className="flex space-x-3">
                {['ceo', 'coo', 'cro', 'system_admin', 'ca_team_lead', 'resume_team_head', 'resume_team_member'].includes(currentUser.role) && (
                  <>
                    <button
                      onClick={() => setIsSendMailModalOpen(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Mail className="h-5 w-5" />
                      <span>Send mail</span>
                    </button>

                    {/* New Send Mail with Attachment Button */}
                    <button
                      onClick={() => setIsSendMailWithAttachmentModalOpen(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Mail className="h-5 w-5" />
                      <span>Send mail with attachment</span>
                    </button>

                    {/* Existing Send Mail Modal */}

                    {/* Send Mail Modal */}
                    {isSendMailModalOpen && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                          <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Send Email</h2>
                            <button
                              onClick={() => setIsSendMailModalOpen(false)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              ✕
                            </button>
                          </div>

                          {isEmailSent ? (
                            <div className="text-center py-4">
                              <p className="text-green-600 font-medium">Email sent successfully!</p>
                            </div>
                          ) : (
                            <form onSubmit={handleSendEmail}>
                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  To
                                </label>
                                <input
                                  type="email"
                                  value={emailTo}
                                  onChange={(e) => setEmailTo(e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  required
                                />
                              </div>

                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Subject
                                </label>
                                <input
                                  type="text"
                                  value={emailSubject}
                                  onChange={(e) => setEmailSubject(e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  required
                                />
                              </div>

                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Message
                                </label>
                                <textarea
                                  value={emailMessage}
                                  onChange={(e) => setEmailMessage(e.target.value)}
                                  rows={4}
                                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Enter your message here..."
                                  required
                                />
                              </div>

                              <div className="flex justify-end space-x-3">
                                <button
                                  type="button"
                                  onClick={() => setIsSendMailModalOpen(false)}
                                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                                >
                                  Send Email
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      </div>
                    )}
                    {/* New Send Mail with Attachment Modal */}
                    {isSendMailWithAttachmentModalOpen && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                          <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Send Email with Attachment</h2>
                            <button
                              onClick={() => {
                                setIsSendMailWithAttachmentModalOpen(false);
                                setAttachmentFile(null);
                              }}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              ✕
                            </button>
                          </div>

                          {isEmailSent ? (
                            <div className="text-center py-4">
                              <p className="text-green-600 font-medium">Email sent successfully!</p>
                            </div>
                          ) : (
                            <form onSubmit={handleSendEmailWithAttachment}>
                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  To
                                </label>
                                <input
                                  type="email"
                                  value={emailToAttachment}
                                  onChange={(e) => setEmailToAttachment(e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  required
                                />
                              </div>

                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Subject
                                </label>
                                <input
                                  type="text"
                                  value={emailSubjectAttachment}
                                  onChange={(e) => setEmailSubjectAttachment(e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  required
                                />
                              </div>

                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Message
                                </label>
                                <textarea
                                  value={emailMessageAttachment}
                                  onChange={(e) => setEmailMessageAttachment(e.target.value)}
                                  rows={4}
                                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Enter your message here..."
                                  required
                                />
                              </div>

                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Attachment
                                </label>
                                <input
                                  type="file"
                                  onChange={handleFileChange}
                                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                                {attachmentFile && (
                                  <p className="text-sm text-gray-500 mt-1">Selected: {attachmentFile.name}</p>
                                )}
                              </div>

                              <div className="flex justify-end space-x-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsSendMailWithAttachmentModalOpen(false);
                                    setAttachmentFile(null);
                                  }}
                                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={!attachmentFile}
                                  className={`px-4 py-2 text-white rounded-md transition-colors ${!attachmentFile
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                >
                                  Send Email
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {currentUser?.role === 'sales' && (
                  <button
                    onClick={() => setIsClientOnboardingModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <UserPlus className="h-5 w-5" />
                    <span>Onboard Client</span>
                  </button>
                )}
                {/* {(currentUser?.role === 'sales' || currentUser?.role == 'account_manager' || currentUser?.role == 'career_associate' || currentUser?.role == 'cro' || currentUser?.role == 'credential_resolution') && ( */}
                {(currentUser?.role == 'account_manager'
                  || isExecutive
                  || currentUser.role == 'resume_team_head'
                  || currentUser.role == 'ca_team_lead'
                ) && (
                    <button
                      onClick={() => setIsCreateTicketModalOpen(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                      <span>Create Ticket</span>
                    </button>
                  )}
              </div>
            </div>
            {currentUser?.role === 'client' ? (
              <>
                {optedJobLinks ? (
                  <>
                    <ScoredJobsDashboard applywizzId={applywizzId} />
                    <ScoredJobsRegularList
                      ref={scoredJobsRef}
                      applywizzId={applywizzId}
                      showCalendar={showCalendar}
                      setShowCalendar={setShowCalendar}
                      filteredDate={filteredDate}
                      setFilteredDate={setFilteredDate}
                      expandedDate={expandedDate}
                      setExpandedDate={setExpandedDate}
                      onJobsEmpty={handleJobsEmpty}
                      onLoadingChange={handleJobsLoading}
                    />
                  </>
                ) : (
                  <>
                    <ApplicationsOverTime
                      data={clientDashboardData}
                      loading={clientDashboardLoading}
                      error={clientDashboardError}
                    />
                    <ApplicationSummaryList
                      data={clientDashboardData}
                      loading={clientDashboardLoading}
                      error={clientDashboardError}
                      applywizzId={applywizzId}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                <DashboardStatsComponent
                  stats={stats}
                  userRole={currentUser?.role || ''}
                  onTotalTicketsClick={() => {
                    setActiveView('tickets');
                    setFilterStatus('all'); // Reset status filter
                    setFilterType('all');
                    setFilterPriority('all');
                  }}
                  onOpenTicketsClick={() => {
                    setActiveView('tickets');
                    setFilterStatus('open'); // This will filter to only open tickets
                    setFilterType('all'); // Reset type filter
                    setFilterPriority('all');
                  }}
                  onResolvedTicketsClick={() => {
                    setActiveView('tickets');
                    setFilterStatus('resolved');
                    setFilterType('all');
                    setFilterPriority('all');
                  }}
                  onCriticalTicketsClick={() => {
                    setActiveView('tickets');
                    setFilterStatus('all');
                    setFilterType('all');
                    setFilterPriority('critical');
                  }}
                />
                {isExecutive ? (
                  <ExecutiveDashboard user={currentUser!} tickets={getVisibleTickets()} escalations={escalations} />
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Tickets</h2>
                      <div className="space-y-4">
                        {getVisibleTickets().slice(0, 5).map(ticket => (
                          <div
                            key={ticket.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleTicketClick(ticket)}
                          >
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{ticket.title}</h3>
                              <p className="text-sm text-gray-600">{ticket.type.replace('_', ' ')}</p>
                            </div>
                            <div className={`px-2 py-1 text-xs font-medium rounded-full ${ticket.priority === 'critical' ? 'bg-red-100 text-red-800' :
                              ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                              {ticket.priority}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                      <div className="space-y-3">
                        <button
                          onClick={() => setActiveView('tickets')}
                          className="w-full flex items-center space-x-3 p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <FileText className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-900">View All Tickets</span>
                        </button>

                        <button
                          onClick={() => setActiveView('clients')}
                          className="w-full flex items-center space-x-3 p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          <Users className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-900">Manage Clients</span>
                        </button>

                        {/* <button
                      onClick={() => setActiveView('reports')}
                      className="w-full flex items-center space-x-3 p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                    >
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-purple-900">View Reports</span>
                    </button> */}

                        {currentUser?.role === 'system_admin' && (
                          <button
                            onClick={() => setIsUserManagementModalOpen(true)}
                            className="w-full flex items-center space-x-3 p-3 text-left bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                          >
                            <Settings className="h-5 w-5 text-orange-600" />
                            <span className="font-medium text-orange-900">User Management</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )
            }
            <FeedbackButton user={currentUser} />
          </div>
        );

      case 'tickets':
        const isExecutive1 = currentUser && ['ceo', 'coo', 'cro'].includes(currentUser.role);
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
              {(currentUser?.role == 'account_manager'
                || currentUser.role == 'client'
                || isExecutive1
                || currentUser.role == 'resume_team_head'
                || currentUser.role == 'ca_team_lead'
              ) && (
                  <button
                    onClick={() => setIsCreateTicketModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Create Ticket</span>
                  </button>
                )}
            </div>
            <TicketList
              tickets={getVisibleTickets()}
              user={currentUser!}
              assignments={assignments}
              onTicketClick={handleTicketClick}
              initialFilterStatus={filterStatus} // Pass the filter status
              initialFilterType={filterType} // Pass the filter type
              initialFilterPriority={filterPriority} // Pass the filter priority
            />
            <FeedbackButton user={currentUser} />
          </div>
        );

      case 'easy-apply':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Easy Apply</h1>
            </div>
            {currentUser?.role === 'client' ? (
              <EasyApplySummaryList
                data={clientDashboardData}
                loading={clientDashboardLoading}
                error={clientDashboardError}
                applywizzId={applywizzId}
              />
            ) : (
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-gray-500">Not available for your role.</p>
              </div>
            )}
          </div>
        );

      case 'linkedin-easy-apply':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">LinkedIn Easy Apply</h1>
              <div className="flex items-center gap-4">
                {/* Calendar Date Picker */}
                <div style={{ position: 'relative' }}>
                  <div
                    onClick={() => {
                      setShowCalendar(!showCalendar);
                    }}
                    style={{
                      display: 'inline-flex',
                      height: '47px',
                      padding: '16px 18px 17px 35px',
                      alignItems: 'flex-start',
                      gap: '24px',
                      borderRadius: '15px',
                      border: '1px solid #000',
                      color: '#000',
                      cursor: 'pointer'
                    }}
                  >
                    <h1 className="text-sm font-medium">
                      {filteredDate
                        ? filteredDate.split('-').reverse().join('-')
                        : new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}
                    </h1>
                    <img
                      src="/chevron-bottom.svg"
                      alt="chevron"
                      style={{
                        transform: showCalendar ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }}
                    />
                  </div>

                  {showCalendar && (
                    <div style={{ position: 'absolute', zIndex: 50, marginTop: '8px', right: 0 }}>
                      <JobCalendar onDateSelect={(date) => {
                        if (linkedInEasyApplyRef.current) {
                          linkedInEasyApplyRef.current.handleDateSelect(date);
                        }
                      }} />
                    </div>
                  )}
                </div>

                {/* Job Scoring Button */}
                {showFloatingButton && (
                  <JobScoringFloatingButton onClick={() => {
                    setShowFloatingButton(false);
                    setShowScoringModal(true);
                  }} />
                )}
              </div>
            </div>
            {/* <LinkedInEasyApplyDashboard applywizzId={applywizzId} /> */}
            <LinkedInEasyApplyRegularList
              ref={linkedInEasyApplyRef}
              applywizzId={applywizzId}
              showScoringModal={showScoringModal}
              setShowScoringModal={setShowScoringModal}
              showFloatingButton={showFloatingButton}
              setShowFloatingButton={setShowFloatingButton}
              isScoringTriggered={isScoringTriggered}
              setIsScoringTriggered={setIsScoringTriggered}
              showCalendar={showCalendar}
              setShowCalendar={setShowCalendar}
              filteredDate={filteredDate}
              setFilteredDate={setFilteredDate}
              expandedDate={expandedDate}
              setExpandedDate={setExpandedDate}
            />
          </div>
        );

      case 'indeed-easy-apply':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Indeed Easy Apply</h1>
              <div className="flex items-center gap-4">
                {/* Calendar Date Picker */}
                <div style={{ position: 'relative' }}>
                  <div
                    onClick={() => {
                      setShowCalendar(!showCalendar);
                    }}
                    style={{
                      display: 'inline-flex',
                      height: '47px',
                      padding: '16px 18px 17px 35px',
                      alignItems: 'flex-start',
                      gap: '24px',
                      borderRadius: '15px',
                      border: '1px solid #000',
                      color: '#000',
                      cursor: 'pointer'
                    }}
                  >
                    <h1 className="text-sm font-medium">
                      {filteredDate
                        ? filteredDate.split('-').reverse().join('-')
                        : new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}
                    </h1>
                    <img
                      src="/chevron-bottom.svg"
                      alt="chevron"
                      style={{
                        transform: showCalendar ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }}
                    />
                  </div>

                  {showCalendar && (
                    <div style={{ position: 'absolute', zIndex: 50, marginTop: '8px', right: 0 }}>
                      <JobCalendar onDateSelect={(date) => {
                        if (indeedEasyApplyRef.current) {
                          indeedEasyApplyRef.current.handleDateSelect(date);
                        }
                      }} />
                    </div>
                  )}
                </div>

                {/* Job Scoring Button */}
                {showFloatingButton && (
                  <JobScoringFloatingButton onClick={() => {
                    setShowFloatingButton(false);
                    setShowScoringModal(true);
                  }} />
                )}
              </div>
            </div>
            {/* <IndeedEasyApplyDashboard applywizzId={applywizzId} /> */}
            <IndeedEasyApplyRegularList
              ref={indeedEasyApplyRef}
              applywizzId={applywizzId}
              showScoringModal={showScoringModal}
              setShowScoringModal={setShowScoringModal}
              showFloatingButton={showFloatingButton}
              setShowFloatingButton={setShowFloatingButton}
              isScoringTriggered={isScoringTriggered}
              setIsScoringTriggered={setIsScoringTriggered}
              showCalendar={showCalendar}
              setShowCalendar={setShowCalendar}
              filteredDate={filteredDate}
              setFilteredDate={setFilteredDate}
              expandedDate={expandedDate}
              setExpandedDate={setExpandedDate}
            />
          </div>
        );

      case 'regular-applications':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">Career Portal Application</h1>
                <p className="text-gray-500">We scan and collect job links directly from official company career pages and trusted job portals.
                  <br /> Our system automatically detects newly posted roles.
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Calendar Date Picker */}
                <div style={{ position: 'relative' }}>
                  <div
                    onClick={() => {
                      setShowCalendar(!showCalendar);
                    }}
                    style={{
                      display: 'inline-flex',
                      height: '47px',
                      padding: '16px 18px 17px 35px',
                      alignItems: 'flex-start',
                      gap: '24px',
                      borderRadius: '15px',
                      border: '1px solid #000',
                      color: '#000',
                      cursor: 'pointer'
                    }}
                  >
                    <h1 className="text-sm font-medium">
                      {filteredDate
                        ? filteredDate.split('-').reverse().join('-')
                        : new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}
                    </h1>
                    <img
                      src="/chevron-bottom.svg"
                      alt="chevron"
                      style={{
                        transform: showCalendar ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }}
                    />
                  </div>

                  {showCalendar && (
                    <div style={{ position: 'absolute', zIndex: 50, marginTop: '8px', right: 0 }}>
                      <JobCalendar onDateSelect={(date) => {
                        if (scoredJobsRef.current) {
                          scoredJobsRef.current.handleDateSelect(date);
                        }
                      }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {currentUser?.role === 'client' ? (
              optedJobLinks ? (
                <ScoredJobsRegularList
                  ref={scoredJobsRef}
                  applywizzId={applywizzId}
                  showCalendar={showCalendar}
                  setShowCalendar={setShowCalendar}
                  filteredDate={filteredDate}
                  setFilteredDate={setFilteredDate}
                  expandedDate={expandedDate}
                  setExpandedDate={setExpandedDate}
                />
              ) : (
                <ApplicationSummaryList
                  data={clientDashboardData}
                  loading={clientDashboardLoading}
                  error={clientDashboardError}
                  applywizzId={applywizzId}
                />
              )
            ) : (
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-gray-500">Not available for your role.</p>
              </div>
            )}
          </div>
        );

      case 'applied-jobs':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Applied Jobs</h1>
            </div>
            {currentUser?.role === 'client' ? (
              // optedJobLinks ? (
              <ScoredJobsAppliedList applywizzId={applywizzId} />
              // ) : (
              //   <AppliedJobsList applywizzId={applywizzId} />
              // )
            ) : (
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-gray-500">Not available for your role.</p>
              </div>
            )}
          </div>
        );

      // Staffing Agencies Views
      case 'staffing-agencies':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Staffing Agencies</h1>
            </div>
            {/* <StaffingAgenciesDashboard applywizzId={applywizzId} /> */}
            <StaffingAgenciesRegularList applywizzId={applywizzId} />
          </div>
        );

      // C2C Contract Jobs Views
      case 'contract-jobs-c2c':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">C2C Contract Jobs</h1>
            </div>
            {/* <C2CJobsDashboard applywizzId={applywizzId} /> */}
            <C2CJobsRegularList applywizzId={applywizzId} />
          </div>
        );

      // W2 Contract Jobs Views
      case 'contract-jobs-w2':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">W2 Contract Jobs</h1>
            </div>
            {/* <W2JobsDashboard applywizzId={applywizzId} /> */}
            <W2JobsRegularList applywizzId={applywizzId} />
          </div>
        );

      // C2C,W2 Contract Jobs Views
      case 'contract-jobs-c2c-w2':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">C2C,W2 Contract Jobs</h1>
            </div>
            {/* <C2CW2JobsDashboard applywizzId={applywizzId} /> */}
            <C2CW2JobsRegularList applywizzId={applywizzId} />
          </div>
        );

      case 'clients':
        return (
          <ClientsListView
            currentUser={currentUser}
            clients={clients}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            setIsClientOnboardingModalOpen={setIsClientOnboardingModalOpen}
            handleClientEdit={handleClientEdit}
            handleViewClientApplications={handleViewClientApplications}
          />
        );

      case 'client-applications':
        return (
          <ClientApplicationsView
            client={selectedClientForApplications}
            onBack={() => setActiveView('clients')}
          />
        );

      case 'user-management':
        const filteredUsers = users.filter(user =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <button
                onClick={() => setIsUserManagementModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="h-5 w-5" />
                <span>Add User</span>
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />

            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">System User</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user, index) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {user.role.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.department || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => setIsUserManagementModalOpen(true)}
                            className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <FeedbackButton user={currentUser} />
          </div>
        );

      case 'reports':
        return <ReportPage />;

      case 'escalations':
        return (<ExecutiveDashboard user={currentUser!} tickets={tickets} escalations={escalations} />);

      case 'pending_onboarding':
        return (
          <PendingOnboardingList
            pendingClients={pendingClients}
            onAssignRoles={handleAssignRoles}
            onDirectOnboard={handleDirectOnboard}
          />
        );

      case 'job-tracking':
        return (
          <div className="space-y-6">
            <JobTrackingDashboard currentUserEmail={currentUser?.email} />
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900">Feature Coming Soon</h2>
            <p className="text-gray-600 mt-2">This feature is under development.</p>
          </div>
        );
    }
  };




  return (
    <>
      {/* <Toaster position="top-center" reverseOrder={false} /> */}
      <DialogProvider>
        <BrowserRouter>
          <Routes>
            {/* Public auth routes */}
            <Route path="/EmailVerifyRedirect" element={<EmailVerifyRedirect />} />
            <Route path="/LinkExpired" element={<LinkExpired />} />
            <Route path="/EmailConfirmed" element={<EmailConfirmed />} />
            <Route path="/success" element={<SuccessPage />} />
            {/* Login route */}
            <Route
              path="/login"
              element={
                !currentUser
                  ? (<LoginForm onLogin={handleLogin} />)
                  : (<Navigate to="/" replace />)
              }
            />
            {/* Job Board Sign Up route */}
            <Route
              path="/jobboard-signup"
              element={
                !currentUser
                  ? (<JobBoardSignUpForm onSignUpSuccess={handleLogin} />)
                  : (<Navigate to="/" replace />)
              }
            />
            {/* Protected main app routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute currentUser={currentUser}>
                  <>
                    <AppLayout
                      currentUser={currentUser}
                      activeView={activeView}
                      setActiveView={setActiveView}
                      renderMainContent={renderMainContent}
                      renderTicketEditModal={renderTicketEditModal}
                      isCreateTicketModalOpen={isCreateTicketModalOpen}
                      setIsCreateTicketModalOpen={setIsCreateTicketModalOpen}
                      isClientOnboardingModalOpen={isClientOnboardingModalOpen}
                      setIsClientOnboardingModalOpen={setIsClientOnboardingModalOpen}
                      isClientEditModalOpen={isClientEditModalOpen}
                      setIsClientEditModalOpen={setIsClientEditModalOpen}

                      isUserManagementModalOpen={isUserManagementModalOpen}
                      setIsUserManagementModalOpen={setIsUserManagementModalOpen}
                      selectedTicket={selectedTicket}
                      selectedClient={selectedClient}
                      setSelectedClient={setSelectedClient}
                      handleLogout={handleLogout}
                      handleCreateTicket={handleCreateTicket}
                      handleUpdateClient={handleUpdateClient}
                      handleUpdateUser={handleUpdateUser}
                      handleDeleteUser={handleDeleteUser}
                      fetchData={fetchData}
                      pendingClientsCount={pendingClients.length}
                      optedJobLinks={optedJobLinks}
                      onViewLabResults={handleViewLabResults}
                    />
                    <LabResultsModal
                      user={currentUser}
                      labId={selectedLabId}
                      isOpen={isLabResultsModalOpen}
                      onClose={() => setIsLabResultsModalOpen(false)}
                    />

                    {/* ── Onboarding overlay for new job board clients ── */}
                    {currentUser?.role === 'client' && clientExists === false && (
                      <div
                        className="fixed inset-0 z-[200] overflow-y-auto"
                        style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.55)' }}
                      >
                        <div className="min-h-full flex items-start justify-center py-8 px-4">
                          <ClientOnboarding onComplete={() => {
                            setClientExists(true);
                            fetchClientDashboardData();
                          }} />
                        </div>
                      </div>
                    )}
                  </>
                </ProtectedRoute>
              }
            />

          </Routes>

          {/* Conditional Overlays - Only show on dashboard */}
          <ConditionalOverlays
            activeView={activeView}
            isJobsLoading={isJobsLoading}
            showJobScoringOverlay={showJobScoringOverlay}
            isPendingReview={isPendingReview}
            pendingReviewData={pendingReviewData}
            isKarmafyPending={isKarmafyPending}
            currentUser={currentUser}
            optedJobLinks={optedJobLinks}
            handleRefreshJobs={handleRefreshJobs}
            isNewRoleClient={isNewRoleClient}
            isSendingReminder={isSendingReminder}
            reminderSent={reminderSent}
            getRemainingTimeForReminder={getRemainingTimeForReminder}
            handleSendReminder={handleSendReminder}
          />

          {/* Onboarding Success Modal */}
          <OnboardingSuccessModal
            isOpen={isOnboardingSuccessModalOpen}
            onClose={() => {
              setIsOnboardingSuccessModalOpen(false);
              setOnboardingSuccessData(null);
            }}
            clientData={onboardingSuccessData}
            onSendEmail={sendOnboardingWelcomeEmail}
          />
        </BrowserRouter>
      </DialogProvider>

      {/* Google Sign-up: Payment Required Popup */}
      {showPaymentPopup && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '20px',
              padding: '40px 36px',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
              textAlign: 'center',
              animation: 'fadeInUp 0.3s ease',
            }}
          >
            <div style={{ fontSize: '52px', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ fontFamily: '"Darker Grotesque"', fontSize: '24px', fontWeight: 700, color: '#1a1a1a', marginBottom: '8px' }}>
              Payment Required
            </h2>
            <p style={{ fontFamily: 'Poppins', fontSize: '14px', color: '#6b7280', marginBottom: '8px', lineHeight: 1.6 }}>
              The Google account
            </p>
            <p style={{ fontFamily: 'Poppins', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '16px', background: '#f3f4f6', padding: '6px 14px', borderRadius: '8px', display: 'inline-block' }}>
              {blockedGoogleEmail}
            </p>
            <p style={{ fontFamily: 'Poppins', fontSize: '14px', color: '#6b7280', marginBottom: '28px', lineHeight: 1.6 }}>
              is not linked to any active plan. Please complete a payment to create your ApplyWizz account.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <a
                href="https://apply-wizz.com/#pricing"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowPaymentPopup(false)}
                style={{
                  display: 'block', background: '#77E954', color: '#fff',
                  padding: '13px 24px', borderRadius: '10px', fontFamily: 'Poppins',
                  fontWeight: 600, fontSize: '15px', textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#68D045')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#77E954')}
              >
                View Plans &amp; Pay →
              </a>
              <button
                onClick={() => { setShowPaymentPopup(false); setBlockedGoogleEmail(null); }}
                style={{
                  background: 'none', border: '1px solid #e5e7eb', borderRadius: '10px',
                  padding: '11px 24px', fontFamily: 'Poppins', fontSize: '14px',
                  color: '#6b7280', cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(20px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

// Component to conditionally render overlays based on current view
function ConditionalOverlays({
  activeView,
  isJobsLoading,
  showJobScoringOverlay,
  isPendingReview,
  pendingReviewData,
  isKarmafyPending,
  currentUser,
  optedJobLinks,
  handleRefreshJobs,
  isNewRoleClient,
  isSendingReminder,
  reminderSent,
  getRemainingTimeForReminder,
  handleSendReminder
}: {
  activeView: string;
  isJobsLoading: boolean;
  showJobScoringOverlay: boolean;
  isPendingReview: boolean;
  pendingReviewData: any;
  isKarmafyPending: boolean;
  currentUser: User | null;
  optedJobLinks: boolean;
  handleRefreshJobs: () => void;
  isNewRoleClient: boolean;
  isSendingReminder: boolean;
  reminderSent: boolean;
  getRemainingTimeForReminder: () => number;
  handleSendReminder: () => Promise<void>;
}) {
  const isDashboardView = activeView === 'dashboard';

  return (
    <>
      {/* 1. Pending Review Overlay (Phase 2 - Persistent) */}
      {isDashboardView && isPendingReview && currentUser && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          {/* We reuse the Success Modal style but as a persistent overlay */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
            {/* <div className="absolute top-0 left-0 w-full h-32 pointer-events-none opacity-20">
              <DotLottieReact src="/SuccessIcon.lottie" loop autoplay />
            </div> */}
            <h2 className="text-2xl font-extrabold text-gray-900 mb-4 mt-8">Application Under Review</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3 text-left">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                Since you have selected a new target role, we will match jobs according to your selected role. This process may take up to 24 hours.
              </p>
            </div>

            <div className="mb-6">
              {getRemainingTimeForReminder() !== 0 ? (
                <div className="flex flex-col items-center">
                  <button
                    disabled
                    className="w-full py-4 bg-gray-100 text-gray-400 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 cursor-not-allowed border border-gray-200"
                  >
                    <Clock className="w-5 h-5" />
                    Send Reminder Email
                  </button>
                  <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                    Available in {Math.floor(getRemainingTimeForReminder()! / (60 * 60 * 1000))}h {Math.floor((getRemainingTimeForReminder()! % (60 * 60 * 1000)) / (60 * 1000))}m {Math.floor((getRemainingTimeForReminder()! % (60 * 1000)) / 1000)}s
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleSendReminder}
                  disabled={isSendingReminder || reminderSent}
                  className={`w-full py-4 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2 ${reminderSent ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'
                    } ${isSendingReminder ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {reminderSent ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Reminder Sent
                    </>
                  ) : (
                    <>
                      <Send className={`w-5 h-5 ${isSendingReminder ? 'animate-pulse' : ''}`} />
                      {isSendingReminder ? 'Sending...' : 'Send Reminder Email'}
                    </>
                  )}
                </button>
              )}
            </div>

            <p className="text-gray-500 text-sm mb-4">
              Our team has been notified. We'll update you soon!
            </p>
          </div>
        </div>
      )}

      {/* 2. Karmafy Pending Overlay (Phase 3) */}
      {isDashboardView && isKarmafyPending && currentUser && optedJobLinks && (
        <KarmafyPendingOverlay userName={currentUser.name} />
      )}

      {/* 3. Loading Overlay - Shows while fetching jobs on dashboard only */}
      {isDashboardView && isJobsLoading && currentUser?.role === 'client' && optedJobLinks && currentUser && !isKarmafyPending && (
        <LoadingOverlay userName={currentUser.name} />
      )}

      {/* 4. Job Scoring Overlay - Shows when client has no jobs yet on dashboard */}
      {isDashboardView && showJobScoringOverlay && currentUser && !isKarmafyPending && !isPendingReview && (
        <JobScoringOverlay
          userName={currentUser.name}
          onRefresh={handleRefreshJobs}
          isNewRole={!!isNewRoleClient}
        />
      )}
    </>
  );
}

export default App;
