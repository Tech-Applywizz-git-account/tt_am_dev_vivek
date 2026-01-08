import React, { useState, useEffect } from "react";
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
import { TrendingUp, Calendar, RefreshCw } from "lucide-react";

// ✅ Types
export interface ChartItem {
    date: string;
    c2cw2Count: number;
}

interface C2CW2JobsDashboardProps {
    applywizzId?: string;
}

const C2CW2JobsDashboard: React.FC<C2CW2JobsDashboardProps> = ({ applywizzId }) => {
    const [chartData, setChartData] = useState<ChartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Fetch summary data
    const fetchSummaryData = async () => {
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

            const response = await fetch(`${apiUrl}/api/job-links?lead_id=${applywizzId}&job_type=C2C,W2`);

            if (!response.ok) {
                throw new Error(`Failed to fetch summary: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Transform data for chart
            const c2cw2Jobs = data.c2cw2_jobs || {};

            const formatted: ChartItem[] = Object.keys(c2cw2Jobs).map(date => ({
                date,
                c2cw2Count: Number(c2cw2Jobs[date] || 0)
            })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setChartData(formatted);
        } catch (err) {
            console.error("Error fetching summary:", err);
            setError(err instanceof Error ? err.message : "Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummaryData();
    }, [applywizzId]);

    // Calculate totals
    const totalc2cw2 = chartData.reduce((sum, item) => sum + item.c2cw2Count, 0);

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
                            <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                            <span className="text-sm text-gray-600">c2cw2 Jobs:</span>
                            <span className="font-semibold text-gray-900">{payload[0]?.value || 0}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 font-medium">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                {/* Total c2cw2 Jobs Card */}
                <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-teal-100 text-sm font-medium">Total c2cw2 Agency Jobs</p>
                            <p className="text-3xl font-bold mt-2">{totalc2cw2}</p>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <RefreshCw size={28} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white p-6 shadow-lg rounded-xl border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-2 rounded-lg">
                        <Calendar className="text-white" size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">c2cw2 Jobs Over Time</h2>
                </div>

                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                            <defs>
                                <linearGradient id="colorc2cw2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#ea580c" stopOpacity={0.9} />
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
                                    value: "Number of c2cw2 Jobs",
                                    angle: -90,
                                    position: "insideLeft",
                                    style: { fill: '#374151', fontSize: 14, fontWeight: 600 }
                                }}
                            />

                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(249, 115, 22, 0.1)' }} />

                            <Legend
                                wrapperStyle={{
                                    paddingTop: '20px',
                                    fontSize: '14px',
                                    fontWeight: 600
                                }}
                                iconType="circle"
                            />

                            {/* c2cw2 Jobs Bar */}
                            <Bar
                                dataKey="c2cw2Count"
                                name="c2cw2 Agency Jobs"
                                fill="url(#colorc2cw2)"
                                radius={[8, 8, 0, 0]}
                                maxBarSize={50}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Calendar size={48} className="mb-4" />
                        <p className="text-lg font-medium">No c2cw2 jobs data available</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default C2CW2JobsDashboard;
