import React, { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import { User } from '../../types';

interface SupportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'call' | 'cancel' | null;
    currentUser: User;
    isJobBoardClient: boolean;
}

export const SupportDialog: React.FC<SupportDialogProps> = ({ isOpen, onClose, type, currentUser, isJobBoardClient }) => {

    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !type) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulation of API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Send email if it's a job board client
        // if (isJobBoardClient) {
        const emailSubject = type === 'cancel' ? "cancel subscription ticket raised" : "call support ticket raised";
        const emailTo = "shyam@applywizz.com";
        const emailCc = ["ramakrishna@applywizz.com", "jagan@applywizz.com", "nagarajumuthu@applywizz.com"];   

        try {
            await fetch(`${import.meta.env.VITE_TICKETING_TOOL_API_URL}/api/send-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: emailTo,
                    cc: emailCc,
                    subject: emailSubject,
                    htmlBody: `
                             <html>
                              <body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">   
                                <div style="text-align:center; margin-bottom:20px;">
                                  <img src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" 
                                       alt="ApplyWizz Logo" 
                                       style="width:150px;"/>
                                </div>
                                <p><strong>Client Name:</strong> ${currentUser.name}</p>
                                <p><strong>Client Email:</strong> ${currentUser.email}</p>
                                <p><strong>Description:</strong> ${description}</p>
                                <p>Best regards,<br/> <strong>ApplyWizz Support Team.</strong></p> 
                              </body>
                            </html>
                          `
                })
            });
        } catch (error) {
            console.error("Failed to send support email:", error);
        }
        // }

        if (type === 'cancel') {
            toast.success("we will contact you within 4 hours and process the cancel subscription process", {
                position: "top-center",
                autoClose: 5000,
                theme: "dark",
            });
        } else {
            toast.success("Within 2 business working days we will contact you. Thanks for contacting us.", {
                position: "top-center",
                autoClose: 5000,
                theme: "dark",
            });
        }

        setIsSubmitting(false);

        setDescription('');
        onClose();
    };

    const title = type === 'cancel' ? 'Cancel Subscription' : 'Call Support';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">


                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                           Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all h-32 resize-none"
                            placeholder="Provide more details..."
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`flex-1 px-4 py-2 bg-black text-white rounded-lg transition-colors font-medium ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
                                }`}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
