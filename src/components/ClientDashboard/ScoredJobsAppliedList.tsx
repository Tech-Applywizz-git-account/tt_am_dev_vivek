import React, { useState, useEffect } from "react";
import { CheckCircle, MapPin, ExternalLink, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

// ✅ Types
interface JobItem {
    id: string;
    score: number;
    status: string | null;
    source: string;
    url: string;
    company: string;
    title: string;
    location: string;
    description: string;
    date_posted: string;
    generated_at: string;
    apply_type: string | null;
    role_name: number;
}

interface PaginatedResponse {
    jobs: JobItem[];
    pagination: {
        page: number;
        page_size: number;
        total: number;
        total_pages: number;
    };
    filters: any;
}

interface ScoredJobsAppliedListProps {
    applywizzId?: string;
}

const ScoredJobsAppliedList: React.FC<ScoredJobsAppliedListProps> = ({ applywizzId }) => {
    const [jobs, setJobs] = useState<JobItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalJobs, setTotalJobs] = useState(0);
    const pageSize = 50;

    // Fetch applied jobs
    const fetchAppliedJobs = async (page: number = 1) => {
        if (!applywizzId) {
            setError("Applywizz ID not available");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL;
            if (!apiUrl) {
                throw new Error('VITE_EXTERNAL_API_URL is not defined');
            }

            const response = await fetch(
                `${apiUrl}/api/job-links?lead_id=${applywizzId}&page=${page}&page_size=${pageSize}&status=Completed`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch applied jobs: ${response.status}`);
            }

            const data: PaginatedResponse = await response.json();
            setJobs(data.jobs || []);
            setCurrentPage(data.pagination?.page || 1);
            setTotalPages(data.pagination?.total_pages || 1);
            setTotalJobs(data.pagination?.total || 0);
        } catch (err) {
            console.error("Error fetching applied jobs:", err);
            setError(err instanceof Error ? err.message : "Failed to load applied jobs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppliedJobs(currentPage);
    }, [applywizzId]);

    // Pagination handlers
    const handlePreviousPage = () => {
        if (currentPage > 1) {
            const newPage = currentPage - 1;
            setCurrentPage(newPage);
            fetchAppliedJobs(newPage);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            const newPage = currentPage + 1;
            setCurrentPage(newPage);
            fetchAppliedJobs(newPage);
        }
    };

    const handlePageClick = (page: number) => {
        setCurrentPage(page);
        fetchAppliedJobs(page);
    };

    // Helper functions
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

    const getMatchQuality = (score: number) => {
        const percentage = Math.round(score);
        if (percentage >= 90) return { label: 'STRONG MATCH', bgColor: 'bg-gradient-to-br from-green-900 to-green-800', textColor: 'text-green-400' };
        if (percentage >= 70) return { label: 'GOOD MATCH', bgColor: 'bg-gradient-to-br from-blue-900 to-blue-800', textColor: 'text-blue-400' };
        return { label: 'FAIR MATCH', bgColor: 'bg-gradient-to-br from-yellow-900 to-yellow-800', textColor: 'text-yellow-400' };
    };

    const getCompanyDomain = (companyName: string): string | null => {
        if (!companyName) return null;
        const companyDomains: Record<string, string> = {
            'apple': 'apple.com', 'google': 'google.com', 'microsoft': 'microsoft.com',
            'amazon': 'amazon.com', 'meta': 'meta.com', 'netflix': 'netflix.com',
        };
        const normalized = companyName.toLowerCase().trim();
        if (companyDomains[normalized]) return companyDomains[normalized];
        for (const [key, domain] of Object.entries(companyDomains)) {
            if (normalized.includes(key)) return domain;
        }
        const cleanName = normalized.replace(/\s+(inc|llc|ltd|corp|company|co)\b/gi, '').replace(/[^a-z0-9]/g, '').trim();
        return cleanName ? `${cleanName}.com` : null;
    };

    // Render pagination
    const renderPagination = () => {
        const pages = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return (
            <div className="flex items-center justify-between mt-6 px-4">
                <div className="text-sm text-gray-600">
                    Showing {jobs.length} of {totalJobs} applied jobs
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                        <ChevronLeft size={16} />
                        Previous
                    </button>

                    {startPage > 1 && (
                        <>
                            <button
                                onClick={() => handlePageClick(1)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                            >
                                1
                            </button>
                            {startPage > 2 && <span className="text-gray-400">...</span>}
                        </>
                    )}

                    {pages.map(page => (
                        <button
                            key={page}
                            onClick={() => handlePageClick(page)}
                            className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${page === currentPage
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {page}
                        </button>
                    ))}

                    {endPage < totalPages && (
                        <>
                            {endPage < totalPages - 1 && <span className="text-gray-400">...</span>}
                            <button
                                onClick={() => handlePageClick(totalPages)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                            >
                                {totalPages}
                            </button>
                        </>
                    )}

                    <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        );
    };

    // Render job card
    const renderJobCard = (job: JobItem) => {
        const matchData = getMatchQuality(job.score || 0);
        const percentage = Math.round(job.score || 0);
        const timeAgo = getTimeAgo(job.generated_at);
        const companyDomain = getCompanyDomain(job.company);
        const faviconUrl = companyDomain ? `https://www.google.com/s2/favicons?domain=${companyDomain}&sz=128` : null;
        const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company || 'Company')}&background=4F46E5&color=fff&size=80&bold=true&rounded=true`;
        const avatarUrl = faviconUrl || fallbackAvatarUrl;

        return (
            <div key={job.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100">
                <div className="flex items-start gap-6 p-6">
                    <div className="flex-1 flex gap-4">
                        <div className="flex-shrink-0">
                            <img
                                src={avatarUrl}
                                alt={job.company}
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
                                {job.title || "Untitled Role"}
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
                            </div>
                        </div>
                    </div>

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

                <div className="px-6 pb-6 flex items-center gap-3">
                    <div className="flex-1"></div>
                    <a
                        href={job.url || "#"}
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

    if (loading && jobs.length === 0) {
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

    if (jobs.length === 0) {
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
                Applied Jobs ({totalJobs})
            </h2>

            <div className="space-y-4">
                {jobs.map((job) => renderJobCard(job))}
            </div>

            {totalPages > 1 && renderPagination()}
        </div>
    );
};

export default ScoredJobsAppliedList;
