import React from 'react';
import { Client, User } from '../../types';
import { Search, UserPlus, Edit, BarChart3, Zap } from 'lucide-react';
import { format } from 'date-fns';
import FeedbackButton from '../FeedbackButton';

interface ClientsListViewProps {
    currentUser: User | null;
    clients: Client[];
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    setIsClientOnboardingModalOpen: (open: boolean) => void;
    handleClientEdit: (client: Client) => void;
    handleViewClientApplications: (client: Client) => void;
}


export const ClientsListView: React.FC<ClientsListViewProps> = ({
    currentUser,
    clients,
    searchTerm,
    setSearchTerm,
    setIsClientOnboardingModalOpen,
    handleClientEdit,
    handleViewClientApplications,
}) => {
    // Filter clients based on user role and search term
    const getFilteredClients = () => {
        let filteredClients = clients;

        // Filter by role
        if (currentUser?.role === 'career_associate') {
            filteredClients = clients.filter(client => client.careerassociateid === currentUser.id);
        } else if (currentUser?.role === 'ca_team_lead') {
            filteredClients = clients.filter(client => client.careerassociatemanagerid === currentUser.id);
        }

        // Apply search filter
        const search = searchTerm.toLowerCase();
        return filteredClients.filter(client =>
            client.full_name?.toLowerCase().includes(search) ||
            client.personal_email?.toLowerCase().includes(search) ||
            client.company_email?.toLowerCase().includes(search) ||
            (client.applywizz_id && client.applywizz_id.toLowerCase().includes(search)) ||
            (client.job_role_preferences && client.job_role_preferences.some(role => role?.toLowerCase().includes(search)))
        );
    };

    const filteredClients = getFilteredClients();

    const handleStartService = async (client: Client) => {
        if (!client.applywizz_id) {
            alert('Cannot start service: ApplyWizz ID is missing.');
            return;
        }

        if (!window.confirm(`Start scheduling service lifecycle for ${client.full_name}?`)) return;

        try {
            const response = await fetch('/api/scheduling/service-start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applywizzId: client.applywizz_id }),
            });

            const result = await response.json();
            if (response.ok) {
                alert(`✅ Service started successfully for ${client.full_name}`);
            } else {
                alert(`❌ Failed to start service: ${result.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Failed to trigger service start:', err);
            alert('❌ Network error while starting service.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Clients</h1>

                {currentUser?.role === 'sales' && (
                    <button
                        onClick={() => setIsClientOnboardingModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <UserPlus className="h-5 w-5" />
                        <span>Onboard Client</span>
                    </button>
                )}
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search clients by name, email, ApplyWizz ID or roles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="relative w-full max-w-sm mb-4">
                        <h2 className="font-semibold text-gray-900">Client Directory</h2>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No.</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">View Applications</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started Service</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredClients.map((client, index) => (
                                <tr key={client.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {client.full_name}({client.applywizz_id || "Not Found"})
                                            </div>
                                            <div className="text-sm text-gray-500">{client.company_email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleViewClientApplications(client)}
                                            disabled={!client.applywizz_id}
                                            className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-lg transition-colors ${client.applywizz_id
                                                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                            title={client.applywizz_id ? 'View applications' : 'ApplyWizz ID not available'}
                                        >
                                            <BarChart3 className="h-4 w-4" />
                                            <span>View Apps</span>
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleStartService(client)}
                                            disabled={!client.applywizz_id}
                                            className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-lg transition-colors ${client.applywizz_id
                                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                            title={client.applywizz_id ? 'Start service lifecycle' : 'ApplyWizz ID required'}
                                        >
                                            <Zap className="h-3.5 w-3.5" />
                                            <span>Start Service</span>
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {currentUser?.role === 'career_associate' ? (
                                            <button
                                                onClick={() => handleClientEdit(client)}
                                                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                            >
                                                <span>View</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleClientEdit(client)}
                                                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                            >
                                                <Edit className="h-4 w-4" />
                                                <span>Edit</span>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <FeedbackButton user={currentUser} />
        </div>
    );
};
