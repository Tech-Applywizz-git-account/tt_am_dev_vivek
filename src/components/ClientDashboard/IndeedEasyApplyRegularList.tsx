import React, { useState, useEffect } from "react";
import { Calendar, Briefcase, MapPin, ExternalLink, ChevronDown, ChevronUp, Loader2, DollarSign, Building, Monitor, ArrowRight } from "lucide-react";
import JobScoringModal from "./JobScoringModal";
import JobScoringFloatingButton from "./JobScoringFloatingButton";

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
    industry_type: string | null;
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
    Indeed_jobs: Record<string, number>;
    summary: {
        total: number;
        by_status: Record<string, number>;
    };
}

interface DateJobsResponse {
    jobs: JobItem[];
    date: string;
    total: number;
}

interface IndeedEasyApplyRegularListProps {
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
            <div
                className="shrink-0 inline-flex items-center justify-end text-white text-2xl font-bold"
                style={{
                    height: '160px',
                    padding: '17px 13px 18px 22px',
                    borderRadius: '9px',
                    border: '1px solid #D3D3D3',
                    background: '#F1F1F1',
                    boxShadow: '0 2px 1.4px 0 rgba(0, 0, 0, 0.25)'
                }}
            >
                <span style={{ color: '#000' }}>{firstLetter}</span>
            </div>
        );
    }

    return (
        <div
            className="shrink-0 inline-flex items-center justify-end"
            style={{
                height: '121px',
                width: '121px',
                padding: '17px 13px 18px 22px',
                borderRadius: '9px',
                border: '1px solid #D3D3D3',
                background: '#F1F1F1',
                boxShadow: '0 2px 1.4px 0 rgba(0, 0, 0, 0.25)'
            }}
        >
            <img
                src={logoUrl}
                alt={company}
                className="object-contain"
                style={{ width: '120px', height: '80px' }}
                onError={() => setError(true)}
            />
        </div>
    );
};

