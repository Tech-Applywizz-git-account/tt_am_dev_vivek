import React from "react";
import { Zap } from "lucide-react";

interface JobScoringFloatingButtonProps {
    onClick: () => void;
}

const JobScoringFloatingButton: React.FC<JobScoringFloatingButtonProps> = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="text-white bg-gradient-to-b from-[#F9F76C] to-[#14D530] text-black p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 group relative"
            title="Start Job Scoring"
        >
            <Zap size={20} className="animate-pulse" />
            <span className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-sm font-medium px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                Start Job Scoring
            </span>
        </button>
    );
};

export default JobScoringFloatingButton;
