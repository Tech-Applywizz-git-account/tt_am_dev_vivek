import React, { useState, useEffect } from 'react';
import {
    History,
    CheckCircle,
    XCircle,
    Clock,
    PhoneCall,
    User,
    AlertCircle,
    TrendingUp,
    Smile,
    Meh,
    Frown,
    Star,
    Send,
    X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────

interface CallDetails {
    id: string;
    scheduled_date: string;
    scheduled_start_time: string;
    scheduled_end_time: string;
    status: string;
    call_requests: {
        id: string;
        call_type: string;
        sequence_number: number | null;
        am_id: string;
        users: { name: string };
    };
}

interface Feedback {
    id: string;
    submitted_by: 'client' | 'am';
    rating: number;
    comment: string | null;
}

interface CallHistoryItem {
    id: string;
    status: string;
    notes: string | null;
    client_sentiment: string | null;
    created_at: string;
    call_requests: {
        id: string;
        call_type: string;
        sequence_number: number | null;
        am_id: string;
        users: { name: string };
        feedback: Feedback[];
    };
}

interface CallHistoryViewProps {
    clientId: string;
}

// ─── Feedback Modal Component ────────────────────────────────────────

interface FeedbackModalProps {
    callRequestId: string;
    clientId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ callRequestId, clientId, onClose, onSuccess }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (rating === 0) {
            setError('Please select a star rating.');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const res = await fetch('/api/scheduling/submit-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callRequestId, rating, comment, clientId }),
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to submit feedback.');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex justify-between items-center">
                    <h3 className="text-xl font-bold">Rate your Experience</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="text-center space-y-2">
                        <p className="text-gray-600 font-medium italic">"How was your interaction with us?"</p>
                        {/* Star Rating */}
                        <div className="flex justify-center gap-2 pt-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onMouseEnter={() => setHover(star)}
                                    onMouseLeave={() => setHover(0)}
                                    onClick={() => setRating(star)}
                                    className="focus:outline-none transition-transform active:scale-90"
                                >
                                    <Star
                                        className={`h-10 w-10 transition-colors ${(hover || rating) >= star ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Tell us more (Optional)</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="What did you like? What can we improve?"
                            className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-4 h-32 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm font-medium bg-red-50 p-3 rounded-xl">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        {loading ? 'Submitting...' : (
                            <>
                                <Send className="h-4 w-4" />
                                Submit Feedback
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// ─── Main View Component ─────────────────────────────────────────────

export const CallHistoryView: React.FC<CallHistoryViewProps> = ({ clientId }) => {
    const [bookings, setBookings] = useState<CallDetails[]>([]);
    const [history, setHistory] = useState<CallHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedbackCallId, setFeedbackCallId] = useState<string | null>(null);

    const fetchCalls = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/scheduling/client-calls?clientId=${clientId}`);
            const result = await res.json();
            if (result.success) {
                setBookings(result.data.bookings);
                setHistory(result.data.history);
            } else {
                setError(result.error || 'Failed to fetch call history');
            }
        } catch (err) {
            console.error('Error fetching call history:', err);
            setError('An unexpected error occurred while loading your call history.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (clientId) {
            fetchCalls();
        }
    }, [clientId]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'MISSED':
            case 'MISSED_BY_AM': return <XCircle className="h-5 w-5 text-red-500" />;
            case 'BOOKED':
            case 'SCHEDULED': return <Clock className="h-5 w-5 text-blue-500" />;
            case 'NOT_PICKED': return <AlertCircle className="h-5 w-5 text-amber-500" />;
            default: return <PhoneCall className="h-5 w-5 text-gray-500" />;
        }
    };

    const getSentimentIcon = (sentiment: string | null) => {
        switch (sentiment) {
            case 'HAPPY': return <Smile className="h-4 w-4 text-green-500" />;
            case 'NEUTRAL': return <Meh className="h-4 w-4 text-amber-500" />;
            case 'FRUSTRATED': return <Frown className="h-4 w-4 text-red-500" />;
            default: return null;
        }
    };

    const upcomingCalls = bookings.filter(b => b.status === 'BOOKED' || b.status === 'SCHEDULED');

    if (loading && history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Gathering your call history...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 bg-red-50 border border-red-100 rounded-3xl">
                <div className="flex items-center space-x-3 text-red-700 mb-2">
                    <AlertCircle className="h-6 w-6" />
                    <h2 className="text-lg font-bold">Error</h2>
                </div>
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Call History</h1>
                    <p className="text-gray-500 mt-1">A unified timeline of your journey with us</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-2xl">
                    <History className="h-8 w-8 text-blue-600" />
                </div>
            </div>

            {/* Upcoming Calls Section */}
            {upcomingCalls.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Upcoming Interactions
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {upcomingCalls.map((call, idx) => (
                            <motion.div
                                key={call.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-100 relative overflow-hidden"
                            >
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                            {call.call_requests.call_type}{call.call_requests.sequence_number ? ` #${call.call_requests.sequence_number}` : ''}
                                        </span>
                                        <Clock className="h-5 w-5 opacity-50" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-1">
                                        {format(parseISO(call.scheduled_date), 'EEEE, MMM do')}
                                    </h3>
                                    <p className="text-blue-100 text-sm mb-4">
                                        {call.scheduled_start_time} - {call.scheduled_end_time} IST
                                    </p>
                                    <div className="flex items-center gap-2 bg-black/10 rounded-xl p-2">
                                        <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <div className="text-xs">
                                            <p className="opacity-60">Account Manager</p>
                                            <p className="font-bold">{call.call_requests.users.name}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 bg-white/10 rounded-full blur-3xl"></div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* Timeline Section */}
            <section className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">Interaction Timeline</h2>

                {history.length === 0 && upcomingCalls.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <PhoneCall className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">No call interactions found yet.</p>
                        <p className="text-gray-400 text-sm">Your calls will appear here once scheduled.</p>
                    </div>
                ) : (
                    <div className="relative space-y-12 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                        {history.map((item, idx) => {
                            const clientFeedback = item.call_requests.feedback?.find(f => f.submitted_by === 'client');

                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="relative flex items-center justify-between md:justify-start group"
                                >
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-white shadow-sm shrink-0 z-10 transition-transform group-hover:scale-110">
                                        {getStatusIcon(item.status)}
                                    </div>
                                    <div className="w-[calc(100%-4rem)] ml-4 p-5 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <time className="font-bold text-gray-900 text-sm">
                                                {format(parseISO(item.created_at), 'MMM dd, yyyy')}
                                            </time>
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded-full">
                                                {getSentimentIcon(item.client_sentiment)}
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                                    {item.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mb-4">
                                            <div className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                {item.call_requests.call_type}{item.call_requests.sequence_number ? ` #${item.call_requests.sequence_number}` : ''}
                                                {clientFeedback && (
                                                    <span className="flex items-center gap-0.5 text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                                                        <Star className="h-3 w-3 fill-amber-500" />
                                                        {clientFeedback.rating}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                                {item.notes || `This ${item.call_requests.call_type.toLowerCase()} call was ${item.status.toLowerCase().replace('_', ' ')}.`}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                                                    <User className="h-3 w-3 text-gray-400" />
                                                </div>
                                                <span className="text-[10px] text-gray-500 font-bold">
                                                    {item.call_requests.users.name}
                                                </span>
                                            </div>

                                            {item.status === 'COMPLETED' && !clientFeedback && (
                                                <button
                                                    onClick={() => setFeedbackCallId(item.call_requests.id)}
                                                    className="text-[10px] bg-blue-50 text-blue-600 font-bold px-3 py-1.5 rounded-full hover:bg-blue-600 hover:text-white transition-all transform active:scale-95"
                                                >
                                                    Rate Experience
                                                </button>
                                            )}

                                            {clientFeedback && clientFeedback.comment && (
                                                <p className="text-[10px] text-gray-400 font-medium italic truncate max-w-[150px]">
                                                    "{clientFeedback.comment}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Feedback Modal */}
            <AnimatePresence>
                {feedbackCallId && (
                    <FeedbackModal
                        callRequestId={feedbackCallId}
                        clientId={clientId}
                        onClose={() => setFeedbackCallId(null)}
                        onSuccess={() => {
                            fetchCalls();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
