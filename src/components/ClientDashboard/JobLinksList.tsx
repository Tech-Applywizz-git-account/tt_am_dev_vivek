import React, { useEffect, useState, useRef } from "react";
import { Calendar, MapPin, ExternalLink, Loader2 } from "lucide-react";
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
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
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
            const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL1;
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

    useEffect(() => {
        console.log("JobLinksList: Filter/sort useEffect running with jobs:", jobs.length, "selectedDate:", selectedDate, "sortOrder:", sortOrder);
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
        
        // Sort by date
        result.sort((a, b) => {
            if (!a.date_posted || !b.date_posted) return 0;
            const dateA = new Date(a.date_posted).getTime();
            const dateB = new Date(b.date_posted).getTime();
            
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
        
        setFilteredJobs(result);
        console.log("JobLinksList: Filter/sort complete, filtered jobs:", result.length);
    }, [jobs, selectedDate, sortOrder]);

    const handleStatusChange = async (jobIndex: number, newStatus: string) => {
        // Update the local state immediately for better UX
        const updatedJobs = [...jobs];
        updatedJobs[jobIndex].status = newStatus;
        setJobs(updatedJobs);

        // Map frontend status values to backend expected values
        const backendStatus = convertFrontendStatusToBackend(newStatus);

        // Get the job ID from the job object (using the 'id' field)
        const jobId = updatedJobs[jobIndex].id;
       
        if (!jobId) {
            console.error("Job ID not found");
            return;
        }

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

    // Calculate status counts based on filtered jobs
    const statusCounts = {
        total: filteredJobs.length,
        pending: filteredJobs.filter(job => job.status === 'pending').length,
        in_progress: filteredJobs.filter(job => job.status === 'in_progress').length,
        completed: filteredJobs.filter(job => job.status === 'completed').length,
        already_applied: filteredJobs.filter(job => job.status === 'already_applied').length,
        not_relevant: filteredJobs.filter(job => job.status === 'not_relevant').length,
        job_not_found: filteredJobs.filter(job => job.status === 'job_not_found').length,
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow mt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
                <h2 className="text-lg font-semibold">Job Applications</h2>
                
                {/* Date Filter and Sort Controls */}
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
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
                </div>
            </div>

            {/* Task Summary Section */}
            <div className="mb-6">
                <h3 className="text-base font-semibold mb-3">Task Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
                    {/* Total Tasks */}
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-xl sm:text-2xl font-bold text-gray-900">{statusCounts.total}</div>
                        <div className="text-xs text-gray-600 mt-1">Total Tasks</div>
                    </div>

                    {/* Pending */}
                    <div className="bg-yellow-50 rounded-lg p-3 text-center">
                        <div className="text-xl sm:text-2xl font-bold text-yellow-700">{statusCounts.pending}</div>
                        <div className="text-xs text-yellow-700 mt-1">Pending</div>
                    </div>

                    {/* In Progress */}
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <div className="text-xl sm:text-2xl font-bold text-blue-700">{statusCounts.in_progress}</div>
                        <div className="text-xs text-blue-700 mt-1">In Progress</div>
                    </div>

                    {/* Completed */}
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                        <div className="text-xl sm:text-2xl font-bold text-green-700">{statusCounts.completed}</div>
                        <div className="text-xs text-green-700 mt-1">Completed</div>
                    </div>

                    {/* Already Applied */}
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <div className="text-xl sm:text-2xl font-bold text-purple-700">{statusCounts.already_applied}</div>
                        <div className="text-xs text-purple-700 mt-1">Already Applied</div>
                    </div>

                    {/* Not Relevant */}
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                        <div className="text-xl sm:text-2xl font-bold text-red-700">{statusCounts.not_relevant}</div>
                        <div className="text-xs text-red-700 mt-1">Not Relevant</div>
                    </div>

                    {/* Job Not Found */}
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                        <div className="text-xl sm:text-2xl font-bold text-orange-700">{statusCounts.job_not_found}</div>
                        <div className="text-xs text-orange-700 mt-1">Job Not Found</div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {filteredJobs.map((job, index) => {
                    const { formattedDate, daysAgo } = formatDateInfo(job.date_posted);
                    const overdue = isOverdue(job.date_posted);
                    // Use 'pending' as default status only when status is null or undefined
                    const displayStatus = job.status || 'pending';

                    return (
                        <div
                            key={`${job.url}-${index}`}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                        >
                            {/* Header Section */}
                            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 text-base break-words">
                                                {job.title || "Untitled Job"} ({job.url ? job.url.split('/').pop() : 'N/A'})
                                            </h3>
                                            <p className="text-sm text-blue-600 font-medium">{job.role_name || "N/A"}</p>
                                        </div>
                                        <div className="sm:ml-4">
                                            <span
                                                className={`inline-block px-3 py-1 rounded-md text-xs font-semibold uppercase ${getStatusBadgeColor(
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
                                        <button className="text-blue-600 text-xs underline">Score Details</button>
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
                                        onChange={(e) => handleStatusChange(index, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                                        className={`w-full flex items-center justify-center gap-1 px-3 py-2 rounded-md text-sm transition ${
                                            job.url ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
        </div>
    );
};

export default JobLinksList;