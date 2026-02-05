import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
    userName: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ userName }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 border border-gray-200">
                {/* Header with animated icon */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                            <Loader2 className="w-10 h-10 text-white animate-spin" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-400 rounded-full border-2 border-white flex items-center justify-center">
                            <span className="text-xs">⚡</span>
                        </div>
                    </div>
                </div>

                {/* Greeting */}
                <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
                    Hi 👋 {userName}
                </h1>

                {/* Welcome Title */}
                <h2 className="text-2xl font-semibold text-blue-600 text-center mb-6">
                    Welcome to Applywizz!
                </h2>

                {/* Message Content */}
                <div className="bg-blue-50 rounded-lg p-6 mb-6 border border-blue-100">
                    <p className="text-gray-700 text-base leading-relaxed text-center">
                        We're loading your personalized job matches...
                    </p>
                    <p className="text-gray-600 text-sm leading-relaxed text-center mt-3">
                        This will only take a moment. Thank you for your patience!
                    </p>
                </div>

                {/* Loading Animation */}
                <div className="flex justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadingOverlay;
