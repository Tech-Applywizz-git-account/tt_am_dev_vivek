import React, { useEffect, useState } from "react";
import { Calendar, Briefcase, MapPin, ExternalLink, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { supabase } from '@/lib/supabaseClient';

// ✅ Types
interface TaskCount {
  date: string;
  count: number;
}

interface JobItem {
  id: string;
  jobTitle: string | null;
  company: string | null;
  status: string;
  description: string;
  location: string | null;
  salary: string | null;
  createdAt: string;
  dueDate: string;
  score: number;
  jobUrl: string | null;
}

type JobsData = Record<string, JobItem[]>;

interface ApplicationSummaryListProps {
  currentUserEmail?: string;
}

const ApplicationSummaryList: React.FC<ApplicationSummaryListProps> = ({ currentUserEmail }) => {
  const [data, setData] = useState<TaskCount[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [jobsData, setJobsData] = useState<JobsData>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [jobsLoading, setJobsLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchApplicationsData();
  }, [currentUserEmail]);

  const fetchApplicationsData = async () => {
    if (!currentUserEmail) {
      setError("User email not available");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // First, get the applywizz_id from Supabase based on the user's email
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('applywizz_id')
        .eq('company_email', currentUserEmail)
        .single();

      if (clientError) {
        throw new Error(`Failed to fetch client data: ${clientError.message}`);
      }

      if (!clientData || !clientData.applywizz_id) {
        throw new Error("Applywizz ID not found for this user");
      }

      const applywizzId = clientData.applywizz_id;

      // Now fetch the actual data from the external API
      const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL;
      if (!apiUrl) {
        throw new Error('VITE_EXTERNAL_API_URL is not defined in environment variables');
      }
      
      const response = await fetch(`${apiUrl}/api/client-tasks?lead_id=${applywizzId}`);
      console.log("Fetch response:", response);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data from external API: ${response.status} ${response.statusText}`);
      }

      const apiData = await response.json();
      
      // Transform the API data to match our expected format
      const formattedData: TaskCount[] = Object.entries(apiData.completed_tasks || {})
        .map(([date, count]) => ({ date, count: Number(count) }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setData(formattedData);
    } catch (err) {
      console.error("Error fetching applications data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchJobsForDate = async (date: string): Promise<JobItem[]> => {
    try {
      // Set loading state for this specific date
      setJobsLoading(prev => ({ ...prev, [date]: true }));
      
      // Get the applywizz_id from Supabase based on the user's email
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('applywizz_id')
        .eq('company_email', currentUserEmail)
        .single();

      if (clientError) {
        throw new Error(`Failed to fetch client data: ${clientError.message}`);
      }

      if (!clientData || !clientData.applywizz_id) {
        throw new Error("Applywizz ID not found for this user");
      }

      const applywizzId = clientData.applywizz_id;

      // Fetch the job data for the specific date
      const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL;
      if (!apiUrl) {
        throw new Error('VITE_EXTERNAL_API_URL is not defined in environment variables');
      }
      
      const response = await fetch(`${apiUrl}/api/client-tasks?lead_id=${applywizzId}&date=${date}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch job data from external API: ${response.status} ${response.statusText}`);
      }

      const apiData = await response.json();
      
      // Transform the API data to match our expected format
      return apiData.tasks || [];
    } catch (err) {
      console.error("Error fetching job data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while fetching job data");
      return [];
    } finally {
      // Reset loading state for this specific date
      setJobsLoading(prev => ({ ...prev, [date]: false }));
    }
  };

  const handleDateClick = async (date: string) => {
    if (expandedDate === date) {
      setExpandedDate(null);
      return;
    }

    setExpandedDate(date);

    if (!jobsData[date]) {
      const jobs = await fetchJobsForDate(date);
      setJobsData((prev) => ({ ...prev, [date]: jobs }));
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow mt-6">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded-lg shadow mt-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow mt-6">
        <p className="text-gray-500">No application data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow mt-6">
      <h2 className="text-lg font-semibold mb-4">Daily Application Summary</h2>

      <div className="space-y-3">
        {data.map((item) => {
          const dateObj = new Date(item.date);
          const formattedDate = dateObj.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          const isExpanded = expandedDate === item.date;
          const jobs = jobsData[item.date] || [];

          return (
            <div key={item.date}>
              {/* Date Row */}
              <div
                onClick={() => handleDateClick(item.date)}
                className={`flex justify-between items-center px-4 py-3 rounded-lg cursor-pointer transition ${
                  isExpanded ? "bg-blue-100" : "bg-blue-50 hover:shadow"
                }`}
              >
                <div className="flex items-center gap-2 text-blue-900">
                  <Calendar size={18} />
                  <span className="font-medium">{formattedDate}</span>
                </div>

                <div className="flex items-center gap-3 text-blue-700 font-semibold">
                  <div className="flex items-center gap-2">
                    <Briefcase size={18} />
                    <span>{item.count} Applications</span>
                  </div>
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {/* Expanded Job List */}
              {isExpanded && (
                <div className="mt-3 space-y-4 bg-gray-50 p-4 rounded-lg">
                  {jobsLoading[item.date] ? (
                    <div className="flex justify-center items-center py-4">
                      <Loader2 className="animate-spin mr-2" size={20} />
                      <span>Loading jobs...</span>
                    </div>
                  ) : jobs.length > 0 ? (
                    jobs.map((job) => (
                      <div
                        key={job.id}
                        className="bg-white rounded-lg p-4 flex justify-between items-start shadow-sm hover:shadow transition"
                      >
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {job.jobTitle || "Untitled Role"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {job.company || "Unknown Company"}
                          </p>
                          <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                            <MapPin size={14} />
                            <span>{job.location || "Not Available"}</span>
                          </div>
                          {/* <p className="text-sm text-gray-700 mt-2">{job.description}</p>  */}
                          {/* <p className="text-sm mt-1 font-semibold text-blue-600">
                            Score: {job.score ?? "N/A"}
                          </p> */}
                        </div>

                        <div>
                          <a
                            href={job.jobUrl || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-600 text-white px-3 py-2 rounded-md flex items-center gap-1 text-sm hover:bg-blue-700 transition"
                          >
                            <ExternalLink size={14} />
                            View Job Posting
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No jobs for this date.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApplicationSummaryList;