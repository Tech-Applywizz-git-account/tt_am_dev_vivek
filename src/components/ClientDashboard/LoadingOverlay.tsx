import React from 'react';

interface LoadingOverlayProps {
    userName: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ userName }) => {
    return (
        <>
            <style>{`
                @keyframes ball624 {
                    0% { transform: translate(0, 0); }
                    5% { transform: translate(8px, -14px); }
                    10% { transform: translate(15px, -10px); }
                    17% { transform: translate(23px, -24px); }
                    20% { transform: translate(30px, -20px); }
                    27% { transform: translate(38px, -34px); }
                    30% { transform: translate(45px, -30px); }
                    37% { transform: translate(53px, -44px); }
                    40% { transform: translate(60px, -40px); }
                    50% { transform: translate(60px, 0); }
                    57% { transform: translate(53px, -14px); }
                    60% { transform: translate(45px, -10px); }
                    67% { transform: translate(37px, -24px); }
                    70% { transform: translate(30px, -20px); }
                    77% { transform: translate(22px, -34px); }
                    80% { transform: translate(15px, -30px); }
                    87% { transform: translate(7px, -44px); }
                    90% { transform: translate(0, -40px); }
                    100% { transform: translate(0, 0); }
                }

                @keyframes barUp1 {
                    0% { transform: scale(1, 0.2); }
                    40% { transform: scale(1, 0.2); }
                    50% { transform: scale(1, 1); }
                    90% { transform: scale(1, 1); }
                    100% { transform: scale(1, 0.2); }
                }

                @keyframes barUp2 {
                    0% { transform: scale(1, 0.4); }
                    40% { transform: scale(1, 0.4); }
                    50% { transform: scale(1, 0.8); }
                    90% { transform: scale(1, 0.8); }
                    100% { transform: scale(1, 0.4); }
                }

                @keyframes barUp3 {
                    0% { transform: scale(1, 0.6); }
                    100% { transform: scale(1, 0.6); }
                }

                @keyframes barUp4 {
                    0% { transform: scale(1, 0.8); }
                    40% { transform: scale(1, 0.8); }
                    50% { transform: scale(1, 0.4); }
                    90% { transform: scale(1, 0.4); }
                    100% { transform: scale(1, 0.8); }
                }

                @keyframes barUp5 {
                    0% { transform: scale(1, 1); }
                    40% { transform: scale(1, 1); }
                    50% { transform: scale(1, 0.2); }
                    90% { transform: scale(1, 0.2); }
                    100% { transform: scale(1, 1); }
                }

                .loader-bar {
                    position: absolute;
                    bottom: 0;
                    width: 10px;
                    height: 50%;
                    background: rgb(0, 0, 0);
                    transform-origin: center bottom;
                    box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.2);
                }

                .loader-bar:nth-child(1) {
                    left: 0px;
                    transform: scale(1, 0.2);
                    animation: barUp1 4s infinite;
                }

                .loader-bar:nth-child(2) {
                    left: 15px;
                    transform: scale(1, 0.4);
                    animation: barUp2 4s infinite;
                }

                .loader-bar:nth-child(3) {
                    left: 30px;
                    transform: scale(1, 0.6);
                    animation: barUp3 4s infinite;
                }

                .loader-bar:nth-child(4) {
                    left: 45px;
                    transform: scale(1, 0.8);
                    animation: barUp4 4s infinite;
                }

                .loader-bar:nth-child(5) {
                    left: 60px;
                    transform: scale(1, 1);
                    animation: barUp5 4s infinite;
                }

                .loader-ball {
                    position: absolute;
                    bottom: 10px;
                    left: 0;
                    width: 10px;
                    height: 10px;
                    background: rgb(44, 143, 255);
                    border-radius: 50%;
                    animation: ball624 4s infinite;
                }
            `}</style>

            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 border border-gray-200">
                    {/* Animated Bar Loader */}
                    <div className="flex justify-center mb-8">
                        <div style={{ position: 'relative', width: '75px', height: '100px' }}>
                            <div className="loader-bar" />
                            <div className="loader-bar" />
                            <div className="loader-bar" />
                            <div className="loader-bar" />
                            <div className="loader-bar" />
                            <div className="loader-ball" />
                        </div>
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
