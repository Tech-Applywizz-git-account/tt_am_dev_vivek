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
            <div className="relative rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden" style={{ backgroundColor: '#F1FFF3' }}>
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#393737' }}>
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Zap className="text-black" size={24} style={{ color: '#f8f3f3ff' }} />
                        </div>
                        <h2 className="text-xl font-bold" style={{ color: '#fbf9f9ff' }}>Job Scoring Required</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-black/80 hover:text-black transition-colors p-1 hover:bg-black/10 rounded-lg"
                        style={{ color: '#f7f4f4ff' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="border-l-4 border-green-500 p-4 rounded-r-lg" style={{ backgroundColor: '#ffffff' }}>
                        <p className="leading-relaxed" style={{ color: '#000000' }}>
                            We trigger job scoring and job renewal to ensure you receive the most recent jobs from the past 24 hours.
                            Since your profile was not included in the earlier scoring cycle, jobs haven't been scored for your profile yet.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <p className="leading-relaxed" style={{ color: '#000000' }}>
                            Click the button below to start job scoring based on your profile. We will generate a match score for each job using your resume data.
                        </p>

                        <div className="border border-green-200 rounded-lg p-4 space-y-2" style={{ backgroundColor: '#ffffff' }}>
                            <div className="flex items-start gap-2">
                                <Clock className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                                <p className="text-sm" style={{ color: '#000000' }}>
                                    Once you click the button, scoring will begin and may take up to <strong>10 minutes</strong> to complete.
                                </p>
                            </div>
                            <p className="text-sm ml-6" style={{ color: '#000000' }}>
                                However, you don't need to wait that long—scored jobs will start appearing within <strong>1 minute</strong>.
                            </p>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                            <div className="flex items-start gap-2">
                                <RefreshCw className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                                <div className="space-y-1 text-sm text-gray-700">
                                    <p style={{ color: '#000000' }}>🔄 <strong>Reload the page after a minute</strong> to see initial results.</p>
                                    <p style={{ color: '#000000' }}>🔄 <strong>Reload again after 10–15 minutes</strong> to view all scored job links.</p>
                                </div>
                            </div>
                        </div>

                        <p className="text-sm italic" style={{ color: '#000000' }}>
                            Job scoring will continue to run seamlessly for any additional jobs.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200" style={{ backgroundColor: '#F1FFF3' }}>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 font-medium transition-colors"
                        style={{ color: '#000000' }}
                    >
                        Close
                    </button>
                    <div className="relative">
                        <button
                            onClick={onStartScoring}
                            disabled={isButtonDisabled}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            className={`px-6 py-3 rounded-lg font-bold transition-all duration-200 flex items-center gap-2 ${isButtonDisabled
                                ? "bg-gray-400 cursor-not-allowed text-gray-700"
                                : "shadow-lg hover:shadow-xl"
                                }`}
                            style={!isButtonDisabled ? { backgroundColor: '#92E69D', color: '#000000' } : {}}
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
