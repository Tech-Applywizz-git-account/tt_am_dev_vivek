import React, { useState, useEffect } from "react";
import {
    CheckCircle, MapPin, Loader2, ChevronLeft, ChevronRight,
    Linkedin, Briefcase, Building2, DollarSign, ChevronDown,
    Monitor, ArrowRight, ChevronUp
} from "lucide-react";

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

// ── Company Logo (exact match to LinkedInEasyApplyRegularList) ────────────────
const CompanyLogo = ({ company, logoUrl, fallbackColor = 'bg-blue-600' }: { company: string, logoUrl: string | null, fallbackColor?: string }) => {
    const [error, setError] = React.useState(false);
    const firstLetter = company ? company.trim().charAt(0).toUpperCase() : 'C';

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        if (img.naturalWidth < 16 || img.naturalHeight < 16) {
            setError(true);
        }
    };

    if (error || !logoUrl) {
        return (
            <div
                className="shrink-0 inline-flex items-center justify-center text-white text-2xl font-bold"
                style={{
                    height: '80px',
                    width: '80px',
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
                onLoad={handleImageLoad}
            />
        </div>
    );
};

// ── Helper: group jobs by date ────────────────────────────────────────────────
function groupJobsByDate(jobs: JobItem[]): { dateLabel: string; dateKey: string; jobs: JobItem[] }[] {
    const map: Record<string, JobItem[]> = {};

    jobs.forEach((job) => {
        const raw = job.generated_at || job.date_posted;
        // Parse as local date using YYYY-MM-DD split to avoid timezone shift
        let key: string;
        if (raw) {
            const d = new Date(raw);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            key = `${year}-${month}-${day}`;
        } else {
            const now = new Date();
            key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        }
        if (!map[key]) map[key] = [];
        map[key].push(job);
    });

    // Sort descending (newest first)
    return Object.entries(map)
        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
        .map(([key, groupJobs]) => {
            const [year, month, day] = key.split('-').map(Number);
            const dateObj = new Date(year, month - 1, day);
            return {
                dateKey: key,
                dateLabel: dateObj.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                }),
                jobs: groupJobs,
            };
        });
}

