import React, { useEffect, useState, useRef } from "react";
import { Calendar, MapPin, ExternalLink, Loader2, ChevronDown, ChevronUp, Briefcase } from "lucide-react";
import { supabase } from '@/lib/supabaseClient';
import { useAccount } from '@/contexts/AccountContext';

// ✅ Types
interface Job {
    id?: string;
    score?: number;
    url?: string;
    company?: string;
    title?: string;
    location?: string;
    description?: string;
    date_posted?: string;
    role_name?: string;
    status?: string;
    source?: string;
    apply_type?: string | null;
}

interface JobLinksResponse {
    jobs: Job[];
    easyapply: Job[];
}

interface JobGroup {
    date: string;
    jobs: Job[];
    count: number;
}

interface ClientAccount {
    applywizz_id: string;
    full_name?: string;
    id: string; // Added ID field
}

interface JobLinksListProps {
    currentUserEmail?: string;
}

const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "already_applied", label: "Already Applied" },
    { value: "not_relevant", label: "Not Relevant" },
    { value: "job_not_found", label: "Job Not Found" },
];

// Status mapping functions
const frontendToBackendStatusMap: Record<string, string> = {
    "pending": "Pending",
    "in_progress": "In Progress",
    "completed": "Completed",
    "already_applied": "Already Applied",
    "not_relevant": "Not Relevant",
    "job_not_found": "Job Not Found"
};

const backendToFrontendStatusMap: Record<string, string> = {
    "Pending": "pending",
    "In Progress": "in_progress",
    "Completed": "completed",
    "Already Applied": "already_applied",
    "Not Relevant": "not_relevant",
    "Job Not Found": "job_not_found"
};

const convertBackendStatusToFrontend = (backendStatus: string): string => {
    return backendToFrontendStatusMap[backendStatus] || backendStatus.toLowerCase().replace(/\s+/g, '_');
};

