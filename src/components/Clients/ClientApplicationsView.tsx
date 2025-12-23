import React, { useState, useEffect } from 'react';
import { ArrowLeft, User } from 'lucide-react';
import ApplicationsOverTime, { ChartItem } from '../ClientDashboard/ApplicationsOverTime';
import ApplicationSummaryList, { TaskCount } from '../ClientDashboard/ApplicationSummaryList';
import { Client } from '../../types';

interface ClientApplicationsViewProps {
    client: Client | null;
    onBack: () => void;
}

export const ClientApplicationsView: React.FC<ClientApplicationsViewProps> = ({ client, onBack }) => {
    const [applicationData, setApplicationData] = useState<ChartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!client || !client.applywizz_id) {
                setError('No client selected or ApplyWizz ID not available');
                return;
            }

            try {
                setLoading(true);
                setError('');

                // Fetch application data from external API
                const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL1;
                if (!apiUrl) {
                    throw new Error('API URL not configured (VITE_EXTERNAL_API_URL1)');
                }

                const response = await fetch(`${apiUrl}/api/client-tasks?lead_id=${client.applywizz_id}`);

                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
                }

                const apiData = await response.json();

                // Transform the API data
                const allDates = new Set([
                    ...Object.keys(apiData.completed_tasks || {}),
                    ...Object.keys(apiData.easy_apply_tasks || {})
                ]);

                const formattedData: TaskCount[] = Array.from(allDates).map(date => ({
                    date,
                    regularCount: Number(apiData.completed_tasks[date] || 0),
                    easyApplyCount: Number(apiData.easy_apply_tasks[date] || 0)
                })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                setApplicationData(formattedData);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [client]);

    if (!client) {
        return (
            <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                    <p className="text-yellow-800 text-lg">No client selected</p>
                    <button
                        onClick={onBack}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Back to Clients
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Client Info and Back Button */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={onBack}
                            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            <span>Back to Clients</span>
                        </button>
                        <div className="border-l pl-4">
                            <h1 className="text-2xl font-bold text-gray-900">Client Applications</h1>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                                <User className="h-4 w-4" />
                                <span className="font-medium">{client.full_name}</span>
                                <span className="text-gray-400">•</span>
                                <span>{client.company_email}</span>
                                <span className="text-gray-400">•</span>
                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                    ID: {client.applywizz_id || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 text-lg">Loading application data...</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <h2 className="text-red-800 font-semibold text-lg mb-2">Error Loading Data</h2>
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={onBack}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Back to Clients
                    </button>
                </div>
            )}

            {/* Data Display */}
            {!loading && !error && (
                <>
                    <ApplicationsOverTime
                        data={applicationData}
                        loading={loading}
                        error={error}
                    />

                    {/* Daily Application Summary List */}
                    <ApplicationSummaryList
                        data={applicationData}
                        loading={loading}
                        error={error}
                        applywizzId={client.applywizz_id}
                    />
                </>
            )}

            {/* Empty State */}
            {!loading && !error && applicationData.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                    <p className="text-yellow-800 text-lg">
                        No application data found for this client.
                    </p>
                </div>
            )}
        </div>
    );
};
