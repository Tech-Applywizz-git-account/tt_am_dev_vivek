import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface KarmafyPendingOverlayProps {
    userName: string;
}

const KarmafyPendingOverlay: React.FC<KarmafyPendingOverlayProps> = ({ userName }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div
                className="relative rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 border border-gray-200 overflow-hidden"
                style={{
                    backgroundImage: "url('/img_frame.svg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    backgroundColor: '#ffffff',
                }}
            >
                <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">
                    Personalizing Your Dashboard
                </h2>

                <div className="flex justify-center mb-4">
                    <DotLottieReact
                        src="/loading.lottie"
                        loop
                        autoplay
                        style={{ width: 280, height: 280 }}
                    />
                </div>

                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 mb-6 border border-blue-500 shadow-inner text-center">
                    <p className="text-white text-lg font-medium leading-relaxed mb-4">
                        We are personalizing your resume-based jobs.
                    </p>
                    <p className="text-blue-50 text-base leading-relaxed">
                        Job links will be populated between <span className="font-bold text-white">3:00 AM EST</span> and <span className="font-bold text-white">5:00 AM EST</span>. Please wait until then.
                    </p>
                </div>

                <p className="text-center text-sm text-gray-500 mt-6">
                    Your personalized opportunities will appear automatically as soon as they are ready.
                </p>
            </div>
        </div>
    );
};

export default KarmafyPendingOverlay;