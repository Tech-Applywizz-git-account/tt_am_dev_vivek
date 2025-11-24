import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { User, Client, TestResult } from "@/types";
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
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ClientProfileView({ currentUser, isOpen, onClose }: Props) {
  const [form, setForm] = useState<Client | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState<ClientAdditionalInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'assignments' | 'education' | 'employment' | 'background' | 'codinglab' | 'resume'>('details');
  const [testResultsForm, setTestResultsForm] = useState<TestResult[]>([]);

  useEffect(() => {
    if (isOpen && currentUser?.email) {
      fetchClientData(currentUser.email);
    }
  }, [isOpen, currentUser]);

  const fetchClientData = async (email: string) => {
    setLoading(true);
    try {
      // Fetch client data by matching company_email with current user's email
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("company_email", email)
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

        // Fetch additional client information
        fetchAdditionalClientInfo(clientData.id);
      }
    } catch (error) {
      console.error("Error fetching client data:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

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

  if (!isOpen || !form) return null;

  const renderReadOnlyField = (label: string, value: any, icon?: React.ReactNode) => (
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
          value={value || ""}
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700`}
          disabled
          readOnly
        />
      </div>
    </div>
  );

  const renderAdditionalInfoReadOnlyField = (label: string, value: any, icon?: React.ReactNode) => (
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
          value={value || ""}
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700`}
          disabled
          readOnly
        />
      </div>
    </div>
  );

  const renderReadOnlyTextarea = (label: string, value: any, icon?: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}</label>
      <div className="relative">
        {icon && (
          <div className="absolute top-3 left-3">
            {icon}
          </div>
        )}
        <textarea
          value={value || ""}
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700`}
          disabled
          readOnly
          rows={3}
        />
      </div>
    </div>
  );

  const renderAdditionalInfoReadOnlyTextarea = (label: string, value: any, icon?: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}</label>
      <div className="relative">
        {icon && (
          <div className="absolute top-3 left-3">
            {icon}
          </div>
        )}
        <textarea
          value={value || ""}
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700`}
          disabled
          readOnly
          rows={3}
        />
      </div>
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
  const renderReadOnlyBooleanInput = (label: string, value: boolean | undefined, icon?: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {icon && <span className="inline-block align-middle ml-1">{icon}</span>}</label>
      <div className="relative">
        <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
          {value === true ? "Yes" : value === false ? "No" : "Not specified"}
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
            <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
            <p className="text-sm text-gray-500 mt-1">View your profile information</p>
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
            <button
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'resume'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              onClick={() => setActiveTab('resume')}
            >
              Resume
            </button>
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
                  {renderReadOnlyField("Full Name", form.full_name, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyField("Personal Email", form.personal_email, <Mail className="h-4 w-4 text-gray-400" />)}
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
                  {renderReadOnlyField("Visa Type", form.visa_type, <CreditCard className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyField("Gender", additionalInfo?.gender, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyField("Race/Ethnicity", additionalInfo?.race_ethnicity, <UserIcon className="h-4 w-4 text-gray-400" />)}
                </div>
              </div>

              {/* Contact Info Section */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <Phone className="h-5 w-5 text-green-600" />
                  <h2 className="text-green-800 font-semibold text-lg">Contact Information</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderReadOnlyField("WhatsApp Number", form.whatsapp_number, <Phone className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyField("Callable Phone", form.callable_phone, <Phone className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyField("State of Residence", additionalInfo?.state_of_residence, <MapPin className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyField("Zip/Country", additionalInfo?.zip_or_country, <MapPin className="h-4 w-4 text-gray-400" />)}
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

              {/* Additional Details Section */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <h2 className="text-gray-800 font-semibold text-lg">Additional Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderReadOnlyDateInput("Onboarding Date", form.onboardingdate, <Calendar className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyField("Sponsorship Required", form.sponsorship, <CreditCard className="h-4 w-4 text-gray-400" />)}
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

          {/* Education & Skills Tab */}
          {activeTab === 'education' && (
            <div className="space-y-8">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                  <h2 className="text-blue-800 font-semibold text-lg">Education Details</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderAdditionalInfoReadOnlyField("Highest Education", additionalInfo?.highest_education, <GraduationCap className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyField("University Name", additionalInfo?.university_name, <GraduationCap className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyField("Cumulative GPA", additionalInfo?.cumulative_gpa, <GraduationCap className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyField("Main Subject", additionalInfo?.main_subject, <Book className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyField("Graduation Year", additionalInfo?.graduation_year, <GraduationCap className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyField("Experience (Years)", additionalInfo?.experience, <GraduationCap className="h-4 w-4 text-gray-400" />)}
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <Book className="h-5 w-5 text-green-600" />
                  <h2 className="text-green-800 font-semibold text-lg">Skills & Preferences</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderAdditionalInfoReadOnlyField("Role", additionalInfo?.role, <Book className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyField("Work Preferences", additionalInfo?.work_preferences, <Book className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyField("Alternate Job Roles", additionalInfo?.alternate_job_roles, <FileText className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyField("Exclude Companies", additionalInfo?.exclude_companies, <Building className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyBooleanInput("Willing to Relocate", additionalInfo?.willing_to_relocate, <MapPin className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyBooleanInput("Can Work 3 Days in Office", additionalInfo?.can_work_3_days_in_office, <Building className="h-4 w-4 text-gray-400" />)}
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <Link className="h-5 w-5 text-purple-600" />
                  <h2 className="text-purple-800 font-semibold text-lg">Online Profiles</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderAdditionalInfoReadOnlyField("GitHub URL", additionalInfo?.github_url, <Link className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyField("LinkedIn URL", additionalInfo?.linked_in_url, <Link className="h-4 w-4 text-gray-400" />)}
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  <h2 className="text-orange-800 font-semibold text-lg">Availability</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderReadOnlyDateInput("Desired Start Date", additionalInfo?.desired_start_date, <Calendar className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyDateInput("Start Date", additionalInfo?.start_date, <Calendar className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyDateInput("End Date", additionalInfo?.end_date, <Calendar className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyField("No. of Applications", additionalInfo?.no_of_applications, <FileText className="h-4 w-4 text-gray-400" />)}
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
                  {renderReadOnlyBooleanInput("Is Over 18", additionalInfo?.is_over_18, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyBooleanInput("Eligible to Work in US", additionalInfo?.eligible_to_work_in_us, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyBooleanInput("Authorized Without Visa", additionalInfo?.authorized_without_visa, <CreditCard className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyBooleanInput("Require Future Sponsorship", additionalInfo?.require_future_sponsorship, <CreditCard className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyBooleanInput("Can Perform Essential Functions", additionalInfo?.can_perform_essential_functions, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyBooleanInput("Worked for Company Before", additionalInfo?.worked_for_company_before, <Building className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyBooleanInput("Discharged for Policy Violation", additionalInfo?.discharged_for_policy_violation, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyBooleanInput("Referred by Agency", additionalInfo?.referred_by_agency, <UserIcon className="h-4 w-4 text-gray-400" />)}
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
                  {renderReadOnlyBooleanInput("Convicted of Felony", additionalInfo?.convicted_of_felony, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyTextarea("Felony Explanation", additionalInfo?.felony_explanation, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyBooleanInput("Pending Investigation", additionalInfo?.pending_investigation, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyBooleanInput("Willing Background Check", additionalInfo?.willing_background_check, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyBooleanInput("Willing Drug Screen", additionalInfo?.willing_drug_screen, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyBooleanInput("Failed or Refused Drug Test", additionalInfo?.failed_or_refused_drug_test, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyBooleanInput("Uses Substances Affecting Duties", additionalInfo?.uses_substances_affecting_duties, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyTextarea("Substances Description", additionalInfo?.substances_description, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyBooleanInput("Can Provide Legal Docs", additionalInfo?.can_provide_legal_docs, <UserIcon className="h-4 w-4 text-gray-400" />)}
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <UserIcon className="h-5 w-5 text-green-600" />
                  <h2 className="text-green-800 font-semibold text-lg">Diversity & Relations</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderAdditionalInfoReadOnlyField("Hispanic/Latino", additionalInfo?.is_hispanic_latino, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyField("Veteran Status", additionalInfo?.veteran_status, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyField("Disability Status", additionalInfo?.disability_status, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderReadOnlyBooleanInput("Has Relatives in Company", additionalInfo?.has_relatives_in_company, <UserIcon className="h-4 w-4 text-gray-400" />)}
                  {renderAdditionalInfoReadOnlyTextarea("Relatives Details", additionalInfo?.relatives_details, <UserIcon className="h-4 w-4 text-gray-400" />)}
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
        <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <div className="flex justify-end">
            <button
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
