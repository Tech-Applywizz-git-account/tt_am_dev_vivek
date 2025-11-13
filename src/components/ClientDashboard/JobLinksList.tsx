import React, { useEffect, useState } from "react";
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

const getStatusBadgeColor = (status: string | undefined | null) => {
    if (!status) return "bg-gray-100 text-gray-800";

    switch (status.toLowerCase()) {
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

    useEffect(() => {
        fetchJobLinks();
    }, [currentUserEmail]);

    const fetchJobLinks = async () => {
        if (!currentUserEmail) {
            setError("User email not available");
            return;
        }

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
            console.log("Fetch response:", response);

            if (!response.ok) {
                throw new Error(`Failed to fetch data from external API: ${response.status} ${response.statusText}`);
            }

            const apiData: JobLinksResponse = await response.json();

            setJobs(apiData.jobs || []);
        } catch (err) {
            console.error("Error fetching job links:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (jobIndex: number, newStatus: string) => {
        // Update the local state immediately for better UX
        const updatedJobs = [...jobs];
        updatedJobs[jobIndex].status = newStatus;
        setJobs(updatedJobs);

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
                    "status": newStatus
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

    const isOverdue = (datePosted: string | undefined | null) => {
        if (!datePosted) return false;
        try {
            const postedDate = new Date(datePosted);
            const today = new Date();
            const diffTime = today.getTime() - postedDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 7; // Consider overdue if posted more than 7 days ago
        } catch {
            return false;
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

    // Calculate status counts
    const statusCounts = {
        total: jobs.length,
        pending: jobs.filter(job => job.status === 'pending').length,
        in_progress: jobs.filter(job => job.status === 'in_progress').length,
        completed: jobs.filter(job => job.status === 'completed').length,
        already_applied: jobs.filter(job => job.status === 'already_applied').length,
        not_relevant: jobs.filter(job => job.status === 'not_relevant').length,
        job_not_found: jobs.filter(job => job.status === 'job_not_found').length,
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow mt-6">
            <h2 className="text-lg font-semibold mb-4">Job Applications</h2>

            {/* Task Summary Section */}
            <div className="mb-6">
                <h3 className="text-base font-semibold mb-3">Task Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {/* Total Tasks */}
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900">{statusCounts.total}</div>
                        <div className="text-xs text-gray-600 mt-1">Total Tasks</div>
                    </div>

                    {/* Pending */}
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-700">{statusCounts.pending}</div>
                        <div className="text-xs text-yellow-700 mt-1">Pending</div>
                    </div>

                    {/* In Progress */}
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-700">{statusCounts.in_progress}</div>
                        <div className="text-xs text-blue-700 mt-1">In Progress</div>
                    </div>

                    {/* Completed */}
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-700">{statusCounts.completed}</div>
                        <div className="text-xs text-green-700 mt-1">Completed</div>
                    </div>

                    {/* Already Applied */}
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-700">{statusCounts.already_applied}</div>
                        <div className="text-xs text-purple-700 mt-1">Already Applied</div>
                    </div>

                    {/* Not Relevant */}
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-red-700">{statusCounts.not_relevant}</div>
                        <div className="text-xs text-red-700 mt-1">Not Relevant</div>
                    </div>

                    {/* Job Not Found */}
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-orange-700">{statusCounts.job_not_found}</div>
                        <div className="text-xs text-orange-700 mt-1">Job Not Found</div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {jobs.map((job, index) => {
                    let formattedDate = "N/A";
                    let overdue = false;

                    if (job.date_posted) {
                        try {
                            const datePosted = new Date(job.date_posted);
                            formattedDate = datePosted.toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                            });
                            overdue = isOverdue(job.date_posted);
                        } catch {
                            formattedDate = "Invalid Date";
                        }
                    }

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
                                            <h3 className="font-semibold text-gray-900 text-base">
                                                {job.title || "Untitled Job"} ({job.url ? job.url.split('/').pop() : 'N/A'})
                                            </h3>
                                            <p className="text-sm text-blue-600 font-medium">{job.role_name || "N/A"}</p>
                                        </div>
                                        <div className="sm:ml-4">
                                            <span
                                                className={`inline-block px-3 py-1 rounded-md text-xs font-semibold uppercase ${getStatusBadgeColor(
                                                    job.status
                                                )}`}
                                            >
                                                {job.status ? job.status.replace(/_/g, " ") : "N/A"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Match Score */}
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-700">Match Score: {job.score ?? 0}</span>
                                        <button className="text-blue-600 text-xs underline">Score Details</button>
                                    </div>

                                    {/* Location & Date Info */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-1">
                                            <MapPin size={14} />
                                            <span>{job.location || "Location not specified"}</span>
                                        </div>
                                        {overdue && (
                                            <div className="flex items-center gap-1 text-red-600">
                                                <Calendar size={14} />
                                                <span className="font-medium">Overdue {formattedDate}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Status Dropdown & Action Button */}
                                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:min-w-[180px]">
                                    <select
                                        value={job.status || "pending"}
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
                                        View Job
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
