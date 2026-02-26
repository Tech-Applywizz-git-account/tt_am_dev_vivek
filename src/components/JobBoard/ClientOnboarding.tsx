import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase, supabase2 } from '../../lib/supabaseClient';
import { uploadResumeToS3Dev } from '../../services/s3ServiceDev';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Clock, LogIn, Mail, Send, X } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobRole {
    id: string | number;
    name: string;
    alternateRoles?: string[];
}

interface ClientFormData {
    full_name: string;
    company_email: string;
    personal_email: string;
    whatsapp_number: string;
    callable_phone: string;
    gender: string;
    experience: string;
    job_role_preferences: string[];
    alternate_job_roles: string[];
    highest_education: string;
    university_name: string;
    cumulative_gpa: string;
    graduation_year: string;
    main_subject: string;
    visa_type: string;
    sponsorship: boolean;
    state_of_residence: string;
    zip_or_country: string;
    location_preferences: string;
    work_preferences: string;
    willing_to_relocate: boolean;
    add_ons_info: string[];
    start_date: string;
    desired_start_date: string;
    end_date: string;
    no_of_applications: string;
    exclude_companies: string;
    salary_range: string;
    applywizz_id: string;
    resume_url: string;
    linked_in_url: string;
    github_url: string;
    badge_value: string;
    is_over_18: boolean;
    eligible_to_work_in_us: boolean;
    authorized_without_visa: boolean;
    require_future_sponsorship: boolean;
    can_perform_essential_functions: boolean;
    worked_for_company_before: boolean;
    discharged_for_policy_violation: boolean;
    referred_by_agency: boolean;
    can_work_3_days_in_office: boolean;
    convicted_of_felony: boolean;
    felony_explanation: string;
    pending_investigation: boolean;
    willing_background_check: boolean;
    willing_drug_screen: boolean;
    failed_or_refused_drug_test: boolean;
    uses_substances_affecting_duties: boolean;
    substances_description: string;
    can_provide_legal_docs: boolean;
    is_hispanic_latino: boolean;
    race_ethnicity: string;
    veteran_status: string;
    disability_status: string;
    has_relatives_in_company: boolean;
    relatives_details: string;
}

interface TransactionData {
    full_name: string;
    email: string;
    jb_id: string;
    gender: string;
    location: string;
    country: string;
    plan_started: string | null;
    plan_ended: string | null;
    mobile_number: string;
    resume_url: string;
    [key: string]: unknown;
}

// ─── Sub-component prop interfaces ────────────────────────────────────────────

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    type?: string;
    className?: string;
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    options: string[];
}

interface CheckboxFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

// ─── Shared event-handler type ─────────────────────────────────────────────────

type AnyChangeEvent =
    | React.ChangeEvent<HTMLInputElement>
    | React.ChangeEvent<HTMLSelectElement>
    | React.ChangeEvent<HTMLTextAreaElement>;

// ─── Component ─────────────────────────────────────────────────────────────────

interface ClientOnboardingProps {
    onComplete?: () => void;
}

