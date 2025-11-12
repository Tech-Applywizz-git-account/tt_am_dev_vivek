import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Clock, AlertCircle, Loader2, Award } from 'lucide-react';
import { User, MCQResults } from '../../types';
import { supabase } from '../../lib/supabaseClient';

interface LabResultsModalProps {
  user: User;
  labId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface TestCase {
  testCaseId: string;
  status: string;
}

interface LabResultData {
  userId: string;
  labId: string;
  isLabAttempted: boolean;
  isRunComplete: boolean;
  resultArray: TestCase[];
  stats: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: string;
    allTestsPassed: boolean;
  } | null;
}

export const LabResultsModal: React.FC<LabResultsModalProps> = ({
  user,
  labId,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [labData, setLabData] = useState<LabResultData | null>(null);
  const [applywizzId, setApplywizzId] = useState<string | null>(null);
  const [mcqData, setMcqData] = useState<MCQResults | null>(null);
  const isMcqMode = labId === 'mcq';

  useEffect(() => {
    if (isOpen && labId) {
      if (isMcqMode) {
        fetchMcqResults();
      } else {
        fetchApplywizzId();
      }
    }
  }, [isOpen, labId]);

  const fetchMcqResults = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('mcq_results')
        .eq('company_email', user.email)
        .single();

      if (error) {
        setError(`Unable to fetch MCQ results: ${error.message}`);
        setLoading(false);
        return;
      }

      if (!data?.mcq_results) {
        setError('No MCQ results found. You may not have attempted the test yet.');
        setLoading(false);
        return;
      }

      setMcqData(data.mcq_results as MCQResults);
    } catch (err) {
      console.error('❌ Error fetching MCQ results:', err);
      setError('An unexpected error occurred while fetching MCQ results');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplywizzId = async () => {
    try {
      console.log('🔍 Searching for client with email:', user.email);
      
      const { data, error } = await supabase
        .from('clients')
        .select('applywizz_id, company_email, personal_email')
        .eq('company_email', user.email)
        .single();

      console.log('📊 Query result:', { data, error });

      if (error) {
        console.error('❌ Error fetching ApplyWizz ID:', error);
        setError(`Unable to fetch user information: ${error.message}`);
        setLoading(false);
        return;
      }

      if (!data) {
        console.error('❌ No client record found for email:', user.email);
        setError(`No client record found for ${user.email}. Please contact support.`);
        setLoading(false);
        return;
      }

      if (!data.applywizz_id) {
        console.error('❌ ApplyWizz ID is empty for client:', data);
        setError('ApplyWizz ID not configured for your account. Please contact support.');
        setLoading(false);
        return;
      }

      console.log('✅ ApplyWizz ID found:', data.applywizz_id);
      setApplywizzId(data.applywizz_id);
      // Use ApplyWizz ID as userId for Fermion API
      fetchLabResults(data.applywizz_id);
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const fetchLabResults = async (userApplywizzId?: string) => {
    const userId = userApplywizzId || applywizzId;
    
    if (!userId) {
      setError('User ID not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔧 Fetching lab results for:', { userId, labId });
      console.log('📋 Request details:', {
        endpoint: '/api/get-fermion-lab-results',
        method: 'POST',
        body: { userId, labId }
      });
      
      const response = await fetch('/api/get-fermion-lab-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          labId: labId,
        }),
      });

      const data = await response.json();
      console.log('📥 API Response:', data);
      console.log('📊 Lab Data:', data.data);

      if (!data.success) {
        const errorMsg = data.message || data.error?.message || 'Failed to fetch lab results';
        console.error('❌ API Error:', data);
        setError(errorMsg);
        return;
      }

      setLabData(data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching lab results';
      console.error('❌ Lab results fetch error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'successful':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'wrong-answer':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'compilation-error':
      case 'time-limit-exceeded':
      case 'non-zero-exit-code':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'successful':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'wrong-answer':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'compilation-error':
      case 'time-limit-exceeded':
      case 'non-zero-exit-code':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-green-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isMcqMode ? 'MCQ Test Results' : 'Coding Lab Results'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isMcqMode ? 'Multiple Choice Questions' : `Lab ID: ${labId}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600">Loading {isMcqMode ? 'MCQ' : 'lab'} results...</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => isMcqMode ? fetchMcqResults() : fetchLabResults()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* MCQ Results Display */}
          {isMcqMode && mcqData && !loading && !error && (
            <>
              {/* MCQ Statistics Card */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 mb-6 border border-purple-200">
                <div className="flex items-center gap-3 mb-4">
                  <Award className="h-6 w-6 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">MCQ Summary</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Total Questions</p>
                    <p className="text-2xl font-bold text-gray-900">{mcqData.totalQuestions}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">Attempted</p>
                    <p className="text-2xl font-bold text-blue-600">{mcqData.totalAttempted}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">Passed</p>
                    <p className="text-2xl font-bold text-green-600">{mcqData.passed}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-red-200">
                    <p className="text-sm text-gray-600 mb-1">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{mcqData.failed}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-yellow-200">
                    <p className="text-sm text-gray-600 mb-1">Not Attempted</p>
                    <p className="text-2xl font-bold text-yellow-600">{mcqData.notAttempted}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <p className="text-sm text-gray-600 mb-1">Points Scored</p>
                    <p className="text-2xl font-bold text-purple-600">{mcqData.points}</p>
                  </div>
                </div>
                
                {/* Success Rate Display */}
                <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Success Rate</span>
                    <span className="text-lg font-bold text-purple-600">
                      {mcqData.totalAttempted > 0 
                        ? ((mcqData.passed / mcqData.totalAttempted) * 100).toFixed(1) 
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${mcqData.totalAttempted > 0 ? (mcqData.passed / mcqData.totalAttempted) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>

                {/* Congratulations Message */}
                {mcqData.passed === mcqData.totalAttempted && mcqData.totalAttempted > 0 && (
                  <div className="mt-4 bg-green-100 border border-green-300 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <p className="text-green-800 font-medium">🎉 Perfect Score! You answered all attempted questions correctly!</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Coding Lab Results Display */}
          {labData && !loading && !error && !isMcqMode && (
            <>
              {!labData.isLabAttempted ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <Clock className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">Lab Not Attempted</h3>
                  <p className="text-yellow-700">You haven't attempted this coding lab yet.</p>
                </div>
              ) : (
                <>
                  {/* Statistics Card */}
                  {labData.stats && (
                    <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl p-6 mb-6 border border-blue-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1">Total Tests</p>
                          <p className="text-2xl font-bold text-gray-900">{labData.stats.totalTests}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-green-200">
                          <p className="text-sm text-gray-600 mb-1">Passed</p>
                          <p className="text-2xl font-bold text-green-600">{labData.stats.passedTests}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-red-200">
                          <p className="text-sm text-gray-600 mb-1">Failed</p>
                          <p className="text-2xl font-bold text-red-600">{labData.stats.failedTests}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                          <p className="text-sm text-gray-600 mb-1">Pass Rate</p>
                          <p className={`text-2xl font-bold ${labData.stats.allTestsPassed ? 'text-green-600' : 'text-orange-600'}`}>
                            {labData.stats.passRate}
                          </p>
                        </div>
                      </div>
                      {labData.stats.allTestsPassed && (
                        <div className="mt-4 bg-green-100 border border-green-300 rounded-lg p-4 flex items-center gap-3">
                          <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                          <p className="text-green-800 font-medium">🎉 Congratulations! You passed all test cases!</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Test Cases List */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Test Cases</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {labData.resultArray.map((testCase, index) => (
                        <div
                          key={testCase.testCaseId}
                          className={`px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${getStatusColor(testCase.status)} border-l-4`}
                        >
                          <div className="flex items-center gap-4">
                            {getStatusIcon(testCase.status)}
                            <div>
                              <p className="font-medium text-gray-900">Test Case {index + 1}</p>
                              <p className="text-sm text-gray-600">ID: {testCase.testCaseId}</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 text-sm font-medium rounded-full bg-white border">
                            {formatStatus(testCase.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!labData.isRunComplete && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
                      <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                      <p className="text-yellow-800 text-sm">Your code is still being evaluated. Refresh to see updated results.</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          {!isMcqMode && labData && labData.isLabAttempted && !labData.isRunComplete && (
            <button
              onClick={() => fetchLabResults()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Loader2 className="h-4 w-4" />
              Refresh Results
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
