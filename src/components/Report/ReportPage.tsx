import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
    Calendar,
    Users,
    Mail,
    UserCheck,
    RefreshCcw,
    AlertCircle,
    Search,
    Loader2,
    TrendingUp,
    Briefcase,
    FileText,
    ChevronUp,
    ChevronDown,
    X
} from 'lucide-react';

interface LeadDetail {
    client_name?: string;
    work_done_ca_name: string;
    ca_mail: string;
    team_lead_name: string;
    tl_email: string;
    emails_submitted: number;
}

interface DetailedReportResponse {
    date: string;
    by_lead: Record<string, LeadDetail>;
    total_leads_count: number;
}

interface SummaryReportResponse {
    date: string;
    by_lead: Record<string, number>;
}

interface MergedLeadData extends Partial<LeadDetail> {
    lead_id: string;
    summary_count?: number;
    inDetailed: boolean;
    inSummary: boolean;
}

const ReportPage: React.FC = () => {
    const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [reportData, setReportData] = useState<MergedLeadData[]>([]);
    const [summary, setSummary] = useState({
        totalLeads: 0,
        totalEmails: 0,
        totalSummaryCount: 0,
        missingTaskCount: 0,
        missingCACount: 0,
        caLeadCount: 0,
        taskLeadCount: 0
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title: string; data: { lead_id: string; client_name?: string }[] }>({
        isOpen: false,
        title: '',
        data: []
    });


    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL;

            // Route 1: Detailed Report
            const detailedUrl = `https://applywizz-ca-management.vercel.app/api/tasks/summary?date=${date}`;
            // Route 2: Summary Report
            const summaryUrl = `${apiUrl}/api/tasks/summary/?date=${date}`;

            const [detailedRes, summaryRes] = await Promise.all([
                fetch(detailedUrl).then(res => res.ok ? res.json() : null),
                fetch(summaryUrl).then(res => res.ok ? res.json() : null)
            ]);

            if (!detailedRes && !summaryRes) {
                throw new Error('Failed to fetch report data from both sources');
            }

            const detailedReport: DetailedReportResponse = detailedRes || { by_lead: {}, total_leads_count: 0, date };
            const summaryReport: SummaryReportResponse = summaryRes || { by_lead: {}, date };

            // Merge data
            const allLeadIds = Array.from(new Set([
                ...Object.keys(detailedReport.by_lead),
                ...Object.keys(summaryReport.by_lead)
            ]));

            const merged: MergedLeadData[] = allLeadIds.map(id => ({
                lead_id: id,
                ...detailedReport.by_lead[id],
                summary_count: summaryReport.by_lead[id],
                inDetailed: !!detailedReport.by_lead[id],
                inSummary: summaryReport.by_lead[id] !== undefined
            }));

            setReportData(merged);

            const totalEmails = merged.reduce((sum, item) => sum + (item.emails_submitted || 0), 0);
            const totalSummaryCount = merged.reduce((sum, item) => sum + (item.summary_count || 0), 0);
            const missingTaskCount = merged.filter(item => item.inDetailed && !item.inSummary).length;
            const missingCACount = merged.filter(item => !item.inDetailed && item.inSummary).length;
            const caLeadCount = Object.keys(detailedReport.by_lead).length;
            const taskLeadCount = Object.keys(summaryReport.by_lead).length;

            setSummary({
                totalLeads: detailedReport.total_leads_count || Object.keys(summaryReport.by_lead).length,
                totalEmails,
                totalSummaryCount,
                missingTaskCount,
                missingCACount,
                caLeadCount,
                taskLeadCount
            });

        } catch (err: any) {
            setError(err.message || 'An error occurred while fetching report data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []); // Only fetch once on mount

    const toggleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleCardClick = (type: 'missingTask' | 'missingCA') => {
        let filtered: typeof modalConfig.data = [];
        let title = '';

        if (type === 'missingTask') {
            filtered = reportData
                .filter(item => item.inDetailed && !item.inSummary)
                .map(item => ({ lead_id: item.lead_id, client_name: item.client_name }));
            title = 'Leads Missing in Task Management';
        } else {
            filtered = reportData
                .filter(item => !item.inDetailed && item.inSummary)
                .map(item => ({ lead_id: item.lead_id, client_name: item.client_name }));
            title = 'Leads Missing in CA Management';
        }

        if (filtered.length > 0) {
            setModalConfig({
                isOpen: true,
                title,
                data: filtered
            });
        }
    };

    const filteredData = reportData
        .filter(item =>
            item.lead_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.work_done_ca_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.team_lead_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.ca_mail?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (!sortConfig) return 0;

            let aValue: any;
            let bValue: any;

            if (sortConfig.key === 'difference') {
                aValue = (a.emails_submitted || 0) - (a.summary_count || 0);
                bValue = (b.emails_submitted || 0) - (b.summary_count || 0);
            } else {
                aValue = a[sortConfig.key as keyof MergedLeadData];
                bValue = b[sortConfig.key as keyof MergedLeadData];
            }

            if (aValue === bValue) return 0;
            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;

            const comparison = aValue < bValue ? -1 : 1;
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                <p className="text-gray-600 font-medium animate-pulse">Generating your report...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Performance Report</h1>
                    <p className="text-gray-500 text-sm mt-1">Daily overview of team productivity and lead status</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                        <Calendar className="h-5 w-5 text-gray-400 ml-2" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="border-none focus:ring-0 text-gray-700 font-medium cursor-pointer"
                        />
                    </div>
                    <button
                        onClick={fetchData}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                        title="Generate Report"
                    >
                        <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="font-semibold text-sm">Generate Report</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Total Leads</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{summary.totalLeads}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-indigo-50 rounded-xl">
                            <Mail className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full uppercase">CA Source</span>
                        </div>
                    </div>
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">CA Management</p>
                    <div className="flex items-baseline gap-1 mt-2">
                        <h3 className="text-2xl font-bold text-gray-900">{summary.caLeadCount}</h3>
                        <span className="text-gray-500 text-sm font-medium">Leads</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-50">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Total Emails: <span className="text-indigo-600">{summary.totalEmails}</span></p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-50 rounded-xl">
                            <Briefcase className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full uppercase">Task Source</span>
                        </div>
                    </div>
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Task Management</p>
                    <div className="flex items-baseline gap-1 mt-2">
                        <h3 className="text-2xl font-bold text-gray-900">{summary.taskLeadCount}</h3>
                        <span className="text-gray-500 text-sm font-medium">Leads</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-50">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Total Count: <span className="text-purple-600">{summary.totalSummaryCount}</span></p>
                    </div>
                </div>

                {/* Card 1: Missing in Task Management */}
                <div
                    onClick={() => handleCardClick('missingTask')}
                    className={`p-6 rounded-2xl border transition-all ${summary.missingTaskCount > 0 ? 'bg-orange-50/50 border-orange-100 cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]' : 'bg-white border-gray-100'} shadow-sm`}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-xl ${summary.missingTaskCount > 0 ? 'bg-orange-100' : 'bg-gray-50'}`}>
                            <AlertCircle className={`h-6 w-6 ${summary.missingTaskCount > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
                        </div>
                        {summary.missingTaskCount > 0 && (
                            <span className="text-[10px] font-bold px-2 py-1 bg-orange-600 text-white rounded-full animate-pulse uppercase">Click to view</span>
                        )}
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Missing in Tasks</p>
                    <h3 className={`text-2xl font-bold mt-1 ${summary.missingTaskCount > 0 ? 'text-orange-700' : 'text-gray-900'}`}>
                        {summary.missingTaskCount} <span className="text-sm font-normal text-gray-500 ml-1">Leads</span>
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-2 uppercase font-semibold tracking-wider">NOT IN TASK MGMT</p>
                </div>

                {/* Card 2: Missing in CA Management */}
                <div
                    onClick={() => handleCardClick('missingCA')}
                    className={`p-6 rounded-2xl border transition-all ${summary.missingCACount > 0 ? 'bg-red-50/50 border-red-100 cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]' : 'bg-white border-gray-100'} shadow-sm`}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-xl ${summary.missingCACount > 0 ? 'bg-red-100' : 'bg-gray-50'}`}>
                            <AlertCircle className={`h-6 w-6 ${summary.missingCACount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                        </div>
                        {summary.missingCACount > 0 && (
                            <span className="text-[10px] font-bold px-2 py-1 bg-red-600 text-white rounded-full animate-pulse uppercase">Click to view</span>
                        )}
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Missing in CA</p>
                    <h3 className={`text-2xl font-bold mt-1 ${summary.missingCACount > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                        {summary.missingCACount} <span className="text-sm font-normal text-gray-500 ml-1">Leads</span>
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-2 uppercase font-semibold tracking-wider">NOT IN CA MGMT</p>
                </div>
            </div>

            {/* Main Content Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col">
                        <h2 className="font-bold text-gray-900 flex items-center space-x-2">
                            <Briefcase className="h-5 w-5 text-blue-600" />
                            <span>Lead Intelligence & Performance</span>
                        </h2>
                        <span className="text-xs text-gray-500 mt-0.5 ml-7">{filteredData.length} active records identified</span>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search leads, CA or TL..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                    </div>
                </div>


                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                                <th className="px-6 py-4 w-16">S.No.</th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('lead_id')}>
                                    <div className="flex items-center space-x-1">
                                        <span>Lead ID</span>
                                        {sortConfig?.key === 'lead_id' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                    </div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('work_done_ca_name')}>
                                    <div className="flex items-center space-x-1">
                                        <span>Client Name</span>
                                        {sortConfig?.key === 'client_name' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                    </div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('work_done_ca_name')}>
                                    <div className="flex items-center space-x-1 text-blue-600">
                                        <Users className="h-3 w-3" />
                                        <span>Career Associate</span>
                                        {sortConfig?.key === 'work_done_ca_name' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                    </div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('team_lead_name')}>
                                    <div className="flex items-center space-x-1">
                                        <span>Team Lead</span>
                                        {sortConfig?.key === 'team_lead_name' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('emails_submitted')}>
                                    <div className="flex items-center justify-center space-x-1">
                                        <span>CA Management</span>
                                        {sortConfig?.key === 'emails_submitted' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('summary_count')}>
                                    <div className="flex items-center justify-center space-x-1">
                                        <span>Task Management</span>
                                        {sortConfig?.key === 'summary_count' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('difference')}>
                                    <div className="flex items-center justify-center space-x-1">
                                        <span>Difference</span>
                                        {sortConfig?.key === 'difference' && (sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-center">Data Sync Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredData.length > 0 ? (
                                filteredData.map((lead, index) => {
                                    const diff = (lead.emails_submitted || 0) - (lead.summary_count || 0);
                                    return (
                                        <tr key={lead.lead_id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                                                {index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 leading-tight">{lead.lead_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-900 font-semibold">{lead.client_name || 'Anonymous Client'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center space-x-1 text-gray-900 font-medium">
                                                        <span>{lead.work_done_ca_name || 'Unassigned'}</span>
                                                    </div>
                                                    <span className="text-gray-500 text-[11px] ml-4">{lead.ca_mail}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center space-x-1 text-gray-700 font-medium">
                                                        <span>{lead.team_lead_name || 'N/A'}</span>
                                                    </div>
                                                    <span className="text-gray-400 text-[10px] ml-4 italic whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{lead.tl_email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${(lead.emails_submitted || 0) > 20 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {lead.emails_submitted || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${(lead.summary_count || 0) > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {lead.summary_count || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${diff === 0 ? 'bg-blue-50 text-blue-600' :
                                                    diff > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {diff > 0 ? `+${diff}` : diff}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {!lead.inDetailed && (
                                                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded uppercase border border-red-200" title="Missing in CA Management API">
                                                            Missing CA
                                                        </span>
                                                    )}
                                                    {!lead.inSummary && (
                                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded uppercase border border-orange-200" title="Missing in Task Management API">
                                                            Missing Task
                                                        </span>
                                                    )}
                                                    {lead.inDetailed && lead.inSummary && (
                                                        <span className="px-2 py-0.5 bg-green-100 text-green-600 text-[10px] font-bold rounded uppercase border border-green-200">
                                                            Synced
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <div className="p-4 bg-gray-50 rounded-full mb-4">
                                                <FileText className="h-12 w-12 text-gray-200" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900">No Data Matches Found</h3>
                                            <p className="max-w-xs mx-auto mt-1">Try adjusting your search criteria or selecting a different reporting date.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for Missing Leads */}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h3 className="font-bold text-gray-900">{modalConfig.title}</h3>
                            <button
                                onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                            <div className="grid grid-cols-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
                                <span>Lead ID</span>
                                <span>Client Name</span>
                            </div>
                            {modalConfig.data.map((item) => (
                                <div key={item.lead_id} className="grid grid-cols-2 p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-blue-200 hover:bg-blue-50/50 transition-all">
                                    <span className="font-bold text-blue-600">{item.lead_id}</span>
                                    <span className="text-gray-700 font-medium truncate" title={item.client_name}>
                                        {item.client_name || 'Anonymous Client'}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
                            <button
                                onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm active:scale-95 text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportPage;
