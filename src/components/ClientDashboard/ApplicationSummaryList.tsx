import React, { useState } from "react";
import { Calendar, Briefcase, MapPin, ExternalLink, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

// ✅ Types
export interface TaskCount {
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

interface JobsResponse {
  tasks: JobItem[];
  easyapply: JobItem[];
}

type JobsData = Record<string, JobsResponse>;

interface ApplicationSummaryListProps {
  data: TaskCount[];
  loading?: boolean;
  error?: string;
  applywizzId?: string;
}

const ApplicationSummaryList: React.FC<ApplicationSummaryListProps> = ({
  data,
  loading = false,
  error = "",
  applywizzId
}) => {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [jobsData, setJobsData] = useState<JobsData>({});
  const [jobsLoading, setJobsLoading] = useState<Record<string, boolean>>({});

  // Status options for the dropdown
  const statusOptions = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'ALREADY_APPLIED', label: 'Already Applied' },
    { value: 'NOT_RELEVANT', label: 'Not Relevant' },
    { value: 'JOB_NOT_FOUND', label: 'Job Not Found' },
  ];

  // Handle status change for easy apply jobs
  const handleStatusChange = async (taskId: string, newStatus: string, date: string) => {
    console.log("handleStatusChange", taskId, newStatus, date);

    // Get current jobs data for this date
    const currentData = jobsData[date];
    if (!currentData) {
      console.error("No data found for this date");
      return;
    }

    // Find the job in easyapply array
    const easyApplyJobIndex = currentData.easyapply.findIndex(job => job.id === taskId);

    if (easyApplyJobIndex === -1) {
      console.error("Job not found in easyapply array");
      return;
    }

    // Store the old status for potential revert
    const oldStatus = currentData.easyapply[easyApplyJobIndex].status;

    // Update the local state immediately for better UX (optimistic update)
    const updatedEasyApply = [...currentData.easyapply];
    updatedEasyApply[easyApplyJobIndex] = {
      ...updatedEasyApply[easyApplyJobIndex],
      status: newStatus
    };

    setJobsData(prev => ({
      ...prev,
      [date]: {
        ...currentData,
        easyapply: updatedEasyApply
      }
    }));

    try {
      const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL;
      if (!apiUrl) {
        throw new Error('VITE_EXTERNAL_API_URL is not defined in environment variables');
      }

      const response = await fetch(`${apiUrl}/api/admin/update-task-status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: taskId,
          status: newStatus
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Status updated successfully:", result);

      // Optionally, you can silently refresh the data in the background without loading state
      // For now, we rely on the optimistic update

    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");

      // Revert the local state change if the API call fails
      const revertedEasyApply = [...currentData.easyapply];
      revertedEasyApply[easyApplyJobIndex] = {
        ...revertedEasyApply[easyApplyJobIndex],
        status: oldStatus
      };

      setJobsData(prev => ({
        ...prev,
        [date]: {
          ...currentData,
          easyapply: revertedEasyApply
        }
      }));
    }
  };


  const fetchJobsForDate = async (date: string): Promise<JobsResponse> => {
    if (!applywizzId) {
      console.error("Applywizz ID not available");
      return { tasks: [], easyapply: [] };
    }

    try {
      // Set loading state for this specific date
      setJobsLoading(prev => ({ ...prev, [date]: true }));

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
      return {
        tasks: apiData.tasks || [],
        easyapply: apiData.easyapply || []
      };
    } catch (err) {
      console.error("Error fetching job data:", err);
      return { tasks: [], easyapply: [] };
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

  // Helper function to render a job card
  const renderJobCard = (job: JobItem, isEasyApply: boolean = false, date: string = '') => (
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
      </div>

      <div className="flex flex-col gap-2">
        {/* Status Dropdown - Only for Easy Apply jobs */}
        {isEasyApply && (
          <select
            value={job.status || 'PENDING'}
            onChange={(e) => handleStatusChange(job.id, e.target.value, date)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

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
  );

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
          const jobsResponse = jobsData[item.date] || { tasks: [], easyapply: [] };
          const tasks = jobsResponse.tasks || [];
          const easyapply = jobsResponse.easyapply || [];

          return (
            <div key={item.date}>
              {/* Date Row */}
              <div
                onClick={() => handleDateClick(item.date)}
                className={`flex justify-between items-center px-4 py-3 rounded-lg cursor-pointer transition ${isExpanded ? "bg-blue-100" : "bg-blue-50 hover:shadow"
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

              {/* Expanded Job List - Two Column Layout */}
              {isExpanded && (
                <div className="mt-3 bg-gray-50 p-4 rounded-lg">
                  {jobsLoading[item.date] ? (
                    <div className="flex justify-center items-center py-4">
                      <Loader2 className="animate-spin mr-2" size={20} />
                      <span>Loading jobs...</span>
                    </div>
                  ) : tasks.length > 0 || easyapply.length > 0 ? (
                    <div className={`grid gap-6 ${easyapply.length > 0 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                      {/* Left Column - Tasks */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Briefcase size={18} className="text-blue-600" />
                          <h3 className="font-semibold text-gray-800">
                            Regular Applications ({tasks.length})
                          </h3>
                        </div>
                        {tasks.length > 0 ? (
                          <div className="space-y-3">
                            {tasks.map((job) => renderJobCard(job))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm italic">No regular applications for this date.</p>
                        )}
                      </div>

                      {/* Right Column - Easy Apply */}
                      {easyapply.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Briefcase size={18} className="text-green-600" />
                            <h3 className="font-semibold text-gray-800">
                              Easy Apply ({easyapply.length})
                            </h3>
                          </div>
                          {easyapply.length > 0 ? (
                            <div className="space-y-3">
                              {easyapply.map((job) => renderJobCard(job, true, item.date))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm italic">No easy apply applications for this date.</p>
                          )}
                        </div>
                      )}
                    </div>
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