import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, User as UserIcon, Mail, Phone, MapPin, Briefcase, DollarSign, FileText, Github, Linkedin, Download, Upload, Edit, Save, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-toastify';
import { useAccount } from '../../contexts/AccountContext';
import { uploadResumeToS3 } from '../../services/s3Service';
import { CustomSelect } from '../common/CustomSelect';
import { CustomMultiSelect } from '../common/CustomMultiSelect';

interface UserProfileViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail: string;
}

interface ClientAccount {
    applywizz_id: string;
    full_name?: string;
    id: string;
}

interface ClientData {
    full_name: string;
    company_email?: string;
    personal_email?: string;
    whatsapp_number?: string;
    callable_phone?: string;
    applywizz_id: string;
    job_role_preferences?: string[];
    salary_range?: string;
    visa_type?: string;
    sponsorship?: boolean;
    location_preferences?: string[];
}

interface AdditionalClientData {
    gender?: string;
    state_of_residence?: string;
    zip_or_country?: string;
    experience?: string;
    work_preferences?: string;
    willing_to_relocate?: boolean;
    github_url?: string;
    linked_in_url?: string;
    resume_s3_path?: string;
    resume_path?: string;
    resume_url?: string;
    start_date?: string;
    desired_start_date?: string;
    alternate_job_roles?: string[];
}

interface ProfileData {
    client: ClientData | null;
    additional_information: AdditionalClientData | null;
}

