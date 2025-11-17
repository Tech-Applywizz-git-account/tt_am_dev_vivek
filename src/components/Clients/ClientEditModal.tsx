import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { User, Client, TestResult, MCQResults } from "@/types";
import { Building, FileText, Phone, X, User as UserIcon, Mail, Shield, Calendar, CreditCard, Book, MapPin, GraduationCap, Link, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';


interface ClientAdditionalInfo {
  id: string;
  created_at?: string;
  update_at?: string;
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
}

interface Props {
  client: Client | null;
  isOpen: boolean;
  currentUserRole: String;
  onClose: () => void;
  onSubmit: (updatedClient: Client) => void;
}

export function ClientEditModal({ client, isOpen, currentUserRole, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<Client | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState<ClientAdditionalInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [originalCAId, setOriginalCAId] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'details' | 'assignments' | 'education' | 'employment' | 'background' | 'codinglab'>('details');
  const [testResultsForm, setTestResultsForm] = useState<TestResult[]>([]);

  const isReadOnly = currentUserRole === "career_associate";

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("users").select("*").order('name', { ascending: true });
    if (error) console.error("Failed to fetch users", error);
    else setUsers(data);
  };

  useEffect(() => {
    if (client) {
      // Convert string dates to Date objects
      const processedClient = {
        ...client,
        created_at: client.created_at && typeof client.created_at === 'string'
          ? new Date(client.created_at)
          : client.created_at,
        update_at: client.update_at && typeof client.update_at === 'string'
          ? new Date(client.update_at)
          : client.update_at
      };

      setForm(processedClient);
      setOriginalCAId(client.careerassociateid || "");

      // Load test results if available
      if (client.test_results && Array.isArray(client.test_results)) {
        setTestResultsForm(client.test_results);
      } else {
        setTestResultsForm([]);
      }

      // Fetch additional client information
      fetchAdditionalClientInfo(client.id);
    }
  }, [client]);

  const fetchAdditionalClientInfo = async (clientId: string) => {
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
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form?.full_name?.trim()) newErrors.full_name = "Full name is required";
    if (!form?.company_email?.trim()) newErrors.company_email = "Company email is required";
    if (!form?.whatsapp_number?.trim()) newErrors.whatsapp_number = "WhatsApp number is required";
    if (!form?.work_auth_details) newErrors.work_auth_details = "Work authorization is required";
    if (!form?.salary_range) newErrors.salary_range = "Salary range is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    if (!form) return;
    setForm((prev: any) => ({ ...prev, [field]: value }));

    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAdditionalInfoChange = (field: string, value: any) => {
    if (!additionalInfo) return;
    setAdditionalInfo((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form) return;

    if (!validateForm()) {
      toast.error("Please fix validation errors before submitting");
      return;
    }

    setLoading(true);

    // Check if Career Associate has changed
    const caChanged = originalCAId !== form.careerassociateid;

    if (caChanged && originalCAId && form.careerassociateid) {
      try {
        // Get old CA email
        const oldCA = users.find(u => u.id === originalCAId);
        // Get new CA email
        const newCA = users.find(u => u.id === form.careerassociateid);

        if (oldCA && newCA && form.applywizz_id) {
          const baseUrl = import.meta.env.VITE_EXTERNAL_API_URL;

          // Step 1: Delete old assignment
          const deleteUrl = `${baseUrl}/api/associate-update?type=lead-delete`;
          await fetch(deleteUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              "ca-email": oldCA.email,
              "lead-id": form.applywizz_id,
            })
          });

          // Step 2: Map new assignment
          const mappingUrl = `${baseUrl}/api/associate-update?type=lead-mapping`;
          await fetch(mappingUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              "ca-email": newCA.email,
              "lead-id": form.applywizz_id,
            })
          });
        }
      } catch (apiError) {
        console.error('Error syncing CA assignment to external API:', apiError);
        // Continue with local update even if external API fails
      }
    }

    // Update client information with test results
    const { error: clientError } = await supabase
      .from("clients")
      .update({ 
        ...form,
        test_results: testResultsForm.length > 0 ? testResultsForm : null
      })
      .eq("id", client.id);

    // Update additional client information
    let additionalInfoError = null;
    if (additionalInfo) {
      const { error } = await supabase
        .from("clients_additional_information")
        .update({ ...additionalInfo, updated_at: new Date().toISOString() })
        .eq("id", client.id);
      additionalInfoError = error;
    }

    setLoading(false);

    if (clientError || additionalInfoError) {
      toast.error('Error updating client: ' + (clientError?.message || additionalInfoError?.message));
    } else {
      toast.success("Client updated successfully!", {
        position: "top-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });
      onSubmit(form);
      onClose();
    }
  };

  if (!isOpen || !form) return null;

  const renderInput = (label: string, field: string, type = "text", icon?: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}</label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={form[field] || ""}
          onChange={(e) => handleChange(field, e.target.value)}
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border ${errors[field] ? 'border-red-500' : 'border-gray-300'
            } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
          disabled={isReadOnly}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      </div>
      {errors[field] && <p className="mt-1 text-sm text-red-600">{errors[field]}</p>}
    </div>
  );

  const renderAdditionalInfoInput = (label: string, field: string, type = "text", icon?: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}</label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={additionalInfo?.[field] || ""}
          onChange={(e) => handleAdditionalInfoChange(field, e.target.value)}
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
          disabled={isReadOnly}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      </div>
    </div>
  );

  const renderTextarea = (label: string, field: string, icon?: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}</label>
      <div className="relative">
        {icon && (
          <div className="absolute top-3 left-3">
            {icon}
          </div>
        )}
        <textarea
          value={form[field] || ""}
          onChange={(e) => handleChange(field, e.target.value)}
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border ${errors[field] ? 'border-red-500' : 'border-gray-300'
            } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
          disabled={isReadOnly}
          placeholder={`Enter ${label.toLowerCase()}`}
          rows={3}
        />
      </div>
      {errors[field] && <p className="mt-1 text-sm text-red-600">{errors[field]}</p>}
    </div>
  );

  const renderAdditionalInfoTextarea = (label: string, field: string, icon?: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}</label>
      <div className="relative">
        {icon && (
          <div className="absolute top-3 left-3">
            {icon}
          </div>
        )}
        <textarea
          value={additionalInfo?.[field] || ""}
          onChange={(e) => handleAdditionalInfoChange(field, e.target.value)}
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
          disabled={isReadOnly}
          placeholder={`Enter ${label.toLowerCase()}`}
          rows={3}
        />
      </div>
    </div>
  );

  const renderDropdown = (label: string, field: string, role: string, icon?: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}</label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <select
          value={form[field] || ""}
          onChange={(e) => handleChange(field, e.target.value)}
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border ${errors[field] ? 'border-red-500' : 'border-gray-300'
            } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none bg-white`}
          disabled={isReadOnly}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {users
            .filter((u) => u.role === role)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
        </select>
      </div>
      {errors[field] && <p className="mt-1 text-sm text-red-600">{errors[field]}</p>}
    </div>
  );

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
  const renderDateInput = (label: string, field: string, icon?: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}</label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type="date"
          value={form[field] ? form[field].split('T')[0] : ""}
          onChange={(e) => handleChange(field, e.target.value)}
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border ${errors[field] ? 'border-red-500' : 'border-gray-300'
            } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
          disabled={isReadOnly}
        />
      </div>
      {errors[field] && <p className="mt-1 text-sm text-red-600">{errors[field]}</p>}
    </div>
  );

  // Render date input for additional info
  const renderAdditionalInfoDateInput = (label: string, field: string, icon?: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}</label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type="date"
          value={additionalInfo?.[field] ? additionalInfo[field].split('T')[0] : ""}
          onChange={(e) => handleAdditionalInfoChange(field, e.target.value)}
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
          disabled={isReadOnly}
        />
      </div>
    </div>
  );

  // Render boolean input
  const renderBooleanInput = (label: string, field: string, icon?: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}</label>
      <div className="relative">
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              checked={form[field] === true}
              onChange={() => handleChange(field, true)}
              disabled={isReadOnly}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2">Yes</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              checked={form[field] === false}
              onChange={() => handleChange(field, false)}
              disabled={isReadOnly}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2">No</span>
          </label>
        </div>
      </div>
      {errors[field] && <p className="mt-1 text-sm text-red-600">{errors[field]}</p>}
    </div>
  );

  // Render boolean input for additional info
  const renderAdditionalInfoBooleanInput = (label: string, field: string, icon?: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}</label>
      <div className="relative">
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              checked={additionalInfo?.[field] === true}
              onChange={() => handleAdditionalInfoChange(field, true)}
              disabled={isReadOnly}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2">Yes</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              checked={additionalInfo?.[field] === false}
              onChange={() => handleAdditionalInfoChange(field, false)}
              disabled={isReadOnly}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2">No</span>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Client Profile</h2>
            <p className="text-sm text-gray-500 mt-1">Update client information and preferences</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Close"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
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
              Personal Details
            </button>
            <button
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'assignments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              onClick={() => setActiveTab('assignments')}
            >
              Assigned Persons
            </button>
            <button
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'education'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              onClick={() => setActiveTab('education')}
            >
              Education & Skills
            </button>
            <button
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'employment'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              onClick={() => setActiveTab('employment')}
            >
              Employment Info
            </button>
            <button
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'background'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              onClick={() => setActiveTab('background')}
            >
              Background Check
            </button>
            {(currentUserRole === "ca_team_lead" || currentUserRole === "cro") && (
              <button
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'codinglab'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                onClick={() => setActiveTab('codinglab')}
              >
                Coding Lab
              </button>
            )}
          </nav>
        </div>

        {/* Form Content */}
        <div className="p-6">
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
                  {renderInput("Full Name", "full_name", "text", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderInput("Personal Email", "personal_email", "email", <Mail className="h-4 w-4 text-gray-400" />)}
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
                  {renderInput("Visa Type", "visa_type", "text", <CreditCard className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoInput("Gender", "gender", "text", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoInput("Race/Ethnicity", "race_ethnicity", "text", <UserIcon className="h-4 w-4 text-gray-400" />)}
                </div>
              </div>

              {/* Contact Info Section */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <Phone className="h-5 w-5 text-green-600" />
                  <h2 className="text-green-800 font-semibold text-lg">Contact Information</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderInput("WhatsApp Number", "whatsapp_number", "tel", <Phone className="h-4 w-4 text-gray-400" />)}
                  {renderInput("Callable Phone", "callable_phone", "tel", <Phone className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoInput("State of Residence", "state_of_residence", "text", <MapPin className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoInput("Zip/Country", "zip_or_country", "text", <MapPin className="h-4 w-4 text-gray-400" />)}
                </div>
              </div>

              {/* Company Info Section */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <Building className="h-5 w-5 text-purple-600" />
                  <h2 className="text-purple-800 font-semibold text-lg">Company Details</h2>
                </div>
                <div className="space-y-6">
                  {renderInput("Company Email", "company_email", "email", <Mail className="h-4 w-4 text-gray-400" />)}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Work Authorization Details <Shield className="inline h-4 w-4 text-gray-400" />
                      {errors.work_auth_details && <span className="text-red-600">*</span>}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Shield className="h-4 w-4 text-gray-400" />
                      </div>
                      <select
                        value={form.work_auth_details}
                        onChange={(e) => handleChange("work_auth_details", e.target.value)}
                        disabled={isReadOnly}
                        className={`w-full pl-10 pr-3 py-2 border ${errors.work_auth_details ? 'border-red-500' : 'border-gray-300'
                          } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors appearance-none bg-white`}
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
                    {errors.work_auth_details && <p className="mt-1 text-sm text-red-600">{errors.work_auth_details}</p>}
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
                      Expected Salary Range *
                      {errors.salary_range && <span className="text-red-600">*</span>}
                    </label>
                    <select
                      value={form.salary_range}
                      onChange={(e) => handleChange("salary_range", e.target.value)}
                      disabled={isReadOnly}
                      className={`w-full px-3 py-2 border ${errors.salary_range ? 'border-red-500' : 'border-gray-300'
                        } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors appearance-none bg-white`}
                    >
                      <option value="">Select salary range</option>
                      <option value="$50,000 - $70,000">$50,000 - $70,000</option>
                      <option value="$70,000 - $90,000">$70,000 - $90,000</option>
                      <option value="$90,000 - $120,000">$90,000 - $120,000</option>
                      <option value="$120,000 - $150,000">$120,000 - $150,000</option>
                      <option value="$150,000 - $200,000">$150,000 - $200,000</option>
                      <option value="$200,000+">$200,000+</option>
                    </select>
                    {errors.salary_range && <p className="mt-1 text-sm text-red-600">{errors.salary_range}</p>}
                  </div>

                  {renderListDisplay(
                    "Preferred Locations",
                    form.location_preferences,
                    <Building className="h-4 w-4 text-gray-400 inline" />
                  )}
                </div>
              </div>

              {/* Additional Details Section */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <h2 className="text-gray-800 font-semibold text-lg">Additional Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderDateInput("Onboarding Date", "onboardingdate", <Calendar className="h-4 w-4 text-gray-400" />)}
                  {renderBooleanInput("Sponsorship Required", "sponsorship", <CreditCard className="h-4 w-4 text-gray-400" />)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                    <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                      {form.created_at ? new Date(form.created_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                    <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                      {form.update_at ? new Date(form.update_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assigned Persons Tab */}
          {activeTab === 'assignments' && (
            <div className="space-y-8">
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-6 rounded-xl border border-indigo-200 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <UserIcon className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-indigo-800 font-semibold text-lg">Team Assignment</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderDropdown("Account Manager", "account_manager_id", "account_manager", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderDropdown("CA Team Lead", "careerassociatemanagerid", "ca_team_lead", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderDropdown("Career Associate", "careerassociateid", "career_associate", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderDropdown("Scraper", "scraperid", "scraping_team", <UserIcon className="h-4 w-4 text-gray-400" />)}
                </div>
              </div>

              {/* Client Information Summary */}
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Client Information Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="font-medium">{form.full_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Personal Email</p>
                    <p className="font-medium">{form.personal_email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">WhatsApp Number</p>
                    <p className="font-medium">{form.whatsapp_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Work Authorization</p>
                    <p className="font-medium">{form.work_auth_details || 'N/A'}</p>
                  </div>
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
                  {renderAdditionalInfoInput("Highest Education", "highest_education", "text", <GraduationCap className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoInput("University Name", "university_name", "text", <GraduationCap className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoInput("Cumulative GPA", "cumulative_gpa", "text", <GraduationCap className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoInput("Main Subject", "main_subject", "text", <Book className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoInput("Graduation Year", "graduation_year", "text", <GraduationCap className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoInput("Experience (Years)", "experience", "text", <GraduationCap className="h-4 w-4 text-gray-400" />)}
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <Book className="h-5 w-5 text-green-600" />
                  <h2 className="text-green-800 font-semibold text-lg">Skills & Preferences</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderAdditionalInfoInput("Role", "role", "text", <Book className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoInput("Work Preferences", "work_preferences", "text", <Book className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoInput("Alternate Job Roles", "alternate_job_roles", "text", <FileText className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoInput("Exclude Companies", "exclude_companies", "text", <Building className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoBooleanInput("Willing to Relocate", "willing_to_relocate", <MapPin className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoBooleanInput("Can Work 3 Days in Office", "can_work_3_days_in_office", <Building className="h-4 w-4 text-gray-400" />)}
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <Link className="h-5 w-5 text-purple-600" />
                  <h2 className="text-purple-800 font-semibold text-lg">Online Profiles</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderAdditionalInfoInput("GitHub URL", "github_url", "url", <Link className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoInput("LinkedIn URL", "linked_in_url", "url", <Link className="h-4 w-4 text-gray-400" />)}
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  <h2 className="text-orange-800 font-semibold text-lg">Availability</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderAdditionalInfoDateInput("Desired Start Date", "desired_start_date", <Calendar className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoDateInput("Start Date", "start_date", <Calendar className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoDateInput("End Date", "end_date", <Calendar className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoInput("No. of Applications", "no_of_applications", "number", <FileText className="h-4 w-4 text-gray-400" />)}
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
                  {renderAdditionalInfoBooleanInput("Is Over 18", "is_over_18", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoBooleanInput("Eligible to Work in US", "eligible_to_work_in_us", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoBooleanInput("Authorized Without Visa", "authorized_without_visa", <CreditCard className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoBooleanInput("Require Future Sponsorship", "require_future_sponsorship", <CreditCard className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoBooleanInput("Can Perform Essential Functions", "can_perform_essential_functions", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoBooleanInput("Worked for Company Before", "worked_for_company_before", <Building className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoBooleanInput("Discharged for Policy Violation", "discharged_for_policy_violation", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoBooleanInput("Referred by Agency", "referred_by_agency", <UserIcon className="h-4 w-4 text-gray-400" />)}
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
                  {renderAdditionalInfoInput("Resume URL", "resume_url", "url", <Link className="h-4 w-4 text-gray-400" />)}
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
                  {renderAdditionalInfoBooleanInput("Convicted of Felony", "convicted_of_felony", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoTextarea("Felony Explanation", "felony_explanation", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoBooleanInput("Pending Investigation", "pending_investigation", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoBooleanInput("Willing Background Check", "willing_background_check", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoBooleanInput("Willing Drug Screen", "willing_drug_screen", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoBooleanInput("Failed or Refused Drug Test", "failed_or_refused_drug_test", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoBooleanInput("Uses Substances Affecting Duties", "uses_substances_affecting_duties", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoTextarea("Substances Description", "substances_description", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoBooleanInput("Can Provide Legal Docs", "can_provide_legal_docs", <UserIcon className="h-4 w-4 text-gray-400" />)}
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <UserIcon className="h-5 w-5 text-green-600" />
                  <h2 className="text-green-800 font-semibold text-lg">Diversity & Relations</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderAdditionalInfoInput("Hispanic/Latino", "is_hispanic_latino", "text", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoInput("Veteran Status", "veteran_status", "text", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoInput("Disability Status", "disability_status", "text", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoBooleanInput("Has Relatives in Company", "has_relatives_in_company", <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoTextarea("Relatives Details", "relatives_details", <UserIcon className="h-4 w-4 text-gray-400" />)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Coding Lab Tab */}
        {activeTab === "codinglab" &&
          (currentUserRole === "ca_team_lead" ||
            currentUserRole === "cro") && (
            <div className="space-y-8">
              {/* ================== START CODING LAB BLOCK ================== */}

              <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                <h2 className="text-yellow-700 font-semibold text-lg mb-3">
                  🧪 Coding Lab Configuration
                </h2>
                <p className="text-sm text-yellow-600 mb-4">
                  Configure coding lab environment and test results for this client
                </p>

                {/* Coding Lab URL Dropdown */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coding Lab Environment *
                  </label>

                  <select
                    value={form.coding_lab_url || ""}
                    onChange={(e) => handleChange("coding_lab_url", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    title="Coding Lab Environment"
                  >
                    <option value="">Select Environment</option>
                    <option value="vivek">Vivek Environment</option>
                    <option value="fe1">Frontend Lab 1 (FE1)</option>
                    <option value="fe2">Frontend Lab 2 (FE2)</option>
                    <option value="be1">Backend Lab 1 (BE1)</option>
                    <option value="be2">Backend Lab 2 (BE2)</option>
                    <option value="be3">Backend Lab 3 (BE3)</option>
                    <option value="aml1">AML Analyst Lab 1 (AML1)</option>
                    <option value="default">Default Environment</option>
                  </select>

                  <p className="text-xs text-gray-500 mt-1">
                    {form.coding_lab_url
                      ? `Currently assigned: ${form.coding_lab_url.toUpperCase()}`
                      : "No environment assigned"}
                  </p>
                </div>

                {/* ============= Test Results Form Builder ============= */}
                <div className="border-t border-yellow-300 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-semibold text-gray-800">
                      Test/Contest Configuration
                    </h3>

                    <button
                      type="button"
                      onClick={() => {
                        setTestResultsForm([
                          ...testResultsForm,
                          {
                            contestId: "",
                            contestName: "",
                            lab_id_1: null,
                            lab_id_2: null,
                            mcq_results: null,
                          },
                        ]);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Add Contest/Test
                    </button>
                  </div>

                  {testResultsForm.length === 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                      <p className="text-gray-500">
                        No test results configured. Click "Add Contest/Test" to create
                        one.
                      </p>
                    </div>
                  )}

                  {/* Render each contest */}
                  {testResultsForm.map((contest, contestIndex) => (
                    <div
                      key={contestIndex}
                      className="bg-white border border-gray-300 rounded-lg p-4 mb-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-700">
                          Contest {contestIndex + 1}
                        </h4>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = testResultsForm.filter(
                              (_, i) => i !== contestIndex
                            );
                            setTestResultsForm(updated);
                          }}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Remove Contest"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Contest ID / Name / Lab IDs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Contest ID */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contest ID *
                          </label>
                          <input
                            type="text"
                            value={contest.contestId || ""}
                            onChange={(e) => {
                              const updated = [...testResultsForm];
                              updated[contestIndex].contestId = e.target.value;
                              setTestResultsForm(updated);
                            }}
                            placeholder="e.g., contest-fe-2024"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>

                        {/* Contest Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contest Name *
                          </label>
                          <input
                            type="text"
                            value={contest.contestName || ""}
                            onChange={(e) => {
                              const updated = [...testResultsForm];
                              updated[contestIndex].contestName = e.target.value;
                              setTestResultsForm(updated);
                            }}
                            placeholder="e.g., Frontend Developer Assessment"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>

                        {/* Lab ID 1 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Coding Lab 1 ID
                          </label>
                          <input
                            type="text"
                            value={contest.lab_id_1 || ""}
                            onChange={(e) => {
                              const updated = [...testResultsForm];
                              updated[contestIndex].lab_id_1 = e.target.value || null;
                              setTestResultsForm(updated);
                            }}
                            placeholder="e.g., 68d24a4a1295f90e0e22a041"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>

                        {/* Lab ID 2 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Coding Lab 2 ID
                          </label>
                          <input
                            type="text"
                            value={contest.lab_id_2 || ""}
                            onChange={(e) => {
                              const updated = [...testResultsForm];
                              updated[contestIndex].lab_id_2 = e.target.value || null;
                              setTestResultsForm(updated);
                            }}
                            placeholder="e.g., 67890abcdef1234567890abc"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                      </div>

                      {/* MCQ RESULTS */}
                      <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h5 className="text-sm font-semibold text-purple-700 mb-3">
                          MCQ Test Results (Optional)
                        </h5>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {/* Total Questions */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Total Questions
                            </label>
                            <input
                              type="number"
                              value={contest.mcq_results?.totalQuestions || ""}
                              onChange={(e) => {
                                const updated = [...testResultsForm];
                                if (!updated[contestIndex].mcq_results)
                                  updated[contestIndex].mcq_results = {
                                    totalAttempted: 0,
                                    passed: 0,
                                    failed: 0,
                                    notAttempted: 0,
                                    points: 0,
                                    totalQuestions: 0
                                  };
                                updated[contestIndex].mcq_results.totalQuestions =
                                  parseInt(e.target.value) || 0;
                                setTestResultsForm(updated);
                              }}
                              placeholder="20"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          {/* Total Attempted */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Total Attempted
                            </label>
                            <input
                              type="number"
                              value={contest.mcq_results?.totalAttempted || ""}
                              onChange={(e) => {
                                const updated = [...testResultsForm];
                                if (!updated[contestIndex].mcq_results)
                                  updated[contestIndex].mcq_results = {
                                    totalAttempted: 0,
                                    passed: 0,
                                    failed: 0,
                                    notAttempted: 0,
                                    points: 0,
                                    totalQuestions: 0
                                  };
                                updated[contestIndex].mcq_results.totalAttempted =
                                  parseInt(e.target.value) || 0;
                                setTestResultsForm(updated);
                              }}
                              placeholder="18"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          {/* Passed */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Passed
                            </label>
                            <input
                              type="number"
                              value={contest.mcq_results?.passed || ""}
                              onChange={(e) => {
                                const updated = [...testResultsForm];
                                if (!updated[contestIndex].mcq_results)
                                  updated[contestIndex].mcq_results = {
                                    totalAttempted: 0,
                                    passed: 0,
                                    failed: 0,
                                    notAttempted: 0,
                                    points: 0,
                                    totalQuestions: 0
                                  };
                                updated[contestIndex].mcq_results.passed =
                                  parseInt(e.target.value) || 0;
                                setTestResultsForm(updated);
                              }}
                              placeholder="15"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          {/* Failed */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Failed
                            </label>
                            <input
                              type="number"
                              value={contest.mcq_results?.failed || ""}
                              onChange={(e) => {
                                const updated = [...testResultsForm];
                                if (!updated[contestIndex].mcq_results)
                                  updated[contestIndex].mcq_results = {
                                    totalAttempted: 0,
                                    passed: 0,
                                    failed: 0,
                                    notAttempted: 0,
                                    points: 0,
                                    totalQuestions: 0
                                  };
                                updated[contestIndex].mcq_results.failed =
                                  parseInt(e.target.value) || 0;
                                setTestResultsForm(updated);
                              }}
                              placeholder="3"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          {/* Not Attempted */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Not Attempted
                            </label>
                            <input
                              type="number"
                              value={contest.mcq_results?.notAttempted || ""}

                              onChange={(e) => {
                                const updated = [...testResultsForm];
                                if (!updated[contestIndex].mcq_results)
                                  updated[contestIndex].mcq_results = {
                                    totalAttempted: 0,
                                    passed: 0,
                                    failed: 0,
                                    notAttempted: 0,
                                    points: 0,
                                    totalQuestions: 0
                                  };
                                updated[contestIndex].mcq_results.notAttempted =
                                  parseInt(e.target.value) || 0;
                                setTestResultsForm(updated);
                              }}
                              placeholder="2"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          {/* Points */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Points
                            </label>
                            <input
                              type="number"
                              value={contest.mcq_results?.points || ""}
                              onChange={(e) => {
                                const updated = [...testResultsForm];
                                if (!updated[contestIndex].mcq_results)
                                  updated[contestIndex].mcq_results = {
                                    totalAttempted: 0,
                                    passed: 0,
                                    failed: 0,
                                    notAttempted: 0,
                                    points: 0,
                                    totalQuestions: 0
                                  };
                                updated[contestIndex].mcq_results.points =
                                  parseInt(e.target.value) || 0;
                                setTestResultsForm(updated);
                              }}
                              placeholder="75"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Info Box */}
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Changes to coding lab configuration will
                    affect which lab environment the client is redirected to when
                    clicking the "Coding Lab" button.
                  </p>
                </div>
              </div>

              {/* ================== END CODING LAB BLOCK ================== */}
            </div>
          )}


        {/* Action Buttons */}
        <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              {activeTab !== 'details' && (
                <button
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  onClick={() => {
                    if (activeTab === 'assignments') setActiveTab('details');
                    else if (activeTab === 'education') setActiveTab('assignments');
                    else if (activeTab === 'employment') setActiveTab('education');
                    else if (activeTab === 'background') setActiveTab('employment');
                    else if (activeTab === 'codinglab') setActiveTab('background');
                  }}
                >
                  ← Back
                </button>
              )}
            </div>
            <div className="flex space-x-4">
              <button
                className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                onClick={onClose}
              >
                Cancel
              </button>
              {currentUserRole !== 'career_associate' && (
                <button
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center disabled:opacity-50"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : "Save Changes"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
