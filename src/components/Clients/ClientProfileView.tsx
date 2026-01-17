import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { User, Client, TestResult } from "@/types";
import { Building, FileText, Phone, X, User as UserIcon, Mail, Shield, Calendar, CreditCard, Book, MapPin, GraduationCap, Link, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAccount } from '@/contexts/AccountContext';
import { AddressAutocomplete } from './AddressAutocomplete';
import {
  GENDER_OPTIONS,
  RACE_ETHNICITY_OPTIONS,
  VETERAN_STATUS_OPTIONS,
  DISABILITY_STATUS_OPTIONS,
  HISPANIC_LATINO_OPTIONS,
  HIGHEST_EDUCATION_OPTIONS,
  WORK_PREFERENCE_OPTIONS,
  EXPERIENCE_YEARS_OPTIONS,
} from '@/constants/formOptions';


interface ClientAdditionalInfo {
  id: string;
  created_at?: string;
  updated_at?: string;  // Fixed: was update_at
  applywizz_id?: string;  // Added: missing field
  resume_url?: string;
  resume_path?: string;
  start_date?: string;
  end_date?: string;
  no_of_applications?: number;
  is_over_18?: boolean;
  eligible_to_work_in_us?: boolean;
  authorized_without_visa?: boolean;
  require_future_sponsorship?: boolean;
  can_perform_essential_functions?: boolean;
  worked_for_company_before?: boolean;
  discharged_for_policy_violation?: boolean;
  referred_by_agency?: boolean;
  highest_education?: string;
  university_name?: string;
  cumulative_gpa?: string;
  desired_start_date?: string;
  willing_to_relocate?: boolean;
  can_work_3_days_in_office?: boolean;
  role?: string;
  experience?: string;
  work_preferences?: string;
  alternate_job_roles?: string;
  exclude_companies?: string;
  convicted_of_felony?: boolean;
  felony_explanation?: string;
  pending_investigation?: boolean;
  willing_background_check?: boolean;
  willing_drug_screen?: boolean;
  failed_or_refused_drug_test?: boolean;
  uses_substances_affecting_duties?: boolean;
  substances_description?: string;
  can_provide_legal_docs?: boolean;
  gender?: string;
  is_hispanic_latino?: string;
  race_ethnicity?: string;
  veteran_status?: string;
  disability_status?: string;
  has_relatives_in_company?: boolean;
  relatives_details?: string;
  state_of_residence?: string;
  zip_or_country?: string;
  main_subject?: string;
  graduation_year?: string;
  add_ons_info?: string[];
  github_url?: string;
  linked_in_url?: string;
  client_form_fill_date?: string;  // Added: missing field
  full_address?: string;  // Added: missing field
  date_of_birth?: string;  // Added: missing field
  primary_phone?: string;  // Added: missing field
}

interface Props {
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  isModal?: boolean;
}

interface ClientAccount {
  applywizz_id: string;
  full_name?: string;
  id: string;
}

