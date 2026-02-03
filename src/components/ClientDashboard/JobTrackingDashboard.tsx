import React, { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import NextStepsJobsList from './NextStepsJobsList';

interface JobTrackingDashboardProps {
    currentUserEmail?: string;
}

const JobTrackingDashboard: React.FC<JobTrackingDashboardProps> = ({ currentUserEmail }) => {
    const [appliedJobsCount, setAppliedJobsCount] = useState<number>(0);
    const [nextStepsCount, setNextStepsCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [showNextStepsList, setShowNextStepsList] = useState<boolean>(false);

    useEffect(() => {
        const fetchJobData = async () => {
            if (!currentUserEmail) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError('');

                // Fetch applied jobs count (status = 'applied')
                const { count: appliedCount, error: appliedError } = await supabase
                    .from('jobs')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_email', currentUserEmail)
                    .eq('category', 'application_submitted');

                if (appliedError) {
                    throw new Error(`Failed to fetch applied jobs: ${appliedError.message}`);
                }

                // Fetch next steps count (category != 'application_submitted')
                // This assumes "next steps" are jobs that need follow-up actions
                const { count: nextCount, error: nextError } = await supabase
                    .from('jobs')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_email', currentUserEmail)
                    .eq('category', 'next_steps');

                if (nextError) {
                    throw new Error(`Failed to fetch next steps: ${nextError.message}`);
                }

                setAppliedJobsCount(appliedCount || 0);
                setNextStepsCount(nextCount || 0);
            } catch (err) {
                console.error('Error fetching job data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load job data');
            } finally {
                setLoading(false);
            }
        };

        fetchJobData();
    }, [currentUserEmail]);

    const handleGoogleConnect = () => {
        // Redirect to external job tracking system
        window.location.href = 'https://www.job-tracking-ai.apply-wizz.me/login-page';
    };

    // If showing next steps list, render that component instead
    if (showNextStepsList) {
        return (
            <NextStepsJobsList
                userEmail={currentUserEmail}
                onBack={() => setShowNextStepsList(false)}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Heading */}
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Application Tracking System</h1>
                    <p className="text-gray-600 mt-2">Track and manage your job applications</p>
                </div>

                {/* Connect with Google Button */}
                <button
                    onClick={handleGoogleConnect}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md hover:border-gray-400 transition-all duration-200 group"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span className="font-medium text-gray-700 group-hover:text-gray-900">
                        Connect with Google
                    </span>
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 font-medium">{error}</p>
                </div>
            )}

            {/* Cards Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Applied Jobs Card */}
                <div
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8 shadow-lg border border-blue-200 hover:shadow-xl transition-shadow duration-300 cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="bg-blue-500 p-4 rounded-lg shadow-md group-hover:scale-110 transition-transform duration-300">
                            <CheckCircle className="h-8 w-8 text-white" />
                        </div>
                        <ArrowRight className="h-6 w-6 text-blue-600 group-hover:translate-x-2 transition-transform duration-300" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Applied Jobs</h2>
                    <p className="text-gray-600 mb-4">View all jobs you've applied to</p>

                    <div className="mt-6 pt-6 border-t border-blue-200">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Total Applications</span>
                            {loading ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            ) : (
                                <span className="text-3xl font-bold text-blue-600">{appliedJobsCount}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Next Steps Card */}
                <div
                    onClick={() => setShowNextStepsList(true)}
                    className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-8 shadow-lg border border-green-200 hover:shadow-xl transition-shadow duration-300 cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="bg-green-500 p-4 rounded-lg shadow-md group-hover:scale-110 transition-transform duration-300">
                            <ArrowRight className="h-8 w-8 text-white" />
                        </div>
                        <ArrowRight className="h-6 w-6 text-green-600 group-hover:translate-x-2 transition-transform duration-300" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Next Steps</h2>
                    <p className="text-gray-600 mb-4">Actions required on your applications</p>

                    <div className="mt-6 pt-6 border-t border-green-200">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Pending Actions</span>
                            {loading ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            ) : (
                                <span className="text-3xl font-bold text-green-600">{nextStepsCount}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Section */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Getting Started</h3>
                <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span>Click on "Applied Jobs" to view all your job applications</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        <span>Check "Next Steps" for follow-up actions on your applications</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-purple-500 mr-2">•</span>
                        <span>Stay organized and never miss an opportunity</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default JobTrackingDashboard;
