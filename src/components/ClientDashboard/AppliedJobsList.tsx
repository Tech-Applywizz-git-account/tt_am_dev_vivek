import React, { useState, useEffect } from "react";
import { Calendar, CheckCircle, MapPin, ExternalLink, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

// ✅ Types
interface JobItem {
    id: string;
    source: string | null;
    jobTitle: string | null;
    company: string | null;
    status: string;
    description: string;
    location: string | null;
    salary: string | null;
    createdAt: string;
    dueDate: string;
    score: number;
    jobUrl: string | null;
}

interface AppliedJobsResponse {
    applied_jobs: Record<string, JobItem[]>;
}

interface AppliedJobsListProps {
    applywizzId?: string;
}

const AppliedJobsList: React.FC<AppliedJobsListProps> = ({ applywizzId }) => {
    const [jobsData, setJobsData] = useState<Record<string, JobItem[]>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [expandedDate, setExpandedDate] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 50;

    // Helper: Get time ago from date
    const getTimeAgo = (dateString: string): string => {
        const now = new Date();
        const posted = new Date(dateString);
        const diffMs = now.getTime() - posted.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return posted.toLocaleDateString();
    };

    // Helper: Get match quality based on score
    const getMatchQuality = (score: number) => {
        const percentage = Math.round(score);
        if (percentage >= 90) return { label: 'STRONG MATCH', color: 'green', bgColor: 'bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-900', textColor: 'text-emerald-300' };
        if (percentage >= 70) return { label: 'GOOD MATCH', color: 'blue', bgColor: 'bg-gradient-to-b from-amber-600 via-amber-700 to-amber-900', textColor: 'text-amber-300' };
        return { label: 'FAIR MATCH', color: 'yellow', bgColor: 'bg-gradient-to-b from-orange-600 via-orange-700 to-orange-900', textColor: 'text-orange-300' };
    };

    // Helper: Get company initials
    const getCompanyInitials = (companyName: string): string => {
        if (!companyName) return 'CO';
        const words = companyName.trim().split(' ');
        if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    };

    // Helper: Get company domain
    const getCompanyDomain = (companyName: string): string | null => {
        if (!companyName) return null;
        const companyDomains: Record<string, string> = {
            'apple': 'apple.com', 'google': 'google.com', 'microsoft': 'microsoft.com',
            'amazon': 'amazon.com', 'meta': 'meta.com', 'facebook': 'meta.com',
            'netflix': 'netflix.com', 'tesla': 'tesla.com', 'linkedin': 'linkedin.com',
        };
        const normalized = companyName.toLowerCase().trim();
        if (companyDomains[normalized]) return companyDomains[normalized];
        for (const [key, domain] of Object.entries(companyDomains)) {
            if (normalized.includes(key) || key.includes(normalized)) return domain;
        }
        const cleanName = normalized.replace(/\s+(inc|llc|ltd|corporation|corp|company|co|group|limited)\b/gi, '').replace(/[^a-z0-9]/g, '').trim();
        return cleanName ? `${cleanName}.com` : null;
    };

    // Fetch applied jobs
    const fetchAppliedJobs = async () => {
        if (!applywizzId) {
            setError("Applywizz ID not available");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL;
            if (!apiUrl) {
                throw new Error('VITE_EXTERNAL_API_URL is not defined in environment variables');
            }

            const response = await fetch(
                `${apiUrl}/api/client-tasks?lead_id=${applywizzId}&task_status=COMPLETED&page=${currentPage}&page_size=${pageSize}`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch applied jobs: ${response.status} ${response.statusText}`);
            }

            const data: AppliedJobsResponse = await response.json();
            setJobsData(data.applied_jobs || {});
        } catch (err) {
            console.error("Error fetching applied jobs:", err);
            setError(err instanceof Error ? err.message : "Failed to load applied jobs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppliedJobs();
    }, [applywizzId, currentPage]);

    const toggleDateExpansion = (date: string) => {
        setExpandedDate(expandedDate === date ? null : date);
    };

    // Render job card
    const renderJobCard = (job: JobItem) => {
        const matchData = getMatchQuality(job.score || 0);
        const percentage = Math.round(job.score || 0);
        const timeAgo = getTimeAgo(job.createdAt);
        const companyDomain = getCompanyDomain(job.company || '');
        const faviconUrl = companyDomain ? `https://www.google.com/s2/favicons?domain=${companyDomain}&sz=128` : null;
        const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company || 'Company')}&background=4F46E5&color=fff&size=80&bold=true&rounded=true`;
        const avatarUrl = faviconUrl || fallbackAvatarUrl;

        return (
            <div key={job.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100">
                <div className="flex items-start gap-6 p-6">
                    {/* Left: Company Avatar & Job Info */}
                    <div className="flex-1 flex gap-4">
                        <div className="flex-shrink-0">
                            <img
                                src={avatarUrl}
                                alt={job.company || 'Company'}
                                className="w-16 h-16 rounded-xl shadow-md object-contain bg-white p-1"
                                onError={(e) => {
                                    if (e.currentTarget.src !== fallbackAvatarUrl) {
                                        e.currentTarget.src = fallbackAvatarUrl;
                                    }
                                }}
                            />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm text-gray-500">{timeAgo}</span>
                                {job.source && (
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                                        {job.source}
                                    </span>
                                )}
                                <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                                    <CheckCircle size={12} />
                                    Applied
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1">
                                {job.jobTitle || "Untitled Role"}
                            </h3>

                            <p className="text-base text-gray-600 mb-3">
                                {job.company || "Unknown Company"}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                {job.location && (
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={16} className="text-gray-400" />
                                        <span>{job.location}</span>
                                    </div>
                                )}
                                {job.salary && job.salary !== "Not Available" && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-gray-400">💰</span>
                                        <span>{job.salary}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Match Score Card */}
                    <div className={`flex-shrink-0 ${matchData.bgColor} rounded-2xl p-6 w-32 flex flex-col items-center justify-center shadow-lg`}>
                        <div className="relative w-20 h-20 mb-3">
                            <svg className="w-20 h-20 transform -rotate-90">
                                <circle cx="40" cy="40" r="32" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
                                <circle
                                    cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="none"
                                    strokeDasharray={`${(percentage / 100) * 201} 201`} strokeLinecap="round"
                                    className={matchData.textColor}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-bold text-white">{percentage}%</span>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-white tracking-wide text-center">
                            {matchData.label}
                        </span>
                    </div>
                </div>

                {/* Bottom: View Job Button */}
                <div className="px-6 pb-6 flex items-center gap-3">
                    <div className="flex-1"></div>
                    <a
                        href={job.jobUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        <ExternalLink size={16} />
                        <span>VIEW JOB</span>
                    </a>
                </div>
            </div>
        );
    };

    if (loading && Object.keys(jobsData).length === 0) {
        return (
            <div className="bg-white p-4 rounded-lg shadow mt-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin mr-2" size={24} />
                    <span>Loading applied jobs...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white p-4 rounded-lg shadow mt-6">
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    const dates = Object.keys(jobsData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (dates.length === 0) {
        return (
            <div className="bg-white p-4 rounded-lg shadow mt-6">
                <p className="text-gray-500">No applied jobs found.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow mt-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="text-green-600" size={24} />
                Applied Jobs Summary
            </h2>

            <div className="space-y-2">
                {dates.map((date) => {
                    const jobs = jobsData[date] || [];
                    const isExpanded = expandedDate === date;
                    const dateObj = new Date(date);
                    const formattedDate = dateObj.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    });

                    return (
                        <div key={date}>
                            <div
                                onClick={() => toggleDateExpansion(date)}
                                className={`flex justify-between items-center p-4 rounded-lg cursor-pointer transition ${isExpanded ? "bg-green-100" : "bg-green-50 hover:bg-green-100"
                                    }`}
                            >
                                <div className="flex items-center gap-2 text-green-900">
                                    <Calendar size={18} />
                                    <span className="font-medium">{formattedDate}</span>
                                </div>
                                <div className="flex items-center gap-3 text-green-700 font-semibold">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle size={18} />
                                        <span>{jobs.length} Applied</span>
                                    </div>
                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="mt-3 bg-gray-50 p-4 rounded-lg">
                                    <div className="space-y-4">
                                        {jobs.map((job) => renderJobCard(job))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AppliedJobsList;
