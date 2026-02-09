import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, Mail, Copy, X } from 'lucide-react';

interface OnboardingSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientData: {
        fullName: string;
        email: string;
        jbId: string;
    } | null;
    onSendEmail: (data: { fullName: string; email: string; jbId: string }) => Promise<void>;
}

export const OnboardingSuccessModal: React.FC<OnboardingSuccessModalProps> = ({
    isOpen,
    onClose,
    clientData,
    onSendEmail
}) => {
    const [status, setStatus] = useState<'sending' | 'success' | 'failed'>('sending');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    const triggerEmail = async () => {
        if (!clientData) return;
        setStatus('sending');
        setErrorMsg(null);
        try {
            await onSendEmail(clientData);
            setStatus('success');
        } catch (error: any) {
            console.error('Email send failed:', error);
            setStatus('failed');
            setErrorMsg(error.message || 'Failed to send welcome email.');
        }
    };

    useEffect(() => {
        if (isOpen && clientData) {
            triggerEmail();
        } else if (!isOpen) {
            // Reset state when modal closes
            setStatus('sending');
            setErrorMsg(null);
            setCopySuccess(false);
        }
    }, [isOpen, clientData]);

    const handleCopy = () => {
        if (!clientData) return;
        const details = `
ApplyWizz Login Credentials
---------------------------
Full Name: ${clientData.fullName}
Email: ${clientData.email}
Password: Applywizz@2026
Login URL: https://apply-wizz.me/login
ApplyWizz ID: ${clientData.jbId}
    `.trim();

        navigator.clipboard.writeText(details).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Animated Background Decoration */}
                <div className={`absolute top-0 left-0 w-full h-1 ${status === 'sending' ? 'bg-blue-600 animate-pulse' :
                        status === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`} />

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <X className="h-5 w-5 text-gray-500" />
                </button>

                <div className="text-center mt-4">
                    <div className="flex justify-center mb-4">
                        {status === 'sending' && (
                            <div className="relative">
                                <div className="h-16 w-16 rounded-full border-4 border-blue-50 border-t-blue-600 animate-spin" />
                                <Mail className="h-8 w-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                            </div>
                        )}
                        {status === 'success' && (
                            <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center">
                                <CheckCircle2 className="h-10 w-10 text-green-600" />
                            </div>
                        )}
                        {status === 'failed' && (
                            <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
                                <XCircle className="h-10 w-10 text-red-600" />
                            </div>
                        )}
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Onboarding Successful!
                    </h2>
                    <p className="text-gray-600 mb-6 px-4">
                        {clientData?.fullName} has been added to the system.
                        ApplyWizz ID: <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{clientData?.jbId}</span>
                    </p>

                    <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                        <div className="flex items-center justify-center gap-2 mb-2 text-sm font-medium">
                            {status === 'sending' && <span className="text-blue-600 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Sending Welcome Email...</span>}
                            {status === 'success' && <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Welcome Email Sent Successfully!</span>}
                            {status === 'failed' && <span className="text-red-600 flex items-center gap-1"><XCircle className="h-3 w-3" /> Email Failed to Send</span>}
                        </div>

                        <div className="text-left text-sm space-y-1 text-gray-700">
                            <p><strong>Email:</strong> {clientData?.email}</p>
                            <p><strong>Temp Password:</strong> Applywizz@2026</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {status === 'failed' && (
                            <button
                                onClick={triggerEmail}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md active:scale-[0.98]"
                            >
                                <Mail className="h-4 w-4" />
                                Resend Welcome Email
                            </button>
                        )}

                        <button
                            onClick={handleCopy}
                            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all border-2 ${copySuccess
                                    ? 'bg-green-50 border-green-200 text-green-700'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {copySuccess ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    Copied to Clipboard!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4" />
                                    Copy Login Details
                                </>
                            )}
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-3 px-4 rounded-xl font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all mt-2"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