// ── Main Component ────────────────────────────────────────────────────────────
const ScoredJobsAppliedList: React.FC<ScoredJobsAppliedListProps> = ({ applywizzId }) => {
    const [jobs, setJobs] = useState<JobItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalJobs, setTotalJobs] = useState(0);
    const [selectedFilter, setSelectedFilter] = useState<string>("all");
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [expandedDate, setExpandedDate] = useState<string | null>(null);
    const [datePage, setDatePage] = useState(1);

    const itemsPerPage = 10; // date groups per page
    const pageSize = 50;

    const filterOptions = [
        { value: "all", label: "All Applied Jobs", icon: CheckCircle },
        { value: "linkedin", label: "LinkedIn", icon: Linkedin },
        { value: "staffing", label: "Staffing Agencies", icon: Building2 },
        { value: "c2c", label: "C2C", icon: DollarSign },
        { value: "w2", label: "W2", icon: Briefcase },
    ];

    const loadingMessages = [
        "Fetching applied jobs...",
        "Curating your application history...",
        "Almost finished, thank you for waiting!",
        "Preparing your job list...",
    ];

    // ── Fetch ───────────────────────────────────────────────────────────────
    const fetchAppliedJobs = async (page: number = 1) => {
        if (!applywizzId) {
            setError("Applywizz ID not available");
            return;
        }
        try {
            setLoading(true);
            setError("");

            const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL1;
            if (!apiUrl) throw new Error("VITE_EXTERNAL_API_URL is not defined");

            let url = `${apiUrl}/api/job-links?lead_id=${applywizzId}&page=${page}&page_size=${pageSize}&status=Completed`;

            if (selectedFilter === "linkedin") url += `&source=LINKEDIN`;
            else if (selectedFilter === "indeed") url += `&source=INDEED`;
            else if (selectedFilter === "staffing") url += `&industry_type=true`;
            else if (selectedFilter === "c2c") url += `&job_type=C2C`;
            else if (selectedFilter === "w2") url += `&job_type=W2`;
            else if (selectedFilter === "c2c-w2") url += `&job_type=C2C,W2`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch applied jobs: ${response.status}`);

            const data: PaginatedResponse = await response.json();
            const fetched = data.jobs || [];
            setJobs(fetched);
            setCurrentPage(data.pagination?.page || 1);
            setTotalPages(data.pagination?.total_pages || 1);
            setTotalJobs(data.pagination?.total || 0);

            // Auto-expand the first date group
            const grouped = groupJobsByDate(fetched);
            if (grouped.length > 0) {
                setExpandedDate(grouped[0].dateKey);
            }
        } catch (err) {
            console.error("Error fetching applied jobs:", err);
            setError(err instanceof Error ? err.message : "Failed to load applied jobs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
        setExpandedDate(null);
        fetchAppliedJobs(1);
    }, [applywizzId, selectedFilter]);

    // Cycle loading messages
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (loading) {
            setLoadingMessageIndex(0);
            interval = setInterval(() => {
                setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
            }, 1500);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [loading]);

    // ── API pagination (for fetching more jobs) ─────────────────────────────
    const handlePreviousPage = () => {
        if (currentPage > 1) { const p = currentPage - 1; setCurrentPage(p); fetchAppliedJobs(p); }
    };
    const handleNextPage = () => {
        if (currentPage < totalPages) { const p = currentPage + 1; setCurrentPage(p); fetchAppliedJobs(p); }
    };
    const handlePageClick = (page: number) => { setCurrentPage(page); fetchAppliedJobs(page); };

    // ── Toggle date group (accordion — only one open at a time) ─────────────
    const toggleDateExpansion = (key: string) => {
        setExpandedDate((prev) => (prev === key ? null : key));
    };

    // ── Helpers ─────────────────────────────────────────────────────────────
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
                const socialDomains = ['linkedin.com', 'indeed.com', 'glassdoor.com', 'facebook.com', 'twitter.com', 'x.com', 'instagram.com'];
                if (!socialDomains.some(d => hostname.includes(d))) return hostname;
            } catch { /* fall through */ }
        }
        if (!companyName) return null;
        const companyDomains: Record<string, string> = {
            'apple': 'apple.com', 'google': 'google.com', 'microsoft': 'microsoft.com',
            'amazon': 'amazon.com', 'meta': 'meta.com', 'netflix': 'netflix.com',
            'linkedin': 'linkedin.com', 'indeed': 'indeed.com', 'walmart': 'walmart.com'
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

    // ── Job Card — exact same as LinkedInEasyApplyRegularList ───────────────
    const renderJobCard = (job: JobItem) => {
        const matchData = getMatchQuality(job.score || 0);
        const percentage = Math.round(job.score || 0);
        const companyDomain = getCompanyDomain(job.company, job.company_url);
        const faviconUrl = job.company_logo_url || (companyDomain ? `https://www.google.com/s2/favicons?domain=${companyDomain}&sz=128` : null);

        return (
            <div key={job.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100" style={{ border: "1px solid #000000", backgroundColor: "#FFFFFF" }}>
                <div className="flex items-center gap-12 p-6">
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

                        {/* Horizontal Line */}
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

                    {/* Middle: VIEW JOB Button */}
                    <div className="flex-shrink-0 flex items-center">
                        <a
                            href={job.url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-2.5 font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                            style={{ color: "#FFFFFF", backgroundColor: "#2C76FF", textDecoration: "none" }}
                        >
                            <span>VIEW JOB</span>
                            <ArrowRight className="h-5 w-5 text-white" />
                        </a>
                    </div>

                    {/* Right: Match Score Card (same circular SVG as LinkedIn) */}
                    {percentage >= 20 && (
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
                    )}
                </div>

                {/* Bottom spacer (keeps consistent padding with LinkedIn card) */}
                <div className="px-6 pb-4 flex items-center gap-3">
                    <div className="flex-1"></div>
                </div>
            </div>
        );
    };

    // ── Skeleton ────────────────────────────────────────────────────────────
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

    // ── Loading state ───────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="bg-white p-4 rounded-lg shadow mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <Loader2 className="text-blue-600 animate-spin" size={20} />
                        <p className="text-gray-700 font-medium">{loadingMessages[loadingMessageIndex]}</p>
                    </div>
                    <div className="relative">
                        <select
                            value={selectedFilter}
                            onChange={(e) => setSelectedFilter(e.target.value)}
                            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm min-w-[200px]"
                        >
                            {filterOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                    </div>
                </div>
                <div className="space-y-4">
                    <SkeletonJobCard />
                    <SkeletonJobCard />
                    <SkeletonJobCard />
                </div>
            </div>
        );
    }

    // ── Error state ─────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="bg-white p-4 rounded-lg shadow mt-6">
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    // ── Main render ─────────────────────────────────────────────────────────
    const dateGroups = groupJobsByDate(jobs);

    // Paginate over date groups (client-side, same as LinkedIn component)
    const totalDatePages = Math.ceil(dateGroups.length / itemsPerPage);
    const dateStartIndex = (datePage - 1) * itemsPerPage;
    const currentDateGroups = dateGroups.slice(dateStartIndex, dateStartIndex + itemsPerPage);

    const handleDatePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalDatePages) setDatePage(newPage);
    };

    return (
        <div>
            {/* ── Header bar ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={20} />
                    <p className="text-gray-700 font-medium">
                        {totalJobs === 0 ? (
                            <>No applied jobs found</>
                        ) : (
                            <>
                                You have applied to{" "}
                                <span className="font-bold text-blue-600">{totalJobs}</span>{" "}
                                {totalJobs === 1 ? "job" : "jobs"}
                                {selectedFilter !== "all" && (
                                    <> in{" "}
                                        <span className="font-bold text-blue-600">
                                            {filterOptions.find((o) => o.value === selectedFilter)?.label}
                                        </span>
                                    </>
                                )}
                            </>
                        )}
                    </p>
                </div>

                {/* Filter dropdown */}
                <div className="relative">
                    <select
                        value={selectedFilter}
                        onChange={(e) => setSelectedFilter(e.target.value)}
                        className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm min-w-[200px]"
                    >
                        {filterOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                </div>
            </div>

            {/* ── Empty state ─────────────────────────────────────────────── */}
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
                    {/* ── Date Groups — exact LinkedIn style ───────────────── */}
                    <div className="space-y-2">
                        {currentDateGroups.map((group, index) => {
                            const isExpanded = expandedDate === group.dateKey;

                            return (
                                <div key={group.dateKey}>
                                    {/* Date row — exact LinkedIn #E3FFE7 style, no serial number */}
                                    <div
                                        onClick={() => toggleDateExpansion(group.dateKey)}
                                        className="flex justify-between items-center p-4 rounded-lg cursor-pointer transition"
                                        style={{ backgroundColor: '#E3FFE7' }}
                                    >
                                        <div className="flex items-center gap-32">
                                            <span
                                                className="font-medium"
                                                style={{ color: '#615642' }}
                                            >
                                                {group.dateLabel}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <img
                                                src="/chevron-icon.svg"
                                                alt="chevron"
                                                className={`w-[18px] h-[18px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                                onError={(e) => {
                                                    // Fallback if chevron SVG not available
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                            {/* SVG fallback inline */}
                                            <ChevronDown
                                                size={18}
                                                className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                                style={{ color: '#615642' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Collapsible job cards */}
                                    {isExpanded && (
                                        <div className="mt-3 space-y-4">
                                            {group.jobs
                                                .sort((a, b) => {
                                                    const scoreDiff = (b.score || 0) - (a.score || 0);
                                                    if (scoreDiff !== 0) return scoreDiff;
                                                    const countFields = (job: JobItem) => {
                                                        let count = 0;
                                                        if (job.company) count++;
                                                        if (job.salary) count++;
                                                        if (job.experience_level) count++;
                                                        if (job.work_type) count++;
                                                        return count;
                                                    };
                                                    return countFields(b) - countFields(a);
                                                })
                                                .map((job) => renderJobCard(job))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Date-group pagination — exact LinkedIn style ──────── */}
                    {totalDatePages > 1 && (
                        <div className="flex justify-end items-center gap-4 mt-8 px-4 py-4">
                            <button
                                onClick={() => handleDatePageChange(datePage - 1)}
                                disabled={datePage === 1}
                                className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${datePage === 1
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-[#171717] text-white hover:bg-black'
                                    }`}
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <span className="text-xl font-medium" style={{ color: '#181717ff' }}>
                                {String(datePage).padStart(2, '0')}
                            </span>

                            <button
                                onClick={() => handleDatePageChange(datePage + 1)}
                                disabled={datePage === totalDatePages}
                                className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${datePage === totalDatePages
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-[#171717] text-white hover:bg-black'
                                    }`}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* ── API-level pagination (when totalPages > 1) ────────── */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 px-4">
                            <div className="text-sm text-gray-600">
                                Showing page {currentPage} of {totalPages}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handlePreviousPage} disabled={currentPage === 1}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1">
                                    <ChevronLeft size={16} /> Previous
                                </button>
                                <button onClick={handleNextPage} disabled={currentPage === totalPages}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1">
                                    Next <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ScoredJobsAppliedList;
