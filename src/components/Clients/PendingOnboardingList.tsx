import React, { useState, useEffect } from "react";
import { supabase } from '../../lib/supabaseClient';

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
  // New fields for external API sync
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
  add_ons_info?: string[]; // Add this field
}

interface Props {
  pendingClients: PendingClient[];
  onAssignRoles: (
    pendingClientId: string,
    clientData: any,
    roleAssignments: any
  ) => void;
  onDirectOnboard?: (client: PendingClient) => void; // Make this prop optional
}

export const PendingOnboardingList: React.FC<Props> = ({
  pendingClients,
  onAssignRoles,
  onDirectOnboard, // Destructure the prop
}) => {
  const [selectedClient, setSelectedClient] = useState<PendingClient | null>(null);
  const [roleAssignments, setRoleAssignments] = useState({
    accountManagerId: "",
    careerassociatemanagerid: "",
    careerassociateid: "",
    scraperid: "",
  });

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

  const handleSubmit = () => {
    if (
      !roleAssignments.accountManagerId ||
      !roleAssignments.careerassociatemanagerid ||
      !roleAssignments.careerassociateid //||
      // !roleAssignments.scraperid
    ) {
      alert("Please assign all roles.");
      return;
    }

    onAssignRoles(selectedClient!.id, selectedClient, roleAssignments);
    setSelectedClient(null);
    setRoleAssignments({
      accountManagerId: "",
      careerassociatemanagerid: "",
      careerassociateid: "",
      scraperid: "51ce13f8-52fa-4e74-b346-450643b6a376", // Default scraper ID
    });
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
                  <p className="text-lg font-semibold">{client.full_name}</p>
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
                <div className="flex gap-2">
                  {hasJobLinks(client) && onDirectOnboard ? (
                    <button
                      onClick={() => onDirectOnboard(client)} // Use the prop function
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      Onboard Directly
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedClient(client)}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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

      {/* Role Assignment Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg space-y-4">
            <h3 className="text-xl font-semibold">
              Assign Roles for {selectedClient.full_name}
            </h3>

            {[
              { label: "Account Manager", key: "accountManagerId", role: "account_manager" },
              { label: "CA Team Lead", key: "careerassociatemanagerid", role: "ca_team_lead" },
              { label: "Career Associate", key: "careerassociateid", role: "career_associate" },
              // { label: "Scraper", key: "scraperid", role: "scraping_team" },
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
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Complete Onboarding
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
