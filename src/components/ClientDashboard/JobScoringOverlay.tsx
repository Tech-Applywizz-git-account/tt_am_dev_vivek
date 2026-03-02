import React from 'react';
import { RefreshCw } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export interface JobScoringOverlayProps {
    userName: string;
    onRefresh: () => void;
    isNewRole: boolean;
}


const JobScoringOverlay = ({ userName, onRefresh, isNewRole }: JobScoringOverlayProps) => {
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

                <div className="bg-blue-500 rounded-lg p-6 mb-6 border border-blue-100 text-center">
                    {isNewRole ? (
                        <p className="text-white text-base leading-relaxed">
                            Since you have selected new job role, we are personalizing your resume-based jobs. Job links will be populated between 3:00 AM EST and 5:00 AM EST. Please wait until then.
                        </p>
                    ) : (
                        <>
                            <p className="text-white text-base leading-relaxed mb-4">
                                Hang tight! We’re matching your profile with the latest suitable jobs.
                            </p>
                            <p className="text-white text-base leading-relaxed">
                                Check back in 10–15 minutes to see your personalized matches.
                            </p>
                        </>
                    )}
                </div>

                {/* Refresh Button */}
                {/* <div className="flex justify-center">
                    <button
                        onClick={onRefresh}
                        className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    >
                        <RefreshCw className="w-5 h-5" />
                        <span>Refresh Now</span>
                    </button>
                </div> */}

                {/* Footer Note */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    Your job matches will appear automatically once the scoring is complete
                </p>
            </div>
        </div>
    );
};

export default JobScoringOverlay;