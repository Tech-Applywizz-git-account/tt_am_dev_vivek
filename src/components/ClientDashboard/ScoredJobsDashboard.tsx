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
import { TrendingUp, Calendar, Zap, Briefcase } from "lucide-react";

// ✅ Types
export interface ChartItem {
    date: string;
    regularCount: number;
    easyApplyCount: number;
}

interface ScoredJobsDashboardProps {
    applywizzId?: string;
}

const ScoredJobsDashboard: React.FC<ScoredJobsDashboardProps> = ({ applywizzId }) => {
    const [chartData, setChartData] = useState<ChartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedCard, setSelectedCard] = useState<string | null>(null);

    // Fetch summary data
    const fetchSummaryData = async () => {
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

            const response = await fetch(`${apiUrl}/api/job-links?lead_id=${applywizzId}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch summary: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Transform data for chart
            const allDates = new Set([
                ...Object.keys(data.regular_jobs || {}),
                ...Object.keys(data.easy_apply_jobs || {})
            ]);

            const formatted: ChartItem[] = Array.from(allDates).map(date => ({
                date,
                regularCount: Number(data.regular_jobs[date] || 0),
                easyApplyCount: Number(data.easy_apply_jobs[date] || 0)
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
    const totalRegular = chartData.reduce((sum, item) => sum + item.regularCount, 0);
    const totalEasyApply = chartData.reduce((sum, item) => sum + item.easyApplyCount, 0);
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

            const regularValue = payload.find((p: any) => p.dataKey === 'regularCount')?.value || 0;
            const easyApplyValue = payload.find((p: any) => p.dataKey === 'easyApplyCount')?.value || 0;

            return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-semibold text-gray-800 mb-2">{formattedDate}</p>
                    <div className="space-y-1">
                        {regularValue > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-sm text-gray-600">Regular:</span>
                                <span className="font-semibold text-gray-900">{regularValue}</span>
                            </div>
                        )}
                        {easyApplyValue > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                <span className="text-sm text-gray-600">Easy Apply:</span>
                                <span className="font-semibold text-gray-900">{easyApplyValue}</span>
                            </div>
                        )}
                        <div className="pt-2 border-t mt-2">
                            <span className="text-sm text-gray-600">Total:</span>
                            <span className="font-bold text-gray-900 ml-2">
                                {regularValue + easyApplyValue}
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Custom bar shape that centers when only one bar type has data
    const CustomBarShape = (props: any) => {
        const { fill, x, y, width, height, payload, dataKey } = props;

        // Check if this is the only bar with data for this date
        const regularCount = payload.regularCount || 0;
        const easyApplyCount = payload.easyApplyCount || 0;
        const bothHaveData = regularCount > 0 && easyApplyCount > 0;

        // Determine which bar this is
        const isRegularBar = dataKey === 'regularCount';
        const isEasyApplyBar = dataKey === 'easyApplyCount';

        // Only render if this bar has data
        const currentValue = isRegularBar ? regularCount : easyApplyCount;
        if (currentValue === 0) {
            return null; // Don't render bars with zero values
        }

        // Calculate bar position and width
        let barX = x;
        let barWidth = width;

        if (!bothHaveData) {
            // When only one bar has data, center it
            // Recharts allocates space for both bars, so we need to shift to center
            barX = x + (width * 0.5);
        }
        // Create a path with rounded top corners only (radius 8)
        const radius = 8;
        const path = `
            M ${barX},${y + radius}
            Q ${barX},${y} ${barX + radius},${y}
            L ${barX + barWidth - radius},${y}
            Q ${barX + barWidth},${y} ${barX + barWidth},${y + radius}
            L ${barX + barWidth},${y + height}
            L ${barX},${y + height}
            Z
        `;

        return (
            <path
                d={path}
                fill={fill}
            />
        );
    };


    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4"
                style={{
                    backgroundColor: '#F1FFF3'
                }}>
                {/* Total Applications Card */}
                <div
                    onClick={() => setSelectedCard('total')}
                    className={`cursor-pointer transition-colors duration-300 rounded-xl p-6 text-gray-900 shadow-lg ${selectedCard === 'total' ? 'bg-[#A0FFAD]' : 'bg-[#87B1FF] hover:bg-[#A0FFAD]'}`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-700 text-sm font-medium">Total Applications</p>
                            <p className="text-3xl font-bold mt-2">{totalApplications}</p>
                        </div>
                        <div className="bg-white/50 p-3 rounded-lg">
                            <TrendingUp size={28} />
                        </div>
                    </div>
                </div>

                {/* Regular Applications Card */}
                <div
                    onClick={() => setSelectedCard('regular')}
                    className={`cursor-pointer transition-colors duration-300 rounded-xl p-6 text-gray-900 shadow-lg ${selectedCard === 'regular' ? 'bg-[#A0FFAD]' : 'bg-[#87B1FF] hover:bg-[#A0FFAD]'}`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-700 text-sm font-medium">Regular Applications</p>
                            <p className="text-3xl font-bold mt-2">{totalRegular}</p>
                            <p className="text-gray-700 text-xs mt-1">
                                {totalApplications > 0 ? Math.round((totalRegular / totalApplications) * 100) : 0}% of total
                            </p>
                        </div>
                        <div className="bg-white/50 p-3 rounded-lg">
                            <Briefcase size={28} />
                        </div>
                    </div>
                </div>

                {/* Easy Apply Card */}
                <div
                    onClick={() => setSelectedCard('easy')}
                    className={`cursor-pointer transition-colors duration-300 rounded-xl p-6 text-gray-900 shadow-lg ${selectedCard === 'easy' ? 'bg-[#A0FFAD]' : 'bg-[#87B1FF] hover:bg-[#A0FFAD]'}`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-700 text-sm font-medium">Easy Apply</p>
                            <p className="text-3xl font-bold mt-2">{totalEasyApply}</p>
                            <p className="text-gray-700 text-xs mt-1">
                                {totalApplications > 0 ? Math.round((totalEasyApply / totalApplications) * 100) : 0}% of total
                            </p>
                        </div>
                        <div className="bg-white/50 p-3 rounded-lg">
                            <Zap size={28} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div
                className="p-6 shadow-lg rounded-xl"
                style={{ backgroundColor: "#F1FFF3" }}>
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Applications Over Time</h2>
                </div>

                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
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
                                    position: "insideLeft",
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
                                shape={<CustomBarShape />}
                                maxBarSize={50}
                            />

                            {/* Easy Apply Bar */}
                            <Bar
                                dataKey="easyApplyCount"
                                name="Easy Apply"
                                fill="url(#colorEasyApply)"
                                shape={<CustomBarShape />}
                                maxBarSize={50}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Calendar size={48} className="mb-4" />
                        <p className="text-lg font-medium">No application data available</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScoredJobsDashboard;
