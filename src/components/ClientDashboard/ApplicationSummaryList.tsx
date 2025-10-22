import React, { useEffect, useState } from "react";
import { Calendar, Briefcase, MapPin, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

// ✅ Types
interface TaskCount {
  date: string;
  count: number;
}

interface JobItem {
  id: string;
  jobTitle: string | null;
  company: string | null;
  description: string;
  location: string | null;
  score: number;
  joburl: string | null;
}

type JobsData = Record<string, JobItem[]>;

const ApplicationSummaryList: React.FC = () => {
  const [data, setData] = useState<TaskCount[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [jobsData, setJobsData] = useState<JobsData>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchApplicationsData();
  }, []);

  const fetchApplicationsData = async () => {
    setLoading(true);
    setTimeout(() => {
      const completedTasks: Record<string, number> = {
        "2025-09-01": 3,
        "2025-09-02": 5,
        "2025-09-03": 22,
        "2025-09-04": 7,
        "2025-09-05": 4,
        "2025-09-06": 6,
        "2025-09-07": 8,
      };

      const formattedData: TaskCount[] = Object.entries(completedTasks)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setData(formattedData);
      setLoading(false);
    }, 1000);
  };

  const fetchJobsForDate = async (date: string): Promise<JobItem[]> => {
    try {
      const response = await fetch(`http://192.168.0.110:8000/api/client/lead_id=254&date=${date}`);
      const json = await response.json();

      // Dummy data:
      const dummy: JobsData = {
        "2025-09-07": [
          {
            id: "x1y2z3-1111-2222-3333-4444aaaa",
            jobTitle: "Frontend Developer",
            company: "Tech Corp",
            description:
              "Role: 28, Experience: 10, Skills: 8, Qualifications: 5, Location: 5, Other: 0 -> total 56.",
            location: "New York, USA",
            score: 56,
            joburl: "https://example.com",
          },
          {
            id: "x1y2z3-aaaa-bbbb-cccc-ddddeeee",
            jobTitle: "Backend Developer",
            company: "CodeWorks",
            description: "Excellent match but missing location data.",
            location: "Remote",
            score: 115,
            joburl: "https://example.com",
          },
        ],
        "2025-09-06": [
          {
            id: "x1y2z3-1111-2222-3333-4444aaaa",
            jobTitle: "Frontend Developer",
            company: "Tech Corp",
            description:
              "Role: 28, Experience: 10, Skills: 8, Qualifications: 5, Location: 5, Other: 0 -> total 56.",
            location: "New York, USA",
            score: 56,
            joburl: "https://example.com",
          },
          {
            id: "x1y2z3-aaaa-bbbb-cccc-ddddeeee",
            jobTitle: "Backend Developer",
            company: "CodeWorks",
            description: "Excellent match but missing location data.",
            location: "Remote",
            score: 115,
            joburl: "https://example.com",
          },
        ],
        "2025-09-05": [
          {
            id: "x1y2z3-1111-2222-3333-4444aaaa",
            jobTitle: "Frontend Developer",
            company: "Tech Corp",
            description:
              "Role: 28, Experience: 10, Skills: 8, Qualifications: 5, Location: 5, Other: 0 -> total 56.",
            location: "New York, USA",
            score: 56,
            joburl: "https://example.com",
          },
          {
            id: "x1y2z3-aaaa-bbbb-cccc-ddddeeee",
            jobTitle: "Backend Developer",
            company: "CodeWorks",
            description: "Excellent match but missing location data.",
            location: "Remote",
            score: 115,
            joburl: "https://example.com",
          },
        ],
        "2025-09-04": [
          {
            id: "x1y2z3-1111-2222-3333-4444aaaa",
            jobTitle: "Frontend Developer",
            company: "Tech Corp",
            description:
              "Role: 28, Experience: 10, Skills: 8, Qualifications: 5, Location: 5, Other: 0 -> total 56.",
            location: "New York, USA",
            score: 56,
            joburl: "https://example.com",
          },
          {
            id: "x1y2z3-aaaa-bbbb-cccc-ddddeeee",
            jobTitle: "Backend Developer",
            company: "CodeWorks",
            description: "Excellent match but missing location data.",
            location: "Remote",
            score: 115,
            joburl: "https://example.com",
          },
        ],
        "2025-09-03": [
          {
            id: "x1y2z3-1111-2222-3333-4444aaaa",
            jobTitle: "Frontend Developer",
            company: "Tech Corp",
            description:
              "Role: 28, Experience: 10, Skills: 8, Qualifications: 5, Location: 5, Other: 0 -> total 56.",
            location: "New York, USA",
            score: 56,
            joburl: "https://example.com",
          },
          {
            id: "x1y2z3-aaaa-bbbb-cccc-ddddeeee",
            jobTitle: "Backend Developer",
            company: "CodeWorks",
            description: "Excellent match but missing location data.",
            location: "Remote",
            score: 115,
            joburl: "https://example.com",
          },
        ],
        "2025-09-02": [
          {
            id: "x1y2z3-1111-2222-3333-4444aaaa",
            jobTitle: "Frontend Developer",
            company: "Tech Corp",
            description:
              "Role: 28, Experience: 10, Skills: 8, Qualifications: 5, Location: 5, Other: 0 -> total 56.",
            location: "New York, USA",
            score: 56,
            joburl: "https://example.com",
          },
          {
            id: "x1y2z3-aaaa-bbbb-cccc-ddddeeee",
            jobTitle: "Backend Developer",
            company: "CodeWorks",
            description: "Excellent match but missing location data.",
            location: "Remote",
            score: 115,
            joburl: "https://example.com",
          },
        ],
        "2025-09-01": [
          {
            id: "x1y2z3-1111-2222-3333-4444aaaa",
            jobTitle: "Frontend Developer",
            company: "Tech Corp",
            description:
              "Role: 28, Experience: 10, Skills: 8, Qualifications: 5, Location: 5, Other: 0 -> total 56.",
            location: "New York, USA",
            score: 56,
            joburl: "https://example.com",
          },
          {
            id: "x1y2z3-aaaa-bbbb-cccc-ddddeeee",
            jobTitle: "Backend Developer",
            company: "CodeWorks",
            description: "Excellent match but missing location data.",
            location: "Remote",
            score: 115,
            joburl: "https://example.com",
          },
        ],
      };

      return dummy[date] || [];
    } catch (err) {
      console.error(err);
      return [];
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
                  {jobs.length > 0 ? (
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
                          {/* <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                            <MapPin size={14} />
                            <span>{job.location || "Not Available"}</span>
                          </div>
                          <p className="text-sm text-gray-700 mt-2">{job.description}</p> */}
                          {/* <p className="text-sm mt-1 font-semibold text-blue-600">
                            Score: {job.score ?? "N/A"}
                          </p> */}
                        </div>

                        <div>
                          <a
                            href={job.joburl || "#"}
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
