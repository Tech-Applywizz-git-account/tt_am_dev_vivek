import React, { useState, useEffect } from "react";
import { Calendar, Briefcase, MapPin, ExternalLink, ChevronDown, ChevronUp, Loader2, DollarSign, Building, Monitor } from "lucide-react";

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
    company_logo_url?: string | null;
    posted_by_profile?: string | null;
    contract_type?: string | null;
    company_url?: string | null;
    experience_level?: string | null;
    salary?: string | null;
    work_type?: string | null;
    poster_full_name?: string | null;
}

interface SummaryResponse {
    regular_jobs: Record<string, number>;
    summary: {
        total: number;
        by_status: Record<string, number>;
        by_apply_type: Record<string, number>;
    };
}

interface DateJobsResponse {
    jobs: JobItem[];
    date: string;
    total: number;
}

interface ScoredJobsRegularListProps {
    applywizzId?: string;
}

const statusOptions = [
    { value: "Pending", label: "Pending" },
    { value: "In Progress", label: "In Progress" },
    { value: "Completed", label: "Completed" },
    { value: "Already Applied", label: "Already Applied" },
    { value: "Not Relevant", label: "Not Relevant" },
    { value: "Job Not Found", label: "Job Not Found" },
];

const CompanyLogo = ({ company, logoUrl, fallbackColor = 'bg-blue-600' }: { company: string, logoUrl: string | null, fallbackColor?: string }) => {
    const [error, setError] = React.useState(false);
    const firstLetter = company ? company.trim().charAt(0).toUpperCase() : 'C';

    if (error || !logoUrl) {
        return (
            <div className={`w-16 h-16 rounded-xl shadow-md flex items-center justify-center text-white text-2xl font-bold ${fallbackColor} shrink-0`}>
                {firstLetter}
            </div>
        );
    }

    return (
        <div className="shrink-0">
            <img
                src={logoUrl}
                alt={company}
                className="w-16 h-16 rounded-xl shadow-md object-contain bg-white p-1"
                onError={() => setError(true)}
            />
        </div>
    );
};