export const UserProfileViewModal: React.FC<UserProfileViewModalProps> = ({ isOpen, onClose, userEmail }) => {
    const [loading, setLoading] = useState(false);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [accounts, setAccounts] = useState<ClientAccount[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Job roles state
    const [jobRolesData, setJobRolesData] = useState<any[]>([]);
    const [isLoadingJobRoles, setIsLoadingJobRoles] = useState(false);

    const { selectedAccountId, setSelectedAccountId } = useAccount();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch all accounts for the user's email
    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('applywizz_id, full_name, id')
                .eq('company_email', userEmail);

            if (error) {
                console.error('Error fetching accounts:', error);
                toast.error('Failed to load accounts.');
                return;
            }

            if (data && data.length > 0) {
                const validAccounts = data.filter(acc => acc.id && acc.applywizz_id);
                setAccounts(validAccounts);

                // Check if current selectedAccountId is valid for this user's accounts
                const isCurrentSelectionValid = selectedAccountId && validAccounts.some(acc => acc.id === selectedAccountId);

                // Only set to first account if:
                // 1. No account is currently selected, OR
                // 2. Current selection is not valid for this user
                if (!isCurrentSelectionValid && validAccounts.length > 0) {
                    // Use shouldPersist based on number of accounts
                    const shouldPersist = validAccounts.length > 1;
                    setSelectedAccountId(validAccounts[0].id, shouldPersist);
                }
            } else {
                toast.error('No accounts found for this email.');
            }
        } catch (error) {
            console.error('Error in fetchAccounts:', error);
            toast.error('An unexpected error occurred while loading accounts.');
        } finally {
            setLoading(false);
        }
    }, [userEmail, selectedAccountId, setSelectedAccountId]);

    // Fetch profile data using the API endpoint
    const fetchProfileData = useCallback(async (applywizzId: string) => {
        setLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_TICKETING_TOOL_API_URL || '';
            const endpoint = apiUrl ? `${apiUrl}/api/get-client-details` : '/api/get-client-details';

            const response = await fetch(`${endpoint}?applywizz_id=${encodeURIComponent(applywizzId)}`);

            if (!response.ok) {
                throw new Error('Failed to fetch profile data');
            }

            const data: ProfileData = await response.json();
            setProfileData(data);
        } catch (error) {
            console.error('Error fetching profile data:', error);
            toast.error('Failed to load profile data');
        } finally {
            setLoading(false);
        }
    }, []);

    // Constants for dropdown options
    const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer Not to Say"];
    const WORK_AUTH_OPTIONS = ["F1", "H1B", "Green Card", "Citizen", "H4EAD", "Other"];
    const WORK_PREF_OPTIONS = ["Remote", "Hybrid", "On-site", "All"];
    const SALARY_RANGE_OPTIONS = [
        "$50,000 - $70,000",
        "$70,000 - $90,000",
        "$90,000 - $120,000",
        "$120,000 - $150,000",
        "$150,000 - $200,000",
        "$200,000+"
    ];
    const EXPERIENCE_OPTIONS = [
        "1 Year", "2 Years", "3 Years", "4 Years", "5 Years",
        "6 Years", "7 Years", "8 Years", "9 Years", "10 Years",
        "11 Years", "12 Years", "13 Years", "14 Years", "15 Years", "15+ Years"
    ];
    const US_STATES = [
        "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
        "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
        "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
        "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
        "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
        "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
        "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
        "Wisconsin", "Wyoming", "Other"
    ];



    // Fetch job roles from API on mount
    useEffect(() => {
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

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    setJobRolesData(data);
                } else {
                    setJobRolesData([]);
                }
            } catch (error) {
                console.error('Error fetching job roles:', error);
                setJobRolesData([]);
            } finally {
                setIsLoadingJobRoles(false);
            }
        };

        fetchJobRoles();
    }, []);

    // Fetch accounts when modal opens
    useEffect(() => {
        if (isOpen && userEmail) {
            fetchAccounts();
        }
    }, [isOpen, userEmail, fetchAccounts]);

    // Fetch profile data when selected account changes
    useEffect(() => {
        if (selectedAccountId) {
            // Look up the applywizz_id from the accounts array using the selected id
            const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
            if (selectedAccount?.applywizz_id) {
                fetchProfileData(selectedAccount.applywizz_id);
            }
        }
    }, [selectedAccountId, accounts, fetchProfileData]);

    // Initialize form data when profile data loads
    useEffect(() => {
        if (profileData && !isEditMode) {
            const client = profileData.client;
            const additional = profileData.additional_information;

            setFormData({
                gender: additional?.gender || '',
                state_of_residence: additional?.state_of_residence || '',
                experience: additional?.experience || '',
                visa_type: client?.visa_type || '',
                work_preferences: additional?.work_preferences || '',
                sponsorship: client?.sponsorship ? 'Yes' : 'No',
                salary_range: client?.salary_range || '',
                willing_to_relocate: additional?.willing_to_relocate ? 'Yes' : 'No',
                github_url: additional?.github_url || '',
                linked_in_url: additional?.linked_in_url || '',
                job_role_preferences: Array.isArray(client?.job_role_preferences) ? client.job_role_preferences : [],
                alternate_job_roles: Array.isArray(additional?.alternate_job_roles) ? additional.alternate_job_roles : []
            });
        }
    }, [profileData, isEditMode]);

    // Handle entering edit mode
    const handleEditMode = () => {
        setIsEditMode(true);
        setValidationErrors({});
    };

    // Handle form input changes
    const handleInputChange = (field: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
        // Clear validation error for this field
        if (validationErrors[field]) {
            setValidationErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // Validate form data
    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        // No validation needed based on requirements
        // GitHub/LinkedIn URLs: no validation
        // Other fields: dropdown selections are inherently valid

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Handle save changes
    const handleSaveChanges = async () => {
        if (!validateForm()) {
            toast.error('Please fix validation errors');
            return;
        }

        const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
        if (!selectedAccount?.applywizz_id) {
            toast.error('Unable to identify user account');
            return;
        }

        setIsSaving(true);
        const toastId = toast.loading('Saving changes...');

        try {
            const apiUrl = import.meta.env.VITE_TICKETING_TOOL_API_URL || '';
            const syncEndpoint = apiUrl ? `${apiUrl}/api/sync-client` : '/api/sync-client';
            const syncApiKey = import.meta.env.VITE_SYNC_API_KEY;

            // Prepare payload
            const payload: any = {
                applywizz_id: selectedAccount.applywizz_id,
                gender: formData.gender,
                state_of_residence: formData.state_of_residence,
                experience: formData.experience,
                visa_type: formData.visa_type,
                work_preferences: formData.work_preferences,
                sponsorship: formData.sponsorship === 'Yes',
                salary_range: formData.salary_range,
                willing_to_relocate: formData.willing_to_relocate === 'Yes',
                github_url: formData.github_url,
                linked_in_url: formData.linked_in_url,
                job_role_preferences: formData.job_role_preferences,
                alternate_job_roles: formData.alternate_job_roles
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
                throw new Error(errorData.error || 'Failed to save changes');
            }

            toast.update(toastId, {
                render: 'Profile updated successfully!',
                type: 'success',
                isLoading: false,
                autoClose: 3000,
            });

            // Refresh profile data
            await fetchProfileData(selectedAccount.applywizz_id);
            setIsEditMode(false);

        } catch (error: any) {
            console.error('Save error:', error);
            toast.update(toastId, {
                render: error.message || 'Failed to save changes',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Handle cancel edit mode
    const handleCancelEdit = () => {
        const client = profileData?.client;
        const additional = profileData?.additional_information;

        setIsEditMode(false);
        setValidationErrors({});
        // Reset form data to original values
        setFormData({
            gender: additional?.gender || '',
            state_of_residence: additional?.state_of_residence || '',
            experience: additional?.experience || '',
            visa_type: client?.visa_type || '',
            work_preferences: additional?.work_preferences || '',
            sponsorship: client?.sponsorship ? 'Yes' : 'No',
            salary_range: client?.salary_range || '',
            willing_to_relocate: additional?.willing_to_relocate ? 'Yes' : 'No',
            github_url: additional?.github_url || '',
            linked_in_url: additional?.linked_in_url || '',
            job_role_preferences: Array.isArray(client?.job_role_preferences) ? client.job_role_preferences : [],
            alternate_job_roles: Array.isArray(additional?.alternate_job_roles) ? additional.alternate_job_roles : []
        });
    };

    if (!isOpen) return null;

    const client = profileData?.client;
    const additional = profileData?.additional_information;

    // Helper to display value or "Not specified"
    const displayValue = (value: any): string => {
        if (value === null || value === undefined || value === '') return 'Not specified';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'Not specified';
        return String(value);
    };

    // Handle resume download
    const handleResumeDownload = () => {
        // Check for resume in order of preference: resume_url, resume_path, resume_s3_path
        const resumePath = additional?.resume_url || additional?.resume_path || additional?.resume_s3_path;

        if (resumePath) {
            // If it's already a full URL, use it directly
            if (resumePath.startsWith('http://') || resumePath.startsWith('https://')) {
                window.open(resumePath, '_blank', 'noopener,noreferrer');
            } else {
                // Otherwise, construct the S3 URL
                const s3Url = `https://applywizz-prod.s3.us-east-2.amazonaws.com/${resumePath}`;
                window.open(s3Url, '_blank', 'noopener,noreferrer');
            }
        }
    };

    // Handle resume change button click
    const handleChangeResumeClick = () => {
        fileInputRef.current?.click();
    };

    // Handle file selection
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Please upload a PDF or Word document');
            return;
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            toast.error('File size must be less than 5MB');
            return;
        }

        // Get the current applywizz_id
        const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
        if (!selectedAccount?.applywizz_id) {
            toast.error('Unable to identify user account');
            return;
        }

        setUploading(true);
        const toastId = toast.loading('Uploading resume...');

        try {
            // Step 1: Upload to S3
            const s3Key = await uploadResumeToS3(file, selectedAccount.applywizz_id);

            // Step 2: Construct full S3 URL
            const bucket = import.meta.env.VITE_AWS_S3_BUCKET || 'applywizz-prod';
            const region = import.meta.env.VITE_AWS_REGION || 'us-east-2';
            const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;

            // Step 3: Sync to Supabase and Django via /api/sync-client
            const apiUrl = import.meta.env.VITE_TICKETING_TOOL_API_URL || '';
            const syncEndpoint = apiUrl ? `${apiUrl}/api/sync-client` : '/api/sync-client';
            const syncApiKey = import.meta.env.VITE_SYNC_API_KEY;

            const syncResponse = await fetch(syncEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${syncApiKey}`
                },
                body: JSON.stringify({
                    applywizz_id: selectedAccount.applywizz_id,
                    resume_path: s3Key,
                    resume_url: s3Url
                })
            });

            if (!syncResponse.ok) {
                const errorData = await syncResponse.json();
                throw new Error(errorData.error || 'Failed to sync resume data');
            }

            toast.update(toastId, {
                render: 'Resume updated successfully!',
                type: 'success',
                isLoading: false,
                autoClose: 3000,
            });

            // Refresh profile data to show new resume
            await fetchProfileData(selectedAccount.applywizz_id);

        } catch (error: any) {
            console.error('Resume upload error:', error);
            toast.update(toastId, {
                render: error.message || 'Failed to upload resume',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
            });
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <div className="flex justify-between items-start gap-6">
                        {/* Title with Edit Button */}
                        <div className="flex-shrink-0 flex items-center gap-3">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
                                <p className="text-sm text-gray-500 mt-1">View your profile information</p>
                            </div>
                            {!isEditMode && !loading && client && (
                                <button
                                    onClick={handleEditMode}
                                    className="p-2 rounded-full hover:bg-blue-50 transition-colors text-blue-600 hover:text-blue-700"
                                    title="Edit Profile"
                                    aria-label="Edit Profile"
                                >
                                    <Edit className="h-5 w-5" />
                                </button>
                            )}
                        </div>

                        {/* Right side: Account Selector and Close Button */}
                        <div className="flex items-center gap-4">
                            {/* Account Selector - Show only if multiple accounts */}
                            {accounts.length > 1 && (
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-lg border border-blue-200 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                            Select Account :
                                        </label>
                                        <select
                                            value={selectedAccountId || ''}
                                            onChange={(e) => setSelectedAccountId(e.target.value, true)}
                                            className="px-4 py-2 border border-blue-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[220px] bg-white shadow-sm hover:border-blue-400 transition-colors cursor-pointer"
                                        >
                                            {accounts.map((account) => (
                                                <option key={account.id} value={account.id}>
                                                    {account.full_name || account.applywizz_id}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                                title="Close"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="space-y-6 animate-pulse">
                            {/* Personal Information Skeleton */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="h-6 bg-gray-200 rounded w-48"></div>
                                    <div className="h-10 bg-gray-200 rounded w-32"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <div key={i}>
                                            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                                            <div className="h-12 bg-gray-100 rounded-lg border border-gray-200"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Work Details Skeleton */}
                            <div>
                                <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i}>
                                            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                                            <div className="h-12 bg-gray-100 rounded-lg border border-gray-200"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Preferences Skeleton */}
                            <div>
                                <div className="h-6 bg-gray-200 rounded w-36 mb-4"></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[1, 2].map((i) => (
                                        <div key={i}>
                                            <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
                                            <div className="h-12 bg-gray-100 rounded-lg border border-gray-200"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Professional Links Skeleton */}
                            <div>
                                <div className="h-6 bg-gray-200 rounded w-44 mb-4"></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[1, 2].map((i) => (
                                        <div key={i}>
                                            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                                            <div className="h-12 bg-gray-100 rounded-lg border border-gray-200"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : !client ? (
                        <div className="text-center py-12 text-gray-500">
                            No profile data available
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Personal Information Section */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <UserIcon className="h-5 w-5 text-blue-600" />
                                        Personal Information
                                    </h3>
                                    {/* Resume Buttons */}
                                    <div className="flex items-center gap-2">
                                        {(additional?.resume_url || additional?.resume_path || additional?.resume_s3_path) && (
                                            <button
                                                onClick={handleResumeDownload}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                                            >
                                                <Download className="h-4 w-4" />
                                                View Resume
                                            </button>
                                        )}
                                        <button
                                            onClick={handleChangeResumeClick}
                                            disabled={uploading}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Upload className="h-4 w-4" />
                                            {uploading ? 'Uploading...' : (additional?.resume_url || additional?.resume_path || additional?.resume_s3_path) ? 'Change Resume' : 'Upload Resume'}
                                        </button>
                                        {/* Hidden file input */}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                        <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                                            {displayValue(client.full_name)}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-500" />
                                            {displayValue(client.company_email || client.personal_email)}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-gray-500" />
                                            {displayValue(client.whatsapp_number || client.callable_phone)}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                        {isEditMode ? (
                                            <div>
                                                <CustomSelect
                                                    value={formData.gender || ''}
                                                    onChange={(value) => handleInputChange('gender', value)}
                                                    options={GENDER_OPTIONS}
                                                    placeholder="Select Gender"
                                                    disabled={isSaving}
                                                    maxVisibleOptions={4}
                                                />
                                                {validationErrors.gender && (
                                                    <p className="text-red-500 text-xs mt-1">{validationErrors.gender}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                                                {displayValue(additional?.gender)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">State of Residence</label>
                                        {isEditMode ? (
                                            <div>
                                                {formData.state_of_residence === 'Other' || (formData.state_of_residence && !US_STATES.includes(formData.state_of_residence)) ? (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={formData.state_of_residence === 'Other' ? '' : formData.state_of_residence}
                                                            onChange={(e) => handleInputChange('state_of_residence', e.target.value)}
                                                            disabled={isSaving}
                                                            placeholder="Enter state/country"
                                                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        />
                                                        <button
                                                            onClick={() => handleInputChange('state_of_residence', '')}
                                                            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                                                            disabled={isSaving}
                                                        >
                                                            Back to dropdown
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <CustomSelect
                                                        value={formData.state_of_residence || ''}
                                                        onChange={(value) => handleInputChange('state_of_residence', value)}
                                                        options={US_STATES}
                                                        placeholder="Select State"
                                                        disabled={isSaving}
                                                        maxVisibleOptions={4}
                                                    />
                                                )}
                                                {validationErrors.state_of_residence && (
                                                    <p className="text-red-500 text-xs mt-1">{validationErrors.state_of_residence}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-gray-500" />
                                                {displayValue(additional?.state_of_residence)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP / Country</label>
                                        <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                                            {displayValue(additional?.zip_or_country)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Work Details Section */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Briefcase className="h-5 w-5 text-blue-600" />
                                    Work Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
                                        {isEditMode ? (
                                            <div>
                                                <CustomSelect
                                                    value={formData.experience || ''}
                                                    onChange={(value) => handleInputChange('experience', value)}
                                                    options={EXPERIENCE_OPTIONS}
                                                    placeholder="Select Experience"
                                                    disabled={isSaving}
                                                    maxVisibleOptions={4}
                                                />
                                                {validationErrors.experience && (
                                                    <p className="text-red-500 text-xs mt-1">{validationErrors.experience}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                                                {displayValue(additional?.experience)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Job Role</label>
                                        {isEditMode ? (
                                            <div>
                                                <CustomSelect
                                                    value={formData.job_role_preferences?.[0] || ''}
                                                    onChange={(value) => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            job_role_preferences: [value],
                                                            alternate_job_roles: [] // Clear alternate roles when target role changes
                                                        }));
                                                    }}
                                                    options={jobRolesData.map(role => role.name)}
                                                    placeholder={isLoadingJobRoles ? "Loading roles..." : "Select Job Role"}
                                                    disabled={isSaving || isLoadingJobRoles}
                                                    maxVisibleOptions={4}
                                                />
                                                {validationErrors.job_role_preferences && (
                                                    <p className="text-red-500 text-xs mt-1">{validationErrors.job_role_preferences}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                                                {displayValue(client.job_role_preferences)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Job Roles</label>
                                        {isEditMode ? (
                                            <div>
                                                <CustomMultiSelect
                                                    value={formData.alternate_job_roles || []}
                                                    onChange={(value) => setFormData(prev => ({ ...prev, alternate_job_roles: value }))}
                                                    options={
                                                        formData.job_role_preferences?.[0]
                                                            ? (jobRolesData.find(role => role.name === formData.job_role_preferences[0])?.alternateRoles || [])
                                                            : []
                                                    }
                                                    placeholder={
                                                        !formData.job_role_preferences?.[0]
                                                            ? "Select a Target Job Role first"
                                                            : "Select Alternate Roles"
                                                    }
                                                    disabled={isSaving || !formData.job_role_preferences?.[0]}
                                                    maxVisibleOptions={4}
                                                    searchable={true}
                                                />
                                                {validationErrors.alternate_job_roles && (
                                                    <p className="text-red-500 text-xs mt-1">{validationErrors.alternate_job_roles}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                                                {displayValue(additional?.alternate_job_roles)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Visa Type</label>
                                        {isEditMode ? (
                                            <div>
                                                <CustomSelect
                                                    value={formData.visa_type || ''}
                                                    onChange={(value) => handleInputChange('visa_type', value)}
                                                    options={WORK_AUTH_OPTIONS}
                                                    placeholder="Select Visa Type"
                                                    disabled={isSaving}
                                                    maxVisibleOptions={4}
                                                />
                                                {validationErrors.visa_type && (
                                                    <p className="text-red-500 text-xs mt-1">{validationErrors.visa_type}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                                                {displayValue(client.visa_type)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Work Preferences</label>
                                        {isEditMode ? (
                                            <div>
                                                <CustomSelect
                                                    value={formData.work_preferences || ''}
                                                    onChange={(value) => handleInputChange('work_preferences', value)}
                                                    options={WORK_PREF_OPTIONS}
                                                    placeholder="Select Work Preference"
                                                    disabled={isSaving}
                                                    maxVisibleOptions={4}
                                                />
                                                {validationErrors.work_preferences && (
                                                    <p className="text-red-500 text-xs mt-1">{validationErrors.work_preferences}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                                                {displayValue(additional?.work_preferences)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sponsorship Required</label>
                                        {isEditMode ? (
                                            <div>
                                                <CustomSelect
                                                    value={formData.sponsorship || ''}
                                                    onChange={(value) => handleInputChange('sponsorship', value)}
                                                    options={['Yes', 'No']}
                                                    placeholder="Select Option"
                                                    disabled={isSaving}
                                                    maxVisibleOptions={4}
                                                />
                                                {validationErrors.sponsorship && (
                                                    <p className="text-red-500 text-xs mt-1">{validationErrors.sponsorship}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                                                {displayValue(client.sponsorship)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                        <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                                            {displayValue(additional?.start_date || additional?.desired_start_date)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Preferences Section */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-blue-600" />
                                    Preferences
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Salary Range</label>
                                        {isEditMode ? (
                                            <div>
                                                <CustomSelect
                                                    value={formData.salary_range || ''}
                                                    onChange={(value) => handleInputChange('salary_range', value)}
                                                    options={SALARY_RANGE_OPTIONS}
                                                    placeholder="Select Salary Range"
                                                    disabled={isSaving}
                                                    maxVisibleOptions={4}
                                                />
                                                {validationErrors.salary_range && (
                                                    <p className="text-red-500 text-xs mt-1">{validationErrors.salary_range}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                                                {displayValue(client.salary_range)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Willing to Relocate</label>
                                        {isEditMode ? (
                                            <div>
                                                <CustomSelect
                                                    value={formData.willing_to_relocate || ''}
                                                    onChange={(value) => handleInputChange('willing_to_relocate', value)}
                                                    options={['Yes', 'No']}
                                                    placeholder="Select Option"
                                                    disabled={isSaving}
                                                    maxVisibleOptions={4}
                                                />
                                                {validationErrors.willing_to_relocate && (
                                                    <p className="text-red-500 text-xs mt-1">{validationErrors.willing_to_relocate}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                                                {displayValue(additional?.willing_to_relocate)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Links Section */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Linkedin className="h-5 w-5 text-blue-600" />
                                    Professional Links
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
                                        {isEditMode ? (
                                            <div>
                                                <input
                                                    type="text"
                                                    value={formData.github_url || ''}
                                                    onChange={(e) => handleInputChange('github_url', e.target.value)}
                                                    disabled={isSaving}
                                                    placeholder="https://github.com/yourusername"
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                />
                                                {validationErrors.github_url && (
                                                    <p className="text-red-500 text-xs mt-1">{validationErrors.github_url}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                                                {additional?.github_url && additional.github_url !== 'NA' && additional.github_url !== 'N/A' ? (
                                                    <a
                                                        href={additional.github_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline flex items-center gap-2"
                                                    >
                                                        <Github className="h-4 w-4" />
                                                        {additional.github_url}
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-500">Not specified</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                                        {isEditMode ? (
                                            <div>
                                                <input
                                                    type="text"
                                                    value={formData.linked_in_url || ''}
                                                    onChange={(e) => handleInputChange('linked_in_url', e.target.value)}
                                                    disabled={isSaving}
                                                    placeholder="https://linkedin.com/in/yourprofile"
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                />
                                                {validationErrors.linked_in_url && (
                                                    <p className="text-red-500 text-xs mt-1">{validationErrors.linked_in_url}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                                                {additional?.linked_in_url && additional.linked_in_url !== 'NA' && additional.linked_in_url !== 'N/A' ? (
                                                    <a
                                                        href={additional.linked_in_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline flex items-center gap-2"
                                                    >
                                                        <Linkedin className="h-4 w-4" />
                                                        {additional.linked_in_url}
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-500">Not specified</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sticky Footer with Save/Cancel Buttons - Only in Edit Mode */}
                {isEditMode && (
                    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-3 shadow-lg">
                        <button
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <XCircle className="h-4 w-4" />
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
