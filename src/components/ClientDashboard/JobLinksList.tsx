import React, { useEffect, useState, useRef } from "react";
import { Calendar, MapPin, ExternalLink, Loader2, ChevronDown, ChevronUp, Briefcase } from "lucide-react";
import { supabase } from '@/lib/supabaseClient';

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
}

interface JobLinksResponse {
    jobs: Job[];
}

interface JobGroup {
    date: string;
    jobs: Job[];
    count: number;
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
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>(""); // New state for status filter
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'date'>('date'); // New state for view mode
    const [expandedDate, setExpandedDate] = useState<string | null>(null); // For date-wise view
    const [groupedJobs, setGroupedJobs] = useState<JobGroup[]>([]); // For date-wise view
    const hasFetchedData = useRef(false);

    // Extract the data fetching logic into a separate function
    const fetchJobLinks = async () => {
        if (!currentUserEmail) return;

        setLoading(true);
        setError("");

        try {
            // First, get the applywizz_id from Supabase based on the user's email
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('applywizz_id')
                .eq('company_email', currentUserEmail)
                .single();

            if (clientError) {
                throw new Error(`Failed to fetch client data: ${clientError.message}`);
            }

            if (!clientData || !clientData.applywizz_id) {
                throw new Error("Applywizz ID not found for this user");
            }

            const applywizzId = clientData.applywizz_id;

            // Now fetch the job links from the external API
            const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL;
            if (!apiUrl) {
                throw new Error('VITE_EXTERNAL_API_URL is not defined in environment variables');
            }

            const response = await fetch(`${apiUrl}/api/job-links?lead_id=${applywizzId}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch data from external API: ${response.status} ${response.statusText}`);
            }

            const apiData: JobLinksResponse = await response.json();

            // Convert backend statuses to frontend format
            const jobsWithConvertedStatuses = (apiData.jobs || []).map(job => ({
                ...job,
                // Only convert status if it's not null, otherwise keep it as null
                status: job.status ? convertBackendStatusToFrontend(job.status) : job.status
            }));

            setJobs(jobsWithConvertedStatuses);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    // Use a more robust approach to prevent double fetching
    useEffect(() => {
        // Prevent double fetching in development due to React StrictMode
        if (hasFetchedData.current || !currentUserEmail) {
            return;
        }

        hasFetchedData.current = true;
        fetchJobLinks();

        return () => {
            // Cleanup if needed
        };
    }, [currentUserEmail]);

    // Log when currentUserEmail changes
    useEffect(() => {
        console.log("JobLinksList: currentUserEmail dependency changed to:", currentUserEmail);
    }, [currentUserEmail]);

    // Group jobs by date for the date-wise view
    useEffect(() => {
        if (jobs.length > 0) {
            const groups: Record<string, Job[]> = {};

            jobs.forEach(job => {
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
    }, [jobs]);

    useEffect(() => {
        console.log("JobLinksList: Filter/sort useEffect running with jobs:", jobs.length, "selectedDate:", selectedDate, "selectedStatus:", selectedStatus, "sortOrder:", sortOrder);
        let result = [...jobs];

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
    }, [jobs, selectedDate, selectedStatus, sortOrder]);

    const handleStatusChange = async (jobId: string, newStatus: string) => {
        // Find the job index by ID instead of using array index
        const jobIndex = jobs.findIndex(job => job.id === jobId);
        if (jobIndex === -1) {
            console.error("Job not found");
            return;
        }

        // Update the local state immediately for better UX
        const updatedJobs = [...jobs];
        updatedJobs[jobIndex].status = newStatus;
        setJobs(updatedJobs);

        // Map frontend status values to backend expected values
        const backendStatus = convertFrontendStatusToBackend(newStatus);

        try {
            // Get the API URL from environment variables
            const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL as string;
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
            await fetchJobLinks();
        } catch (error) {
            console.error("Error updating job status:", error);
            // Revert the local state change if the API call fails
            const revertedJobs = [...jobs];
            revertedJobs[jobIndex].status = jobs[jobIndex].status;
            setJobs(revertedJobs);
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
            return diffDays > 7; // Consider overdue if posted more than 7 days ago
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

    if (!jobs || jobs.length === 0) {
        return (
            <div className="bg-white p-4 rounded-lg shadow mt-6">
                <p className="text-gray-500">No job links available.</p>
            </div>
        );
    }

    // Calculate status counts based on all jobs (from API) - not filtered
    // Treat null status values as pending
    const originalStatusCounts = {
        total: jobs.length,
        pending: jobs.filter(job => job.status === 'pending' || job.status === null).length,
        in_progress: jobs.filter(job => job.status === 'in_progress').length,
        completed: jobs.filter(job => job.status === 'completed').length,
        already_applied: jobs.filter(job => job.status === 'already_applied').length,
        not_relevant: jobs.filter(job => job.status === 'not_relevant').length,
        job_not_found: jobs.filter(job => job.status === 'job_not_found').length,
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow mt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
                <h2 className="text-lg font-semibold">Job Applications</h2>

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
                <>
                    <div className="mb-6">
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
                        {filteredJobs.map((job, index) => {
                            const { formattedDate, daysAgo } = formatDateInfo(job.date_posted);
                            const overdue = isOverdue(job.date_posted);
                            // Use 'pending' as default status only when status is null or undefined
                            const displayStatus = job.status || 'pending';
                            // Calculate serial number (1-based index)
                            const serialNumber = index + 1;

                            return (
                                <div
                                    key={`${job.url}-${index}`}
                                    className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition"
                                >
                                    {/* Header Section with Serial Number */}
                                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                                        {/* Serial Number */}
                                        <div className="flex items-center justify-center bg-gray-100 rounded-full w-8 h-8 flex-shrink-0">
                                            <span className="text-gray-700 font-medium text-sm">{serialNumber}</span>
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900 text-base break-words">
                                                        {job.title || "Untitled Job"} ({job.url ? job.url.split('/').pop() : 'N/A'})
                                                    </h3>
                                                    <p className="text-sm text-blue-600 font-medium mt-1">{job.role_name || "N/A"}</p>
                                                </div>
                                                <div className="mt-2 sm:mt-0">
                                                    <span
                                                        className={`inline-block px-2 py-1 sm:px-3 sm:py-1 rounded-md text-xs font-semibold uppercase ${getStatusBadgeColor(
                                                            displayStatus
                                                        )}`}
                                                    >
                                                        {displayStatus ? displayStatus.replace(/_/g, " ") : "N/A"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Match Score */}
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-medium text-gray-700">Match Score: {job.score ?? 0}</span>
                                                {/* <button className="text-blue-600 text-xs underline">Score Details</button> */}
                                            </div>

                                            {/* Location & Date Info */}
                                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 mt-2 text-sm text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <MapPin size={14} />
                                                    <span className="break-words">{job.location || "Location not specified"}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    <span>Posted: {formattedDate}{daysAgo}</span>
                                                </div>
                                                {overdue && (
                                                    <div className="flex items-center gap-1 text-red-600">
                                                        <span className="font-medium">(Overdue)</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status Dropdown & Action Button */}
                                        <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full sm:w-auto md:w-48">
                                            <select
                                                value={displayStatus}
                                                onChange={(e) => job.id && handleStatusChange(job.id, e.target.value)}
                                                className="w-full px-2 py-1 sm:px-3 sm:py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                disabled={!job.id}
                                            >
                                                {statusOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => job.url && window.open(job.url, '_blank')}
                                                disabled={!job.url}
                                                className={`w-full flex items-center justify-center gap-1 px-2 py-1 sm:px-3 sm:py-2 rounded-md text-sm transition ${job.url ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                    }`}
                                            >
                                                <ExternalLink size={14} />
                                                <span className="whitespace-nowrap">View Job</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
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
                                                <Briefcase size={18} />
                                                <span>{group.count} Applications</span>
                                            </div>
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </div>
                                    </div>

                                    {/* Expanded Job List with Serial Numbers */}
                                    {isExpanded && (
                                        <div className="mt-3 space-y-4 bg-gray-50 p-4 rounded-lg">
                                            {group.jobs.map((job, index) => {
                                                const { formattedDate, daysAgo } = formatDateInfo(job.date_posted);
                                                const overdue = isOverdue(job.date_posted);
                                                const displayStatus = job.status || 'pending';
                                                // Calculate serial number within the date group (1-based index)
                                                const serialNumber = index + 1;

                                                return (
                                                    <div
                                                        key={job.id || `${job.url}-${Math.random()}`}
                                                        className="bg-white rounded-lg p-4 flex flex-col md:flex-row justify-between items-start shadow-sm hover:shadow transition"
                                                    >
                                                        {/* Serial Number */}
                                                        <div className="flex items-center justify-center bg-gray-100 rounded-full w-6 h-6 flex-shrink-0 mr-3 mb-2 md:mb-0">
                                                            <span className="text-gray-700 font-medium text-xs">{serialNumber}</span>
                                                        </div>

                                                        <div className="flex-1 mb-3 md:mb-0">
                                                            <h3 className="font-semibold text-gray-800">
                                                                {job.title || "Untitled Role"}
                                                            </h3>
                                                            {/* Role Name and Score Information */}
                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                {job.role_name && (
                                                                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                                                        {job.role_name}
                                                                    </span>
                                                                )}
                                                                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                                                    Score: {job.score ?? "N/A"}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-600 mt-2">
                                                                {job.company || "Unknown Company"}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                                                                <MapPin size={14} />
                                                                <span>{job.location || "Not Available"}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col sm:flex-row md:flex-col gap-2 min-w-[180px]">
                                                            <div className="flex items-center justify-between md:justify-start gap-2">
                                                                <span className="text-sm font-medium">Status:</span>
                                                                <span
                                                                    className={`inline-block px-2 py-1 rounded text-xs font-semibold uppercase ${getStatusBadgeColor(
                                                                        displayStatus
                                                                    )}`}
                                                                >
                                                                    {displayStatus.replace(/_/g, " ")}
                                                                </span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <select
                                                                    value={displayStatus}
                                                                    onChange={(e) => job.id && handleStatusChange(job.id, e.target.value)}
                                                                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                                    disabled={!job.id}
                                                                >
                                                                    {statusOptions.map((option) => (
                                                                        <option key={option.value} value={option.value}>
                                                                            {option.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <a
                                                                    href={job.url || "#"}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="bg-green-600 text-white px-3 py-2 rounded-md flex items-center gap-1 text-sm hover:bg-green-700 transition w-full md:w-auto justify-center"
                                                                >
                                                                    <ExternalLink size={14} />
                                                                    View Job
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
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