const ClientOnboarding: React.FC<ClientOnboardingProps> = ({ onComplete }) => {
    const [searchParams] = useSearchParams();
    const jbIdRaw = searchParams.get('jb_id');

    // Decode the obfuscated JB-ID (e.g. 74-66-45-50 back to JB-2)
    const jbIdFromUrl = (() => {
        if (!jbIdRaw) return null;
        if (/^[0-9-]+$/.test(jbIdRaw) && !/[a-zA-Z]/.test(jbIdRaw)) {
            try {
                return jbIdRaw.split('-').map(code => String.fromCharCode(parseInt(code))).join('');
            } catch (e) {
                console.warn('Failed to decode JB-ID', e);
                return jbIdRaw;
            }
        }
        return jbIdRaw;
    })();

    const [isAutoFilled, setIsAutoFilled] = useState<boolean>(false);
    const [isLoadingFromUrl, setIsLoadingFromUrl] = useState<boolean>(false);

    const jobRoleDropdownRef = useRef<HTMLDivElement>(null);
    const alternateRolesDropdownRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState<ClientFormData>({
        full_name: '',
        company_email: '',
        personal_email: '',
        whatsapp_number: '',
        callable_phone: '',
        gender: '',
        experience: '',
        job_role_preferences: [],
        alternate_job_roles: [],
        highest_education: '',
        university_name: '',
        cumulative_gpa: '',
        graduation_year: '',
        main_subject: '',
        visa_type: '',
        sponsorship: false,
        state_of_residence: '',
        zip_or_country: '',
        location_preferences: '',
        work_preferences: '',
        willing_to_relocate: false,
        add_ons_info: ['job-links'],
        start_date: '',
        desired_start_date: '',
        end_date: '',
        no_of_applications: '',
        exclude_companies: '',
        salary_range: '',
        applywizz_id: '',
        resume_url: '',
        linked_in_url: '',
        github_url: '',
        badge_value: '',
        is_over_18: false,
        eligible_to_work_in_us: false,
        authorized_without_visa: false,
        require_future_sponsorship: false,
        can_perform_essential_functions: false,
        worked_for_company_before: false,
        discharged_for_policy_violation: false,
        referred_by_agency: false,
        can_work_3_days_in_office: false,
        convicted_of_felony: false,
        felony_explanation: '',
        pending_investigation: false,
        willing_background_check: false,
        willing_drug_screen: false,
        failed_or_refused_drug_test: false,
        uses_substances_affecting_duties: false,
        substances_description: '',
        can_provide_legal_docs: false,
        is_hispanic_latino: false,
        race_ethnicity: '',
        veteran_status: '',
        disability_status: '',
        has_relatives_in_company: false,
        relatives_details: '',
    });

    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [isJobRoleDropdownOpen, setIsJobRoleDropdownOpen] = useState<boolean>(false);
    const [jobRoleSearchTerm, setJobRoleSearchTerm] = useState<string>('');
    const [isLoadingData] = useState<boolean>(false);
    const [manualJbId, setManualJbId] = useState<string>('');
    const [isFetchingDetails, setIsFetchingDetails] = useState<boolean>(false);
    const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
    const [pendingOnboardingInfo, setPendingOnboardingInfo] = useState<{
        pending_client_id: string;
        client_form_fill_date: string;
        email: string;
    } | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isSendingReminder, setIsSendingReminder] = useState(false);
    const [reminderSent, setReminderSent] = useState(false);

    const isOthersSelected = formData.job_role_preferences[0] === 'Others';

    // Timer to update "currentTime" for the 24h reminder check
    useEffect(() => {
        let interval: any;
        if (showSuccessModal && isOthersSelected) {
            interval = setInterval(() => {
                setCurrentTime(new Date());
            }, 60000); // Update every minute
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [showSuccessModal, isOthersSelected]);

    const getRemainingTimeForReminder = () => {
        if (!pendingOnboardingInfo?.client_form_fill_date) return null;
        const fillDate = new Date(pendingOnboardingInfo.client_form_fill_date);
        const twentyFourHours = 24 * 60 * 60 * 1000;
        const elapsed = currentTime.getTime() - fillDate.getTime();
        const remaining = twentyFourHours - elapsed;
        return remaining > 0 ? remaining : 0;
    };

    const handleSendReminder = async () => {
        if (!pendingOnboardingInfo) return;
        setIsSendingReminder(true);
        try {
            const res = await fetch('/api/send-reminder-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pending_client_id: pendingOnboardingInfo.pending_client_id,
                    email: pendingOnboardingInfo.email,
                }),
            });
            if (!res.ok) throw new Error('Failed to send reminder');
            setReminderSent(true);
        } catch (err) {
            console.error('Error sending reminder:', err);
            alert('Failed to send reminder email. Please try again later.');
        } finally {
            setIsSendingReminder(false);
        }
    };

    const [jobRolesData, setJobRolesData] = useState<JobRole[]>([]);
    const [isLoadingJobRoles, setIsLoadingJobRoles] = useState<boolean>(false);
    const [isAlternateRolesDropdownOpen, setIsAlternateRolesDropdownOpen] = useState<boolean>(false);
    const [alternateRoleSearchTerm, setAlternateRoleSearchTerm] = useState<string>('');
    const [customJobRole, setCustomJobRole] = useState<string>('');
    const [showCustomRoleModal, setShowCustomRoleModal] = useState<boolean>(false);
    const [alternateRolesInput, setAlternateRolesInput] = useState<string>('');

    // Options
    const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer Not to Say'];
    const WORK_AUTH_OPTIONS = ['F1', 'H1B', 'Green Card', 'Citizen', 'H4EAD', 'Other'];
    const WORK_PREF_OPTIONS = ['Remote', 'Hybrid', 'On-site', 'All'];
    const EDUCATION_OPTIONS = ['High School', 'Associate Degree', "Bachelor's Degree", "Master's Degree", 'PhD', 'Other'];

    const filteredJobRoles = jobRolesData.filter(role =>
        role.name.toLowerCase().includes(jobRoleSearchTerm.toLowerCase())
    );

    const selectedJobRole = jobRolesData.find(role =>
        formData.job_role_preferences[0] === role.name
    );


    const filteredAlternateRoles = selectedJobRole?.alternateRoles?.filter(role =>
        role.toLowerCase().includes(alternateRoleSearchTerm.toLowerCase())
    ) || [];

    const fetchClientDetails = async (jbIdToFetch: string): Promise<TransactionData> => {
        if (!jbIdToFetch) {
            alert('Please enter a JB ID');
            return Promise.reject(new Error('No JB ID provided'));
        }

        setIsFetchingDetails(true);
        try {
            const { data, error } = await supabase2
                .from('jobboard_transactions')
                .select('*')
                .eq('jb_id', jbIdToFetch)
                .single();

            if (error) throw error;

            if (data) {
                const tx = data as TransactionData;
                setFormData(prev => ({
                    ...prev,
                    full_name: tx.full_name || '',
                    company_email: tx.email || '',
                    personal_email: tx.email || '',
                    applywizz_id: tx.jb_id || '',
                    gender: tx.gender || '',
                    state_of_residence: tx.location || '',
                    zip_or_country: tx.country || '',
                    start_date: tx.plan_started ? tx.plan_started.split('T')[0] : '',
                    end_date: tx.plan_ended ? tx.plan_ended.split('T')[0] : '',
                    whatsapp_number: tx.mobile_number || '',
                    callable_phone: tx.mobile_number || '',
                    resume_url: tx.resume_url || '',
                }));
                if (!jbIdFromUrl) {
                    alert(`✅ Details loaded for ${tx.full_name}!`);
                }
                return Promise.resolve(tx);
            } else {
                alert('No client found with this JB ID');
                return Promise.reject(new Error('No client found'));
            }
        } catch (err: unknown) {
            const e = err as Error;
            console.error('Error fetching transaction:', e);
            alert(`Failed to load client details: ${e.message}`);
            return Promise.reject(e);
        } finally {
            setIsFetchingDetails(false);
        }
    };

    // Fetch job roles from API on mount
    useEffect(() => {
        const fetchJobRoles = async () => {
            setIsLoadingJobRoles(true);
            try {
                const response = await fetch('https://dashboard.apply-wizz.com/api/all-job-roles/', {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                });

                console.log('Job Roles API Response Status:', response.status);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data: JobRole[] = await response.json();
                console.log('Job Roles Data:', data);

                if (Array.isArray(data) && data.length > 0) {
                    setJobRolesData(data);
                    console.log(`✅ Loaded ${data.length} job roles successfully`);
                } else {
                    console.warn('No job roles data received');
                    setJobRolesData([]);
                }
            } catch (error: unknown) {
                const e = error as Error;
                console.error('Error fetching job roles:', e);
                console.error('Error details:', e.message);
                setJobRolesData([]);
            } finally {
                setIsLoadingJobRoles(false);
            }
        };

        fetchJobRoles();
    }, []);

    // Auto-fetch if jb_id is in URL
    useEffect(() => {
        if (jbIdFromUrl) {
            setIsLoadingFromUrl(true);
            setManualJbId(jbIdFromUrl);
            fetchClientDetails(jbIdFromUrl)
                .then(() => {
                    setIsAutoFilled(true);
                    setIsLoadingFromUrl(false);
                })
                .catch(() => {
                    setIsLoadingFromUrl(false);
                });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jbIdFromUrl]);

    // Auto-fetch by logged-in user's email when used as onboarding gate (no jb_id in URL)
    useEffect(() => {
        if (jbIdFromUrl || !onComplete) return; // Only when used as gate without URL param
        const autoFetchByEmail = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user?.email) return;
                const { data, error } = await supabase2
                    .from('jobboard_transactions')
                    .select('*')
                    .eq('email', user.email.toLowerCase())
                    .limit(1)
                    .single();
                if (error || !data) return;
                const tx = data as TransactionData;
                setManualJbId(tx.jb_id || '');
                setFormData(prev => ({
                    ...prev,
                    full_name: tx.full_name || '',
                    company_email: tx.email || '',
                    personal_email: tx.email || '',
                    applywizz_id: tx.jb_id || '',
                    gender: tx.gender || '',
                    state_of_residence: tx.location || '',
                    zip_or_country: tx.country || '',
                    start_date: tx.plan_started ? tx.plan_started.split('T')[0] : '',
                    end_date: tx.plan_ended ? tx.plan_ended.split('T')[0] : '',
                    whatsapp_number: tx.mobile_number || '',
                    callable_phone: tx.mobile_number || '',
                    resume_url: tx.resume_url || '',
                }));
                setIsAutoFilled(true);
            } catch (err) {
                console.warn('Could not auto-fetch transaction by email:', err);
            }
        };
        autoFetchByEmail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onComplete]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (jobRoleDropdownRef.current && !jobRoleDropdownRef.current.contains(event.target as Node)) {
                setIsJobRoleDropdownOpen(false);
            }
            if (alternateRolesDropdownRef.current && !alternateRolesDropdownRef.current.contains(event.target as Node)) {
                setIsAlternateRolesDropdownOpen(false);
            }
        };

        if (isJobRoleDropdownOpen || isAlternateRolesDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isJobRoleDropdownOpen, isAlternateRolesDropdownOpen]);

    const handleFetchDetails = () => {
        fetchClientDetails(manualJbId);
    };

    const handleInputChange = (e: AnyChangeEvent) => {
        const target = e.target as HTMLInputElement;
        const { name, value, type } = target;
        const checked = type === 'checkbox' ? target.checked : undefined;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setResumeFile(e.target.files[0]);
        }
    };

    const isFormValid = (): boolean => {
        const requiredFields: (string | boolean | File | null)[] = [
            formData.full_name,
            formData.company_email || formData.personal_email,
            formData.whatsapp_number,
            formData.gender,
            formData.experience,
            formData.job_role_preferences.length > 0,
            formData.salary_range,
            formData.highest_education,
            formData.university_name,
            formData.visa_type,
            formData.work_preferences,
            formData.personal_email,
            resumeFile || formData.resume_url,
        ];

        if (isOthersSelected && !customJobRole.trim()) {
            return false;
        }

        return requiredFields.every(field => {
            if (typeof field === 'boolean') return field;
            return field && field.toString().trim() !== '';
        });
    };

    const handleJobRoleToggle = (role: string) => {
        if (role === 'Others') {
            setShowCustomRoleModal(true);
            setFormData(prev => ({
                ...prev,
                job_role_preferences: ['Others'],
                alternate_job_roles: [],
            }));
            setAlternateRolesInput('');
        } else {
            setCustomJobRole('');
            setAlternateRolesInput('');
            setFormData(prev => ({
                ...prev,
                job_role_preferences: [role],
                alternate_job_roles: [],
            }));
        }
        setIsJobRoleDropdownOpen(false);
    };

    const handleCustomRoleSubmit = () => {
        if (customJobRole.trim()) {
            setShowCustomRoleModal(false);
        }
    };

    const handleCustomRoleCancel = () => {
        setCustomJobRole('');
        setAlternateRolesInput('');
        setFormData(prev => ({ ...prev, job_role_preferences: [] }));
        setShowCustomRoleModal(false);
    };

    const handleAlternateRoleToggle = (role: string) => {
        setFormData(prev => {
            const currentRoles = prev.alternate_job_roles;
            if (currentRoles.includes(role)) {
                return { ...prev, alternate_job_roles: currentRoles.filter(r => r !== role) };
            } else {
                return { ...prev, alternate_job_roles: [...currentRoles, role] };
            }
        });
    };

    const handleDirectOnboard = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            // A. Upload Resume to S3
            let uploadedResumeKey = formData.resume_url;
            if (resumeFile) {
                if (!formData.applywizz_id) throw new Error('JB ID is required before uploading resume.');
                uploadedResumeKey = await uploadResumeToS3Dev(resumeFile, formData.applywizz_id);
            } else if (!uploadedResumeKey) {
                throw new Error('Please upload a resume file.');
            }

            // B. Prepare payload for ApplyWizz API
            const apiPayload = {
                submission_type: isOthersSelected ? 'pending' : undefined,
                full_name: formData.full_name,
                email: formData.company_email || formData.personal_email,
                phone: formData.whatsapp_number || formData.callable_phone,
                experience: String(formData.experience),
                applywizz_id: formData.applywizz_id,
                gender: formData.gender,
                state_of_residence: formData.state_of_residence,
                zip_or_country: formData.zip_or_country,
                resume_url: uploadedResumeKey
                    ? uploadedResumeKey.startsWith('http')
                        ? uploadedResumeKey
                        : `https://${import.meta.env.VITE_AWS_S3_BUCKET}.s3.${import.meta.env.VITE_AWS_REGION}.amazonaws.com/${uploadedResumeKey}`
                    : '',
                resume_s3_path: uploadedResumeKey || '',
                start_date: formData.start_date || formData.desired_start_date,
                target_role:
                    (isOthersSelected ? customJobRole : formData.job_role_preferences[0])
                        ?.replace(/\u00A0/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim() || '',
                job_role_preferences: isOthersSelected
                    ? [customJobRole.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim()]
                    : formData.job_role_preferences.map(role =>
                        role.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim()
                    ),
                visa_type: formData.visa_type,
                location_preferences: Array.isArray(formData.location_preferences)
                    ? formData.location_preferences
                    : formData.location_preferences
                        ? [formData.location_preferences]
                        : [],
                salary_range: formData.salary_range,
                work_preferences: (() => {
                    const rawPref = Array.isArray(formData.work_preferences)
                        ? formData.work_preferences[0]
                        : formData.work_preferences || 'Remote';
                    const allowedPrefs = ['Remote', 'Hybrid', 'On-site', 'All'];
                    const match = allowedPrefs.find(
                        p => p.toLowerCase() === String(rawPref).toLowerCase()
                    );
                    return match || 'Remote';
                })(),
                sponsorship: Boolean(formData.sponsorship),
                github_url: formData.github_url || '',
                linked_in_url: formData.linked_in_url || '',
                end_date: formData.end_date || '',
                willing_to_relocate: Boolean(formData.willing_to_relocate),
                alternate_job_roles: formData.alternate_job_roles
                    ? Array.isArray(formData.alternate_job_roles)
                        ? formData.alternate_job_roles.map(r =>
                            r.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim()
                        )
                        : (formData.alternate_job_roles as string)
                            .split(',')
                            .map(r => r.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim())
                    : [],
            };

            console.log('🚀 Submitting Onboarding Payload:', JSON.stringify(apiPayload, null, 2));

            // C. Submit to jobboard-onboard route — relative URL hits this deployment's own function
            //    jobboard-onboard.ts already uses _DEV env vars (VITE_EXTERNAL_API_URL_DEV etc.)
            const apiUrl = '/api/jobboard-onboard';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiPayload),
            });

            if (response.ok) {
                const resData = await response.json();
                if (isOthersSelected) {
                    setPendingOnboardingInfo({
                        pending_client_id: resData.pending_client_id,
                        client_form_fill_date: resData.client_form_fill_date,
                        email: resData.email,
                    });
                }
            } else {
                const errorText = await response.text();
                console.log('⚠️ API Response status:', response.status, 'body:', errorText);

                const isAlreadyRegistered =
                    errorText.toLowerCase().includes('already in use') ||
                    errorText.toLowerCase().includes('already registered') ||
                    errorText.toLowerCase().includes('already exists');

                if (isAlreadyRegistered) {
                    console.log('ℹ️ User/ID already registered. Proceeding to success flow.');
                } else {
                    console.error('❌ API Error Response Body:', errorText);
                    try {
                        const errorJson = JSON.parse(errorText);
                        const errorMsg =
                            errorJson.details ||
                            errorJson.error ||
                            errorJson.message ||
                            `API Error: ${response.status}`;

                        if (errorMsg.includes('Target Role') && errorMsg.includes('not found')) {
                            throw new Error(
                                `The role you selected is not yet recognized by our database sync. Please try a more general role (like 'Data Analyst') or contact support. Details: ${errorMsg}`
                            );
                        }
                        throw new Error(errorMsg);
                    } catch (e: unknown) {
                        const err = e as Error;
                        if (err.message?.includes('recognized')) throw err;
                        throw new Error(`API Error: ${response.status} - ${errorText.substring(0, 200)}`);
                    }
                }
            }

            // D. Send Credentials Email (Non-blocking) - SKIP IF "OTHERS" (Pending)
            if (!isOthersSelected) {
                try {
                    const targetEmail = (formData.company_email || formData.personal_email)
                        ?.trim()
                        .toLowerCase();
                    if (targetEmail) {
                        await supabase.functions.invoke('send-onboarding-credentials', {
                            body: {
                                to: targetEmail,
                                fullName: formData.full_name || 'Valued Customer',
                                jbId: formData.applywizz_id,
                            },
                        });
                    }
                } catch (emailError: unknown) {
                    const e = emailError as Error;
                    console.error('❌ Failed to send credentials email:', e.message);
                }
            }

            setShowSuccessModal(true);
        } catch (error: unknown) {
            const e = error as Error;
            console.error('Onboarding Error:', e);
            alert(`Onboarding Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (isLoadingData) {
        return (
            <div className="min-h-screen flex items-center justify-center text-xl font-bold text-gray-600">
                Loading Client Details...
            </div>
        );
    }

    return (
        <div className={(onComplete ? 'w-full max-w-4xl' : 'min-h-screen bg-gray-50 flex flex-col items-center py-5 px-4 sm:px-6 lg:px-8 font-sans') + ' relative'}>
            <div className={`max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 ${loading ? 'hidden' : ''}`}>
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-8 py-10">
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-4">
                            <img
                                src="/applywizz-logo.jpg"
                                alt="Apply Wizz Logo"
                                className="w-[42px] h-[48px] rounded-[6px_8px_6px_6px]"
                            />
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
                                APPLY WIZZ
                            </h1>
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl sm:text-2xl font-bold text-white">Client Onboarding Form</h2>
                            <p className="mt-2 text-blue-100 text-sm sm:text-base">
                                Complete your profile to get started with job applications
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleDirectOnboard} className="p-10 space-y-10">

                    {/* Read-Only Pre-filled Section */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Account Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-70">
                            <InputField label="JB ID" value={formData.applywizz_id} disabled readOnly />
                            <InputField label="Full Name" value={formData.full_name} disabled readOnly />
                            <InputField label="Email" value={formData.company_email} disabled readOnly />
                            <InputField label="Mobile Number" value={formData.whatsapp_number} disabled readOnly />
                            <InputField label="Location" value={formData.state_of_residence} disabled readOnly />
                            <InputField label="Country" value={formData.zip_or_country} disabled readOnly />
                            <InputField label="Started At" value={formData.start_date} disabled readOnly />
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Service Opted</label>
                                <span className="inline-flex items-center px-4 py-2 border border-blue-200 rounded-full shadow-sm text-sm font-medium bg-blue-100 text-blue-800">
                                    Job Links
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Profile Details */}
                    <div>
                        <h3 className="flex items-center text-2xl font-bold text-gray-800 border-b pb-3 mb-6">
                            Profile Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Target Job Role Dropdown */}
                            <div ref={jobRoleDropdownRef} className="relative">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Target Job Role *
                                </label>
                                <div
                                    className="w-full bg-white border border-gray-300 text-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer flex justify-between items-center transition-shadow shadow-sm hover:shadow-md"
                                    onClick={() => setIsJobRoleDropdownOpen(!isJobRoleDropdownOpen)}
                                >
                                    <span className="truncate">
                                        {formData.job_role_preferences.length > 0
                                            ? isOthersSelected
                                                ? customJobRole || 'Others (Enter custom role)'
                                                : formData.job_role_preferences[0]
                                            : isLoadingJobRoles
                                                ? 'Loading roles...'
                                                : 'Select Job Role'}
                                    </span>
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                                {isJobRoleDropdownOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                        <div className="sticky top-0 bg-gray-50 p-2 border-b border-gray-200">
                                            <input
                                                type="text"
                                                placeholder="Search roles..."
                                                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm outline-none"
                                                value={jobRoleSearchTerm}
                                                onChange={e => setJobRoleSearchTerm(e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </div>
                                        {filteredJobRoles.length > 0 ? (
                                            filteredJobRoles.map(roleObj => (
                                                <label
                                                    key={roleObj.id}
                                                    className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer"
                                                >
                                                    <input
                                                        type="radio"
                                                        name="target_job_role"
                                                        checked={formData.job_role_preferences[0] === roleObj.name}
                                                        onChange={() => handleJobRoleToggle(roleObj.name)}
                                                        className="mr-3 w-5 h-5 text-blue-600"
                                                    />
                                                    <span className="text-gray-700">{roleObj.name}</span>
                                                </label>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                {isLoadingJobRoles ? 'Loading...' : 'No roles found'}
                                            </div>
                                        )}
                                        <div className="border-t border-gray-200">
                                            <label className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="target_job_role"
                                                    checked={isOthersSelected}
                                                    onChange={() => handleJobRoleToggle('Others')}
                                                    className="mr-3 w-5 h-5 text-blue-600"
                                                />
                                                <span className="text-gray-700 font-medium">Others</span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <SelectField
                                label="Gender *"
                                name="gender"
                                value={formData.gender}
                                onChange={handleInputChange}
                                options={GENDER_OPTIONS}
                                required
                            />
                            <InputField
                                label="Years of Experience *"
                                name="experience"
                                value={formData.experience}
                                onChange={handleInputChange}
                                required
                                placeholder="e.g. 5 Years"
                            />
                            <SelectField
                                label="Salary Range *"
                                name="salary_range"
                                value={formData.salary_range}
                                onChange={handleInputChange}
                                options={[
                                    '$50,000 - $70,000',
                                    '$70,000 - $90,000',
                                    '$90,000 - $120,000',
                                    '$120,000 - $150,000',
                                    '$150,000 - $200,000',
                                    '$200,000+',
                                ]}
                                required
                            />
                            <SelectField
                                label="Highest Education *"
                                name="highest_education"
                                value={formData.highest_education}
                                onChange={handleInputChange}
                                options={EDUCATION_OPTIONS}
                                required
                            />
                            <InputField
                                label="University Name *"
                                name="university_name"
                                value={formData.university_name}
                                onChange={handleInputChange}
                                required
                            />
                            <SelectField
                                label="Work Preference *"
                                name="work_preferences"
                                value={formData.work_preferences}
                                onChange={handleInputChange}
                                options={WORK_PREF_OPTIONS}
                                required
                            />
                            <InputField
                                label="Personal Email *"
                                name="personal_email"
                                value={formData.personal_email}
                                onChange={handleInputChange}
                                type="email"
                                required
                                placeholder="your.personal@email.com"
                            />
                            <SelectField
                                label="Work Authorization *"
                                name="visa_type"
                                value={formData.visa_type}
                                onChange={handleInputChange}
                                options={WORK_AUTH_OPTIONS}
                                required
                            />
                            <div className="flex items-end pb-3">
                                <CheckboxField
                                    label="Requires Sponsorship"
                                    name="sponsorship"
                                    checked={formData.sponsorship}
                                    onChange={handleInputChange}
                                />
                            </div>

                            {/* Alternate Job Roles */}
                            {isOthersSelected ? (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Alternate Job Roles (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter roles separated by commas (e.g., Data Analyst, Business Analyst)"
                                        value={alternateRolesInput}
                                        onChange={e => {
                                            const value = e.target.value;
                                            setAlternateRolesInput(value);
                                            const rolesArray = value
                                                .split(',')
                                                .map(role => role.trim())
                                                .filter(role => role !== '');
                                            setFormData(prev => ({
                                                ...prev,
                                                alternate_job_roles: rolesArray,
                                            }));
                                        }}
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow shadow-sm hover:shadow-md"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Separate multiple roles with commas</p>
                                </div>
                            ) : (
                                <div ref={alternateRolesDropdownRef} className="relative">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Alternate Job Roles (Optional)
                                    </label>
                                    <div
                                        className={`w-full bg-white border border-gray-300 text-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${selectedJobRole
                                            ? 'cursor-pointer hover:shadow-md'
                                            : 'cursor-not-allowed bg-gray-50'
                                            } flex justify-between items-center transition-shadow shadow-sm`}
                                        onClick={() =>
                                            selectedJobRole &&
                                            setIsAlternateRolesDropdownOpen(!isAlternateRolesDropdownOpen)
                                        }
                                    >
                                        <span className="truncate">
                                            {!selectedJobRole
                                                ? 'Select a Target Job Role first'
                                                : formData.alternate_job_roles.length > 0
                                                    ? formData.alternate_job_roles.join(', ')
                                                    : 'Select Alternate Roles'}
                                        </span>
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                    {isAlternateRolesDropdownOpen && selectedJobRole && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                            <div className="sticky top-0 bg-gray-50 p-2 border-b border-gray-200">
                                                <input
                                                    type="text"
                                                    placeholder="Search alternate roles..."
                                                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm outline-none"
                                                    value={alternateRoleSearchTerm}
                                                    onChange={e => setAlternateRoleSearchTerm(e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            </div>
                                            {filteredAlternateRoles.length > 0 ? (
                                                filteredAlternateRoles.map((role, index) => (
                                                    <label
                                                        key={`${role}-${index}`}
                                                        className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.alternate_job_roles.includes(role)}
                                                            onChange={() => handleAlternateRoleToggle(role)}
                                                            className="mr-3 w-5 h-5 text-blue-600 rounded"
                                                        />
                                                        <span className="text-gray-700">{role}</span>
                                                    </label>
                                                ))
                                            ) : (
                                                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                    No alternate roles available
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <InputField
                                label="LinkedIn URL"
                                name="linked_in_url"
                                value={formData.linked_in_url}
                                onChange={handleInputChange}
                                placeholder="https://linkedin.com/in/yourprofile"
                            />
                            <InputField
                                label="GitHub URL"
                                name="github_url"
                                value={formData.github_url}
                                onChange={handleInputChange}
                                placeholder="https://github.com/yourusername"
                            />
                            <InputField
                                label="Plan Start Date"
                                name="start_date"
                                value={formData.start_date}
                                disabled
                                readOnly
                                className="bg-gray-100 cursor-not-allowed w-full border border-gray-300 rounded-lg p-3 text-gray-500"
                            />
                            <InputField
                                label="Plan End Date"
                                name="end_date"
                                value={formData.end_date}
                                disabled
                                readOnly
                                className="bg-gray-100 cursor-not-allowed w-full border border-gray-300 rounded-lg p-3 text-gray-500"
                            />
                            <div className="space-y-3 pt-6">
                                <CheckboxField
                                    label="Willing to Relocate"
                                    name="willing_to_relocate"
                                    checked={formData.willing_to_relocate}
                                    onChange={handleInputChange}
                                />
                                <CheckboxField
                                    label="Can work 3 days in office?"
                                    name="can_work_3_days_in_office"
                                    checked={formData.can_work_3_days_in_office}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Uploads & Exclusions */}
                    <div>
                        <h3 className="flex items-center text-2xl font-bold text-gray-800 border-b pb-3 mb-6">
                            Uploads &amp; Exclusions
                        </h3>
                        <div className="grid grid-cols-1 gap-6">
                            <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-center hover:bg-gray-100 transition-colors group">
                                <label className="cursor-pointer block">
                                    <span className="block text-gray-700 font-semibold mb-2">Upload Resume (PDF) *</span>
                                    <div className="flex justify-center mt-3">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={handleFileChange}
                                            className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                        />
                                    </div>
                                </label>
                                {resumeFile && (
                                    <p className="mt-2 text-sm text-green-600 font-medium">
                                        Selected: {resumeFile.name}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Exclude Companies
                                </label>
                                <textarea
                                    name="exclude_companies"
                                    value={formData.exclude_companies}
                                    onChange={handleInputChange}
                                    className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                                    placeholder="e.g. Facebook, Google, Amazon"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-8 relative group">
                        <button
                            type="submit"
                            disabled={loading || !isFormValid()}
                            className={`w-full py-4 text-xl font-bold rounded-xl shadow-xl transition-all duration-300 transform flex items-center justify-center text-white ${loading || !isFormValid()
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 hover:-translate-y-1'
                                }`}
                        >
                            {loading ? 'Submitting...' : 'Complete Registration'}
                        </button>
                        {!isFormValid() && !loading && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                Please fill all required fields
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
                            </div>
                        )}
                    </div>
                </form>
            </div>

            {/* Full Page Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center space-y-4 max-w-sm mx-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 bg-blue-600 rounded-full opacity-20 animate-ping" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Submitting Your Registration</h3>
                            <p className="text-sm text-gray-600">It may take 2–5 minutes to process your registration</p>
                            <p className="text-sm text-gray-600">Please wait while we process your information...</p>
                        </div>
                        <div className="flex space-x-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-100"
                        >
                            {/* X Close Button — only for non-Others flow */}
                            {!isOthersSelected && (
                                <button
                                    onClick={() => {
                                        setShowSuccessModal(false);
                                        onComplete?.();
                                    }}
                                    className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all"
                                    aria-label="Close"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            )}
                            <div className="h-48 flex items-center justify-center relative">
                                <div className="w-full pointer-events-none flex items-center justify-center pt-4">
                                    <DotLottieReact
                                        src="/SuccessIcon.lottie"
                                        loop
                                        autoplay
                                        style={{ width: '120px', height: '120px' }}
                                    />
                                </div>
                            </div>

                            <div className="p-8 text-center pt-2">
                                <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
                                    {isOthersSelected ? 'Application Under Review' : 'Successfully Submitted'}
                                </h2>
                                <p className="text-gray-500 mb-6">
                                    {isOthersSelected
                                        ? "You'll be notified once your custom job role is processed."
                                        : 'Your profile registration is now complete and active.'}
                                </p>

                                {isOthersSelected && (
                                    <div className="space-y-4">
                                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-2 flex items-start gap-3 text-left">
                                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-800 leading-relaxed">
                                                Since you have selected a new target role, we will match jobs according to your selected role. This process may take up to 24 hours.
                                            </p>
                                        </div>

                                        <div className="pt-2">
                                            {getRemainingTimeForReminder() !== 0 ? (
                                                <div className="flex flex-col items-center">
                                                    <button
                                                        disabled
                                                        className="w-full py-4 bg-gray-100 text-gray-400 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 cursor-not-allowed border border-gray-200"
                                                    >
                                                        <Clock className="w-5 h-5" />
                                                        Send Reminder Email
                                                    </button>
                                                    <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                                                        Available in {Math.floor(getRemainingTimeForReminder()! / (60 * 60 * 1000))} hours {Math.floor((getRemainingTimeForReminder()! % (60 * 60 * 1000)) / (60 * 1000))} minutes
                                                    </p>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={handleSendReminder}
                                                    disabled={isSendingReminder || reminderSent}
                                                    className={`w-full py-4 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2 ${reminderSent ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'
                                                        } ${isSendingReminder ? 'opacity-70 cursor-wait' : ''}`}
                                                >
                                                    {reminderSent ? (
                                                        <>
                                                            <CheckCircle className="w-5 h-5" />
                                                            Reminder Sent
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className={`w-5 h-5 ${isSendingReminder ? 'animate-pulse' : ''}`} />
                                                            {isSendingReminder ? 'Sending...' : 'Send Reminder Email'}
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {!isOthersSelected && (
                                    <button
                                        onClick={() => {
                                            setShowSuccessModal(false);
                                            onComplete?.();
                                            window.location.reload();
                                        }}
                                        className="w-full py-4 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                                        style={{ backgroundColor: "#67ef3e" }}
                                    >
                                        <LogIn className="w-5 h-5" />
                                        Go to Dashboard
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Job Role Modal */}
            <AnimatePresence>
                {showCustomRoleModal && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm rounded-2xl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
                        >
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-6">
                                <h3 className="text-2xl font-bold text-white text-center">Enter Custom Job Role</h3>
                                <p className="text-blue-100 text-sm text-center mt-2">
                                    Please specify your target job role
                                </p>
                            </div>

                            <div className="p-6">
                                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                                    <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-semibold text-blue-900 mb-1">Please Note</p>
                                        <p className="text-xs text-blue-700 leading-relaxed">
                                            Since this is a new job role for us, it will take up to 24 hours to be available
                                            in the job board. You will be notified once it is available with your login
                                            credentials.
                                        </p>
                                    </div>
                                </div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">Job Role *</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Machine Learning Engineer"
                                    value={customJobRole}
                                    onChange={e => setCustomJobRole(e.target.value)}
                                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                        if (e.key === 'Enter' && customJobRole.trim()) {
                                            handleCustomRoleSubmit();
                                        }
                                    }}
                                    className="w-full bg-white border-2 border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    autoFocus
                                />
                                {!customJobRole.trim() && (
                                    <p className="text-xs text-gray-500 mt-2">This field is required</p>
                                )}

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={handleCustomRoleCancel}
                                        className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCustomRoleSubmit}
                                        disabled={!customJobRole.trim()}
                                        className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${customJobRole.trim()
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-lg hover:shadow-xl'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const InputField: React.FC<InputFieldProps> = ({ label, type = 'text', className = '', ...props }) => (
    <div className={props.disabled ? 'opacity-75' : ''}>
        <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
        <input
            type={type}
            {...props}
            className={`w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow shadow-sm ${props.disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:shadow-md'
                } ${className}`}
        />
    </div>
);

const SelectField: React.FC<SelectFieldProps> = ({ label, options, ...props }) => (
    <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
        <div className="relative">
            <select
                {...props}
                className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
                <option value="">Select Option</option>
                {options.map(opt => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        </div>
    </div>
);

const CheckboxField: React.FC<CheckboxFieldProps> = ({ label, ...props }) => (
    <label className="flex items-center cursor-pointer space-x-3">
        <input type="checkbox" {...props} className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
        <span className="text-gray-700 font-medium text-sm">{label}</span>
    </label>
);

export default ClientOnboarding;
