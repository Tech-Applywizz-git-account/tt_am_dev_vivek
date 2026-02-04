import React from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';

const SuccessPage = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-10 text-center">
                <div className="flex justify-center mb-6">
                    <div className="bg-green-100 p-4 rounded-full">
                        <CheckCircle className="text-green-600 w-12 h-12" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
                <p className="text-slate-600 mb-8">
                    Thank you for your business. Your subscription has been activated and your account is being processed.
                    You will receive a confirmation email shortly.
                </p>
                <button
                    onClick={() => window.location.href = '/login'}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                >
                    Final Step: Go to Login <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default SuccessPage;