export function ClientProfileView({ currentUser, isOpen, onClose, isModal = true }: Props) {
  const [form, setForm] = useState<Client | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState<ClientAdditionalInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'assignments' | 'education' | 'employment' | 'background' | 'codinglab' | 'resume'>('details');
  const [testResultsForm, setTestResultsForm] = useState<TestResult[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedFields, setEditedFields] = useState<Partial<ClientAdditionalInfo>>({});
  const [emptyFieldsAtStart, setEmptyFieldsAtStart] = useState<string[]>([]);

  // New state for multiple accounts
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);

  // Use the shared context for selectedAccountId
  const { selectedAccountId, setSelectedAccountId } = useAccount();

  // Fetch additional client information
  const fetchAdditionalClientInfo = useCallback(async (clientId: string, skipIfEditing: boolean = false) => {
    // Don't overwrite data if user is editing
    if (skipIfEditing && isEditMode) {
      return;
    }

    const { data, error } = await supabase
      .from("clients_additional_information")
      .select("*")
      .eq("id", clientId)
      .single();

    if (error) {
      console.error("Failed to fetch additional client information", error);
    } else {
      setAdditionalInfo(data || null);
    }
  }, [isEditMode]);

  // Fetch client data by ID (not email)
  const fetchClientDataById = useCallback(async (clientId: string) => {
    setLoading(true);
    try {
      // Fetch client data by ID
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();

      if (clientError) {
        throw new Error("Failed to fetch client data: " + clientError.message);
      }

      if (clientData) {
        // Convert string dates to Date objects
        const processedClient = {
          ...clientData,
          created_at: clientData.created_at && typeof clientData.created_at === 'string'
            ? new Date(clientData.created_at)
            : clientData.created_at,
          update_at: clientData.update_at && typeof clientData.update_at === 'string'
            ? new Date(clientData.update_at)
            : clientData.update_at
        };

        setForm(processedClient);

        // Load test results if available
        if (clientData.test_results && Array.isArray(clientData.test_results)) {
          setTestResultsForm(clientData.test_results);
        } else {
          setTestResultsForm([]);
        }

        // Fetch additional client information (skip if user is editing)
        fetchAdditionalClientInfo(clientData.id, true);
      }
    } catch (error) {
      console.error("Error fetching client data:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  }, [fetchAdditionalClientInfo]);

  // Fetch all accounts for the current user's email
  const fetchAccounts = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('applywizz_id, full_name, id')
        .eq('company_email', email);

      if (error) {
        console.error("Error fetching accounts:", error);
        toast.error("Failed to load client accounts.");
        return;
      }

      if (data && data.length > 0) {
        // Filter out any accounts without required IDs
        const validAccounts = data.filter(acc => acc.id && acc.applywizz_id);
        setAccounts(validAccounts);

        const hasMultipleAccounts = validAccounts.length > 1;

        // If no account is selected or selected account is not in the list, select the first one
        if (!selectedAccountId || !validAccounts.find(acc => acc.id === selectedAccountId)) {
          if (validAccounts.length > 0) {
            // Only persist to localStorage if there are multiple accounts
            setSelectedAccountId(validAccounts[0].id, hasMultipleAccounts);
          }
        } else if (!hasMultipleAccounts) {
          // If only one account, make sure we're not persisting to localStorage
          setSelectedAccountId(validAccounts[0].id, false);
        }
      } else {
        toast.error("No accounts found for this email.");
      }
    } catch (error) {
      console.error("Error in fetchAccounts:", error);
      toast.error("An unexpected error occurred while loading accounts.");
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, setSelectedAccountId]);

  // Handle save changes using sync-client API
  const handleSave = async () => {
    if (!form || !selectedAccountId) return;

    setSaving(true);
    try {
      // Merge edited fields into additionalInfo
      const mergedAdditionalInfo = additionalInfo ? { ...additionalInfo, ...editedFields } : null;

      // Prepare data for sync-client API
      const syncData: Record<string, any> = {
        applywizz_id: form.applywizz_id,
      };

      // Add client table fields (only if they have values)
      if (form.full_name) syncData.full_name = form.full_name;
      if (form.personal_email) syncData.personal_email = form.personal_email;
      if (form.whatsapp_number) syncData.whatsapp_number = form.whatsapp_number;
      if (form.callable_phone) syncData.callable_phone = form.callable_phone;
      if (form.job_role_preferences) syncData.job_role_preferences = form.job_role_preferences;
      if (form.salary_range) syncData.salary_range = form.salary_range;
      if (form.location_preferences) syncData.location_preferences = form.location_preferences;
      if (form.work_auth_details) syncData.work_auth_details = form.work_auth_details;
      if (form.visa_type) syncData.visa_type = form.visa_type;

      // Add additional info fields (only if they have values)
      if (additionalInfo) {
        if (additionalInfo.gender) syncData.gender = additionalInfo.gender;
        if (additionalInfo.state_of_residence) syncData.state_of_residence = additionalInfo.state_of_residence;
        if (additionalInfo.zip_or_country) syncData.zip_or_country = additionalInfo.zip_or_country;
        if (additionalInfo.highest_education) syncData.highest_education = additionalInfo.highest_education;
        if (additionalInfo.university_name) syncData.university_name = additionalInfo.university_name;
        if (additionalInfo.cumulative_gpa) syncData.cumulative_gpa = additionalInfo.cumulative_gpa;
        if (additionalInfo.main_subject) syncData.main_subject = additionalInfo.main_subject;
        if (additionalInfo.graduation_year) syncData.graduation_year = additionalInfo.graduation_year;
        if (additionalInfo.experience) syncData.experience = additionalInfo.experience;
        if (additionalInfo.role) syncData.role = additionalInfo.role;
        if (additionalInfo.work_preferences) syncData.work_preferences = additionalInfo.work_preferences;
        if (additionalInfo.alternate_job_roles) syncData.alternate_job_roles = additionalInfo.alternate_job_roles;
        if (additionalInfo.exclude_companies) syncData.exclude_companies = additionalInfo.exclude_companies;
        if (additionalInfo.willing_to_relocate !== undefined) syncData.willing_to_relocate = additionalInfo.willing_to_relocate;
        if (additionalInfo.can_work_3_days_in_office !== undefined) syncData.can_work_3_days_in_office = additionalInfo.can_work_3_days_in_office;
        if (additionalInfo.github_url) syncData.github_url = additionalInfo.github_url;
        if (additionalInfo.linked_in_url) syncData.linked_in_url = additionalInfo.linked_in_url;
        if (additionalInfo.is_over_18 !== undefined) syncData.is_over_18 = additionalInfo.is_over_18;
        if (additionalInfo.eligible_to_work_in_us !== undefined) syncData.eligible_to_work_in_us = additionalInfo.eligible_to_work_in_us;
        if (additionalInfo.authorized_without_visa !== undefined) syncData.authorized_without_visa = additionalInfo.authorized_without_visa;
        if (additionalInfo.require_future_sponsorship !== undefined) syncData.require_future_sponsorship = additionalInfo.require_future_sponsorship;
        if (additionalInfo.can_perform_essential_functions !== undefined) syncData.can_perform_essential_functions = additionalInfo.can_perform_essential_functions;
        if (additionalInfo.worked_for_company_before !== undefined) syncData.worked_for_company_before = additionalInfo.worked_for_company_before;
        if (additionalInfo.discharged_for_policy_violation !== undefined) syncData.discharged_for_policy_violation = additionalInfo.discharged_for_policy_violation;
        if (additionalInfo.referred_by_agency !== undefined) syncData.referred_by_agency = additionalInfo.referred_by_agency;
        if (additionalInfo.convicted_of_felony !== undefined) syncData.convicted_of_felony = additionalInfo.convicted_of_felony;
        if (additionalInfo.felony_explanation) syncData.felony_explanation = additionalInfo.felony_explanation;
        if (additionalInfo.pending_investigation !== undefined) syncData.pending_investigation = additionalInfo.pending_investigation;
        if (additionalInfo.willing_background_check !== undefined) syncData.willing_background_check = additionalInfo.willing_background_check;
        if (additionalInfo.willing_drug_screen !== undefined) syncData.willing_drug_screen = additionalInfo.willing_drug_screen;
        if (additionalInfo.failed_or_refused_drug_test !== undefined) syncData.failed_or_refused_drug_test = additionalInfo.failed_or_refused_drug_test;
        if (additionalInfo.uses_substances_affecting_duties !== undefined) syncData.uses_substances_affecting_duties = additionalInfo.uses_substances_affecting_duties;
        if (additionalInfo.substances_description) syncData.substances_description = additionalInfo.substances_description;
        if (additionalInfo.can_provide_legal_docs !== undefined) syncData.can_provide_legal_docs = additionalInfo.can_provide_legal_docs;
        if (additionalInfo.is_hispanic_latino) syncData.is_hispanic_latino = additionalInfo.is_hispanic_latino;
        if (additionalInfo.race_ethnicity) syncData.race_ethnicity = additionalInfo.race_ethnicity;
        if (additionalInfo.veteran_status) syncData.veteran_status = additionalInfo.veteran_status;
        if (additionalInfo.disability_status) syncData.disability_status = additionalInfo.disability_status;
        if (additionalInfo.has_relatives_in_company !== undefined) syncData.has_relatives_in_company = additionalInfo.has_relatives_in_company;
        if (additionalInfo.relatives_details) syncData.relatives_details = additionalInfo.relatives_details;
        // New fields added to match database schema
        if (additionalInfo.client_form_fill_date) syncData.client_form_fill_date = additionalInfo.client_form_fill_date;
        if (additionalInfo.full_address) syncData.full_address = additionalInfo.full_address;
        if (additionalInfo.date_of_birth) syncData.date_of_birth = additionalInfo.date_of_birth;
        if (additionalInfo.primary_phone) syncData.primary_phone = additionalInfo.primary_phone;
      }

      // Call sync-client API endpoint
      // Use environment variable for production, or relative path for local development
      const apiUrl = import.meta.env.VITE_TICKETING_TOOL_API_URL || '';
      const endpoint = apiUrl ? `${apiUrl}/api/sync-client` : '/api/sync-client';

          // Prepare headers - only include Authorization if API key is set
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };

          const apiKey = import.meta.env.VITE_SYNC_API_KEY;
          if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
          }

          const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(syncData),
          });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details?.join(', ') || 'Failed to update profile');
      }

      toast.success('Profile updated successfully to both systems!');

      // Update additionalInfo with merged data and clear editedFields
      if (mergedAdditionalInfo) {
        setAdditionalInfo(mergedAdditionalInfo);
      }
      setEditedFields({});
      setIsEditMode(false);

      // Refresh data
      await fetchClientDataById(selectedAccountId);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile changes');
    } finally {
      setSaving(false);
    }
  };



  // Update form field - using functional update to avoid dependencies
  const updateFormField = useCallback((field: keyof Client, value: any) => {
    setForm(prevForm => {
      if (!prevForm) return prevForm;
      return { ...prevForm, [field]: value };
    });
  }, []); // Empty array - function never recreates!

  // Update additional info field - using functional update to avoid dependencies
  const updateAdditionalInfoField = useCallback((field: keyof ClientAdditionalInfo, value: any) => {
    // During edit mode, store changes in separate state
    if (isEditMode) {
      setEditedFields(prev => ({ ...prev, [field]: value }));
    } else {
      // When not in edit mode, update directly
      setAdditionalInfo(prevInfo => {
        if (!prevInfo) return prevInfo;
        return { ...prevInfo, [field]: value };
      });
    }
  }, [isEditMode]);

  // Helper function to check if a field is empty
  const isFieldEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    return false;
  };

  // Get list of empty fields from additionalInfo
  const getEmptyFields = useCallback((): string[] => {
    if (!additionalInfo) return [];

    const emptyFields: string[] = [];
    const fieldsToCheck: (keyof ClientAdditionalInfo)[] = [
      // Personal Details tab
      'primary_phone',
      'date_of_birth',
      'full_address',
      'gender',
      'race_ethnicity',
      'state_of_residence',
      'zip_or_country',

      // Education & Skills tab
      'highest_education',
      'university_name',
      'cumulative_gpa',
      'main_subject',
      'graduation_year',
      'experience',
      'role',
      'work_preferences',
      'alternate_job_roles',
      'github_url',
      'linked_in_url',

      // Employment Info tab
      'is_over_18',
      'eligible_to_work_in_us',
      'authorized_without_visa',
      'require_future_sponsorship',
      'can_perform_essential_functions',
      'worked_for_company_before',
      'discharged_for_policy_violation',
      'referred_by_agency',

      // Background Check tab
      'convicted_of_felony',
      'pending_investigation',
      'willing_background_check',
      'willing_drug_screen',
      'failed_or_refused_drug_test',
      'uses_substances_affecting_duties',
      'can_provide_legal_docs',
      'is_hispanic_latino',
      'veteran_status',
      'disability_status',
      'has_relatives_in_company',
    ];

    fieldsToCheck.forEach(field => {
      if (isFieldEmpty(additionalInfo[field])) {
        emptyFields.push(field);
      }
    });

    return emptyFields;
  }, [additionalInfo]);

  // Check if all initially empty fields have been filled
  const areAllRequiredFieldsFilled = useMemo((): boolean => {
    if (emptyFieldsAtStart.length === 0) return true;

    // Check if all fields that were empty at start are now filled in editedFields
    return emptyFieldsAtStart.every(field => {
      const editedValue = editedFields[field as keyof ClientAdditionalInfo];
      return !isFieldEmpty(editedValue);
    });
  }, [emptyFieldsAtStart, editedFields]);

  // Handle entering edit mode
  const handleEnterEditMode = useCallback(() => {
    const emptyFields = getEmptyFields();
    setEmptyFieldsAtStart(emptyFields);
    setIsEditMode(true);
  }, [getEmptyFields]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setIsEditMode(false);
    setEditedFields({});
    setEmptyFieldsAtStart([]);
  }, []);

  // Map fields to their tabs
  const getFieldTab = (field: string): string => {
    const fieldTabMap: Record<string, string> = {
      // Personal Details
      'primary_phone': 'details',
      'date_of_birth': 'details',
      'full_address': 'details',
      'gender': 'details',
      'race_ethnicity': 'details',
      'state_of_residence': 'details',
      'zip_or_country': 'details',

      // Education & Skills
      'highest_education': 'education',
      'university_name': 'education',
      'cumulative_gpa': 'education',
      'main_subject': 'education',
      'graduation_year': 'education',
      'experience': 'education',
      'role': 'education',
      'work_preferences': 'education',
      'alternate_job_roles': 'education',
      'exclude_companies': 'education',
      'github_url': 'education',
      'linked_in_url': 'education',

      // Employment Info
      'is_over_18': 'employment',
      'eligible_to_work_in_us': 'employment',
      'authorized_without_visa': 'employment',
      'require_future_sponsorship': 'employment',
      'can_perform_essential_functions': 'employment',
      'worked_for_company_before': 'employment',
      'discharged_for_policy_violation': 'employment',
      'referred_by_agency': 'employment',

      // Background Check
      'convicted_of_felony': 'background',
      'pending_investigation': 'background',
      'willing_background_check': 'background',
      'willing_drug_screen': 'background',
      'failed_or_refused_drug_test': 'background',
      'uses_substances_affecting_duties': 'background',
      'can_provide_legal_docs': 'background',
      'is_hispanic_latino': 'background',
      'veteran_status': 'background',
      'disability_status': 'background',
      'has_relatives_in_company': 'background',
    };
    return fieldTabMap[field] || 'details';
  };

  // Get count of empty fields per tab
  const getEmptyFieldsPerTab = useMemo(() => {
    const tabCounts: Record<string, number> = {};

    emptyFieldsAtStart.forEach(field => {
      const editedValue = editedFields[field as keyof ClientAdditionalInfo];
      if (isFieldEmpty(editedValue)) {
        const tab = getFieldTab(field);
        tabCounts[tab] = (tabCounts[tab] || 0) + 1;
      }
    });

    return tabCounts;
  }, [emptyFieldsAtStart, editedFields]);

  // Fetch accounts when component opens
  useEffect(() => {

    if (isOpen && currentUser?.email) {
      fetchAccounts(currentUser.email);
    }
  }, [isOpen, currentUser, fetchAccounts]);

  // Fetch client data when selected account changes (but not while editing)
  useEffect(() => {
    if (selectedAccountId && !isEditMode) {
      fetchClientDataById(selectedAccountId);
    }
  }, [selectedAccountId, fetchClientDataById, isEditMode]);

  if (!isOpen && isModal) return null;

  if (loading) {
    return (
      <div className={`${isModal ? 'fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50' : 'w-full flex justify-center items-center py-12'}`}>
        <div className="bg-white p-6 rounded-lg shadow-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!form) return null;

  // Render field that can be edited only if empty
  const renderReadOnlyField = (label: string, value: any, icon?: React.ReactNode, field?: keyof Client) => {
    const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
    const canEdit = isEditMode && isEmpty && field;

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}
        </label>
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            key={`client-${field}`}
            type="text"
            value={value || ""}
            onChange={(e) => field && updateFormField(field, e.target.value)}
            className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border rounded-lg ${canEdit
              ? 'border-blue-300 bg-blue-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              : 'border-gray-300 bg-gray-50 text-gray-700'
              }`}
            disabled={!canEdit}
            readOnly={!canEdit}
            placeholder={canEdit ? `Enter ${label.toLowerCase()}` : ''}
          />
        </div>
      </div>
    );
  };

  const renderAdditionalInfoReadOnlyField = (label: string, value: any, icon?: React.ReactNode, field?: keyof ClientAdditionalInfo) => {
    const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
    const canEdit = isEditMode && isEmpty && field;

    // Use editedFields value if in edit mode and field has been edited
    const displayValue = (canEdit && field && editedFields[field] !== undefined)
      ? editedFields[field]
      : (value || "");

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}
        </label>
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            key={`additional-${field}`}
            type="text"
            value={displayValue}
            onChange={(e) => {
              e.stopPropagation();
              if (field) {
                updateAdditionalInfoField(field, e.target.value);
              }
            }}
            className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border rounded-lg ${canEdit
              ? 'border-blue-300 bg-blue-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              : 'border-gray-300 bg-gray-50 text-gray-700'
              }`}
            disabled={!canEdit}
            readOnly={!canEdit}
            placeholder={canEdit ? `Enter ${label.toLowerCase()}` : ''}
          />
        </div>
      </div>
    );
  };

  const renderReadOnlyTextarea = (label: string, value: any, icon?: React.ReactNode, field?: keyof Client) => {
    const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
    const canEdit = isEditMode && isEmpty && field;

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}
        </label>
        <div className="relative">
          {icon && (
            <div className="absolute top-3 left-3">
              {icon}
            </div>
          )}
          <textarea
            key={`client-textarea-${field}`}
            value={value || ""}
            onChange={(e) => field && updateFormField(field, e.target.value)}
            className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border rounded-lg ${canEdit
              ? 'border-blue-300 bg-blue-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              : 'border-gray-300 bg-gray-50 text-gray-700'
              }`}
            disabled={!canEdit}
            readOnly={!canEdit}
            rows={3}
            placeholder={canEdit ? `Enter ${label.toLowerCase()}` : ''}
          />
        </div>
      </div>
    );
  };

  const renderAdditionalInfoReadOnlyTextarea = (label: string, value: any, icon?: React.ReactNode, field?: keyof ClientAdditionalInfo) => {
    const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
    const canEdit = isEditMode && isEmpty && field;

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}
        </label>
        <div className="relative">
          {icon && (
            <div className="absolute top-3 left-3">
              {icon}
            </div>
          )}
          <textarea
            key={`additional-textarea-${field}`}
            value={value || ""}
            onChange={(e) => field && updateAdditionalInfoField(field, e.target.value)}
            className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border rounded-lg ${canEdit
              ? 'border-blue-300 bg-blue-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              : 'border-gray-300 bg-gray-50 text-gray-700'
              }`}
            disabled={!canEdit}
            readOnly={!canEdit}
            rows={3}
            placeholder={canEdit ? `Enter ${label.toLowerCase()}` : ''}
          />
        </div>
      </div>
    );
  };

  // Render select dropdown with options
  const renderAdditionalInfoSelectField = (
    label: string,
    value: any,
    options: string[],
    icon?: React.ReactNode,
    field?: keyof ClientAdditionalInfo
  ) => {
    const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
    const canEdit = isEditMode && isEmpty && field;

    // Use editedFields value if in edit mode and field has been edited
    const displayValue = (canEdit && field && editedFields[field] !== undefined)
      ? editedFields[field]
      : (value || "");

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}
        </label>
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              {icon}
            </div>
          )}
          <select
            key={`additional-select-${field}`}
            value={displayValue || ""}
            onChange={(e) => {
              e.stopPropagation();
              if (field) {
                updateAdditionalInfoField(field, e.target.value);
              }
            }}
            className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-10 py-2 border rounded-lg appearance-none ${canEdit
              ? 'border-blue-300 bg-blue-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer'
              : 'border-gray-300 bg-gray-50 text-gray-700 cursor-not-allowed'
              }`}
            disabled={!canEdit}
          >
            <option value="">{canEdit ? `Select ${label.toLowerCase()}` : ''}</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {/* Dropdown arrow icon */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    );
  };

  // Render date input with calendar picker
  const renderAdditionalInfoReadOnlyDate = (label: string, value: any, icon?: React.ReactNode, field?: keyof ClientAdditionalInfo) => {
    const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
    const canEdit = isEditMode && isEmpty && field;

    // Use editedFields if available during edit mode, otherwise use value
    const displayValue = field && editedFields[field] !== undefined
      ? editedFields[field]
      : value;

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}
        </label>
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            key={`additional-date-${field}`}
            type={canEdit ? "date" : "text"}
            value={displayValue || ""}
            onChange={(e) => {
              e.stopPropagation();
              if (field) {
                updateAdditionalInfoField(field, e.target.value);
              }
            }}
            className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border rounded-lg ${canEdit
              ? 'border-blue-300 bg-blue-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              : 'border-gray-300 bg-gray-50 text-gray-700'
              }`}
            disabled={!canEdit}
            readOnly={!canEdit}
            placeholder={canEdit ? 'Select date' : ''}
          />
        </div>
      </div>
    );
  };


  // Simple display component for job roles and locations
  const renderListDisplay = (label: string, items: string[] | undefined, icon?: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}
      </label>
      <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 min-h-[42px]">
        {items && items.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {items.map((item, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {item}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-500 text-sm">No {label.toLowerCase()} specified</span>
        )}
      </div>
    </div>
  );

  // Render date input
  const renderReadOnlyDateInput = (label: string, value: string | Date | undefined, icon?: React.ReactNode) => {
    const formattedDate = value ? new Date(value).toLocaleDateString() : "";
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}</label>
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            type="text"
            value={formattedDate}
            className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700`}
            disabled
            readOnly
          />
        </div>
      </div>
    );
  };

  // Render boolean input
  const renderReadOnlyBooleanInput = (label: string, value: boolean | undefined, icon?: React.ReactNode, field?: keyof ClientAdditionalInfo) => {
    const isEmpty = value === undefined || value === null;
    const canEdit = isEditMode && isEmpty && field;

    // Use editedFields value if in edit mode and field has been edited
    let displayValue: string = "";

    if (canEdit && field && editedFields[field] !== undefined) {
      const editedVal = editedFields[field];
      displayValue = editedVal === undefined || editedVal === null ? "" : editedVal.toString();
    } else {
      displayValue = value === undefined || value === null ? "" : value.toString();
    }

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}
        </label>
        <div className="relative">
          {canEdit ? (
            <select
              value={displayValue}
              onChange={(e) => {
                if (field) {
                  const val = e.target.value;
                  const newValue = val === '' ? undefined : val === 'true';
                  updateAdditionalInfoField(field, newValue);
                }
              }}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-blue-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select...</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : (
            <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
              {value === true ? "Yes" : value === false ? "No" : "Not specified"}
            </div>
          )}
        </div>
      </div>
    );
  };


  const content = (
    <div className={`${isModal ? 'bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col' : 'w-full flex flex-col space-y-6'}`}>
      {/* Header */}
      <div className={`${isModal ? 'p-6 border-b border-gray-200 sticky top-0 bg-white z-10' : 'pb-6 border-b border-gray-200'}`}>
        <div className="flex justify-between items-start gap-6">
          {/* Title and Subtitle */}
          <div className="flex-shrink-0">
            <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
            <p className="text-sm text-gray-500 mt-1">View your profile information</p>
          </div>

          {/* Right side content: Account Selector, Edit/Save Buttons, and Close Button */}
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
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="px-4 py-2 border border-blue-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[220px] bg-white shadow-sm hover:border-blue-400 transition-colors cursor-pointer"
                    disabled={isEditMode}
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

            {/* Edit Mode Buttons */}
            {!isEditMode ? (
              <button
                onClick={handleEnterEditMode}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all font-medium shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Fill Your Data
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !areAllRequiredFieldsFilled}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title={!areAllRequiredFieldsFilled ? `Please fill all empty fields (${emptyFieldsAtStart.length - emptyFieldsAtStart.filter(f => !isFieldEmpty(editedFields[f as keyof ClientAdditionalInfo])).length}/${emptyFieldsAtStart.length} filled)` : 'Save changes'}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Close Button */}
            {isModal && (
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                title="Close"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Edit Mode Info - Show when in edit mode */}
        {isEditMode && emptyFieldsAtStart.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900">Edit Mode Active</p>
                <p className="text-xs text-blue-700">
                  You can only fill in <span className="font-semibold">empty fields</span> (highlighted in light blue). Fields with existing data cannot be modified.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px overflow-x-auto">
          <button
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'details'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            onClick={() => setActiveTab('details')}
          >
            <div className="flex items-center gap-2">
              <span>Personal Details</span>
              {isEditMode && getEmptyFieldsPerTab['details'] > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {getEmptyFieldsPerTab['details']}
                </span>
              )}
            </div>
          </button>
          <button
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'education'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            onClick={() => setActiveTab('education')}
          >
            <div className="flex items-center gap-2">
              <span>Education & Skills</span>
              {isEditMode && getEmptyFieldsPerTab['education'] > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {getEmptyFieldsPerTab['education']}
                </span>
              )}
            </div>
          </button>
          <button
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'employment'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            onClick={() => setActiveTab('employment')}
          >
            <div className="flex items-center gap-2">
              <span>Employment Info</span>
              {isEditMode && getEmptyFieldsPerTab['employment'] > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {getEmptyFieldsPerTab['employment']}
                </span>
              )}
            </div>
          </button>
          <button
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'background'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            onClick={() => setActiveTab('background')}
          >
            <div className="flex items-center gap-2">
              <span>Background Check</span>
              {isEditMode && getEmptyFieldsPerTab['background'] > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {getEmptyFieldsPerTab['background']}
                </span>
              )}
            </div>
          </button>
          <button
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'resume'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            onClick={() => setActiveTab('resume')}
          >
            <div className="flex items-center gap-2">
              <span>Resume</span>
              {isEditMode && getEmptyFieldsPerTab['resume'] > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {getEmptyFieldsPerTab['resume']}
                </span>
              )}
            </div>
          </button>
        </nav>
      </div>

      {/* Form Content */}
      <div className={`${isModal ? 'p-6' : 'py-6'}`}>
        {/* Personal Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-8">
            {/* Personal Info Section */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <UserIcon className="h-5 w-5 text-blue-600" />
                <h2 className="text-blue-800 font-semibold text-lg">Personal Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderReadOnlyField("Full Name", form.full_name, <UserIcon className="h-4 w-4 text-gray-400" />, 'full_name')}
                {renderReadOnlyField("Personal Email", form.personal_email, <Mail className="h-4 w-4 text-gray-400" />, 'personal_email')}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ApplyWizz ID <UserIcon className="inline h-4 w-4 text-gray-400" /></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={form.applywizz_id || ""}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                      disabled
                      readOnly
                    />
                  </div>
                </div>
                {renderReadOnlyField("Visa Type", form.visa_type, <CreditCard className="h-4 w-4 text-gray-400" />, 'visa_type')}
                {renderAdditionalInfoSelectField("Gender", additionalInfo?.gender, GENDER_OPTIONS, <UserIcon className="h-4 w-4 text-gray-400" />, 'gender')}
                {renderAdditionalInfoSelectField("Race/Ethnicity", additionalInfo?.race_ethnicity, RACE_ETHNICITY_OPTIONS, <UserIcon className="h-4 w-4 text-gray-400" />, 'race_ethnicity')}
              </div>
            </div>

            {/* Contact Info Section */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <Phone className="h-5 w-5 text-green-600" />
                <h2 className="text-green-800 font-semibold text-lg">Contact Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderReadOnlyField("WhatsApp Number", form.whatsapp_number, <Phone className="h-4 w-4 text-gray-400" />, 'whatsapp_number')}
                {renderReadOnlyField("Callable Phone", form.callable_phone, <Phone className="h-4 w-4 text-gray-400" />, 'callable_phone')}
                {renderAdditionalInfoReadOnlyField("Primary Phone", additionalInfo?.primary_phone, <Phone className="h-4 w-4 text-gray-400" />, 'primary_phone')}
                {renderAdditionalInfoReadOnlyDate("Date of Birth", additionalInfo?.date_of_birth, <Calendar className="h-4 w-4 text-gray-400" />, 'date_of_birth')}
                {renderAdditionalInfoReadOnlyField("State of Residence", additionalInfo?.state_of_residence, <MapPin className="h-4 w-4 text-gray-400" />, 'state_of_residence')}
                {renderAdditionalInfoReadOnlyField("Zip/Country", additionalInfo?.zip_or_country, <MapPin className="h-4 w-4 text-gray-400" />, 'zip_or_country')}

                {/* Full Address with Autocomplete */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Address <MapPin className="inline h-4 w-4 text-gray-400" />
                  </label>
                  {isEditMode && (!additionalInfo?.full_address || additionalInfo.full_address === '') ? (
                    <AddressAutocomplete
                      value={editedFields.full_address !== undefined ? editedFields.full_address : (additionalInfo?.full_address || '')}
                      onChange={(value) => updateAdditionalInfoField('full_address', value)}
                      placeholder="Start typing address... (USA/UK)"
                    />
                  ) : (
                    <div className="relative">
                      <div className="absolute top-3 left-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                      </div>
                      <textarea
                        value={additionalInfo?.full_address || ""}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 resize-none"
                        disabled
                        readOnly
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Company Info Section */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <Building className="h-5 w-5 text-purple-600" />
                <h2 className="text-purple-800 font-semibold text-lg">Company Details</h2>
              </div>
              <div className="space-y-6">
                {renderReadOnlyField("Company Email", form.company_email, <Mail className="h-4 w-4 text-gray-400" />)}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Authorization Details <Shield className="inline h-4 w-4 text-gray-400" />
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Shield className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                      value={form.work_auth_details}
                      disabled
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 appearance-none"
                    >
                      <option value="">Select work authorization</option>
                      <option value="H1B Visa">H1B Visa</option>
                      <option value="Green Card">Green Card</option>
                      <option value="F1 OPT">F1 OPT</option>
                      <option value="L1 Visa">L1 Visa</option>
                      <option value="US Citizen">US Citizen</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Job/Location Info Section */}
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="h-5 w-5 text-orange-600" />
                <h2 className="text-orange-800 font-semibold text-lg">Job & Location Preferences</h2>
              </div>

              <div className="space-y-6">
                {renderListDisplay(
                  "Target Job Roles",
                  form.job_role_preferences,
                  <FileText className="h-4 w-4 text-gray-400 inline" />
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Salary Range
                  </label>
                  <select
                    value={form.salary_range}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 appearance-none"
                  >
                    <option value="">Select salary range</option>
                    <option value="$50,000 - $70,000">$50,000 - $70,000</option>
                    <option value="$70,000 - $90,000">$70,000 - $90,000</option>
                    <option value="$90,000 - $120,000">$90,000 - $120,000</option>
                    <option value="$120,000 - $150,000">$120,000 - $150,000</option>
                    <option value="$150,000 - $200,000">$150,000 - $200,000</option>
                    <option value="$200,000+">$200,000+</option>
                  </select>
                </div>

                {renderListDisplay(
                  "Preferred Locations",
                  form.location_preferences,
                  <Building className="h-4 w-4 text-gray-400 inline" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Education & Skills Tab */}
        {activeTab === 'education' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                <h2 className="text-blue-800 font-semibold text-lg">Education Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderAdditionalInfoSelectField("Highest Education", additionalInfo?.highest_education, HIGHEST_EDUCATION_OPTIONS, <GraduationCap className="h-4 w-4 text-gray-400" />, 'highest_education')}
                {renderAdditionalInfoReadOnlyField("University Name", additionalInfo?.university_name, <GraduationCap className="h-4 w-4 text-gray-400" />, 'university_name')}
                {renderAdditionalInfoReadOnlyField("Cumulative GPA", additionalInfo?.cumulative_gpa, <GraduationCap className="h-4 w-4 text-gray-400" />, 'cumulative_gpa')}
                {renderAdditionalInfoReadOnlyField("Main Subject", additionalInfo?.main_subject, <Book className="h-4 w-4 text-gray-400" />, 'main_subject')}
                {renderAdditionalInfoReadOnlyField("Graduation Year", additionalInfo?.graduation_year, <GraduationCap className="h-4 w-4 text-gray-400" />, 'graduation_year')}
                {renderAdditionalInfoSelectField("Experience (Years)", additionalInfo?.experience, EXPERIENCE_YEARS_OPTIONS, <GraduationCap className="h-4 w-4 text-gray-400" />, 'experience')}
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <Book className="h-5 w-5 text-green-600" />
                <h2 className="text-green-800 font-semibold text-lg">Skills & Preferences</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderAdditionalInfoReadOnlyField("Role", additionalInfo?.role, <Book className="h-4 w-4 text-gray-400" />, 'role')}
                {renderAdditionalInfoSelectField("Work Preferences", additionalInfo?.work_preferences, WORK_PREFERENCE_OPTIONS, <Book className="h-4 w-4 text-gray-400" />, 'work_preferences')}
                {renderAdditionalInfoReadOnlyField("Alternate Job Roles", additionalInfo?.alternate_job_roles, <FileText className="h-4 w-4 text-gray-400" />, 'alternate_job_roles')}
                {renderAdditionalInfoReadOnlyField("Exclude Companies", additionalInfo?.exclude_companies, <Building className="h-4 w-4 text-gray-400" />, 'exclude_companies')}
                {renderReadOnlyBooleanInput("Willing to Relocate", additionalInfo?.willing_to_relocate, <MapPin className="h-4 w-4 text-gray-400" />, 'willing_to_relocate')}
                {renderReadOnlyBooleanInput("Can Work 3 Days in Office", additionalInfo?.can_work_3_days_in_office, <Building className="h-4 w-4 text-gray-400" />, 'can_work_3_days_in_office')}
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <Link className="h-5 w-5 text-purple-600" />
                <h2 className="text-purple-800 font-semibold text-lg">Online Profiles</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderAdditionalInfoReadOnlyField("GitHub URL", additionalInfo?.github_url, <Link className="h-4 w-4 text-gray-400" />, 'github_url')}
                {renderAdditionalInfoReadOnlyField("LinkedIn URL", additionalInfo?.linked_in_url, <Link className="h-4 w-4 text-gray-400" />, 'linked_in_url')}
              </div>
            </div>
          </div>
        )}

        {/* Employment Info Tab */}
        {activeTab === 'employment' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <Building className="h-5 w-5 text-blue-600" />
                <h2 className="text-blue-800 font-semibold text-lg">Employment Eligibility</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderReadOnlyBooleanInput("Is Over 18", additionalInfo?.is_over_18, <UserIcon className="h-4 w-4 text-gray-400" />, 'is_over_18')}
                {renderReadOnlyBooleanInput("Eligible to Work in US", additionalInfo?.eligible_to_work_in_us, <UserIcon className="h-4 w-4 text-gray-400" />, 'eligible_to_work_in_us')}
                {renderReadOnlyBooleanInput("Authorized Without Visa", additionalInfo?.authorized_without_visa, <CreditCard className="h-4 w-4 text-gray-400" />, 'authorized_without_visa')}
                {renderReadOnlyBooleanInput("Require Future Sponsorship", additionalInfo?.require_future_sponsorship, <CreditCard className="h-4 w-4 text-gray-400" />, 'require_future_sponsorship')}
                {renderReadOnlyBooleanInput("Can Perform Essential Functions", additionalInfo?.can_perform_essential_functions, <UserIcon className="h-4 w-4 text-gray-400" />, 'can_perform_essential_functions')}
                {renderReadOnlyBooleanInput("Worked for Company Before", additionalInfo?.worked_for_company_before, <Building className="h-4 w-4 text-gray-400" />, 'worked_for_company_before')}
                {renderReadOnlyBooleanInput("Discharged for Policy Violation", additionalInfo?.discharged_for_policy_violation, <UserIcon className="h-4 w-4 text-gray-400" />, 'discharged_for_policy_violation')}
                {renderReadOnlyBooleanInput("Referred by Agency", additionalInfo?.referred_by_agency, <UserIcon className="h-4 w-4 text-gray-400" />, 'referred_by_agency')}
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="h-5 w-5 text-green-600" />
                <h2 className="text-green-800 font-semibold text-lg">Add-ons Information</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Add-ons Info</label>
                  <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 min-h-[42px]">
                    {additionalInfo?.add_ons_info && additionalInfo.add_ons_info.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {additionalInfo.add_ons_info.map((item, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">No add-ons specified</span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Background Check Tab */}
        {activeTab === 'background' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <UserIcon className="h-5 w-5 text-blue-600" />
                <h2 className="text-blue-800 font-semibold text-lg">Legal & Background</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderReadOnlyBooleanInput("Convicted of Felony", additionalInfo?.convicted_of_felony, <UserIcon className="h-4 w-4 text-gray-400" />, 'convicted_of_felony')}
                {renderAdditionalInfoReadOnlyTextarea("Felony Explanation", additionalInfo?.felony_explanation, <UserIcon className="h-4 w-4 text-gray-400" />, 'felony_explanation')}
                {renderReadOnlyBooleanInput("Pending Investigation", additionalInfo?.pending_investigation, <UserIcon className="h-4 w-4 text-gray-400" />, 'pending_investigation')}
                {renderReadOnlyBooleanInput("Willing Background Check", additionalInfo?.willing_background_check, <UserIcon className="h-4 w-4 text-gray-400" />, 'willing_background_check')}
                {renderReadOnlyBooleanInput("Willing Drug Screen", additionalInfo?.willing_drug_screen, <UserIcon className="h-4 w-4 text-gray-400" />, 'willing_drug_screen')}
                {renderReadOnlyBooleanInput("Failed or Refused Drug Test", additionalInfo?.failed_or_refused_drug_test, <UserIcon className="h-4 w-4 text-gray-400" />, 'failed_or_refused_drug_test')}
                {renderReadOnlyBooleanInput("Uses Substances Affecting Duties", additionalInfo?.uses_substances_affecting_duties, <UserIcon className="h-4 w-4 text-gray-400" />, 'uses_substances_affecting_duties')}
                {renderAdditionalInfoReadOnlyTextarea("Substances Description", additionalInfo?.substances_description, <UserIcon className="h-4 w-4 text-gray-400" />, 'substances_description')}
                {renderReadOnlyBooleanInput("Can Provide Legal Docs", additionalInfo?.can_provide_legal_docs, <UserIcon className="h-4 w-4 text-gray-400" />, 'can_provide_legal_docs')}
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <UserIcon className="h-5 w-5 text-green-600" />
                <h2 className="text-green-800 font-semibold text-lg">Diversity & Relations</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderAdditionalInfoSelectField("Hispanic/Latino", additionalInfo?.is_hispanic_latino, HISPANIC_LATINO_OPTIONS, <UserIcon className="h-4 w-4 text-gray-400" />, 'is_hispanic_latino')}
                {renderAdditionalInfoSelectField("Veteran Status", additionalInfo?.veteran_status, VETERAN_STATUS_OPTIONS, <UserIcon className="h-4 w-4 text-gray-400" />, 'veteran_status')}
                {renderAdditionalInfoSelectField("Disability Status", additionalInfo?.disability_status, DISABILITY_STATUS_OPTIONS, <UserIcon className="h-4 w-4 text-gray-400" />, 'disability_status')}
                {renderReadOnlyBooleanInput("Has Relatives in Company", additionalInfo?.has_relatives_in_company, <UserIcon className="h-4 w-4 text-gray-400" />, 'has_relatives_in_company')}
                {renderAdditionalInfoReadOnlyTextarea("Relatives Details", additionalInfo?.relatives_details, <UserIcon className="h-4 w-4 text-gray-400" />, 'relatives_details')}
              </div>
            </div>
          </div>
        )}

        {/* Resume Tab */}
        {activeTab === 'resume' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-blue-800 font-semibold text-lg">Resume Information</h2>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resume Document</label>
                  {additionalInfo?.resume_url ? (
                    <div className="flex items-center p-4 border border-blue-200 rounded-lg bg-white shadow-sm">
                      <div className="p-3 bg-blue-50 rounded-full mr-4">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {additionalInfo.resume_url.split('/').pop() || 'Resume.pdf'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {additionalInfo.resume_url}
                        </p>
                      </div>
                      <a
                        href={additionalInfo.resume_url.startsWith('http')
                          ? additionalInfo.resume_url
                          : `https://applywizz-prod.s3.us-east-2.amazonaws.com/${additionalInfo.resume_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        <Link className="h-4 w-4 mr-2" />
                        View Resume
                      </a>
                    </div>
                  ) : (
                    <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">No resume available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {isModal && (
        <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white mt-auto">
          <div className="flex justify-end">
            <button
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 overflow-hidden">
        {content}
      </div>
    );
  }

  return content;
}
