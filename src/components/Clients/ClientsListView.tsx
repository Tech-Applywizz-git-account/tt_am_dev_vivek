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

    const [isServiceStartModalOpen, setIsServiceStartModalOpen] = React.useState(false);
    const [selectedClientForService, setSelectedClientForService] = React.useState<Client | null>(null);
    const [serviceStartDate, setServiceStartDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
    const [subscriptionType, setSubscriptionType] = React.useState<string>('');
    const [isSubmittingService, setIsSubmittingService] = React.useState(false);

    const handleStartService = (client: Client) => {
        if (!client.applywizz_id) {
            alert('Cannot start service: ApplyWizz ID is missing.');
            return;
        }
        setSelectedClientForService(client);
        setSubscriptionType(client.subscription_type || '');
        setIsServiceStartModalOpen(true);
    };

    const handleConfirmServiceStart = async () => {
        if (!selectedClientForService) return;

        setIsSubmittingService(true);
        try {
            const response = await fetch('/api/scheduling/service-start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    applywizzId: selectedClientForService.applywizz_id,
                    serviceStartDate,
                    subscriptionType
                }),
            });

            const result = await response.json();
            if (response.ok) {
                alert(`✅ Service successfully scheduled for ${selectedClientForService.full_name}`);
                setIsServiceStartModalOpen(false);
            } else {
                alert(`❌ Oops! ${result.error || 'Failed to start service'}`);
            }
        } catch (err) {
            console.error('Failed to trigger service start:', err);
            alert('❌ Network error while starting service.');
        } finally {
            setIsSubmittingService(false);
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

                {/* Service Start Confirmation Modal */}
                {isServiceStartModalOpen && selectedClientForService && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmittingService && setIsServiceStartModalOpen(false)}></div>
                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                                        <Zap className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">Start Service Lifecycle</h3>
                                </div>
                                <button
                                    onClick={() => setIsServiceStartModalOpen(false)}
                                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                    disabled={isSubmittingService}
                                >
                                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-sm text-blue-800">
                                    <p>You are about to start the scheduling lifecycle for:</p>
                                    <p className="font-bold text-blue-900 mt-0.5">{selectedClientForService.full_name}</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Service Start Date</label>
                                        <input
                                            type="date"
                                            value={serviceStartDate}
                                            onChange={(e) => setServiceStartDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Subscription Tier (Duration)</label>
                                        <select
                                            value={subscriptionType}
                                            onChange={(e) => setSubscriptionType(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                                        >
                                            <option value="">Select Duration</option>
                                            <option value="30">30 Days</option>
                                            <option value="60">60 Days</option>
                                            <option value="90">90 Days</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex space-x-3 pt-2">
                                    <button
                                        onClick={() => setIsServiceStartModalOpen(false)}
                                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                        disabled={isSubmittingService}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmServiceStart}
                                        disabled={isSubmittingService || !subscriptionType || !serviceStartDate}
                                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center space-x-2"
                                    >
                                        {isSubmittingService ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Scheduling...</span>
                                            </>
                                        ) : (
                                            <span>Schedule Lifecycle</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <FeedbackButton user={currentUser} />
        </div>
    );
};
