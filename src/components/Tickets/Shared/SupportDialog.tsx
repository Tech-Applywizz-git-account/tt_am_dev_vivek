import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { X } from 'lucide-react';

interface SupportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'call' | 'cancel' | null;
    currentUser: User;
    isJobBoardClient?: boolean;
}

export const SupportDialog: React.FC<SupportDialogProps> = ({ isOpen, onClose, type, currentUser, isJobBoardClient }) => {
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) {
            toast.error('Please provide a description');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isJobBoardClient) {
                const { data: clientData } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('company_email', currentUser.email)
                    .single();

                const clientId = clientData?.id || null;

                const newTicket = {
                    title: type === 'call' ? 'Call Support Request' : 'Subscription Cancellation Request',
                    description: description,
                    base_type: type === 'call' ? 'jobBoard_call_support' : 'jobBoard_subscription_cancellation',
                    type: type === 'call' ? 'jobBoard_call_support' : 'jobBoard_subscription_cancellation',
                    clientId: clientId,
                    createdby: currentUser.id,
                    priority: 'medium',
                    status: 'open',
                    createdat: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    escalation_level: 0,
                    metadata: JSON.stringify({ source: 'jobboard_support_dialog' }),
                    comments: JSON.stringify([]),
                    createdbyclient: true,
                };

                const { error: ticketError } = await supabase.from('tickets').insert([newTicket]);
                if (ticketError) console.error("Failed to create support ticket in DB:", ticketError);
            }

            const emailSubject = type === 'cancel' ? "cancel subscription ticket raised" : "call support ticket raised";
            const emailTo = "bhanuteja@applywizz.com";
            const emailCc = ["bhanutejathouti@gmail.com"];

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

            toast.success(
                type === 'call'
                    ? 'Support team will contact you shortly.'
                    : 'Cancellation request received. Our team will process it within 24 hours.'
            );
            onClose();
            setDescription('');
        } catch (error) {
            console.error('Error submitting support request:', error);
            toast.error('Failed to submit request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                    <X className="h-5 w-5" />
                </button>

                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    {type === 'call' ? 'Request Call Support' : 'Cancel Subscription'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Please describe your {type === 'call' ? 'issue' : 'reason for cancellation'}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border px-3 py-2 rounded-lg min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#816D46] resize-none"
                            placeholder={type === 'call' ? "Enter details about the issue you are facing..." : "Enter details why you want to cancel..."}
                            required
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
