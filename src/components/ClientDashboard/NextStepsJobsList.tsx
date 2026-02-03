import React, { useState, useEffect } from "react";
import { Mail, Calendar, Building2, ExternalLink, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface EmailTrackedJob {
    id: number;
    user_email: string;
    job_name: string | null;
    company_name: string | null;
    job_link: string | null;
    req_id: string | null;
    additional_details: string | null;
    status: string | null;
    category: string | null;
    email_timestamp: string | null;
    email_subject: string | null;
    email_sender: string | null;
    email_body: string | null;
    date: string | null;
    created_at: string | null;
    updated_at: string | null;
}

interface NextStepsJobsListProps {
    userEmail?: string;
    onBack?: () => void;
}

const NextStepsJobsList: React.FC<NextStepsJobsListProps> = ({ userEmail, onBack }) => {
    const [jobs, setJobs] = useState<EmailTrackedJob[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchNextStepJobs();
    }, [userEmail]);

    const fetchNextStepJobs = async () => {
        if (!userEmail) {
            setError("User email not available");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const { data, error: fetchError } = await supabase
                .from("jobs")
                .select("*")
                .eq("user_email", userEmail)
                .eq("category", "next_steps")
                .order("date", { ascending: false })
                .limit(20);

            if (fetchError) {
                throw new Error(`Failed to fetch jobs: ${fetchError.message}`);
            }

            setJobs(data || []);
        } catch (err) {
            console.error("Error fetching Next Step jobs:", err);
            setError(err instanceof Error ? err.message : "Failed to load jobs");
        } finally {
            setLoading(false);
        }
    };

    const getTimeAgo = (dateString: string | null): string => {
        if (!dateString) return "Unknown date";

        const now = new Date();
        const posted = new Date(dateString);
        const diffMs = now.getTime() - posted.getTime();
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return posted.toLocaleDateString();
    };

    const renderJobCard = (job: EmailTrackedJob) => {
        const timeAgo = getTimeAgo(job.date || job.created_at);

        return (
            <div
                key={job.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-200"
            >
                <div className="p-5">
                    {/* Email Info Header */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <Mail size={14} className="text-gray-400 flex-shrink-0" />
                                <span className="text-xs text-gray-500 truncate">
                                    {job.email_sender || "Unknown sender"}
                                </span>
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 line-clamp-2 mb-1">
                                {job.email_subject || job.job_name || "No subject"}
                            </h3>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                            {timeAgo}
                        </span>
                    </div>

                    {/* Job Details */}
                    <div className="space-y-2 mb-4">
                        {job.job_name && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                <span className="font-medium">{job.job_name}</span>
                            </div>
                        )}
                        {job.company_name && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Building2 size={14} className="text-gray-400" />
                                <span>{job.company_name}</span>
                            </div>
                        )}
                        {job.date && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar size={14} className="text-gray-400" />
                                <span>{new Date(job.date).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                        {job.job_link && (
                            <a
                                href={job.job_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                <ExternalLink size={14} />
                                <span>View Job</span>
                            </a>
                        )}
                        <span className="ml-auto px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                            Next Step
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Header with Back Button */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 px-4 py-2 text-white hover:opacity-90 transition-all"
                            style={{
                                borderRadius: '13.589px',
                                background: '#77E954'
                            }}
                        >
                            <ArrowLeft size={20} />
                            <span>Back to Dashboard</span>
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900">Next Steps</h2>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin mr-2 text-blue-600" size={24} />
                        <span className="text-gray-600">Loading next steps...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                {/* Header with Back Button */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 px-4 py-2 text-white hover:opacity-90 transition-all"
                            style={{
                                borderRadius: '13.589px',
                                background: '#77E954'
                            }}
                        >
                            <ArrowLeft size={20} />
                            <span>Back to Dashboard</span>
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900">Next Steps</h2>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-red-500 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    if (jobs.length === 0) {
        return (
            <div className="space-y-6">
                {/* Header with Back Button */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 px-4 py-2 text-white hover:opacity-90 transition-all"
                            style={{
                                borderRadius: '13.589px',
                                background: '#77E954'
                            }}
                        >
                            <ArrowLeft size={20} />
                            <span>Back to Dashboard</span>
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900">Next Steps</h2>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-gray-500 text-sm text-center py-4">
                        No next steps available. All caught up! 🎉
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-4 py-2 text-white hover:opacity-90 transition-all"
                        style={{
                            borderRadius: '13.589px',
                            background: '#77E954'
                        }}
                    >
                        <ArrowLeft size={20} />
                        <span>Back to Dashboard</span>
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900">Next Steps</h2>
                </div>
                <span className="text-sm text-gray-600">
                    {jobs.length} {jobs.length === 1 ? 'item' : 'items'}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map((job) => renderJobCard(job))}
            </div>
        </div>
    );
};

export default NextStepsJobsList;
