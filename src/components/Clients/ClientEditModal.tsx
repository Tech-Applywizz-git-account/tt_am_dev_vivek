import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { User } from "@/types";
import { Building, FileText, Phone, X, Plus, Trash2 } from 'lucide-react';
import {toast} from 'react-toastify';

interface Client {
  id: string;
  full_name: string;
  personal_email: string;
  whatsapp_number: string;
  callable_phone: string;
  company_email: string;
  job_role_preferences: string[];
  salary_range: string;
  location_preferences: string[];
  work_auth_details: string;
  account_manager_id: string;
  careerassociatemanagerid: string;
  careerassociateid: string;
  scraperid: string;
  coding_lab_url?: string;
  test_results?: any;
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
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [testResultsForm, setTestResultsForm] = useState<any[]>([]);

  const isReadOnly = currentUserRole === "career_associate";
  const canEditCodingLab = currentUserRole === "ca_team_lead" || currentUserRole === "cro";

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
      setForm({ ...client });
      // Parse test_results if it exists
      if (client.test_results && Array.isArray(client.test_results)) {
        setTestResultsForm(client.test_results);
      } else {
        setTestResultsForm([]);
      }
    }
  }, [client]);

  const handleChange = (field: string, value: any) => {
    if (!form) return;
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  // const handleChange = (field: keyof Client, value: any) => {
  //   if (!form) return;
  //   setForm({ ...form, [field]: value });
  // };

  const handleSubmit = async () => {
    if (!form) return;
    setLoading(true);
    
    // Convert test results form to JSON before saving
    const updatedForm = {
      ...form,
      test_results: testResultsForm.length > 0 ? testResultsForm : null
    };
    const { error } = await supabase
      .from("clients")
      .update(updatedForm)
      .eq("id", client.id);
    setLoading(false);
    if (error) {
      alert('Error updating client: ' + error.message);
    } else {
      toast("Client updated successfully!", {
        position: "top-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });
      onSubmit(updatedForm);
      onClose();
    }
  };

  if (!isOpen || !form) return null;

  const jobRoles = [
    'Software Engineer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer',
    'Data Scientist', 'ML Engineer', 'DevOps Engineer', 'Product Manager', 'UI/UX Designer', 'QA Engineer'
  ];

  const locations = [
    'New York', 'San Francisco', 'Seattle', 'Austin', 'Chicago',
    'Boston', 'Los Angeles', 'Denver', 'Atlanta', 'Remote'
  ];

  const renderInput = (label: string, field: string, type = "text") => (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <input
        type={type}
        value={form[field] || ""}
        onChange={(e) => handleChange(field, e.target.value)}
        className="w-full border border-gray-300 p-2 rounded"
        disabled={isReadOnly}
        placeholder={`Enter ${label}`}
      />
    </div>
  );

  const renderTextarea = (label: string, field: string) => (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <textarea
        value={form[field] || ""}
        onChange={(e) => handleChange(field, e.target.value)}
        className="w-full border border-gray-300 p-2 rounded"
        disabled={isReadOnly}
        placeholder={`Enter ${label}`}
        title={label}
      />
    </div>
  );

  const renderDropdown = (label: string, field: string, role: string) => (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <select
        value={form[field] || ""}
        onChange={(e) => handleChange(field, e.target.value)}
        className="w-full border border-gray-300 p-2 rounded"
        disabled={isReadOnly}
        title={label}
      >
        <option value="">Select {label}</option>
        {users
          .filter((u) => u.role === role)
          .map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl space-y-6 overflow-y-auto max-h-[90vh]">

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Client</h2>
          <button onClick={onClose} title="Close" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Personal Info */}
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <h2 className="text-blue-600 font-semibold text-lg mb-3">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput("Full Name", "full_name")}
            {renderInput("Personal Email", "personal_email")}
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-green-50 p-4 rounded border border-green-200">
          <div className="flex items-center space-x-2 mb-4">
            <Phone className="h-5 w-5 text-green-600" />
            <h2 className="text-green-600 font-semibold text-lg">Contact Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput("WhatsApp Number", "whatsapp_number")}
            {renderInput("Callable Phone", "callable_phone")}
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-purple-50 p-4 rounded border border-purple-200">
          <div className="flex items-center space-x-2 mb-4">
            <Building className="h-5 w-5 text-purple-600" />
            <h2 className="text-purple-600 font-semibold text-lg">Company Details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            {renderInput("Company Email", "company_email")}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Work Authorization Details *
            </label>
            <select
              value={form.work_auth_details}
              onChange={(e) => handleChange("work_auth_details", e.target.value)}
              disabled={isReadOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              required
              aria-label="Work Authorization Details"
              title="Work Authorization Details"
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

        {/* Job/Location Info */}
        <div className="bg-orange-50 p-4 rounded border border-orange-200">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="h-5 w-5 text-orange-600" />
            <h2 className="text-orange-600 font-semibold text-lg ">Job & Location Preferences</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">

            {/* Job Preferences */}
            {/* <div className="bg-orange-50 rounded-lg p-6 border border-orange-200"> */}

            <h3 className="text-lg font-semibold text-orange-900">Job Preferences</h3>


            <div className="space-y-6">
              {/* Job Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Target Job Roles * (Select all that apply)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {jobRoles.map(role => (
                    <label key={role} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={form.job_role_preferences?.includes(role)}
                        disabled={isReadOnly}
                        onChange={(e) => {
                          const updatedRoles = e.target.checked
                            ? [...form.job_role_preferences, role]
                            : form.job_role_preferences.filter(r => r !== role);
                          handleChange("job_role_preferences", updatedRoles);
                        }}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{role}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Salary Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Salary Range *
                </label>
                <select
                  value={form.salary_range}
                  onChange={(e) => handleChange("salary_range", e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                  title="Expected Salary Range"
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

              {/* Location Preferences */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Preferred Locations * (Select all that apply)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {locations.map(location => (
                    <label key={location} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={form.location_preferences?.includes(location)}
                        disabled={isReadOnly}
                        onChange={(e) => {
                          const updatedLocations = e.target.checked
                            ? [...form.location_preferences, location]
                            : form.location_preferences.filter(l => l !== location);
                          handleChange("location_preferences", updatedLocations);
                        }}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{location}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {/* </div> */}
          </div>

        </div>

        {/* Team Assignments */}
        <div className="bg-indigo-50 p-4 rounded border border-indigo-200">
          <h2 className="text-indigo-600 font-semibold text-lg mb-3">Team Assignment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderDropdown("Account Manager", "account_manager_id", "account_manager")}
            {renderDropdown("CA Team Lead", "careerassociatemanagerid", "ca_team_lead")}
            {renderDropdown("Career Associate", "careerassociateid", "career_associate")}
            {renderDropdown("Scraper", "scraperid", "scraping_team")}
          </div>
        </div>

        {/* Coding Lab Configuration - Only for CA Team Lead & CRO */}
        {canEditCodingLab && (
          <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
            <h2 className="text-yellow-700 font-semibold text-lg mb-3">🧪 Coding Lab Configuration</h2>
            <p className="text-sm text-yellow-600 mb-4">Configure coding lab environment and test results for this client</p>
            
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

            {/* Test Results Form Builder */}
            <div className="border-t border-yellow-300 pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-semibold text-gray-800">Test/Contest Configuration</h3>
                <button
                  type="button"
                  onClick={() => {
                    setTestResultsForm([...testResultsForm, {
                      contestId: '',
                      contestName: '',
                      lab_id_1: null,
                      lab_id_2: null,
                      mcq_results: null
                    }]);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Contest/Test
                </button>
              </div>

              {testResultsForm.length === 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-500">No test results configured. Click "Add Contest/Test" to create one.</p>
                </div>
              )}

              {/* Render each contest */}
              {testResultsForm.map((contest, contestIndex) => (
                <div key={contestIndex} className="bg-white border border-gray-300 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-700">Contest {contestIndex + 1}</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = testResultsForm.filter((_, i) => i !== contestIndex);
                        setTestResultsForm(updated);
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Remove Contest"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Contest ID */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contest ID *</label>
                      <input
                        type="text"
                        value={contest.contestId || ''}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contest Name *</label>
                      <input
                        type="text"
                        value={contest.contestName || ''}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Coding Lab 1 ID</label>
                      <input
                        type="text"
                        value={contest.lab_id_1 || ''}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Coding Lab 2 ID</label>
                      <input
                        type="text"
                        value={contest.lab_id_2 || ''}
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

                  {/* MCQ Results Section */}
                  <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h5 className="text-sm font-semibold text-purple-700 mb-3">MCQ Test Results (Optional)</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Total Questions</label>
                        <input
                          type="number"
                          value={contest.mcq_results?.totalQuestions || ''}
                          onChange={(e) => {
                            const updated = [...testResultsForm];
                            if (!updated[contestIndex].mcq_results) {
                              updated[contestIndex].mcq_results = {};
                            }
                            updated[contestIndex].mcq_results.totalQuestions = parseInt(e.target.value) || 0;
                            setTestResultsForm(updated);
                          }}
                          placeholder="20"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Total Attempted</label>
                        <input
                          type="number"
                          value={contest.mcq_results?.totalAttempted || ''}
                          onChange={(e) => {
                            const updated = [...testResultsForm];
                            if (!updated[contestIndex].mcq_results) {
                              updated[contestIndex].mcq_results = {};
                            }
                            updated[contestIndex].mcq_results.totalAttempted = parseInt(e.target.value) || 0;
                            setTestResultsForm(updated);
                          }}
                          placeholder="18"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Passed</label>
                        <input
                          type="number"
                          value={contest.mcq_results?.passed || ''}
                          onChange={(e) => {
                            const updated = [...testResultsForm];
                            if (!updated[contestIndex].mcq_results) {
                              updated[contestIndex].mcq_results = {};
                            }
                            updated[contestIndex].mcq_results.passed = parseInt(e.target.value) || 0;
                            setTestResultsForm(updated);
                          }}
                          placeholder="15"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Failed</label>
                        <input
                          type="number"
                          value={contest.mcq_results?.failed || ''}
                          onChange={(e) => {
                            const updated = [...testResultsForm];
                            if (!updated[contestIndex].mcq_results) {
                              updated[contestIndex].mcq_results = {};
                            }
                            updated[contestIndex].mcq_results.failed = parseInt(e.target.value) || 0;
                            setTestResultsForm(updated);
                          }}
                          placeholder="3"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Not Attempted</label>
                        <input
                          type="number"
                          value={contest.mcq_results?.notAttempted || ''}
                          onChange={(e) => {
                            const updated = [...testResultsForm];
                            if (!updated[contestIndex].mcq_results) {
                              updated[contestIndex].mcq_results = {};
                            }
                            updated[contestIndex].mcq_results.notAttempted = parseInt(e.target.value) || 0;
                            setTestResultsForm(updated);
                          }}
                          placeholder="2"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Points</label>
                        <input
                          type="number"
                          value={contest.mcq_results?.points || ''}
                          onChange={(e) => {
                            const updated = [...testResultsForm];
                            if (!updated[contestIndex].mcq_results) {
                              updated[contestIndex].mcq_results = {};
                            }
                            updated[contestIndex].mcq_results.points = parseInt(e.target.value) || 0;
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
                <strong>Note:</strong> Changes to coding lab configuration will affect which lab environment 
                the client is redirected to when clicking the "Coding Lab" button.
              </p>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="mt-6 flex justify-end gap-4">
          <button
            className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
            onClick={onClose}
          >
            Cancel
          </button>
          {currentUserRole !== 'career_associate' && (
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