const IndeedEasyApplyRegularList: React.FC<IndeedEasyApplyRegularListProps> = ({ applywizzId }) => {
    const [summary, setSummary] = useState<Record<string, number>>({});
    const [jobsData, setJobsData] = useState<Record<string, JobItem[]>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [expandedDate, setExpandedDate] = useState<string | null>(null);

    // Job Scoring Modal States
    const [showScoringModal, setShowScoringModal] = useState(false);
    const [showFloatingButton, setShowFloatingButton] = useState(false);
    const [isScoringTriggered, setIsScoringTriggered] = useState(false);

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

            const response = await fetch(`${apiUrl}/api/job-links?lead_id=${applywizzId}&source=INDEED&apply_type=EASY_APPLY`);

            if (!response.ok) {
                throw new Error(`Failed to fetch summary: ${response.status}`);
            }

            const data: any = await response.json();
            // When using apply_type=EASY_APPLY, the API returns easy_apply_jobs instead of jobs
            const summaryData = data.easy_apply_jobs || {};
            setSummary(summaryData);

            // Check if today's date exists in the summary
            const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
            const hasTodayJobs = summaryData.hasOwnProperty(today);

            // Show modal if summary is empty or today's date is missing
            if (Object.keys(summaryData).length === 0 || !hasTodayJobs) {
                setShowScoringModal(true);
            }
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
            const response = await fetch(`${apiUrl}/api/job-links?lead_id=${applywizzId}&date=${date}&source=INDEED&apply_type=EASY_APPLY`);

            if (!response.ok) {
                throw new Error(`Failed to fetch jobs: ${response.status}`);
            }

            const data: any = await response.json();

            // When using apply_type=EASY_APPLY, the API returns easy_apply_jobs instead of jobs
            setJobsData(prev => ({
                ...prev,
                [date]: data.easy_apply_jobs || []
            }));
        } catch (err) {
            console.error("Error fetching jobs for date:", err);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, [applywizzId]);

    // Job Scoring Handlers
    const handleCloseModal = () => {
        setShowScoringModal(false);
        setShowFloatingButton(true);
    };

    const handleStartScoring = async () => {
        if (!applywizzId || isScoringTriggered) return;

        try {
            const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL2;
            await fetch(`${apiUrl}/api/trigger-easyapply-scoring/?apw_id=${applywizzId}`);

            // Mark as triggered and close modal
            setIsScoringTriggered(true);
            setShowScoringModal(false);
            setShowFloatingButton(false);
        } catch (err) {
            // Silent fail as per requirements
            console.error("Error triggering job scoring:", err);
        }
    };

    const handleFloatingButtonClick = () => {
        setShowFloatingButton(false);
        setShowScoringModal(true);
    };

    // Check if today's jobs exist to determine button state
    const today = new Date().toISOString().split('T')[0];
    const hasTodayJobs = summary.hasOwnProperty(today);
    const isScoringButtonDisabled = hasTodayJobs || isScoringTriggered;

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
        const bgGradient = 'linear-gradient(to right, #171717, #353333, #6f6767ff)';
        if (percentage >= 80) return { label: 'Strong Match', bgColor: '', bgGradient, textColor: '#00FE24' };
        if (percentage >= 60) return { label: 'Great Match', bgColor: '', bgGradient, textColor: '#42FF5C' };
        return { label: 'Good Match', bgColor: '', bgGradient, textColor: '#70FF84' };
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
            <div key={job.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100" style={{ border: "1px solid #000000", backgroundColor: "#FFFFFF" }}>
                <div className="flex items-center gap-36 p-6">
                    {/* Left: Company Avatar & Job Info */}
                    <div className="flex-1 flex gap-4 ">
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

                            <h3
                                className="text-xl font-bold text-gray-900 mb-1 line-clamp-1"
                                style={{ color: "#282828", fontFamily: "Darker Grotesque", fontSize: "24px" }}>
                                {job.title || "Untitled Role"}
                            </h3>

                            <p
                                className="text-base text-gray-600 mb-3"
                                style={{ color: "#7B7B7B", fontFamily: "Noto Sans", fontSize: "16px" }}
                            >
                                {job.company || "Unknown Company"}
                            </p>

                            <hr className="my-3 border-gray-500" style={{ maxWidth: "80%" }} />

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

                    {/* Middle: Apply Now Button */}
                    <div className="flex-shrink-0 flex items-center">
                        <a
                            href={job.url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-2.5 font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                            style={{ color: "#FFFFFF", backgroundColor: "#2C76FF" }}
                        >
                            <span>APPLY NOW</span>
                            <ArrowRight className="h-5 w-5 text-white" />
                        </a>
                    </div>

                    {/* Right: Match Score Card */}
                    <div
                        className="flex-shrink-0 rounded-2xl p-6 w-38 flex flex-col items-center justify-center shadow-lg"
                        style={{ background: matchData.bgGradient }}
                    >
                        <div className="relative w-20 h-20 mb-3">
                            <svg className="w-20 h-20 transform -rotate-90">
                                <circle cx="40" cy="40" r="32" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
                                <circle
                                    cx="40" cy="40" r="32" strokeWidth="6" fill="none"
                                    strokeDasharray={`${(percentage / 100) * 201} 201`} strokeLinecap="round"
                                    stroke={matchData.textColor}
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

                {/* Bottom: Status Dropdown Only */}
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
                    <span className="text-gray-700 font-medium">Loading Indeed jobs...</span>
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

    return (
        <div>
            <div className="flex items-center justify-between mb-4">

                {/* Floating Button - Inline with heading */}
                {showFloatingButton && (
                    <JobScoringFloatingButton onClick={handleFloatingButtonClick} />
                )}
            </div>
            {dates.length === 0 ? (
                <div className="bg-white p-4 rounded-lg shadow mt-6">
                    <p className="text-gray-500">No Indeed easy apply jobs found.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {dates.map((date, index) => {
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
                                    className="flex justify-between items-center p-4 rounded-lg cursor-pointer transition"
                                    style={{ backgroundColor: '#E3FFE7' }}
                                >
                                    <div className="flex items-center gap-32">
                                        <span className="font-semibold text-lg" style={{ color: '#22201C' }}>{index + 1}.</span>
                                        <span className="font-medium" style={{ color: '#615642' }}>{formattedDate}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-blue-700 font-semibold">
                                        <img
                                            src="/chevron-icon.svg"
                                            alt="chevron"
                                            className={`w-[18px] h-[18px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                        />
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="mt-3">
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
            )}
            {/* Job Scoring Modal */}
            <JobScoringModal
                isOpen={showScoringModal}
                onClose={handleCloseModal}
                onStartScoring={handleStartScoring}
                isButtonDisabled={isScoringButtonDisabled}
            />

        </div>
    );
};

export default IndeedEasyApplyRegularList;
