import React, { useState, useEffect } from "react";
import {
    CheckCircle, MapPin, ExternalLink, Loader2, ChevronLeft, ChevronRight,
    Linkedin, Briefcase, Building2, DollarSign, RefreshCw, ChevronDown,
    Building, Monitor, ArrowRight, ChevronUp, Calendar
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

// ── Company Logo ──────────────────────────────────────────────────────────────
const CompanyLogo = ({
    company,
    logoUrl,
}: {
    company: string;
    logoUrl: string | null;
}) => {
    const [error, setError] = React.useState(false);
    const firstLetter = company ? company.trim().charAt(0).toUpperCase() : "C";

    const boxStyle: React.CSSProperties = {
        height: "64px",
        width: "64px",
        borderRadius: "9px",
        border: "1px solid #D3D3D3",
        background: "#F1F1F1",
        boxShadow: "0 2px 1.4px 0 rgba(0,0,0,0.25)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    };

    if (error || !logoUrl) {
        return (
            <div style={boxStyle}>
                <span style={{ color: "#000", fontSize: "24px", fontWeight: 700 }}>
                    {firstLetter}
                </span>
            </div>
        );
    }

    return (
        <div style={boxStyle}>
            <img
                src={logoUrl}
                alt={company}
                className="object-contain"
                style={{ width: "48px", height: "48px" }}
                onError={() => setError(true)}
            />
        </div>
    );
};

// ── Helper: group jobs by date ────────────────────────────────────────────────
function groupJobsByDate(jobs: JobItem[]): { dateLabel: string; dateKey: string; jobs: JobItem[] }[] {
    const map: Record<string, JobItem[]> = {};

    jobs.forEach((job) => {
        const raw = job.generated_at || job.date_posted;
        const d = raw ? new Date(raw) : new Date();
        // Normalize to YYYY-MM-DD for grouping key
        const key = d.toISOString().split("T")[0];
        if (!map[key]) map[key] = [];
        map[key].push(job);
    });

    // Sort descending (newest first)
    return Object.entries(map)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([key, groupJobs]) => ({
            dateKey: key,
            dateLabel: new Date(key + "T12:00:00").toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            }),
            jobs: groupJobs,
        }));
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
    // Track which date groups are expanded (all open by default)
    const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

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

            // Default: expand all date groups
            const grouped = groupJobsByDate(fetched);
            const initExpanded: Record<string, boolean> = {};
            grouped.forEach((g) => (initExpanded[g.dateKey] = true));
            setExpandedDates(initExpanded);
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
                setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
            }, 1500);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [loading]);

    // ── Pagination ──────────────────────────────────────────────────────────
    const handlePreviousPage = () => {
        if (currentPage > 1) { const p = currentPage - 1; setCurrentPage(p); fetchAppliedJobs(p); }
    };
    const handleNextPage = () => {
        if (currentPage < totalPages) { const p = currentPage + 1; setCurrentPage(p); fetchAppliedJobs(p); }
    };
    const handlePageClick = (page: number) => { setCurrentPage(page); fetchAppliedJobs(page); };

    // ── Toggle date group ───────────────────────────────────────────────────
    const toggleDateGroup = (key: string) => {
        setExpandedDates((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // ── Helpers ─────────────────────────────────────────────────────────────
    const getMatchQuality = (score: number) => {
        const percentage = Math.round(score);
        const bgGradient = "linear-gradient(to right, #171717, #353333, #6f6767ff)";
        if (percentage >= 80) return { label: "Strong Match", bgGradient, textColor: "#00FE24" };
        if (percentage >= 60) return { label: "Great Match", bgGradient, textColor: "#42FF5C" };
        return { label: "Good Match", bgGradient, textColor: "#70FF84" };
    };

    const getCompanyDomain = (companyName: string, companyUrl?: string | null): string | null => {
        if (companyUrl) {
            try {
                const u = new URL(companyUrl.startsWith("http") ? companyUrl : `https://${companyUrl}`);
                const hostname = u.hostname.replace("www.", "");
                const social = ["linkedin.com", "indeed.com", "glassdoor.com", "facebook.com", "twitter.com", "x.com", "instagram.com"];
                if (!social.some((d) => hostname.includes(d))) return hostname;
            } catch { /* fall through */ }
        }
        if (!companyName) return null;
        const known: Record<string, string> = {
            apple: "apple.com", google: "google.com", microsoft: "microsoft.com",
            amazon: "amazon.com", meta: "meta.com", netflix: "netflix.com",
        };
        const n = companyName.toLowerCase().trim();
        if (known[n]) return known[n];
        for (const [k, v] of Object.entries(known)) { if (n.includes(k)) return v; }
        const clean = n.replace(/\s+(inc|llc|ltd|corp|company|co|federal credit union|credit union|systems)\b/gi, "").replace(/[^a-z0-9]/g, "").trim();
        return clean ? `${clean}.com` : null;
    };

    // ── Pagination render ───────────────────────────────────────────────────
    const renderPagination = () => {
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
        const pages: number[] = [];
        for (let i = start; i <= end; i++) pages.push(i);

        return (
            <div className="flex items-center justify-between mt-6 px-4">
                <div className="text-sm text-gray-600">
                    Showing {jobs.length} of {totalJobs} applied jobs
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handlePreviousPage} disabled={currentPage === 1}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1">
                        <ChevronLeft size={16} /> Previous
                    </button>
                    {start > 1 && (<>
                        <button onClick={() => handlePageClick(1)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">1</button>
                        {start > 2 && <span className="text-gray-400">...</span>}
                    </>)}
                    {pages.map((page) => (
                        <button key={page} onClick={() => handlePageClick(page)}
                            className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${page === currentPage ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:bg-gray-50"}`}>
                            {page}
                        </button>
                    ))}
                    {end < totalPages && (<>
                        {end < totalPages - 1 && <span className="text-gray-400">...</span>}
                        <button onClick={() => handlePageClick(totalPages)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">{totalPages}</button>
                    </>)}
                    <button onClick={handleNextPage} disabled={currentPage === totalPages}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1">
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        );
    };

    // ── Job Card ────────────────────────────────────────────────────────────
    const renderJobCard = (job: JobItem, index: number) => {
        const matchData = getMatchQuality(job.score || 0);
        const percentage = Math.round(job.score || 0);
        const companyDomain = getCompanyDomain(job.company, job.company_url);
        const faviconUrl = job.company_logo_url ||
            (companyDomain ? `https://www.google.com/s2/favicons?domain=${companyDomain}&sz=128&default_icon=404` : null);

        return (
            <div
                key={job.id}
                className="bg-white rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md"
                style={{ border: "1px solid #E5E7EB", marginBottom: "0" }}
            >
                <div className="flex items-center gap-6 p-5">
                    {/* Serial number */}
                    <div
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-gray-500"
                        style={{ background: "#F3F4F6", minWidth: "2rem" }}
                    >
                        {index + 1}
                    </div>

                    {/* Logo */}
                    <CompanyLogo company={job.company} logoUrl={faviconUrl} />

                    {/* Job Info */}
                    <div className="flex-1 min-w-0">
                        <h3
                            className="font-bold truncate"
                            style={{ color: "#282828", fontFamily: "Darker Grotesque, sans-serif", fontSize: "18px", lineHeight: "1.3" }}
                        >
                            {job.title || "Untitled Role"}
                        </h3>
                        <p className="text-sm text-gray-600 truncate" style={{ fontFamily: "Noto Sans, sans-serif" }}>
                            {job.company || "Unknown Company"}
                        </p>

                        {/* Meta chips */}
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                            {job.location && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <MapPin size={13} /> {job.location}
                                </span>
                            )}
                            {job.experience_level && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <Briefcase size={13} /> {job.experience_level}
                                </span>
                            )}
                            {job.work_type && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <Monitor size={13} /> {job.work_type}
                                </span>
                            )}
                            {job.salary && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <DollarSign size={13} /> {job.salary}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Match score pill */}
                    <div
                        className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl px-4 py-3 shadow-md"
                        style={{ background: matchData.bgGradient, minWidth: "90px" }}
                    >
                        <span className="text-2xl font-bold text-white">{percentage}%</span>
                        <span className="text-xs font-semibold text-white mt-0.5 text-center" style={{ color: matchData.textColor }}>
                            {matchData.label}
                        </span>
                    </div>

                    {/* View Job button */}
                    <a
                        href={job.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm shadow hover:shadow-md transition-all duration-200"
                        style={{ color: "#FFFFFF", backgroundColor: "#2C76FF", textDecoration: "none" }}
                    >
                        VIEW JOB <ArrowRight size={16} />
                    </a>
                </div>
            </div>
        );
    };

    // ── Skeleton ────────────────────────────────────────────────────────────
    const SkeletonDateGroup = () => (
        <div className="mb-4 animate-pulse">
            <div className="h-14 rounded-xl bg-gray-200 mb-2" />
            <div className="space-y-2 pl-4">
                {[1, 2].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-gray-100 border border-gray-200" />
                ))}
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
                    <SkeletonDateGroup />
                    <SkeletonDateGroup />
                    <SkeletonDateGroup />
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
                    {/* ── Date Groups ──────────────────────────────────────── */}
                    <div className="space-y-3">
                        {dateGroups.map((group, groupIdx) => {
                            const isOpen = expandedDates[group.dateKey] !== false; // default open
                            return (
                                <div key={group.dateKey}>
                                    {/* Date header row — matches reference image style */}
                                    <button
                                        onClick={() => toggleDateGroup(group.dateKey)}
                                        className="w-full flex items-center justify-between px-5 py-4 rounded-xl transition-all duration-200 focus:outline-none"
                                        style={{
                                            background: "linear-gradient(135deg, #e8f5e9 0%, #d4edda 100%)",
                                            border: "1px solid #b2dfdb",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Group number badge */}
                                            <span
                                                className="flex items-center justify-center rounded-full text-sm font-bold"
                                                style={{
                                                    width: "32px",
                                                    height: "32px",
                                                    background: "#2d6a4f",
                                                    color: "#fff",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {groupIdx + 1}
                                            </span>

                                            {/* Date label */}
                                            <div className="flex items-center gap-2">
                                                <Calendar size={16} style={{ color: "#2d6a4f" }} />
                                                <span
                                                    className="font-semibold"
                                                    style={{ color: "#2d6a4f", fontSize: "15px", fontFamily: "Noto Sans, sans-serif" }}
                                                >
                                                    {group.dateLabel}
                                                </span>
                                            </div>

                                            {/* Job count badge */}
                                            <span
                                                className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                                                style={{ background: "#2d6a4f", color: "#fff" }}
                                            >
                                                {group.jobs.length} {group.jobs.length === 1 ? "job" : "jobs"}
                                            </span>
                                        </div>

                                        {/* Chevron toggle */}
                                        <span style={{ color: "#2d6a4f" }}>
                                            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </span>
                                    </button>

                                    {/* Collapsible job cards */}
                                    {isOpen && (
                                        <div
                                            className="mt-2 space-y-2 pl-2"
                                            style={{
                                                borderLeft: "3px solid #b2dfdb",
                                                marginLeft: "16px",
                                                paddingLeft: "12px",
                                            }}
                                        >
                                            {group.jobs.map((job, idx) => renderJobCard(job, idx))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Pagination ───────────────────────────────────────── */}
                    {totalPages > 1 && renderPagination()}
                </>
            )}
        </div>
    );
};

export default ScoredJobsAppliedList;
