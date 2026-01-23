import React, { useState } from "react";
import { Calendar, Zap, MapPin, ExternalLink, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

// ✅ Types
export interface TaskCount {
    date: string;
    regularCount: number;
    easyApplyCount: number;
}

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

interface JobsResponse {
    tasks: JobItem[];
    easyapply: JobItem[];
}

type JobsData = Record<string, JobsResponse>;

interface EasyApplySummaryListProps {
    data: TaskCount[];
    loading?: boolean;
    error?: string;
    applywizzId?: string;
}

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

const EasyApplySummaryList: React.FC<EasyApplySummaryListProps> = ({
    data,
    loading = false,
    error = "",
    applywizzId
}) => {
    const [expandedDate, setExpandedDate] = useState<string | null>(null);
    const [jobsData, setJobsData] = useState<JobsData>({});
    const [jobsLoading, setJobsLoading] = useState<Record<string, boolean>>({});

    // Status options for the dropdown
    const statusOptions = [
        { value: 'PENDING', label: 'Pending' },
        { value: 'IN_PROGRESS', label: 'In Progress' },
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'ALREADY_APPLIED', label: 'Already Applied' },
        { value: 'NOT_RELEVANT', label: 'Not Relevant' },
        { value: 'JOB_NOT_FOUND', label: 'Job Not Found' },
    ];

    // Handle status change for easy apply jobs
    const handleStatusChange = async (taskId: string, newStatus: string, date: string) => {
        console.log("handleStatusChange", taskId, newStatus, date);

        // Get current jobs data for this date
        const currentData = jobsData[date];
        if (!currentData) {
            console.error("No data found for this date");
            return;
        }

        // Find the job in easyapply array
        const easyApplyJobIndex = currentData.easyapply.findIndex(job => job.id === taskId);

        if (easyApplyJobIndex === -1) {
            console.error("Job not found in easyapply array");
            return;
        }

        // Store the old status for potential revert
        const oldStatus = currentData.easyapply[easyApplyJobIndex].status;

        // Update the local state immediately for better UX (optimistic update)
        const updatedEasyApply = [...currentData.easyapply];
        updatedEasyApply[easyApplyJobIndex] = {
            ...updatedEasyApply[easyApplyJobIndex],
            status: newStatus
        };

        setJobsData(prev => ({
            ...prev,
            [date]: {
                ...currentData,
                easyapply: updatedEasyApply
            }
        }));

        try {
            const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL;
            if (!apiUrl) {
                throw new Error('VITE_EXTERNAL_API_URL is not defined in environment variables');
            }

            const response = await fetch(`${apiUrl}/api/admin/update-task-status/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    taskId: taskId,
                    status: newStatus
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to update status: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log("Status updated successfully:", result);

            // Optionally, you can silently refresh the data in the background without loading state
            // For now, we rely on the optimistic update

        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status. Please try again.");

            // Revert the local state change if the API call fails
            const revertedEasyApply = [...currentData.easyapply];
            revertedEasyApply[easyApplyJobIndex] = {
                ...revertedEasyApply[easyApplyJobIndex],
                status: oldStatus
            };

            setJobsData(prev => ({
                ...prev,
                [date]: {
                    ...currentData,
                    easyapply: revertedEasyApply
                }
            }));
        }
    };


    const fetchJobsForDate = async (date: string): Promise<JobsResponse> => {
        if (!applywizzId) {
            console.error("Applywizz ID not available");
            return { tasks: [], easyapply: [] };
        }

        try {
            // Set loading state for this specific date
            setJobsLoading(prev => ({ ...prev, [date]: true }));

            // Fetch ONLY easy apply jobs for this date
            const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL;
            if (!apiUrl) {
                throw new Error('VITE_EXTERNAL_API_URL is not defined in environment variables');
            }

            const response = await fetch(`${apiUrl}/api/job-links?lead_id=${applywizzId}&date=${date}&apply_type=EASY_APPLY`);

            if (!response.ok) {
                throw new Error(`Failed to fetch job data from external API: ${response.status} ${response.statusText}`);
            }

            const apiData = await response.json();

            // Backend returns only easyapply (no regular tasks)
            return {
                tasks: [], // No regular tasks in this view
                easyapply: apiData.easyapply || []
            };
        } catch (err) {
            console.error("Error fetching job data:", err);
            return { tasks: [], easyapply: [] };
        } finally {
            // Reset loading state for this specific date
            setJobsLoading(prev => ({ ...prev, [date]: false }));
        }
    };

    const toggleDateExpansion = async (date: string) => {
        if (expandedDate === date) {
            // Collapse if already expanded
            setExpandedDate(null);
        } else {
            // Expand and fetch jobs if not already fetched
            setExpandedDate(date);
            if (!jobsData[date]) {
                const jobs = await fetchJobsForDate(date);
                setJobsData(prev => ({ ...prev, [date]: jobs }));
            }
        }
    };

    if (loading) {
        return (
            <div className="bg-white p-4 rounded-lg shadow mt-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin mr-2" size={24} />
                    <span>Loading application summary...</span>
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

    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-4 rounded-lg shadow mt-6">
                <p className="text-gray-500">No application data available.</p>
            </div>
        );
    }

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

    // Helper: Get company domain from company name
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

        // Common company name to domain mapping
        const companyDomains: Record<string, string> = {
            // Tech Giants
            'apple': 'apple.com',
            'google': 'google.com',
            'microsoft': 'microsoft.com',
            'amazon': 'amazon.com',
            'meta': 'meta.com',
            'facebook': 'meta.com',
            'netflix': 'netflix.com',
            'tesla': 'tesla.com',
            'twitter': 'twitter.com',
            'x': 'x.com',
            'linkedin': 'linkedin.com',
            'uber': 'uber.com',
            'airbnb': 'airbnb.com',
            'spotify': 'spotify.com',
            'adobe': 'adobe.com',
            'salesforce': 'salesforce.com',
            'oracle': 'oracle.com',
            'ibm': 'ibm.com',
            'intel': 'intel.com',
            'nvidia': 'nvidia.com',
            'amd': 'amd.com',
            'cisco': 'cisco.com',
            'dell': 'dell.com',
            'hp': 'hp.com',
            'samsung': 'samsung.com',
            'sony': 'sony.com',

            // Finance
            'goldman sachs': 'goldmansachs.com',
            'jp morgan': 'jpmorgan.com',
            'morgan stanley': 'morganstanley.com',
            'bank of america': 'bankofamerica.com',
            'wells fargo': 'wellsfargo.com',
            'citigroup': 'citigroup.com',
            'american express': 'americanexpress.com',
            'visa': 'visa.com',
            'mastercard': 'mastercard.com',
            'paypal': 'paypal.com',
            'stripe': 'stripe.com',

            // Consulting
            'mckinsey': 'mckinsey.com',
            'bain': 'bain.com',
            'bcg': 'bcg.com',
            'deloitte': 'deloitte.com',
            'pwc': 'pwc.com',
            'ey': 'ey.com',
            'kpmg': 'kpmg.com',
            'accenture': 'accenture.com',

            // E-commerce & Retail
            'walmart': 'walmart.com',
            'target': 'target.com',
            'costco': 'costco.com',
            'ebay': 'ebay.com',
            'shopify': 'shopify.com',

            // Other Popular Companies
            'nike': 'nike.com',
            'adidas': 'adidas.com',
            'coca cola': 'coca-cola.com',
            'pepsi': 'pepsi.com',
            'starbucks': 'starbucks.com',
            'mcdonald': 'mcdonalds.com',
            'disney': 'disney.com',
            'comcast': 'comcast.com',
            'verizon': 'verizon.com',
            'at&t': 'att.com',
            't-mobile': 't-mobile.com',
        };

        // Normalize company name for lookup
        const normalized = companyName.toLowerCase().trim();

        // Direct match
        if (companyDomains[normalized]) {
            return companyDomains[normalized];
        }

        // Partial match - check if company name contains any key
        for (const [key, domain] of Object.entries(companyDomains)) {
            if (normalized.includes(key) || key.includes(normalized)) {
                return domain;
            }
        }

        // Fallback: try to guess domain
        // Remove common suffixes and special characters
        const cleanName = normalized
            .replace(/\s+(inc|llc|ltd|corporation|corp|company|co|group|limited|federal credit union|credit union|systems)\b/gi, '')
            .replace(/[^a-z0-9]/g, '')
            .trim();

        if (cleanName) {
            return `${cleanName}.com`;
        }

        return null;
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

    // Helper function to render a job card with modern design
    const renderJobCard = (job: JobItem, isEasyApply: boolean = false, date: string = '') => {
        const matchData = getMatchQuality(job.score || 0);
        const percentage = Math.round(job.score || 0);
        const timeAgo = getTimeAgo(job.createdAt);
        const companyInitials = getCompanyInitials(job.company || '');
        const companyDomain = getCompanyDomain(job.company || '', job.jobUrl);
        const faviconUrl = companyDomain ? `https://www.google.com/s2/favicons?domain=${companyDomain}&sz=128&default_icon=404` : null;

        return (
            <div
                key={job.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100"
            >
                <div className="flex items-start gap-6 p-6">
                    {/* Left: Company Avatar & Job Info */}
                    <div className="flex-1 flex gap-4">
                        <CompanyLogo company={job.company || 'Company'} logoUrl={faviconUrl} fallbackColor="bg-blue-600" />

                        {/* Job Details */}
                        <div className="flex-1 min-w-0">
                            {/* Time & Source Badge */}
                            {/* <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm text-gray-500">{timeAgo}</span>
                                {job.source && (
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                                        {job.source}
                                    </span>
                                )}
                            </div> */}

                            {/* Job Title */}
                            <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1">
                                {job.jobTitle || "Untitled Role"}
                            </h3>

                            {/* Company Name */}
                            <p className="text-base text-gray-600 mb-3">
                                {job.company || "Unknown Company"}
                            </p>

                            {/* Job Metadata */}
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
                        {/* Circular Progress */}
                        <div className="relative w-20 h-20 mb-3">
                            <svg className="w-20 h-20 transform -rotate-90">
                                {/* Background circle */}
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="32"
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeWidth="6"
                                    fill="none"
                                />
                                {/* Progress circle */}
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="32"
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    fill="none"
                                    strokeDasharray={`${(percentage / 100) * 201} 201`}
                                    strokeLinecap="round"
                                    className={matchData.textColor}
                                />
                            </svg>
                            {/* Percentage text */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-bold text-white">{percentage}%</span>
                            </div>
                        </div>

                        {/* Match Quality Label */}
                        <span className="text-xs font-bold text-white tracking-wide text-center">
                            {matchData.label}
                        </span>
                    </div>
                </div>

                {/* Bottom: Actions */}
                <div className="px-6 pb-6 flex items-center gap-3">
                    {/* Status Dropdown */}
                    {isEasyApply && (
                        <select
                            value={job.status || 'PENDING'}
                            onChange={(e) => handleStatusChange(job.id, e.target.value, date)}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:bg-gray-50 transition-colors"
                        >
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Spacer */}
                    <div className="flex-1"></div>

                    {/* View Job Button */}
                    <a
                        href={job.jobUrl || "#"}
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

    return (
        <div className="bg-white p-4 rounded-lg shadow mt-6">
            <h2 className="text-lg font-semibold mb-4">Easy Apply Summary</h2>

            <div className="space-y-2">
                {data.map((item) => {
                    const isExpanded = expandedDate === item.date;
                    const { tasks = [], easyapply = [] } = jobsData[item.date] || {};

                    const dateObj = new Date(item.date);
                    const formattedDate = dateObj.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    });

                    return (
                        <div key={item.date}>
                            {/* Date Header - Clickable to expand/collapse */}
                            <div
                                onClick={() => toggleDateExpansion(item.date)}
                                className={`flex justify-between items-center p-4 rounded-lg cursor-pointer transition ${isExpanded ? "bg-green-100" : "bg-green-50 hover:bg-green-100"
                                    }`}
                            >
                                <div className="flex items-center gap-2 text-green-900">
                                    <Calendar size={18} />
                                    <span className="font-medium">{formattedDate}</span>
                                </div>
                                <div className="flex items-center gap-3 text-green-700 font-semibold">
                                    <div className="flex items-center gap-2">
                                        <Zap size={18} />
                                        <span>{item.easyApplyCount} Easy Apply</span>
                                    </div>
                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </div>

                            {/* Expanded Job List - Single Column */}
                            {isExpanded && (
                                <div className="mt-3 bg-gray-50 p-4 rounded-lg">
                                    {jobsLoading[item.date] ? (
                                        <div className="space-y-4">
                                            <SkeletonJobCard />
                                            <SkeletonJobCard />
                                        </div>
                                    ) : easyapply.length > 0 ? (
                                        <div className="space-y-4">
                                            {easyapply
                                                .sort((a, b) => (b.score || 0) - (a.score || 0))
                                                .map((job) => renderJobCard(job, true, item.date))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">No easy apply jobs for this date.</p>
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

export default EasyApplySummaryList;
