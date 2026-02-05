import React from 'react';

interface LoadingOverlayProps {
    userName: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ userName }) => {
    return (
        <>
            <style>{`
                @keyframes pulse {
                    0% {
                        transform: scale(0.8);
                        background-color: #b3d4fc;
                        box-shadow: 0 0 0 0 rgba(178, 212, 252, 0.7);
                    }
                    50% {
                        transform: scale(1.2);
                        background-color: #6793fb;
                        box-shadow: 0 0 0 10px rgba(178, 212, 252, 0);
                    }
                    100% {
                        transform: scale(0.8);
                        background-color: #b3d4fc;
                        box-shadow: 0 0 0 0 rgba(178, 212, 252, 0.7);
                    }
                }

                .loading-dot {
                    height: 20px;
                    width: 20px;
                    margin-right: 10px;
                    border-radius: 10px;
                    background-color: #b3d4fc;
                    animation: pulse 1.5s infinite ease-in-out;
                }

                .loading-dot:last-child {
                    margin-right: 0;
                }

                .loading-dot:nth-child(1) {
                    animation-delay: -0.3s;
                }

                .loading-dot:nth-child(2) {
                    animation-delay: -0.1s;
                }

                .loading-dot:nth-child(3) {
                    animation-delay: 0.1s;
                }

                .loading-dot:nth-child(4) {
                    animation-delay: 0.3s;
                }

                .loading-dot:nth-child(5) {
                    animation-delay: 0.5s;
                }
            `}</style>

            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 border border-gray-200">
                    {/* Pulsing Dots Loader */}
                    <div className="flex justify-center items-center mb-8">
                        <div className="loading-dot" />
                        <div className="loading-dot" />
                        <div className="loading-dot" />
                        <div className="loading-dot" />
                        <div className="loading-dot" />
                    </div>

                    {/* Loading Text */}
                    <div className="text-center">
                        <p className="text-gray-700 text-lg font-medium leading-relaxed">
                            Loading your personalized job matches...
                        </p>
                        <p className="text-gray-500 text-sm leading-relaxed mt-2">
                            Please wait a moment
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoadingOverlay;