const convertFrontendStatusToBackend = (frontendStatus: string): string => {
    return frontendToBackendStatusMap[frontendStatus] || frontendStatus.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

const getStatusBadgeColor = (status: string | undefined | null) => {
    // Convert backend status to frontend format for color mapping
    const frontendStatus = status ? convertBackendStatusToFrontend(status) : status;

    if (!frontendStatus) return "bg-gray-100 text-gray-800";

    switch (frontendStatus.toLowerCase()) {
        case "pending":
            return "bg-yellow-100 text-yellow-800";
        case "in_progress":
            return "bg-blue-100 text-blue-800";
        case "completed":
            return "bg-green-100 text-green-800";
        case "already_applied":
            return "bg-purple-100 text-purple-800";
        case "not_relevant":
            return "bg-gray-100 text-gray-800";
        case "job_not_found":
            return "bg-red-100 text-red-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
};

const JobLinksList: React.FC<JobLinksListProps> = ({ currentUserEmail }) => {
    const [jobs, setJobs] = useState<Job[]>([]); // Regular jobs
    const [easyApplyJobs, setEasyApplyJobs] = useState<Job[]>([]); // Easy apply jobs
    const [allJobs, setAllJobs] = useState<Job[]>([]); // Combined for filtering/sorting
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>(""); // New state for status filter
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'date'>('date'); // New state for view mode
    const [expandedDate, setExpandedDate] = useState<string | null>(null); // For date-wise view
    const [groupedJobs, setGroupedJobs] = useState<JobGroup[]>([]); // For date-wise view

    // New state for multiple accounts
    const [accounts, setAccounts] = useState<ClientAccount[]>([]);

    // Use the shared context for selectedAccountId
    const { selectedAccountId, setSelectedAccountId } = useAccount();

    // Local state to store the applywizz_id for the selected account
    const [selectedApplywizzId, setSelectedApplywizzId] = useState<string | null>(null);

    // Extract the data fetching logic into a separate function
    // Fetch client accounts based on email
    useEffect(() => {
        if (!currentUserEmail) return;

        const fetchAccounts = async () => {
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('applywizz_id, full_name, id')
                    .eq('company_email', currentUserEmail);

                if (error) {
                    console.error("Error fetching accounts:", error);
                    setError("Failed to load client accounts.");
                    return;
                }
                console.log("Accounts fetched:", data);

                if (data && data.length > 0) {
                    // Filter out any accounts without applywizz_id or id
                    const validAccounts = data.filter(acc => acc.applywizz_id && acc.id);
                    setAccounts(validAccounts);

                    const hasMultipleAccounts = validAccounts.length > 1;

                    // If no account is selected or selected account is not in the list, select the first one
                    if (!selectedAccountId || !validAccounts.find(acc => acc.id === selectedAccountId)) {
                        if (validAccounts.length > 0) {
                            // Only persist to localStorage if there are multiple accounts
                            setSelectedAccountId(validAccounts[0].id, hasMultipleAccounts);
                        }
                    } else if (!hasMultipleAccounts) {
                        // If only one account, make sure we're not persisting to localStorage
                        setSelectedAccountId(validAccounts[0].id, false);
                    }
                } else {
                    // No accounts found, maybe handle this gracefully or show error
                    // For now, we just don't set a selected ID, so no jobs will load
                }
            } catch (err) {
                console.error("Error in fetchAccounts:", err);
                setError("An unexpected error occurred while loading accounts.");
            }
        };

        fetchAccounts();
    }, [currentUserEmail, selectedAccountId, setSelectedAccountId]);

    // Map the selectedAccountId from context to applywizz_id
    useEffect(() => {
        if (selectedAccountId && accounts.length > 0) {
            const account = accounts.find(acc => acc.id === selectedAccountId);
            if (account) {
                setSelectedApplywizzId(account.applywizz_id);
            }
        }
    }, [selectedAccountId, accounts]);

    // Fetch jobs when selectedApplywizzId changes
    useEffect(() => {
        if (!selectedApplywizzId) return;

        const fetchJobLinks = async () => {
            setLoading(true);
            setError("");

            try {
                // Now fetch the job links from the external API
                const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL1;
                if (!apiUrl) {
                    throw new Error('VITE_EXTERNAL_API_URL is not defined in environment variables');
                }

                const response = await fetch(`${apiUrl}/api/job-links?lead_id=${selectedApplywizzId}`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch data from external API: ${response.status} ${response.statusText}`);
                }

                const apiData: JobLinksResponse = await response.json();

                // Convert backend statuses to frontend format for both regular and easy apply jobs
                const regularJobsWithConvertedStatuses = (apiData.jobs || []).map(job => ({
                    ...job,
                    // Only convert status if it's not null, otherwise keep it as null
                    status: job.status ? convertBackendStatusToFrontend(job.status) : job.status
                }));

                const easyApplyJobsWithConvertedStatuses = (apiData.easyapply || []).map(job => ({
                    ...job,
                    // Only convert status if it's not null, otherwise keep it as null
                    status: job.status ? convertBackendStatusToFrontend(job.status) : job.status
                }));

                setJobs(regularJobsWithConvertedStatuses);
                setEasyApplyJobs(easyApplyJobsWithConvertedStatuses);

                // Combine both for filtering/sorting (backward compatibility)
                setAllJobs([...regularJobsWithConvertedStatuses, ...easyApplyJobsWithConvertedStatuses]);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchJobLinks();
    }, [selectedApplywizzId]);

    // Log when currentUserEmail changes
    useEffect(() => {
        console.log("JobLinksList: currentUserEmail dependency changed to:", currentUserEmail);
    }, [currentUserEmail]);

    // Group jobs by date for the date-wise view
    useEffect(() => {
        if (allJobs.length > 0) {
            const groups: Record<string, Job[]> = {};

            allJobs.forEach(job => {
                if (job.date_posted) {
                    const dateKey = job.date_posted.split('T')[0]; // Extract YYYY-MM-DD
                    if (!groups[dateKey]) {
                        groups[dateKey] = [];
                    }
                    groups[dateKey].push(job);
                }
            });

            const groupedArray: JobGroup[] = Object.keys(groups).map(date => ({
                date,
                jobs: groups[date],
                count: groups[date].length
            }));

            // Sort by date descending
            groupedArray.sort((a, b) => {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            });

            setGroupedJobs(groupedArray);
        }
    }, [allJobs]);

    useEffect(() => {
        console.log("JobLinksList: Filter/sort useEffect running with allJobs:", allJobs.length, "selectedDate:", selectedDate, "selectedStatus:", selectedStatus, "sortOrder:", sortOrder);
        let result = [...allJobs];

        // Filter by selected date if provided
        if (selectedDate) {
            result = result.filter(job => {
                if (!job.date_posted) return false;
                try {
                    const jobDate = new Date(job.date_posted);
                    // Format both dates as DD/MM/YYYY for comparison
                    const jobDateFormatted = formatDateForFilter(jobDate);

                    // Convert selectedDate (YYYY-MM-DD) to DD/MM/YYYY
                    const [year, month, day] = selectedDate.split('-');
                    const selectedDateFormatted = `${day}/${month}/${year}`;

                    return jobDateFormatted === selectedDateFormatted;
                } catch {
                    return false;
                }
            });
        }

        // Filter by selected status if provided
        // Treat null status values as pending when filtering
        if (selectedStatus) {
            if (selectedStatus === 'pending') {
                result = result.filter(job => job.status === 'pending' || job.status === null);
            } else {
                result = result.filter(job => job.status === selectedStatus);
            }
        }

        // Sort by date
        result.sort((a, b) => {
            if (!a.date_posted || !b.date_posted) return 0;
            const dateA = new Date(a.date_posted).getTime();
            const dateB = new Date(b.date_posted).getTime();

            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        setFilteredJobs(result);
        console.log("JobLinksList: Filter/sort complete, filtered jobs:", result.length);
    }, [allJobs, selectedDate, selectedStatus, sortOrder]);

    const handleStatusChange = async (jobId: string, newStatus: string) => {
        // Find the job in either regular jobs or easy apply jobs
        const regularJobIndex = jobs.findIndex(job => job.id === jobId);
        const easyApplyJobIndex = easyApplyJobs.findIndex(job => job.id === jobId);

        if (regularJobIndex === -1 && easyApplyJobIndex === -1) {
            console.error("Job not found");
            return;
        }

        // Update the local state immediately for better UX
        if (regularJobIndex !== -1) {
            const updatedJobs = [...jobs];
            updatedJobs[regularJobIndex].status = newStatus;
            setJobs(updatedJobs);
        } else if (easyApplyJobIndex !== -1) {
            const updatedEasyApplyJobs = [...easyApplyJobs];
            updatedEasyApplyJobs[easyApplyJobIndex].status = newStatus;
            setEasyApplyJobs(updatedEasyApplyJobs);
        }

        // Also update allJobs
        const updatedAllJobs = [...allJobs];
        const allJobsIndex = updatedAllJobs.findIndex(job => job.id === jobId);
        if (allJobsIndex !== -1) {
            updatedAllJobs[allJobsIndex].status = newStatus;
            setAllJobs(updatedAllJobs);
        }

        // Map frontend status values to backend expected values
        const backendStatus = convertFrontendStatusToBackend(newStatus);

        try {
            // Get the API URL from environment variables
            const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL1 as string;
            if (!apiUrl) {
                throw new Error('VITE_EXTERNAL_API_URL is not defined in environment variables');
            }

            // Call the backend API to update the job status
            const response = await fetch(`${apiUrl}/api/job-links/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "job-id": jobId,
                    "status": backendStatus
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to update job status: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log("Job status updated successfully:", result);

            // Refresh the job list to ensure consistency
            if (selectedApplywizzId) {
                const refreshResponse = await fetch(`${apiUrl}/api/job-links?lead_id=${selectedApplywizzId}`);
                if (refreshResponse.ok) {
                    const apiData: JobLinksResponse = await refreshResponse.json();
                    const regularJobsRefreshed = (apiData.jobs || []).map(job => ({
                        ...job,
                        status: job.status ? convertBackendStatusToFrontend(job.status) : job.status
                    }));
                    const easyApplyJobsRefreshed = (apiData.easyapply || []).map(job => ({
                        ...job,
                        status: job.status ? convertBackendStatusToFrontend(job.status) : job.status
                    }));
                    setJobs(regularJobsRefreshed);
                    setEasyApplyJobs(easyApplyJobsRefreshed);
                    setAllJobs([...regularJobsRefreshed, ...easyApplyJobsRefreshed]);
                }
            }
        } catch (error) {
            console.error("Error updating job status:", error);
            // Revert the local state change if the API call fails - revert all three states
            if (regularJobIndex !== -1) {
                const revertedJobs = [...jobs];
                revertedJobs[regularJobIndex].status = jobs[regularJobIndex].status;
                setJobs(revertedJobs);
            } else if (easyApplyJobIndex !== -1) {
                const revertedEasyApplyJobs = [...easyApplyJobs];
                revertedEasyApplyJobs[easyApplyJobIndex].status = easyApplyJobs[easyApplyJobIndex].status;
                setEasyApplyJobs(revertedEasyApplyJobs);
            }
        }
    };

    const formatDateForFilter = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const isOverdue = (datePosted: string | undefined | null) => {
        if (!datePosted) return false;
        try {
            const postedDate = new Date(datePosted);
            const today = new Date();
            const diffTime = today.getTime() - postedDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 15; // Consider overdue if posted more than 7 days ago
        } catch {
            return false;
        }
    };

    const formatDateInfo = (datePosted: string | undefined | null) => {
        if (!datePosted) return { formattedDate: "N/A", daysAgo: "" };

        try {
            const postedDate = new Date(datePosted);
            const today = new Date();
            const diffTime = today.getTime() - postedDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            // Format date as DD/MM/YYYY
            const day = String(postedDate.getDate()).padStart(2, '0');
            const month = String(postedDate.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
            const year = postedDate.getFullYear();
            const formattedDate = `${day}/${month}/${year}`;

            let daysAgo = "";
            if (diffDays === 0) {
                daysAgo = " (Today)";
            } else if (diffDays === 1) {
                daysAgo = " (1 day ago)";
            } else {
                daysAgo = ` (${diffDays} days ago)`;
            }

            return { formattedDate, daysAgo };
        } catch {
            return { formattedDate: "Invalid Date", daysAgo: "" };
        }
    };

    // Toggle date expansion in date-wise view
    const toggleDateExpansion = (date: string) => {
        if (expandedDate === date) {
            setExpandedDate(null);
        } else {
            setExpandedDate(date);
        }
    };

    // Helper function to render a job card (to avoid duplication)
    const renderJobCard = (job: Job, index: number, serialNumber: number) => {
        const { formattedDate, daysAgo } = formatDateInfo(job.date_posted);
        const overdue = isOverdue(job.date_posted);
        const displayStatus = job.status || 'pending';

        return (
            <div
                key={`${job.id}-${index}`}
                className="bg-white rounded-lg p-4 flex flex-col md:flex-row justify-between items-start shadow-sm hover:shadow transition"
            >
                {/* Serial Number */}
                <div className="flex items-center justify-center bg-gray-100 rounded-full w-6 h-6 flex-shrink-0 mr-3 mb-2 md:mb-0">
                    <span className="text-gray-700 font-medium text-xs">{serialNumber}</span>
                </div>

                <div className="flex-1 mb-3 md:mb-0">
                    <h3 className="font-semibold text-gray-800">
                        {job.title || "Untitled Job"}{job.id}
                    </h3>
                    <p className="text-sm text-blue-600 font-medium mt-1">{job.role_name || "N/A"}</p>
                    <p className="text-sm text-gray-600 mt-2">
                        Company Name : {job.company || "Unknown Company"}
                    </p>
                    {/* Match Score */}
                    <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                            Score: {job.score ?? "N/A"}
                        </span>
                    </div>

                    {/* Location & Date Info */}
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                            <MapPin size={14} />
                            <span className="break-words">{job.location || "Location not specified"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>
                                {formattedDate} ({daysAgo})
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
                    {/* Status Badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(displayStatus)}`}>
                        {displayStatus.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                    </span>

                    {/* Overdue Warning */}
                    {/* {overdue && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                            Overdue
                        </span>
                    )} */}

                    {/* Status Dropdown */}
                    <select
                        value={displayStatus}
                        onChange={(e) => handleStatusChange(job.id!, e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    {/* Apply Link */}
                    {job.url && (
                        <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                        >
                            Apply <ExternalLink size={14} />
                        </a>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="bg-white p-4 rounded-lg shadow mt-6">
                <div className="flex justify-center items-center py-8">
                    <Loader2 className="animate-spin mr-2" size={24} />
                    <span>Loading job links...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white p-4 rounded-lg shadow mt-6">
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    if (!allJobs || allJobs.length === 0) {
        return (
            <div className="bg-white p-4 rounded-lg shadow mt-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold">Job Applications</h2>
                    {accounts.length > 1 && (
                        <select
                            value={selectedAccountId || ''}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
                        >
                            {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.full_name || account.applywizz_id}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                <p className="text-gray-500">No job links available.</p>
            </div>
        );
    }

    // Calculate status counts based on all jobs (from API) - not filtered
    // Treat null status values as pending
    const originalStatusCounts = {
        total: allJobs.length,
        pending: allJobs.filter(job => job.status === 'pending' || job.status === null).length,
        in_progress: allJobs.filter(job => job.status === 'in_progress').length,
        completed: allJobs.filter(job => job.status === 'completed').length,
        already_applied: allJobs.filter(job => job.status === 'already_applied').length,
        not_relevant: allJobs.filter(job => job.status === 'not_relevant').length,
        job_not_found: allJobs.filter(job => job.status === 'job_not_found').length,
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow mt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold">Job Applications</h2>
                    {accounts.length > 1 && (
                        <select
                            value={selectedAccountId || ''}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
                        >
                            {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.full_name || account.applywizz_id}
                                </option>
                            ))}
                        </select>
                    )}
                </div>


                {/* View Mode Toggle and Date Filter/Sort Controls */}
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    {/* View Mode Toggle Buttons */}
                    <div className="flex rounded-md overflow-hidden border border-gray-300 w-full sm:w-auto">
                        <button
                            onClick={() => setViewMode('date')}
                            className={`px-4 py-2 text-sm font-medium transition ${viewMode === 'date'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            Date View
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 text-sm font-medium transition ${viewMode === 'list'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            List View
                        </button>
                    </div>

                    {viewMode === 'list' && (
                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <label htmlFor="date-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                    Filter by Date:
                                </label>
                                <input
                                    type="date"
                                    id="date-filter"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                                />
                                {selectedDate && (
                                    <button
                                        onClick={() => setSelectedDate("")}
                                        className="text-sm text-red-600 hover:text-red-800 whitespace-nowrap"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <label htmlFor="status-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                    Filter by Status:
                                </label>
                                <select
                                    id="status-filter"
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="already_applied">Already Applied</option>
                                    <option value="not_relevant">Not Relevant</option>
                                    <option value="job_not_found">Job Not Found</option>
                                </select>
                                {selectedStatus && (
                                    <button
                                        onClick={() => setSelectedStatus("")}
                                        className="text-sm text-red-600 hover:text-red-800 whitespace-nowrap"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <label htmlFor="sort-order" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                    Sort:
                                </label>
                                <select
                                    id="sort-order"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                                >
                                    <option value="desc">Newest First</option>
                                    <option value="asc">Oldest First</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>


            {/* View Content Based on View Mode */}
            {viewMode === 'list' ? (
                <div className="space-y-6">
                    <div className="mb-2">
                        <h3 className="text-base font-semibold mb-3">Task Summary</h3>
                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                            {/* Total Tasks */}
                            <button
                                onClick={() => setSelectedStatus('')}
                                className={`rounded-lg p-2 xs:p-3 text-center transition-all duration-200 ${!selectedStatus ? 'ring-2 ring-blue-500 ring-offset-2 scale-105' : 'bg-gray-50 hover:bg-gray-100'}`}
                            >
                                <div className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900">{originalStatusCounts.total}</div>
                                <div className="text-xs text-gray-600 mt-1">Total Tasks</div>
                            </button>

                            {/* Pending */}
                            <button
                                onClick={() => setSelectedStatus('pending')}
                                className={`rounded-lg p-2 xs:p-3 text-center transition-all duration-200 ${selectedStatus === 'pending' ? 'ring-2 ring-yellow-500 ring-offset-2 scale-105 bg-yellow-100' : 'bg-yellow-50 hover:bg-yellow-100'}`}
                            >
                                <div className="text-lg xs:text-xl sm:text-2xl font-bold text-yellow-700">{originalStatusCounts.pending}</div>
                                <div className="text-xs text-yellow-700 mt-1">Pending</div>
                            </button>

                            {/* In Progress */}
                            <button
                                onClick={() => setSelectedStatus('in_progress')}
                                className={`rounded-lg p-2 xs:p-3 text-center transition-all duration-200 ${selectedStatus === 'in_progress' ? 'ring-2 ring-blue-500 ring-offset-2 scale-105 bg-blue-100' : 'bg-blue-50 hover:bg-blue-100'}`}
                            >
                                <div className="text-lg xs:text-xl sm:text-2xl font-bold text-blue-700">{originalStatusCounts.in_progress}</div>
                                <div className="text-xs text-blue-700 mt-1">In Progress</div>
                            </button>

                            {/* Completed */}
                            <button
                                onClick={() => setSelectedStatus('completed')}
                                className={`rounded-lg p-2 xs:p-3 text-center transition-all duration-200 ${selectedStatus === 'completed' ? 'ring-2 ring-green-500 ring-offset-2 scale-105 bg-green-100' : 'bg-green-50 hover:bg-green-100'}`}
                            >
                                <div className="text-lg xs:text-xl sm:text-2xl font-bold text-green-700">{originalStatusCounts.completed}</div>
                                <div className="text-xs text-green-700 mt-1">Completed</div>
                            </button>

                            {/* Already Applied */}
                            <button
                                onClick={() => setSelectedStatus('already_applied')}
                                className={`rounded-lg p-2 xs:p-3 text-center transition-all duration-200 ${selectedStatus === 'already_applied' ? 'ring-2 ring-purple-500 ring-offset-2 scale-105 bg-purple-100' : 'bg-purple-50 hover:bg-purple-100'}`}
                            >
                                <div className="text-lg xs:text-xl sm:text-2xl font-bold text-purple-700">{originalStatusCounts.already_applied}</div>
                                <div className="text-xs text-purple-700 mt-1">Applied</div>
                            </button>

                            {/* Not Relevant */}
                            <button
                                onClick={() => setSelectedStatus('not_relevant')}
                                className={`rounded-lg p-2 xs:p-3 text-center transition-all duration-200 ${selectedStatus === 'not_relevant' ? 'ring-2 ring-red-500 ring-offset-2 scale-105 bg-red-100' : 'bg-red-50 hover:bg-red-100'}`}
                            >
                                <div className="text-lg xs:text-xl sm:text-2xl font-bold text-red-700">{originalStatusCounts.not_relevant}</div>
                                <div className="text-xs text-red-700 mt-1">Not Relevant</div>
                            </button>

                            {/* Job Not Found */}
                            <button
                                onClick={() => setSelectedStatus('job_not_found')}
                                className={`rounded-lg p-2 xs:p-3 text-center transition-all duration-200 ${selectedStatus === 'job_not_found' ? 'ring-2 ring-orange-500 ring-offset-2 scale-105 bg-orange-100' : 'bg-orange-50 hover:bg-orange-100'}`}
                            >
                                <div className="text-lg xs:text-xl sm:text-2xl font-bold text-orange-700">{originalStatusCounts.job_not_found}</div>
                                <div className="text-xs text-orange-700 mt-1">Not Found</div>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Two-Column Grid for Regular Jobs and Easy Apply */}
                        <div className={`grid gap-6 ${easyApplyJobs.length > 0 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                            {/* Left Column: Regular Applications */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Briefcase className="h-5 w-5 text-blue-600" />
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Regular Applications ({jobs.length})
                                    </h3>
                                </div>

                                {jobs.length > 0 ? (
                                    <div className="space-y-4">
                                        {jobs.map((job, index) => renderJobCard(job, index, index + 1))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        No regular applications available
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Easy Apply */}
                            {easyApplyJobs.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Briefcase className="h-5 w-5 text-green-600" />
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Easy Apply ({easyApplyJobs.length})
                                        </h3>
                                    </div>

                                    {easyApplyJobs.length > 0 ? (
                                        <div className="space-y-4">
                                            {easyApplyJobs.map((job, index) => renderJobCard(job, index, index + 1))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            No easy apply applications available
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                // Date-wise View (New UI) with Serial Numbers
                <div>
                    <div className="space-y-3">
                        {groupedJobs.map((group) => {
                            const dateObj = new Date(group.date);
                            const formattedDate = dateObj.toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            });

                            const isExpanded = expandedDate === group.date;

                            // Separate jobs into regular and easy apply for this date
                            const regularJobsForDate = group.jobs.filter(job => !job.apply_type || job.apply_type !== 'EASY_APPLY');
                            const easyApplyJobsForDate = group.jobs.filter(job => job.apply_type === 'EASY_APPLY');

                            return (
                                <div key={group.date}>
                                    {/* Date Row */}
                                    <div
                                        onClick={() => toggleDateExpansion(group.date)}
                                        className={`flex justify-between items-center px-4 py-3 rounded-lg cursor-pointer transition ${isExpanded ? "bg-blue-100" : "bg-blue-50 hover:shadow"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 text-blue-900">
                                            <Calendar size={18} />
                                            <span className="font-medium">{formattedDate}</span>
                                        </div>

                                        <div className="flex items-center gap-3 text-blue-700 font-semibold">
                                            <div className="flex items-center gap-2">
                                                <Briefcase size={18} className="text-blue-600" />
                                                <span>{regularJobsForDate.length} Regular Apply</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Briefcase size={18} className="text-green-600" />
                                                <span>{easyApplyJobsForDate.length} Easy Apply</span>
                                            </div>
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </div>
                                    </div>

                                    {/* Expanded Job List with Two-Column Layout */}
                                    {isExpanded && (
                                        <div className="mt-3 bg-gray-50 p-4 rounded-lg">
                                            {/* Two-Column Grid for Regular Jobs and Easy Apply */}
                                            <div className={`grid gap-6 ${easyApplyJobsForDate.length > 0 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                                                {/* Left Column: Regular Applications */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <Briefcase className="h-5 w-5 text-blue-600" />
                                                        <h4 className="text-md font-semibold text-gray-900">
                                                            Regular Applications ({regularJobsForDate.length})
                                                        </h4>
                                                    </div>

                                                    {regularJobsForDate.length > 0 ? (
                                                        <div className="space-y-4">
                                                            {regularJobsForDate.map((job, index) => renderJobCard(job, index, index + 1))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8 text-gray-500">
                                                            No regular applications for this date
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right Column: Easy Apply */}
                                                {easyApplyJobsForDate.length > 0 && (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <Briefcase className="h-5 w-5 text-green-600" />
                                                            <h4 className="text-md font-semibold text-gray-900">
                                                                Easy Apply ({easyApplyJobsForDate.length})
                                                            </h4>
                                                        </div>

                                                        {easyApplyJobsForDate.length > 0 ? (
                                                            <div className="space-y-4">
                                                                {easyApplyJobsForDate.map((job, index) => renderJobCard(job, index, index + 1))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-8 text-gray-500">
                                                                No easy apply applications for this date
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobLinksList;
