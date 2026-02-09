import React, { useState, useEffect, useCallback } from 'react';
import { X, Briefcase, AlertTriangle, CheckCircle, Save, Clock, ChevronRight } from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';
import { toast } from 'react-toastify';
import { useAccount } from '../../contexts/AccountContext';
import { supabase } from '../../lib/supabaseClient';

interface ChangeTargetRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail: string;
}

interface ClientAccount {
    applywizz_id: string;
    full_name?: string;
    id: string;
}

export const ChangeTargetRoleModal: React.FC<ChangeTargetRoleModalProps> = ({ isOpen, onClose, userEmail }) => {
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [accounts, setAccounts] = useState<ClientAccount[]>([]);
    const [currentRole, setCurrentRole] = useState<string>('');
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [roleLastUpdated, setRoleLastUpdated] = useState<string | null>(null);
    const [jobRolesData, setJobRolesData] = useState<any[]>([]);
    const [isLoadingJobRoles, setIsLoadingJobRoles] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const { selectedAccountId, setSelectedAccountId } = useAccount();

    const fetchAccounts = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('applywizz_id, full_name, id')
                .eq('company_email', userEmail);

            if (error) throw error;
            if (data && data.length > 0) {
                setAccounts(data);

                // If no account is selected, auto-select the first one to trigger data fetch
                if (!selectedAccountId) {
                    setSelectedAccountId(data[0].id, data.length > 1);
                }
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    }, [userEmail, selectedAccountId, setSelectedAccountId]);

    const fetchClientDetails = useCallback(async (applywizzId: string) => {
        setLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_TICKETING_TOOL_API_URL || '';
            const endpoint = apiUrl ? `${apiUrl}/api/get-client-details` : '/api/get-client-details';
            const response = await fetch(`${endpoint}?applywizz_id=${encodeURIComponent(applywizzId)}`);

            if (!response.ok) throw new Error('Failed to fetch client details');

            const data = await response.json();
            const role = data.client?.job_role_preferences?.[0] || '';
            setCurrentRole(role);
            setSelectedRole(role);
            setRoleLastUpdated(data.client?.role_last_updated || null);
        } catch (error) {
            console.error('Error fetching client details:', error);
            toast.error('Failed to load current role information');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchJobRoles = async () => {
        setIsLoadingJobRoles(true);
        try {
            const response = await fetch('https://dashboard.apply-wizz.com/api/all-job-roles/', {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (Array.isArray(data)) {
                setJobRolesData(data);
            }
        } catch (error) {
            console.error('Error fetching job roles:', error);
        } finally {
            setIsLoadingJobRoles(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchAccounts();
            fetchJobRoles();
        }
    }, [isOpen, fetchAccounts]);

    useEffect(() => {
        if (selectedAccountId && accounts.length > 0) {
            const account = accounts.find(acc => acc.id === selectedAccountId);
            if (account?.applywizz_id) {
                fetchClientDetails(account.applywizz_id);
            }
        }
    }, [selectedAccountId, accounts, fetchClientDetails]);

    const check24HourLimit = (): boolean => {
        if (!roleLastUpdated) return true;

        const lastUpdated = new Date(roleLastUpdated).getTime();
        const now = new Date().getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        return (now - lastUpdated) >= twentyFourHours;
    };

    const getTimeRemaining = (): string => {
        if (!roleLastUpdated) return '';

        const lastUpdated = new Date(roleLastUpdated).getTime();
        const now = new Date().getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        const remaining = twentyFourHours - (now - lastUpdated);

        if (remaining <= 0) return '';

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}h ${minutes}m`;
    };

    const handleSave = async () => {
        if (!selectedRole) {
            toast.error('Please select a job role');
            return;
        }

        if (selectedRole === currentRole) {
            toast.info('New role is the same as the current role');
            onClose();
            return;
        }

        if (!check24HourLimit()) {
            toast.error(`You can only change your role once every 24 hours. Please wait ${getTimeRemaining()}.`);
            return;
        }

        setShowConfirm(true);
    };

    const confirmSave = async () => {
        setShowConfirm(false);
        setIsSaving(true);
        const toastId = toast.loading('Updating target role...');

        try {
            const account = accounts.find(acc => acc.id === selectedAccountId);
            if (!account?.applywizz_id) throw new Error('Account information not found');

            const apiUrl = import.meta.env.VITE_TICKETING_TOOL_API_URL || '';
            const syncEndpoint = apiUrl ? `${apiUrl}/api/sync-client` : '/api/sync-client';
            const syncApiKey = import.meta.env.VITE_SYNC_API_KEY;

            const payload = {
                applywizz_id: account.applywizz_id,
                job_role_preferences: [selectedRole],
                alternate_job_roles: [], // Clear alternate roles when target role changes
                role_last_updated: new Date().toISOString()
            };

            const response = await fetch(syncEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${syncApiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update target role');
            }

            toast.update(toastId, {
                render: 'Target role updated successfully!',
                type: 'success',
                isLoading: false,
                autoClose: 3000,
            });

            onClose();
        } catch (error: any) {
            console.error('Save error:', error);
            toast.update(toastId, {
                render: error.message || 'Failed to update target role',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[70] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        {/* <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-200">
                            <Briefcase className="h-5 w-5 text-white" />
                        </div> */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 leading-tight">Change Target Role</h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/80 transition-colors text-gray-400 hover:text-gray-600 shadow-sm"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                            <p className="text-sm text-gray-500 font-medium">Loading role information...</p>
                        </div>
                    ) : (
                        <>
                            {/* Current Role Display */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Current Target Role</label>
                                <div className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    {currentRole || 'Not specified'}
                                </div>
                            </div>

                            {/* Warning Text */}
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-800 leading-relaxed font-medium">
                                    You can change the target role only <span className="font-bold">once within 24 hours</span>.
                                    (We suggest you to change your resume based on new target role).
                                    You will get new jobs for new role from tomorrow onwards.
                                </div>
                            </div>

                            {/* New Role Selection */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">Select New Target Role</label>
                                <CustomSelect
                                    value={selectedRole}
                                    onChange={setSelectedRole}
                                    options={jobRolesData.map(role => role.name)}
                                    placeholder={isLoadingJobRoles ? "Loading job roles..." : "Select Job Role"}
                                    disabled={isSaving || isLoadingJobRoles || !check24HourLimit()}
                                    maxVisibleOptions={5}
                                    className="w-full"
                                />
                                {!check24HourLimit() && (
                                    <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold mt-1 bg-red-50 p-2 rounded-lg border border-red-100">
                                        <Clock className="h-3.5 w-3.5" />
                                        Next change available in: {getTimeRemaining()}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-white transition-all disabled:opacity-50 text-sm shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || loading || !check24HourLimit() || selectedRole === currentRole}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg shadow-blue-200 flex justify-center items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Save Change
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Custom Styled Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowConfirm(false)}></div>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-4 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="h-8 w-8 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Role Change</h3>
                            <div className="text-gray-600 text-sm mb-6 space-y-3">
                                <p>Are you sure you want to change your target role to:</p>
                                <div className="flex items-center justify-center gap-2 font-bold text-blue-700 bg-blue-50 py-2 px-3 rounded-lg border border-blue-100">
                                    <span className="text-gray-500 font-medium line-through">{currentRole}</span>
                                    <ChevronRight className="h-4 w-4 text-blue-400" />
                                    <span>{selectedRole}</span>
                                </div>
                                <p className="text-xs text-amber-600 font-semibold italic">Remember: You won't be able to change it again for 24 hours.</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors text-sm"
                                >
                                    No, Keep it
                                </button>
                                <button
                                    onClick={confirmSave}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors text-sm shadow-md shadow-blue-100"
                                >
                                    Yes, Change it
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
