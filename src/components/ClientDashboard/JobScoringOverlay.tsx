import React from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface JobScoringOverlayProps {
    userName: string;
    onRefresh: () => void;
}


const JobScoringOverlay: React.FC<JobScoringOverlayProps> = ({ userName, onRefresh }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div
                className="relative rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 border border-gray-200 overflow-hidden"
                style={{
                    backgroundImage: "url('/img_frame1.svg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    backgroundColor: '#ffffff',
                }}
            >
                <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">
                    Welcome to Applywizz!
                </h2>
                {/* Lottie Animation — top of card */}
                <div className="flex justify-center mb-4">
                    <DotLottieReact
                        src="/loading.lottie"
                        loop
                        autoplay
                        style={{ width: 280, height: 280 }}
                    />
                </div>

                {/* Greeting */}
                {/* <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
                    Hi 👋 {userName}
                </h1> */}

                {/* Welcome Title */}
                <h2 className="text-2xl font-semibold text-blue-600 text-center mb-6">
                    Welcome to Applywizz!
                </h2>

                {/* Message Content */}
                <div className="bg-blue-50 rounded-lg p-6 mb-6 border border-blue-100">
                    <p className="text-gray-700 text-base leading-relaxed mb-4">
                        Thanks for submitting your details and resume. We're currently scoring your profile and matching it with the latest jobs that best fit your skills.
                    </p>
                    <p className="text-gray-700 text-base leading-relaxed mb-4">
                        This process may take <span className="font-semibold text-blue-600">10–15 minutes</span>. Please refresh the page after a few minutes to view your personalized job matches.
                    </p>
                    <p className="text-gray-700 text-base leading-relaxed">
                        Thank you for your patience - we're working to bring you the best opportunities!
                    </p>
                </div>

                {/* Refresh Button */}
                <div className="flex justify-center">
                    <button
                        onClick={onRefresh}
                        className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    >
                        <RefreshCw className="w-5 h-5" />
                        <span>Refresh Now</span>
                    </button>
                </div>

                {/* Footer Note */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    Your job matches will appear automatically once the scoring is complete
                </p>
            </div>
        </div>
    );
};

export default JobScoringOverlay;

