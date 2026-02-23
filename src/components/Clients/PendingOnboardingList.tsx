import React, { useState, useEffect, useRef } from "react";
import { supabase } from '../../lib/supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// JobRoleSelector – Reusable searchable job-role dropdown
// ─────────────────────────────────────────────────────────────────────────────

function JobRoleSelector({
  value = '',
  onChange,
  required = false,
  label = 'Target Job Role',
}: {
  value?: string;
  onChange: (roleName: string) => void;
  required?: boolean;
  label?: string;
}) {
  const [jobRolesData, setJobRolesData] = useState<{ id: number; name: string }[]>([]);
  const [fetchError, setFetchError] = useState<string>('');
  const [isLoadingJobRoles, setIsLoadingJobRoles] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredJobRoles = jobRolesData.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayValue = value || (isLoadingJobRoles ? 'Loading roles…' : 'Select Job Role');

  useEffect(() => {
    const fetchJobRoles = async () => {
      setIsLoadingJobRoles(true);
      setFetchError('');
      try {
        const baseUrl = import.meta.env.VITE_EXTERNAL_API_URL1;
        if (!baseUrl) {
          throw new Error('VITE_EXTERNAL_API_URL1 is not defined');
        }
        const response = await fetch(`${baseUrl}/api/all-job-roles/`, {
          method: 'GET',
          mode: 'cors',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setJobRolesData(Array.isArray(data) && data.length > 0 ? data : []);
      } catch (error: any) {
        console.error('Error fetching job roles:', error.message);
        setFetchError(error.message);
        setJobRolesData([]);
      } finally {
        setIsLoadingJobRoles(false);
      }
    };
    fetchJobRoles();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const handleRoleSelect = (roleName: string) => {
    onChange(roleName);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}{required && ' *'}
      </label>

      {/* Trigger */}
      <div
        className="w-full bg-white border border-gray-300 text-gray-700 rounded-lg p-3 cursor-pointer flex justify-between items-center transition-shadow shadow-sm hover:shadow-md"
        onClick={() => setIsDropdownOpen(prev => !prev)}
      >
        <span className="truncate">{displayValue}</span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown panel */}
      {isDropdownOpen && (
        <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {/* Sticky search bar */}
          <div className="sticky top-0 bg-gray-50 p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search roles..."
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {/* Role list */}
          {filteredJobRoles.length > 0 ? (
            filteredJobRoles.map(roleObj => (
              <label
                key={roleObj.id}
                className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer"
              >
                <input
                  type="radio"
                  name="job_role_selector_map"
                  checked={value === roleObj.name}
                  onChange={() => handleRoleSelect(roleObj.name)}
                  className="mr-3 w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700 text-sm">{roleObj.name}</span>
              </label>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              {isLoadingJobRoles ? 'Loading…' : 'No roles found'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PendingClient interface
// ─────────────────────────────────────────────────────────────────────────────
interface PendingClient {
  id: string;
  full_name: string;
  company_email: string;
  personal_email?: string;
  whatsapp_number?: string;
  callable_phone?: string;
  job_role_preferences: string[];
  location_preferences: string[];
  salary_range: string;
  work_auth_details?: string;
  visa_type?: string;
  sponsorship?: string;
  applywizz_id?: string;
  submitted_by: string;
  gender?: string;
  years_experience?: number;
  country?: string;
  zip_or_country?: string;
  willing_to_relocate?: boolean;
  github_url?: string;
  linkedin_url?: string;
  resume_link?: string;
  resume_s3_path?: string;
  personal_details_s3_path?: string;
  alternate_job_roles?: string[];
  exclude_companies?: string[];
  number_of_applications?: string;
  work_preference?: string;
  start_date?: string;
  end_date?: string;
  add_ons_info?: string[];
}

interface Props {
  pendingClients: PendingClient[];
  onAssignRoles: (
    pendingClientId: string,
    clientData: any,
    roleAssignments: any
  ) => Promise<void>;
  onDirectOnboard?: (client: PendingClient) => Promise<void>;
}

export const PendingOnboardingList: React.FC<Props> = ({
  pendingClients,
  onAssignRoles,
  onDirectOnboard,
}) => {
  const [selectedClient, setSelectedClient] = useState<PendingClient | null>(null);
  const [roleAssignments, setRoleAssignments] = useState({
    accountManagerId: "",
    careerassociatemanagerid: "",
    careerassociateid: "",
    scraperid: "",
  });

  const [loadingClientId, setLoadingClientId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Map to Different Role state ───────────────────────────────────────────
  const [mapRoleClient, setMapRoleClient] = useState<PendingClient | null>(null);   // which client's modal is open
  const [mappedRole, setMappedRole] = useState<string>('');                          // selected role from dropdown
  const [showMapRoleConfirm, setShowMapRoleConfirm] = useState(false);              // confirmation popup visibility

  const [usersByRole, setUsersByRole] = useState<{
    [key: string]: { id: string; name: string }[];
  }>({
    account_manager: [],
    ca_team_lead: [],
    career_associate: [],
    scraping_team: [],
  });

  useEffect(() => {
    const fetchUsers = async () => {
      const roles = [
        "account_manager",
        "ca_team_lead",
        "career_associate",
        "scraping_team",
      ];

      for (let role of roles) {
        const { data } = await supabase
          .from("users")
          .select("id, name")
          .eq("role", role)
          .eq("is_active", true)
          .order('name', { ascending: true });

        if (data) {
          setUsersByRole((prev) => ({
            ...prev,
            [role]: data,
          }));
        }
      }
    };

    fetchUsers();
  }, []);

  const handleSubmit = async () => {
    if (
      !roleAssignments.accountManagerId ||
      !roleAssignments.careerassociatemanagerid ||
      !roleAssignments.careerassociateid //||
      // !roleAssignments.scraperid
    ) {
      alert("Please assign all roles.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAssignRoles(selectedClient!.id, selectedClient, roleAssignments);
      setSelectedClient(null);
      setRoleAssignments({
        accountManagerId: "",
        careerassociatemanagerid: "",
        careerassociateid: "",
        scraperid: "51ce13f8-52fa-4e74-b346-450643b6a376",
      });
    } catch (error) {
      console.error("Error assigning roles:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectOnboardClick = async (client: PendingClient) => {
    if (!onDirectOnboard) return;
    setLoadingClientId(client.id);
    try {
      await onDirectOnboard(client);
    } catch (error) {
      console.error("Error during direct onboarding:", error);
    } finally {
      setLoadingClientId(null);
    }
  };

  // ── Map to Different Role handlers ────────────────────────────────────────
  const openMapRoleModal = (client: PendingClient) => {
    setMapRoleClient(client);
    setMappedRole('');
    setShowMapRoleConfirm(false);
  };

  const closeMapRoleModal = () => {
    setMapRoleClient(null);
    setMappedRole('');
    setShowMapRoleConfirm(false);
  };

  const handleMapRoleConfirm = async () => {
    if (!mapRoleClient || !mappedRole || !onDirectOnboard) return;
    // Build a modified copy of the client with the overridden job_role_preferences
    const modifiedClient: PendingClient = {
      ...mapRoleClient,
      job_role_preferences: [mappedRole],
    };
    setShowMapRoleConfirm(false);
    setMapRoleClient(null);
    setMappedRole('');
    setLoadingClientId(modifiedClient.id);
    try {
      await onDirectOnboard(modifiedClient);
    } catch (error) {
      console.error("Error during mapped role onboarding:", error);
    } finally {
      setLoadingClientId(null);
    }
  };

  // Check if client has job-links in add_ons_info
  const hasJobLinks = (client: PendingClient): boolean => {
    if (!client.add_ons_info) return false;

    if (typeof client.add_ons_info === 'string') {
      try {
        const parsed = JSON.parse(client.add_ons_info);
        return Array.isArray(parsed) && parsed.includes('job-links');
      } catch {
        return false;
      }
    }

    if (Array.isArray(client.add_ons_info)) {
      return client.add_ons_info.includes('job-links');
    }

    return false;
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">🟡 Pending Client Onboarding</h2>

      {pendingClients.length === 0 ? (
        <p className="text-gray-500">No pending clients found.</p>
      ) : (
        <ul className="space-y-4">
          {pendingClients.map((client) => (
            <li
              key={client.id}
              className="p-4 border border-gray-300 rounded shadow-sm bg-white"
            >
              <div className="flex justify-between items-center">
                <div>
                  {hasJobLinks(client) && (
                    <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Opted for Job Links
                    </span>
                  )}
                  <p className="text-lg font-semibold">{client.full_name} ({client.applywizz_id || 'not found'})</p>
                  <p className="text-sm text-gray-600">{client.company_email}</p>
                  <p className="text-sm">
                    Job Prefs: {client.job_role_preferences?.join(", ")}
                  </p>
                  <p className="text-sm">
                    Locations: {client.location_preferences?.join(", ")}
                  </p>
                  <p className="text-sm text-gray-700">
                    Salary: {client.salary_range}
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  {hasJobLinks(client) && onDirectOnboard ? (
                    <>
                      {/* ── Onboard Directly ── */}
                      <button
                        onClick={() => handleDirectOnboardClick(client)}
                        disabled={loadingClientId !== null}
                        className={`px-4 py-2 rounded text-white ${loadingClientId === client.id
                          ? "bg-green-400 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700"
                          }`}
                      >
                        {loadingClientId === client.id ? "Onboarding..." : "Onboard Directly"}
                      </button>

                      {/* ── Map to Different Role ── */}
                      <button
                        onClick={() => openMapRoleModal(client)}
                        disabled={loadingClientId !== null}
                        className={`px-4 py-2 rounded text-white ${loadingClientId !== null
                          ? "bg-purple-300 cursor-not-allowed"
                          : "bg-purple-600 hover:bg-purple-700"
                          }`}
                      >
                        Map to Different Role
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setSelectedClient(client)}
                      disabled={loadingClientId !== null}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Assign Roles
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Map to Different Role Modal                                          */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {mapRoleClient && !showMapRoleConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg space-y-5 shadow-xl">
            {/* Header */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                Map to Different Role
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Client: <span className="font-medium text-gray-700">{mapRoleClient.full_name} ({mapRoleClient.applywizz_id || 'not found'})</span>
              </p>
            </div>

            {/* Current role display */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700">
              <span className="font-semibold">Current Role(s): </span>
              {mapRoleClient.job_role_preferences?.join(", ") || "—"}
            </div>

            {/* Job role selector */}
            <JobRoleSelector
              value={mappedRole}
              onChange={(role) => setMappedRole(role)}
              label="Select New Target Role"
              required
            />

            {/* Role change message – shown after a role is selected */}
            {mappedRole && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800">
                ⚠️ Updating client role:{" "}
                <span className="font-semibold line-through text-red-500">
                  {mapRoleClient.job_role_preferences?.join(", ") || "—"}
                </span>{" "}
                →{" "}
                <span className="font-semibold text-green-700">{mappedRole}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={closeMapRoleModal}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowMapRoleConfirm(true)}
                disabled={!mappedRole}
                className={`px-4 py-2 rounded text-white ${!mappedRole
                  ? "bg-purple-300 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700"
                  }`}
              >
                Confirm & Onboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Confirmation Popup (second step)                                     */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {mapRoleClient && showMapRoleConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl space-y-4">
            {/* Header */}
            <h3 className="text-xl font-semibold text-gray-800">
              Confirm Onboarding
            </h3>

            {/* Summary */}
            <p className="text-sm text-gray-600">
              You are about to onboard{" "}
              <span className="font-semibold text-gray-800">{mapRoleClient.full_name}</span>{" "}
              with a <span className="font-semibold text-purple-700">mapped role</span>:
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 space-y-1 text-sm">
              <div>
                <span className="text-gray-500">Original Role: </span>
                <span className="font-medium text-red-600 line-through">
                  {mapRoleClient.job_role_preferences?.join(", ") || "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">New Role: </span>
                <span className="font-semibold text-green-700">{mappedRole}</span>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              This will trigger the direct onboarding process with the new role. This action cannot be undone.
            </p>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setShowMapRoleConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Go Back
              </button>
              <button
                onClick={handleMapRoleConfirm}
                className="px-4 py-2 rounded text-white bg-green-600 hover:bg-green-700"
              >
                Yes, Onboard Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Role Assignment Modal (existing)                                     */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg space-y-4">
            <h3 className="text-xl font-semibold">
              Assign Roles for {selectedClient.full_name} ({selectedClient.applywizz_id || 'not found'})
            </h3>

            {[
              { label: "Account Manager", key: "accountManagerId", role: "account_manager" },
              { label: "CA Team Lead", key: "careerassociatemanagerid", role: "ca_team_lead" },
              { label: "Career Associate", key: "careerassociateid", role: "career_associate" },
            ].map(({ label, key, role }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <select
                  aria-label={label}
                  value={(roleAssignments as any)[key]}
                  onChange={(e) =>
                    setRoleAssignments({ ...roleAssignments, [key]: e.target.value })
                  }
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="">Select {label}</option>
                  {usersByRole[role]?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 border rounded"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded text-white ${isSubmitting
                  ? "bg-green-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
                  }`}
              >
                {isSubmitting ? "Assigning Roles..." : "Complete Onboarding"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
