import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { User } from '@/types';
import { supabase } from '@/lib/supabaseClient'; 

type FeedbackType = 'bug' | 'feature' | 'general';

interface FeedbackProps {
    user: User;
}

const FeedbackButton: React.FC<FeedbackProps> = ({ user }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [comment, setComment] = useState<string>('');
    const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            alert('You must be logged in to submit a ticket');
            return;
        }
        
        const {error: feedbackError}=await supabase
            .from('feedbacks')
            .insert([{
                type:feedbackType,
                comment: comment,
                name:user.name,
                role:user.role,
                userid:user.id
            }])
        if(feedbackError){
            console.error("Failed to insert feedback comment", feedbackError.message);
        alert("Failed to save volume shortfall-specific data.");
        return;
        }
        // Here you would typically send the data to your backend
        // console.log('Feedback submitted:', { comment, feedbackType });

        toast.success('Thank you for your feedback!');
        setComment('');
        setIsOpen(false);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {isOpen && (
                <div className="mb-4 w-80 bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="p-4 bg-blue-600 text-white">
                        <h3 className="text-lg font-semibold">Submit Feedback</h3>
                    </div>
                    <form onSubmit={handleSubmit} className="p-4">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Feedback Type
                            </label>
                            <select
                                value={feedbackType}
                                onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="bug">Bug Report</option>
                                <option value="feature">Feature Request</option>
                                <option value="general">General Feedback for our tool</option>
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Your Feedback
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="What would you like to share with us?"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
                                required
                            />
                        </div>
                        <div className="flex justify-between">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Submit
                            </button>
                        </div>
                    </form>
                </div>
            )}
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`${!isOpen ? 'fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-lg z-50' : ''}`}
            >
                {!isOpen ? '💬 Feedback' : ''}
            </button>

        </div>
    );
};

export default FeedbackButton;



// import React, { useState } from 'react';

// const FeedbackButton: React.FC = () => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [comment, setComment] = useState('');

//   const handleSubmit = () => {
//     if (!comment.trim()) return alert("Please enter a comment");
//     console.log("Submitted comment:", comment);
//     setComment('');
//     setIsOpen(false);
//   };

//   return (
//     <>
//   {/* Floating Button */}
//   <button
//     onClick={() => setIsOpen(true)}
//     className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-lg z-50"
//   >
//     💬 Feedback
//   </button>

//       {/* Modal */}
//       {isOpen && (
//         <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
//           <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
//             <button
//               className="absolute top-2 right-3 text-gray-500 hover:text-red-500"
//               onClick={() => setIsOpen(false)}
//             >
//               ✕
//             </button>

//             <h2 className="text-xl font-bold mb-4">Submit a Comment</h2>
//             <textarea
//               value={comment}
//               onChange={(e) => setComment(e.target.value)}
//               rows={4}
//               className="w-full border border-gray-300 p-2 rounded mb-4"
//               placeholder="Write your comment here..."
//             />

//             <button
//               onClick={handleSubmit}
//               className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
//             >
//               Submit
//             </button>
//           </div>
//         </div>
//       )}
//     </>
//   );
// };

// export default FeedbackButton;
