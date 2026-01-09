import React, { useState, useEffect } from "react";
import { CheckCircle, MapPin, ExternalLink, Loader2, ChevronLeft, ChevronRight, Linkedin, Briefcase, Building2, DollarSign, RefreshCw, ChevronDown } from "lucide-react";

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
    const [selectedFilter, setSelectedFilter] = useState<string>('all');
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const pageSize = 50;

    const filterOptions = [
        { value: 'all', label: 'All Applied Jobs', icon: CheckCircle },
        { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
        { value: 'indeed', label: 'Indeed', icon: Briefcase },
        { value: 'staffing', label: 'Staffing Agencies', icon: Building2 },
        { value: 'c2c', label: 'C2C', icon: DollarSign },
        { value: 'w2', label: 'W2', icon: Briefcase },
        { value: 'c2c-w2', label: 'C2C,W2', icon: RefreshCw },
    ];

    const loadingMessages = [
        "Fetching applied jobs...",
        "Curating your application history...",
        "Almost finished, thank you for waiting!",
        "Preparing your job list...",
    ];

    const currentMessages = loadingMessages;

    // Fetch applied jobs
    const fetchAppliedJobs = async (page: number = 1) => {
        if (!applywizzId) {
            setError("Applywizz ID not available");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL1;
            if (!apiUrl) {
                throw new Error('VITE_EXTERNAL_API_URL is not defined');
            }

            let url = `${apiUrl}/api/job-links?lead_id=${applywizzId}&page=${page}&page_size=${pageSize}&status=Completed`;

            // Add filter based on selection
            if (selectedFilter === 'linkedin') {
                url += `&source=LINKEDIN`;
            } else if (selectedFilter === 'indeed') {
                url += `&source=INDEED`;
            } else if (selectedFilter === 'staffing') {
                url += `&industry_type=true`;
            } else if (selectedFilter === 'c2c') {
                url += `&job_type=C2C`;
            } else if (selectedFilter === 'w2') {
                url += `&job_type=W2`;
            } else if (selectedFilter === 'c2c-w2') {
                url += `&job_type=C2C,W2`;
            }

            const response = await fetch(url);

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
        setCurrentPage(1);
        fetchAppliedJobs(1);
    }, [applywizzId, selectedFilter]);

    // Cycle loading messages
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (loading) {
            setLoadingMessageIndex(0);
            interval = setInterval(() => {
                setLoadingMessageIndex((prev) => (prev + 1) % currentMessages.length);
            }, 1500);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [loading, currentMessages.length]);

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

    // Skeleton Loading Card
    const SkeletonJobCard = () => (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 animate-pulse">
            <div className="flex items-start gap-6 p-6">
                {/* Left: Company Avatar & Job Info */}
                <div className="flex-1 flex gap-4">
                    {/* Avatar Skeleton */}
                    <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-xl bg-gray-200"></div>
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* Tags Skeleton */}
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-4 w-20 bg-gray-200 rounded"></div>
                            <div className="h-4 w-16 bg-gray-200 rounded-full"></div>
                        </div>

                        {/* Title Skeleton */}
                        <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>

                        {/* Company Skeleton */}
                        <div className="h-5 w-1/2 bg-gray-200 rounded mb-3"></div>

                        {/* Location Skeleton */}
                        <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
                    </div>
                </div>

                {/* Right: Match Score Skeleton */}
                <div className="flex-shrink-0 bg-gray-200 rounded-2xl p-6 w-32 h-40"></div>
            </div>

            {/* Bottom: Actions Skeleton */}
            <div className="px-6 pb-6 flex items-center gap-3">
                <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
                <div className="flex-1"></div>
                <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="bg-white p-4 rounded-lg shadow mt-6">
                {/* Header with filter info and dropdown */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    {/* Left: Loading text */}
                    <div className="flex items-center gap-2">
                        <Loader2 className="text-blue-600 animate-spin" size={20} />
                        <p className="text-gray-700 font-medium">
                            Loading applied jobs...
                        </p>
                    </div>

                    {/* Right: Filter Dropdown (still functional during loading) */}
                    <div className="relative">
                        <select
                            value={selectedFilter}
                            onChange={(e) => setSelectedFilter(e.target.value)}
                            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-sm min-w-[200px]"
                        >
                            {filterOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                    </div>
                </div>

                {/* Skeleton Loading Cards */}
                <div className="space-y-4">
                    <SkeletonJobCard />
                    <SkeletonJobCard />
                    <SkeletonJobCard />
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


    return (
        <div className="bg-white p-4 rounded-lg shadow mt-6">
            {/* Header with filter info and dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                {/* Left: Filter description */}
                <div className="flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={20} />
                    <p className="text-gray-700 font-medium">
                        {totalJobs === 0 ? (
                            <>No applied jobs found</>
                        ) : (
                            <>
                                You have applied to <span className="font-bold text-blue-600">{totalJobs}</span> {totalJobs === 1 ? 'job' : 'jobs'}
                                {selectedFilter !== 'all' && (
                                    <> in <span className="font-bold text-blue-600">
                                        {filterOptions.find(opt => opt.value === selectedFilter)?.label}
                                    </span></>
                                )}
                            </>
                        )}
                    </p>
                </div>

                {/* Right: Filter Dropdown */}
                <div className="relative">
                    <select
                        value={selectedFilter}
                        onChange={(e) => setSelectedFilter(e.target.value)}
                        className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-sm min-w-[200px]"
                    >
                        {filterOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                </div>
            </div>

            {jobs.length === 0 ? (
                <div className="text-center py-12">
                    <CheckCircle className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-500 text-lg font-medium">No applied jobs found</p>
                    <p className="text-gray-400 text-sm mt-2">
                        Try selecting a different filter or apply to some jobs first.
                    </p>
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        {jobs.map((job) => renderJobCard(job))}
                    </div>

                    {totalPages > 1 && renderPagination()}
                </>
            )}
        </div>
    );
};

export default ScoredJobsAppliedList;
