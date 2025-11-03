import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { User } from "@/types";
import { Building, FileText, Phone, X } from 'lucide-react';
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
  applywizz_id?: string;
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
  const [originalCAId, setOriginalCAId] = useState<string>("");

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
      setForm({ ...client });
      setOriginalCAId(client.careerassociateid || "");
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

    const { error } = await supabase
      .from("clients")
      .update({ ...form })
      .eq("id", client.id);
    setLoading(false);
    if (error) {
      alert('Error updating client: ' + error.message);
    } else {
      // alert('Client updated successfully!');
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
      onSubmit(form);
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
