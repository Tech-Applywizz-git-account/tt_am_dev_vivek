import React, { useState, useEffect } from "react";
import { Calendar, RefreshCw, MapPin, ExternalLink, ChevronDown, ChevronUp, Loader2, Briefcase, DollarSign, Building, Monitor, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

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
    c2cw2_jobs: Record<string, number>;
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

interface C2CW2JobsRegularListProps {
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
                height: '80px',
                width: '80px',
                padding: '17px 17px 17px 17px',
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
                style={{ width: '80px', height: '80px' }}
                onError={() => setError(true)}
            />
        </div>
    );
};

const C2CW2JobsRegularList: React.FC<C2CW2JobsRegularListProps> = ({ applywizzId }) => {
    const [summary, setSummary] = useState<Record<string, number>>({});
    const [jobsData, setJobsData] = useState<Record<string, JobItem[]>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [expandedDate, setExpandedDate] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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

            const response = await fetch(`${apiUrl}/api/job-links?lead_id=${applywizzId}&job_type=C2C,W2`);

            if (!response.ok) {
                throw new Error(`Failed to fetch summary: ${response.status}`);
            }

            const data: SummaryResponse = await response.json();
            setSummary(data.c2cw2_jobs || {});
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
            const response = await fetch(`${apiUrl}/api/job-links?lead_id=${applywizzId}&date=${date}&job_type=C2C,W2`);

            if (!response.ok) {
                throw new Error(`Failed to fetch jobs: ${response.status}`);
            }

            const data: any = await response.json();

            // API returns "c2c,w2_jobs" array for job_type=C2C,W2
            setJobsData(prev => ({
                ...prev,
                [date]: data['c2c,w2_jobs'] || data.jobs || []
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
                    <div className="flex-1">
                        {/* Header: Logo, Title, and Company */}
                        <div className="flex gap-3 items-start mb-1">
                            <CompanyLogo company={job.company} logoUrl={faviconUrl} fallbackColor="bg-blue-600" />
                            <div className="flex-1 min-w-0 mt-3">
                                <h3
                                    className="text-xl font-bold mb-1"
                                    style={{ color: "#282828", fontFamily: "Darker Grotesque", fontSize: "24px" }}>
                                    {job.title || "Untitled Role"}
                                </h3>

                                <p
                                    className="text-base text-gray-600"
                                    style={{ color: "#282828", fontFamily: "Noto Sans", fontSize: "12px" }}
                                >
                                    {job.company || "Unknown Company"}
                                </p>
                            </div>
                        </div>

                        {/* Horizontal Line below logo and header info */}
                        <hr className="my-3 border-gray-100" style={{ maxWidth: "80%" }} />
                        <div className="flex gap-12 mt-3">
                            {(() => {
                                const details = [];
                                if (job.location) {
                                    details.push(
                                        <div key="loc" className="flex items-center gap-1.5" style={{ fontFamily: "Noto Sans", fontSize: "12px", color: "#282828" }}>
                                            <MapPin size={16} style={{ color: "#282828" }} />
                                            <span>{job.location}</span>
                                        </div>
                                    );
                                }
                                if (job.salary) {
                                    details.push(
                                        <div key="sal" className="flex items-center gap-1.5" style={{ fontFamily: "Noto Sans", fontSize: "12px", color: "#282828" }}>
                                            <DollarSign size={16} style={{ color: "#282828" }} />
                                            <span>Salary: {job.salary}</span>
                                        </div>
                                    );
                                }
                                if (job.experience_level) {
                                    details.push(
                                        <span key="exp" className="px-2 py-0.5 flex items-center gap-1" style={{ fontFamily: "Noto Sans", fontSize: "12px", color: "#282828" }}>
                                            <Briefcase size={16} />
                                            {job.experience_level}
                                        </span>
                                    );
                                }
                                if (job.work_type) {
                                    details.push(
                                        <span key="work" className="px-2 py-0.5 flex items-center gap-1" style={{ fontFamily: "Noto Sans", fontSize: "12px", color: "#282828" }}>
                                            <Monitor size={16} />
                                            {job.work_type}
                                        </span>
                                    );
                                }

                                const columns = [];
                                for (let i = 0; i < details.length; i += 2) {
                                    columns.push(
                                        <div key={`col-${i}`} className="flex flex-col gap-3">
                                            {details.slice(i, i + 2)}
                                        </div>
                                    );
                                }
                                return columns;
                            })()}
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
                    <Loader2 className="animate-spin text-indigo-600" size={20} />
                    <span className="text-gray-700 font-medium">Loading C2C,W2 jobs...</span>
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

    const allDates = Object.keys(summary).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const totalPages = Math.ceil(allDates.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentDates = allDates.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            // Optional: Scroll to top of list
            // window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    if (allDates.length === 0) {
        return (
            <div className="bg-white p-4 rounded-lg shadow mt-6">
                <p className="text-gray-500">No c2cw2 agency jobs found.</p>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <RefreshCw className="text-teal-600" size={24} />
                c2cw2 Agency Jobs Summary
            </h2>

            <div className="space-y-2">
                {currentDates.map((date, index) => {
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
                                    <span className="font-semibold text-lg" style={{ color: '#22201C' }}>{startIndex + index + 1}.</span>
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-end items-center gap-4 mt-8 px-4 py-4">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${currentPage === 1
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-[#171717] text-white hover:bg-black'
                            }`}
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <span className="text-xl font-medium" style={{ color: '#181717ff' }}>
                        {String(currentPage).padStart(2, '0')}
                    </span>

                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${currentPage === totalPages
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-[#171717] text-white hover:bg-black'
                            }`}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default C2CW2JobsRegularList;
