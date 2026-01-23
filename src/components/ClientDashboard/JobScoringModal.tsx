import React, { useState } from "react";
import { X, Zap, Clock, RefreshCw } from "lucide-react";

interface JobScoringModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStartScoring: () => void;
    isButtonDisabled: boolean;
}

const JobScoringModal: React.FC<JobScoringModalProps> = ({
    isOpen,
    onClose,
    onStartScoring,
    isButtonDisabled,
}) => {
    const [isHovered, setIsHovered] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Zap className="text-white" size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Job Scoring Required</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                        <p className="text-gray-700 leading-relaxed">
                            We trigger job scoring and job renewal to ensure you receive the most recent jobs from the past 24 hours.
                            Since your profile was not included in the earlier scoring cycle, jobs haven't been scored for your profile yet.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-gray-700 leading-relaxed">
                            Click the button below to start job scoring based on your profile. We will generate a match score for each job using your resume data.
                        </p>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                            <div className="flex items-start gap-2">
                                <Clock className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                                <p className="text-sm text-gray-700">
                                    Once you click the button, scoring will begin and may take up to <strong>10 minutes</strong> to complete.
                                </p>
                            </div>
                            <p className="text-sm text-gray-700 ml-6">
                                However, you don't need to wait that long—scored jobs will start appearing within <strong>1 minute</strong>.
                            </p>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                            <div className="flex items-start gap-2">
                                <RefreshCw className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                                <div className="space-y-1 text-sm text-gray-700">
                                    <p>🔄 <strong>Reload the page after a minute</strong> to see initial results.</p>
                                    <p>🔄 <strong>Reload again after 10–15 minutes</strong> to view all scored job links.</p>
                                </div>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 italic">
                            Job scoring will continue to run seamlessly for any additional jobs.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                    >
                        Close
                    </button>
                    <div className="relative">
                        <button
                            onClick={onStartScoring}
                            disabled={isButtonDisabled}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            className={`px-6 py-3 rounded-lg font-bold text-white transition-all duration-200 flex items-center gap-2 ${isButtonDisabled
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl"
                                }`}
                        >
                            <Zap size={18} />
                            <span>Start Job Scoring</span>
                        </button>
                        {isButtonDisabled && isHovered && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap shadow-lg">
                                We score jobs only once in a day
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                    <div className="border-4 border-transparent border-t-gray-900"></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobScoringModal;