const ScoredJobsRegularList: React.FC<ScoredJobsRegularListProps> = ({ applywizzId }) => {
    const [summary, setSummary] = useState<Record<string, number>>({});
    const [jobsData, setJobsData] = useState<Record<string, JobItem[]>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [expandedDate, setExpandedDate] = useState<string | null>(null);

    // Fetch summary
    const fetchSummary = async () => {
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

            const response = await fetch(`${apiUrl}/api/job-links?lead_id=${applywizzId}&apply_type=REGULAR`);

            if (!response.ok) {
                throw new Error(`Failed to fetch summary: ${response.status}`);
            }

            const data: SummaryResponse = await response.json();
            setSummary(data.regular_jobs || {});
        } catch (err) {
            console.error("Error fetching summary:", err);
            setError(err instanceof Error ? err.message : "Failed to load summary");
        } finally {
            setLoading(false);
        }
    };

    // Fetch jobs for a specific date
    const fetchJobsForDate = async (date: string) => {
        if (!applywizzId) return;

        try {
            const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL1;
            const response = await fetch(`${apiUrl}/api/job-links?lead_id=${applywizzId}&date=${date}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch jobs: ${response.status}`);
            }

            const data: DateJobsResponse = await response.json();

            // Filter to show only regular jobs (not easy apply)
            const regularJobs = data.jobs.filter(job =>
                !job.apply_type ||
                (job.apply_type !== "EASY_APPLY" && job.apply_type !== "easy_apply")
            );

            setJobsData(prev => ({
                ...prev,
                [date]: regularJobs
            }));
        } catch (err) {
            console.error("Error fetching jobs for date:", err);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, [applywizzId]);

    // Toggle date expansion and fetch jobs if needed
    const toggleDateExpansion = (date: string) => {
        const isCurrentlyExpanded = expandedDate === date;
        setExpandedDate(isCurrentlyExpanded ? null : date);

        // Fetch jobs if not already fetched and expanding
        if (!isCurrentlyExpanded && !jobsData[date]) {
            fetchJobsForDate(date);
        }
    };

    // Handle status change
    const handleStatusChange = async (jobId: string, newStatus: string, date: string) => {
        // Optimistic update
        setJobsData(prev => {
            const updatedJobs = { ...prev };
            if (updatedJobs[date]) {
                updatedJobs[date] = updatedJobs[date].map(job =>
                    job.id === jobId ? { ...job, status: newStatus } : job
                );
            }
            return updatedJobs;
        });

        try {
            const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL;
            const response = await fetch(`${apiUrl}/api/job-links/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    "job-id": jobId,
                    "status": newStatus
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to update status: ${response.status}`);
            }

            console.log("Status updated successfully");
        } catch (err) {
            console.error("Error updating status:", err);

            // Revert on error
            setJobsData(prev => {
                const revertedJobs = { ...prev };
                if (revertedJobs[date]) {
                    // Refetch to get correct state
                    fetchJobsForDate(date);
                }
                return revertedJobs;
            });
        }
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
        if (percentage >= 90) return { label: 'STRONG MATCH', bgColor: 'bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-900', textColor: 'text-emerald-300' };
        if (percentage >= 70) return { label: 'GOOD MATCH', bgColor: 'bg-gradient-to-b from-amber-600 via-amber-700 to-amber-900', textColor: 'text-amber-300' };
        return { label: 'FAIR MATCH', bgColor: 'bg-gradient-to-b from-orange-600 via-orange-700 to-orange-900', textColor: 'text-orange-300' };
    };

    const getCompanyDomain = (companyName: string, companyUrl?: string | null): string | null => {
        if (companyUrl) {
            try {
                const url = new URL(companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`);
                const hostname = url.hostname.replace('www.', '');
                // Skip social media/job board domains
                const socialDomains = ['linkedin.com', 'indeed.com', 'glassdoor.com', 'facebook.com', 'twitter.com', 'x.com', 'instagram.com'];
                if (!socialDomains.some(d => hostname.includes(d))) {
                    return hostname;
                }
            } catch (e) {
                // fall through to name-based logic
            }
        }
        if (!companyName) return null;
        const companyDomains: Record<string, string> = {
            'apple': 'apple.com', 'google': 'google.com', 'microsoft': 'microsoft.com',
            'amazon': 'amazon.com', 'meta': 'meta.com', 'netflix': 'netflix.com',
            'linkedin': 'linkedin.com', 'indeed': 'indeed.com', 'verizone': 'verizon.com',
            'att': 'att.com', 't-mobile': 't-mobile.com', 'walmart': 'walmart.com'
        };
        const normalized = companyName.toLowerCase().trim();
        if (companyDomains[normalized]) return companyDomains[normalized];
        for (const [key, domain] of Object.entries(companyDomains)) {
            if (normalized.includes(key)) return domain;
        }
        const cleanName = normalized
            .replace(/\s+(inc|llc|ltd|corp|company|co|federal credit union|credit union|systems)\b/gi, '')
            .replace(/[^a-z0-9]/g, '')
            .trim();
        return cleanName ? `${cleanName}.com` : null;
    };

    // Render job card
    const renderJobCard = (job: JobItem, date: string) => {
        const matchData = getMatchQuality(job.score || 0);
        const percentage = Math.round(job.score || 0);
        const timeAgo = getTimeAgo(job.generated_at);
        const companyDomain = getCompanyDomain(job.company, job.company_url);
        const faviconUrl = job.company_logo_url || (companyDomain ? `https://www.google.com/s2/favicons?domain=${companyDomain}&sz=128&default_icon=404` : null);

        return (
            <div key={job.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100">
                <div className="flex items-start gap-6 p-6">
                    {/* Left: Company Avatar & Job Info */}
                    <div className="flex-1 flex gap-4">
                        <CompanyLogo company={job.company} logoUrl={faviconUrl} fallbackColor="bg-blue-600" />

                        <div className="flex-1 min-w-0">
                            {/* <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm text-gray-500">{timeAgo}</span>
                                {job.source && (
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                                        {job.source}
                                    </span>
                                )}
                            </div> */}

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

                            {/* New fields section */}
                            <div className="flex flex-wrap items-center gap-4 text-sm mt-3">
                                {/* {job.company_url && (
                                    <a
                                        href={job.company_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                        <Building size={16} />
                                        <span>{new URL(job.company_url).hostname.replace('www.', '')}</span>
                                    </a>
                                )} */}
                                {job.experience_level && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full flex items-center gap-1">
                                        <Briefcase size={12} />
                                        {job.experience_level}
                                    </span>
                                )}
                                {job.salary && (
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                        <DollarSign size={16} className="text-gray-400" />
                                        <span>Salary: {job.salary}</span>
                                    </div>
                                )}
                                {job.work_type && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full flex items-center gap-1">
                                        <Monitor size={12} />
                                        {job.work_type}
                                    </span>
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

                {/* Bottom: Actions */}
                <div className="px-6 pb-6 flex items-center gap-3">
                    <select
                        value={job.status || 'Pending'}
                        onChange={(e) => handleStatusChange(job.id, e.target.value, date)}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:bg-gray-50 transition-colors"
                    >
                        {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <div className="flex-1"></div>

                    <a
                        href={job.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        <ExternalLink size={16} />
                        <span>APPLY NOW</span>
                    </a>
                </div>
            </div>
        );
    };

    // Skeleton Loading Card
    const SkeletonJobCard = () => (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 animate-pulse">
            <div className="flex items-start gap-6 p-6">
                <div className="flex-1 flex gap-4">
                    <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-xl bg-gray-200"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-4 w-20 bg-gray-200 rounded"></div>
                            <div className="h-4 w-16 bg-gray-200 rounded-full"></div>
                        </div>
                        <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-5 w-1/2 bg-gray-200 rounded mb-3"></div>
                        <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
                    </div>
                </div>
                <div className="flex-shrink-0 bg-gray-200 rounded-2xl p-6 w-32 h-40"></div>
            </div>
            <div className="px-6 pb-6 flex items-center gap-3">
                <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
                <div className="flex-1"></div>
                <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
            </div>
        </div>
    );

    if (loading && Object.keys(summary).length === 0) {
        return (
            <div className="bg-white p-4 rounded-lg shadow mt-6">
                <div className="flex items-center gap-2 mb-6">
                    <Loader2 className="animate-spin text-blue-600" size={20} />
                    <span className="text-gray-700 font-medium">Loading jobs...</span>
                </div>
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

    const dates = Object.keys(summary).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (dates.length === 0) {
        return (
            <div className="bg-white p-4 rounded-lg shadow mt-6">
                <p className="text-gray-500">No jobs found.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow mt-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="text-blue-600" size={24} />
                Career Portal Jobs Summary
            </h2>

            <div className="space-y-2">
                {dates.map((date) => {
                    const count = summary[date] || 0;
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
                                className={`flex justify-between items-center p-4 rounded-lg cursor-pointer transition ${isExpanded ? "bg-blue-100" : "bg-blue-50 hover:bg-blue-100"
                                    }`}
                            >
                                <div className="flex items-center gap-2 text-blue-900">
                                    <Calendar size={18} />
                                    <span className="font-medium">{formattedDate}</span>
                                </div>
                                <div className="flex items-center gap-3 text-blue-700 font-semibold">
                                    <div className="flex items-center gap-2">
                                        <Briefcase size={18} />
                                        <span>{count} Jobs</span>
                                    </div>
                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="mt-3 bg-gray-50 p-4 rounded-lg">
                                    {jobs.length > 0 ? (
                                        <div className="space-y-4">
                                            {jobs
                                                .sort((a, b) => (b.score || 0) - (a.score || 0))
                                                .map((job) => renderJobCard(job, date))}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <SkeletonJobCard />
                                            <SkeletonJobCard />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ScoredJobsRegularList;
