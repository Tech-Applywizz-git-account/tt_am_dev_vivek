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
import { supabase } from '@/lib/supabaseClient';

// ✅ Types
interface ChartItem {
    date: string;
    count: number;
}

interface ApplicationsOverTimeProps {
    currentUserEmail?: string;
}

const ApplicationsOverTime: React.FC<ApplicationsOverTimeProps> = ({ currentUserEmail }) => {
    const [data, setData] = useState<ChartItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        fetchApplicationsData();
    }, [currentUserEmail]);

    const fetchApplicationsData = async () => {
        if (!currentUserEmail) {
            setError("User email not available");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // First, get the applywizz_id from Supabase based on the user's email
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('applywizz_id')
                .eq('company_email', currentUserEmail)
                .single();

            if (clientError) {
                throw new Error(`Failed to fetch client data: ${clientError.message}`);
            }

            if (!clientData || !clientData.applywizz_id) {
                throw new Error("Applywizz ID not found for this user");
            }

            const applywizzId = clientData.applywizz_id;

            // Now fetch the actual data from the external API
            const apiUrl = import.meta.env.VITE_APPLYWIZZ_API_URL;
            if (!apiUrl) {
                throw new Error('VITE_APPLYWIZZ_API_URL is not defined in environment variables');
            }
            
            const response = await fetch(`${apiUrl}/api/client-tasks?lead_id=${applywizzId}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch data from external API: ${response.status} ${response.statusText}`);
            }

            const apiData = await response.json();
            
            // Transform the API data to match our expected format
            const formattedData: ChartItem[] = Object.entries(apiData.completed_tasks || {})
                .map(([date, count]) => ({ date, count: Number(count) }));

            setData(formattedData);
        } catch (err) {
            console.error("Error fetching applications data:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred");
        } finally {
            setLoading(false);
        }
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
