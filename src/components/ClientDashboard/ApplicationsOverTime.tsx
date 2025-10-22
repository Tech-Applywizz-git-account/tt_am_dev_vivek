import React, { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

// ✅ Types
interface ChartItem {
    date: string;
    count: number;
}

const ApplicationsOverTime: React.FC = () => {
    const [data, setData] = useState<ChartItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        fetchApplicationsData();
    }, []);

    const fetchApplicationsData = async () => {
        setLoading(true);
        setTimeout(() => {
            const completedTasks: Record<string, number> = {
                "2025-09-01": 3,
                "2025-09-02": 5,
                "2025-09-03": 22,
                "2025-09-04": 7,
                "2025-09-05": 4,
                "2025-09-06": 6,
                "2025-09-07": 8,
            };

            const formattedData: ChartItem[] = Object.entries(completedTasks).map(
                ([date, count]) => ({
                    date,
                    count,
                })
            );

            setData(formattedData);
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="bg-white p-4 shadow rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Application Summary</h2>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-600">{error}</p>}

            {!loading && data.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="date"
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            tickFormatter={(value: string) => {
                                const date = new Date(value);
                                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                const month = monthNames[date.getMonth()];
                                const day = String(date.getDate()).padStart(2, "0");
                                return `${month}-${day}`;
                            }}
                            label={{
                                value: "Application Dates",
                                position: "insideBottom",
                                offset: -5,
                                fill: "#000",
                            }}
                            stroke="#1d4ed8"
                        />


                        <YAxis
                            label={{
                                value: "Number of Applications",
                                angle: -90,
                                position: "outsideLeft",
                                fill: "#000",
                            }}
                            stroke="#1d4ed8"
                        />
                        <Tooltip />
                        <Bar
                            type="monotone"
                            dataKey="count"
                            fill="#3b82f6"
                            strokeWidth={3}
                        />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};

export default ApplicationsOverTime;
