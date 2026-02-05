import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { TrendingUp, Calendar, Zap, Briefcase } from "lucide-react";

// ✅ Types
export interface ChartItem {
    date: string;
    regularCount: number;
    easyApplyCount: number;
}

interface ApplicationsOverTimeProps {
    data: ChartItem[];
    loading?: boolean;
    error?: string;
}

const ApplicationsOverTime: React.FC<ApplicationsOverTimeProps> = ({ data, loading = false, error = "" }) => {

    // Calculate totals for summary cards
    const totalRegular = data.reduce((sum, item) => sum + item.regularCount, 0);
    const totalEasyApply = data.reduce((sum, item) => sum + item.easyApplyCount, 0);
    const totalApplications = totalRegular + totalEasyApply;

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const date = new Date(label);
            const formattedDate = date.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric"
            });

            return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-semibold text-gray-800 mb-2">{formattedDate}</p>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-sm text-gray-600">Regular:</span>
                            <span className="font-semibold text-gray-900">{payload[0]?.value || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            <span className="text-sm text-gray-600">Easy Apply:</span>
                            <span className="font-semibold text-gray-900">{payload[1]?.value || 0}</span>
                        </div>
                        <div className="pt-2 border-t mt-2">
                            <span className="text-sm text-gray-600">Total:</span>
                            <span className="font-bold text-gray-900 ml-2">
                                {(payload[0]?.value || 0) + (payload[1]?.value || 0)}
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Applications Card */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-indigo-100 text-sm font-medium">Total Applications</p>
                            <p className="text-3xl font-bold mt-2">{totalApplications}</p>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <TrendingUp size={28} />
                        </div>
                    </div>
                </div>

                {/* Regular Applications Card */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Regular Applications</p>
                            <p className="text-3xl font-bold mt-2">{totalRegular}</p>
                            <p className="text-blue-100 text-xs mt-1">
                                {totalApplications > 0 ? Math.round((totalRegular / totalApplications) * 100) : 0}% of total
                            </p>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <Briefcase size={28} />
                        </div>
                    </div>
                </div>

                {/* Easy Apply Card */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-emerald-100 text-sm font-medium">Easy Apply</p>
                            <p className="text-3xl font-bold mt-2">{totalEasyApply}</p>
                            <p className="text-emerald-100 text-xs mt-1">
                                {totalApplications > 0 ? Math.round((totalEasyApply / totalApplications) * 100) : 0}% of total
                            </p>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <Zap size={28} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white p-6 shadow-lg rounded-xl border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg">
                        <Calendar className="text-white" size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Applications Over Time</h2>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-600 font-medium">{error}</p>
                    </div>
                )}

                {!loading && !error && data.length > 0 && (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                        >
                            <defs>
                                <linearGradient id="colorRegular" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.9} />
                                </linearGradient>
                                <linearGradient id="colorEasyApply" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                                </linearGradient>
                            </defs>

                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

                            <XAxis
                                dataKey="date"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                tickFormatter={(value: string) => {
                                    const date = new Date(value);
                                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                    const month = monthNames[date.getMonth()];
                                    const day = String(date.getDate()).padStart(2, "0");
                                    return `${month} ${day}`;
                                }}
                                stroke="#9ca3af"
                            />

                            <YAxis
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                stroke="#9ca3af"
                                label={{
                                    value: "Number of Applications",
                                    angle: -90,
                                    offset: -40,
                                    style: { fill: '#374151', fontSize: 14, fontWeight: 600 }
                                }}
                            />

                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />

                            <Legend
                                wrapperStyle={{
                                    paddingTop: '20px',
                                    fontSize: '14px',
                                    fontWeight: 600
                                }}
                                iconType="circle"
                            />

                            {/* Regular Applications Bar */}
                            <Bar
                                dataKey="regularCount"
                                name="Regular Applications"
                                fill="url(#colorRegular)"
                                radius={[8, 8, 0, 0]}
                                maxBarSize={50}
                            />

                            {/* Easy Apply Bar */}
                            <Bar
                                dataKey="easyApplyCount"
                                name="Easy Apply"
                                fill="url(#colorEasyApply)"
                                radius={[8, 8, 0, 0]}
                                maxBarSize={50}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}

                {!loading && !error && data.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Calendar size={48} className="mb-4" />
                        <p className="text-lg font-medium">No application data available</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApplicationsOverTime;
