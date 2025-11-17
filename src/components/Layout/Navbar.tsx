import React, { useEffect, useState } from 'react';
import { LogOut, X, BarChart3 } from 'lucide-react';
import { User } from '../../types';
import { roleLabels } from '../../data/mockData';
import { ProfileMenu } from "./ProfileMenu";
import { supabase } from '../../lib/supabaseClient';


interface NavbarProps {
  user: User;
  onLogout: () => void;
  onViewLabResults?: (labId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onViewLabResults }) => {
  const [isBetaOpen, setIsBetaOpen] = useState(false);
  const [badgeValue, setBadgeValue] = useState<number | null>(null);
  const [codingLabUrl, setCodingLabUrl] = useState<string | null>(null);
  const [labId1, setLabId1] = useState<string | null>(null);
  const [labId2, setLabId2] = useState<string | null>(null);
  const [showLabSelector, setShowLabSelector] = useState(false);
  const [applywizzId, setApplywizzId] = useState<string | null>(null);
  const [hasMcqResults, setHasMcqResults] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  useEffect(() => {
    const fetchBadgeValue = async () => {
      if (!user?.email) return;

      const { data, error } = await supabase
        .from("clients")
        .select("badge_value,coding_lab_url,company_email,lab_id_1,lab_id_2,applywizz_id,mcq_results,test_results")
        .eq("company_email", user.email)
        .single();

      if (error) {
        console.error("Error fetching badge value:", error.message);
        return;
      }

      if (data?.badge_value !== null) {
        setBadgeValue(data.badge_value);
      }
      if (data?.coding_lab_url) {
        setCodingLabUrl(data.coding_lab_url);
      }
      if (data?.applywizz_id) {
        setApplywizzId(data.applywizz_id);
      }

      // Check for new test_results array first, fallback to legacy columns
      if (data?.test_results && Array.isArray(data.test_results) && data.test_results.length > 0) {
        setTestResults(data.test_results);
        
        // For backward compatibility, set first lab IDs found
        let foundLab1 = false;
        let foundLab2 = false;
        let foundMcq = false;
        
        for (const test of data.test_results) {
          if (test.lab_id_1 && !foundLab1) {
            setLabId1(test.lab_id_1);
            foundLab1 = true;
          }
          if (test.lab_id_2 && !foundLab2) {
            setLabId2(test.lab_id_2);
            foundLab2 = true;
          }
          if (test.mcq_results && !foundMcq) {
            setHasMcqResults(true);
            foundMcq = true;
          }
        }
      } else {
        // Legacy support: use old columns
        if (data?.lab_id_1) setLabId1(data.lab_id_1);
        if (data?.lab_id_2) setLabId2(data.lab_id_2);
        if (data?.mcq_results) setHasMcqResults(true);
      }
    };

    fetchBadgeValue();
  }, [user?.email]);
  
  useEffect(() => {
    if (!isBetaOpen) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setIsBetaOpen(false);
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isBetaOpen]);

  // Close lab selector when clicking outside
  useEffect(() => {
    if (!showLabSelector) return;
    const handleClickOutside = () => setShowLabSelector(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showLabSelector]);
  return (
    // <nav className="bg-gradient-to-br from-blue-400 to-lime-500 border-b border-gray-200 sticky top-0 z-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        {/* width constraint + responsive paddings */}
      <div className="mx-auto max-w-screen-2xl px-3 sm:px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-3 md:gap-4">
          {/* LEFT: brand + section + beta */}
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <img
                className="h-7 w-28 sm:h-8 sm:w-32 md:w-36 object-contain"
                src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png"
                alt="ApplyWizz"
              />
            </div>

            {/* Small/Medium: open modal instead of details */}
            {/* <button
              type="button"
              onClick={() => setIsBetaOpen(true)}
              className="lg:hidden text-xs sm:text-sm text-gray-600 bg-transparent border border-green-200 rounded px-2 py-1 hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-300"
              aria-haspopup="dialog"
              aria-expanded={isBetaOpen}
              aria-controls="beta-modal"
              title="ApplyWizz Ticketing Tool - Beta Version"
            >
              <span className="font-medium text-gray-900">🚀ApplyWizz Ticketing Tool<br/> - Beta Version</span><br/>
              <span className="ml-1 text-gray-900">(tap for details)</span>
            </button> */}
            {/* {isBetaOpen && (
              <div id="beta-modal" role="dialog" aria-modal="true" className="fixed inset-0 z-[70]">
                <div className="absolute inset-0 bg-black/40" onClick={() => setIsBetaOpen(false)} aria-hidden="true" />
                <div className="absolute inset-0 grid place-items-center px-4">
                  <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-center  py-3 bg-gray-100 ">
                      <h2 className="text-base text-center bg-gradient-to-r from-blue-900 via-blue-600 via-blue-600 to-lime-600 inline-block text-transparent bg-clip-text px-8 font-semibold">
                        ApplyWizz Ticketing Tool<br/> - Beta Version</h2>
                      <button
                        onClick={() => setIsBetaOpen(false)}
                        className="p-1 rounded hover:bg-black/20 pl-8 text-black focus:outline-none focus:ring-2 focus:ring-black/60"
                        aria-label="Close"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="p-4 text-sm text-gray-700 space-y-3">
                      <p>
                        You’re now using the beta version of our internal ticketing system. 🎉 We’re testing and
                        improving how tickets are created, tracked, and resolved across teams.
                      </p>
                      <p>
                        💬 Found a bug or have feedback? Let us know - your input helps us make it better!<br/>
                        - ApplyWizz Ops &amp; Tech Team
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}  */}


            {/* Full text only on large+ (unchanged look) */}
             {/* <div className="hidden lg:block text-sm text-gray-600 bg-transparent border border-green-200 rounded px-3 py-2 text-gray-900">
              <div className="text-center">🚀 ApplyWizz Ticketing Tool – Beta Version Launched!</div>
              <div className="px-4 text-center ">
                <p>
                  You’re now using the beta version of our internal ticketing system. 🎉 We’re testing and improving how tickets are created, tracked, and resolved across teams.
                </p>
                <p>
                  💬 Found a bug or have feedback? Let us know - your input helps us make it better!
                  - ApplyWizz Ops &amp; Tech Team
                </p>
              </div>
            </div>  */}
          </div>

          {(user.role === 'client' && badgeValue && badgeValue > 0) && ( // show buttons only if the user is a client and has a badgeValue
              <div className="flex items-center gap-2">
                {/* Lab Results Button with Dropdown */}
                <div className="relative">
                  <button
                    className="text-sm px-3 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-colors flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      
                      // Use new test_results array if available
                      if (testResults.length > 0) {
                        // Count all available result types across all tests
                        const allResults = testResults.flatMap((test: any, testIndex: number) => {
                          const results = [];
                          if (test.mcq_results) {
                            results.push({ type: 'mcq', contestId: test.contestId, contestName: test.contestName, testIndex });
                          }
                          if (test.lab_id_1) {
                            results.push({ type: 'lab1', labId: test.lab_id_1, contestName: test.contestName, testIndex });
                          }
                          if (test.lab_id_2) {
                            results.push({ type: 'lab2', labId: test.lab_id_2, contestName: test.contestName, testIndex });
                          }
                          return results;
                        });
                        
                        if (allResults.length === 1) {
                          // Single result - open directly
                          const result = allResults[0];
                          if (result.type === 'mcq') {
                            onViewLabResults?.(`mcq:${result.contestId}`);
                          } else {
                            onViewLabResults?.(result.labId);
                          }
                        } else if (allResults.length > 1) {
                          // Multiple results - show dropdown
                          setShowLabSelector(!showLabSelector);
                        } else {
                          alert('No test results configured for your account');
                        }
                      } else {
                        // Legacy: Count available result types
                        const hasLab1 = !!labId1;
                        const hasLab2 = !!labId2;
                        const hasMcq = hasMcqResults;
                        const totalOptions = (hasLab1 ? 1 : 0) + (hasLab2 ? 1 : 0) + (hasMcq ? 1 : 0);
                        
                        if (totalOptions === 1) {
                          if (hasMcq) {
                            onViewLabResults?.('mcq');
                          } else if (hasLab1) {
                            onViewLabResults?.(labId1);
                          } else if (hasLab2) {
                            onViewLabResults?.(labId2);
                          }
                        } else if (totalOptions > 1) {
                          setShowLabSelector(!showLabSelector);
                        } else {
                          alert('No test results configured for your account');
                        }
                      }
                    }}
                    title="View your test results"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Test Results</span>
                  </button>
                  
                  {/* Dropdown Menu for Result Selection */}
                  {showLabSelector && (
                    <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-[200px]">
                      {testResults.length > 0 ? (
                        // New test_results array structure
                        testResults.map((test: any, testIndex: number) => (
                          <div key={testIndex}>
                            {test.contestName && testResults.length > 1 && (
                              <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">
                                {test.contestName}
                              </div>
                            )}
                            {test.mcq_results && (
                              <button
                                onClick={() => {
                                  onViewLabResults?.(`mcq:${test.contestId}`);
                                  setShowLabSelector(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                              >
                                📝 MCQ Results{testResults.length > 1 ? '' : ''}
                              </button>
                            )}
                            {test.lab_id_1 && (
                              <button
                                onClick={() => {
                                  onViewLabResults?.(test.lab_id_1);
                                  setShowLabSelector(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                              >
                                💻 Coding Lab 1
                              </button>
                            )}
                            {test.lab_id_2 && (
                              <button
                                onClick={() => {
                                  onViewLabResults?.(test.lab_id_2);
                                  setShowLabSelector(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                              >
                                💻 Coding Lab 2
                              </button>
                            )}
                            {testIndex < testResults.length - 1 && (
                              <div className="border-b border-gray-200 my-1" />
                            )}
                          </div>
                        ))
                      ) : (
                        // Legacy columns fallback
                        <>
                          {hasMcqResults && (
                            <button
                              onClick={() => {
                                onViewLabResults?.('mcq');
                                setShowLabSelector(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                            >
                              📝 MCQ Results
                            </button>
                          )}
                          {labId1 && (
                            <button
                              onClick={() => {
                                onViewLabResults?.(labId1);
                                setShowLabSelector(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                            >
                              💻 Coding Lab 1 Results
                            </button>
                          )}
                          {labId2 && (
                            <button
                              onClick={() => {
                                onViewLabResults?.(labId2);
                                setShowLabSelector(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                            >
                              💻 Coding Lab 2 Results
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                <button
                  className="text-sm px-3 py-2 bg-blue-100 text-blue-600 rounded-lg font-medium hover:bg-blue-200 transition-colors"
                  onClick={() => {
                    // Use ApplyWizz ID instead of Supabase UUID
                    const uid = encodeURIComponent(applywizzId || user.email);
                    const env = codingLabUrl;
                    window.open(`/api/fermion-redirect?env=${env}&uid=${uid}`, '_blank', 'noopener');
                  }}
                >
                  Coding Lab
                </button>
              </div>
            )}

          <ProfileMenu user={user} onLogout={onLogout} />
        </div>
      </div>
    </nav>
  );
};
