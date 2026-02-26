import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { supabase2 } from '../../lib/supabaseClient';
import { supabaseAdmin } from '../../lib/supabaseAdminClient';

type EmailStatus = 'idle' | 'checking' | 'valid' | 'invalid';
type PopupType = 'invalid' | 'registered' | null;

const JobBoardSignUpForm: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Email validation
    const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle');
    const [popupType, setPopupType] = useState<PopupType>(null);
    const [txUserName, setTxUserName] = useState(''); // full_name from jobboard_transactions
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isLeaving, setIsLeaving] = useState(false);
    const navigate = useNavigate();

    // Typewriter animation states
    const [displayedText, setDisplayedText] = useState('');
    const [showCursor, setShowCursor] = useState(true);
    const fullText = 'Your dream job awaits...';

    // Typewriter effect
    useEffect(() => {
        let currentWordIndex = 0;
        const words = fullText.split(' ');
        let currentText = '';

        const typeInterval = setInterval(() => {
            if (currentWordIndex < words.length) {
                currentText = words.slice(0, currentWordIndex + 1).join(' ');
                setDisplayedText(currentText);
                currentWordIndex++;
            } else {
                setTimeout(() => {
                    currentWordIndex = 0;
                    currentText = '';
                }, 1000);
            }
        }, 400);

        return () => clearInterval(typeInterval);
    }, []);

    // Blinking cursor effect
    useEffect(() => {
        const cursorInterval = setInterval(() => {
            setShowCursor((prev) => !prev);
        }, 500);
        return () => clearInterval(cursorInterval);
    }, []);

    // Debounced email validation
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        const trimmed = email.trim().toLowerCase();

        if (!trimmed || !trimmed.includes('@')) {
            setEmailStatus('idle');
            setPopupType(null);
            return;
        }

        setEmailStatus('checking');
        setPopupType(null);

        debounceRef.current = setTimeout(async () => {
            try {
                // Check 1: clients table with opted_job_links = true (main DB)
                // → already an account, direct to login
                const { data: clientData, error: clientError } = await supabase
                    .from('clients')
                    .select('id')
                    .ilike('company_email', trimmed)
                    .eq('opted_job_links', true)
                    .maybeSingle();

                if (!clientError && clientData) {
                    setEmailStatus('invalid');
                    setPopupType('registered');
                    return;
                }

                // Check 2: jobboard_transactions with non-null transaction_id (payment DB)
                // → paid, eligible to sign up
                const { data: txData, error: txError } = await supabase2
                    .from('jobboard_transactions')
                    .select('id, full_name')
                    .ilike('email', trimmed)
                    .not('transaction_id', 'is', null)
                    .neq('payment_status', 'failed')
                    .maybeSingle();

                if (!txError && txData) {
                    setTxUserName((txData as any).full_name ?? '');
                    setEmailStatus('valid');
                    return;
                }

                // Neither check passed
                setEmailStatus('invalid');
                setPopupType('invalid');

            } catch {
                setEmailStatus('invalid');
                setPopupType('invalid');
            }
        }, 700);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [email]);

    const [signUpLoading, setSignUpLoading] = useState(false);
    const [signUpMessage, setSignUpMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const passwordsMatch = confirmPassword === '' || password === confirmPassword;
    const canSubmit =
        emailStatus === 'valid' &&
        password.trim().length >= 6 &&
        confirmPassword.trim().length >= 6 &&
        password === confirmPassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        setSignUpLoading(true);
        setSignUpMessage(null);

        const normalizedEmail = email.trim().toLowerCase();

        // Check if user already exists in auth
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
            setSignUpMessage({ type: 'error', text: 'Unable to verify account. Please try again.' });
            setSignUpLoading(false);
            return;
        }

        const users = (listData?.users ?? []) as Array<{ id: string; email?: string }>;
        const matchedUser = users.find((u) => u.email?.toLowerCase() === normalizedEmail);

        if (matchedUser) {
            // User exists in auth — update password
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                matchedUser.id,
                { password }
            );
            if (!updateError) {
                // Ensure they exist in public.users too
                await supabase.from('users').upsert(
                    { id: matchedUser.id, email: normalizedEmail, name: txUserName || normalizedEmail, role: 'client', is_active: true },
                    { onConflict: 'id', ignoreDuplicates: true }
                );
            }
            if (updateError) {
                setSignUpLoading(false);
                setSignUpMessage({ type: 'error', text: updateError.message });
            } else {
                // Auto sign-in and redirect to dashboard
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email: normalizedEmail,
                    password,
                });
                if (signInError || !signInData?.user) {
                    setSignUpLoading(false);
                    setSignUpMessage({
                        type: 'success',
                        text: 'Password updated! You can now log in with your new credentials.',
                    });
                } else {
                    // Fetch user from public.users and persist to localStorage
                    // so ProtectedRoute (which reads currentUser from localStorage) lets us in
                    const { data: publicUser } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', signInData.user.id)
                        .single();
                    if (publicUser) {
                        localStorage.setItem('currentUser', JSON.stringify(publicUser));
                    }
                    setSignUpLoading(false);
                    navigate('/dashboard');
                }
            }
        } else {
            // New job board client — create auth account, auto-confirm (no verification email)
            const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: normalizedEmail,
                password,
                email_confirm: true,
            });
            if (!createError && createData?.user) {
                // Insert into public.users with role 'client'
                await supabase.from('users').insert({
                    id: createData.user.id,
                    email: normalizedEmail,
                    name: txUserName || normalizedEmail,
                    role: 'client',
                    is_active: true,
                });
            }
            if (createError) {
                setSignUpLoading(false);
                setSignUpMessage({ type: 'error', text: createError.message });
            } else {
                // Auto sign-in and redirect to dashboard
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email: normalizedEmail,
                    password,
                });
                if (signInError || !signInData?.user) {
                    setSignUpLoading(false);
                    setSignUpMessage({
                        type: 'success',
                        text: 'Account created! You can now log in with your new credentials.',
                    });
                } else {
                    // Fetch user from public.users and persist to localStorage
                    // so ProtectedRoute (which reads currentUser from localStorage) lets us in
                    const { data: publicUser } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', signInData.user.id)
                        .single();
                    if (publicUser) {
                        localStorage.setItem('currentUser', JSON.stringify(publicUser));
                    }
                    setSignUpLoading(false);
                    navigate('/dashboard');
                }
            }
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center"
            style={{
                background: '#F1FFF3',
                opacity: isLeaving ? 0 : 1,
                transition: 'opacity 0.4s ease',
            }}
        >
            {/* Main container with split screen layout */}
            <div className="w-full max-w-7xl flex flex-col lg:flex-row items-stretch min-h-screen">

                {/* LEFT SECTION - Illustration */}
                <div className="flex-1 flex flex-col items-start justify-center p-8 lg:p-16 relative">
                    {/* Logo - top left */}
                    <div className="absolute top-8 left-8">
                        <div className="flex items-center gap-2">
                            <img
                                src="/applywizz-logo.jpg"
                                alt="Apply Wizz Logo"
                                className="w-8 h-8 rounded-lg"
                            />
                            <span className="font-bold text-gray-800 text-sm">APPLY WIZZ</span>
                        </div>
                    </div>

                    {/* Speech bubble */}
                    <div className="mb-2 relative">
                        <div
                            className="ml-24 pl-24 pr-24 pt-12 pb-12 shadow-lg"
                            style={{ background: '#9BDA88', borderRadius: '50%' }}
                        >
                            <p className="text-white text-lg font-handwriting italic">
                                {displayedText}
                                <span style={{ opacity: showCursor ? 1 : 0 }}>|</span>
                            </p>
                        </div>
                        {/* Speech bubble tail */}
                        <div
                            className="absolute -bottom-4 left-36 w-0 h-0 border-l-[40px] border-l-transparent border-r-[40px] border-r-transparent border-t-[40px]"
                            style={{ borderTopColor: '#9BDA88' }}
                        />
                    </div>

                    {/* Illustration */}
                    <div className="w-128 h-96 flex items-start justify-start">
                        <img
                            src="/login-page-image-1.png"
                            alt="Woman working on laptop"
                            className="w-full h-full object-contain"
                        />
                    </div>
                </div>

                {/* RIGHT SECTION - Sign Up Form */}
                <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
                    <div className="w-full max-w-md">
                        {/* Sign Up Card */}
                        <div className="bg-white rounded-3xl shadow-lg p-10 border border-gray-200">

                            {/* Header */}
                            <div className="mb-10">
                                <h1
                                    className="mb-2"
                                    style={{
                                        color: '#424141',
                                        fontFamily: '"Darker Grotesque"',
                                        fontSize: '32px',
                                        fontWeight: 500,
                                        lineHeight: 'normal',
                                    }}
                                >
                                    Create your account
                                </h1>
                                <p
                                    className="text-sm"
                                    style={{
                                        color: '#989898',
                                        fontFamily: '"Noto Sans"',
                                        fontStyle: 'normal',
                                        fontSize: '16px',
                                    }}
                                >
                                    Sign up to start your job board journey
                                </p>
                            </div>

                            {/* Sign Up Form */}
                            <form onSubmit={handleSubmit} className="space-y-5">

                                {/* Email Field */}
                                <div>
                                    <label
                                        className="block text-sm font-medium mb-2"
                                        style={{
                                            color: '#000',
                                            fontFamily: 'Poppins',
                                            fontWeight: 500,
                                            fontSize: '16px',
                                        }}
                                    >
                                        Enter Registered Email Address
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all pr-10"
                                            style={{
                                                borderColor:
                                                    emailStatus === 'valid'
                                                        ? '#77E954'
                                                        : emailStatus === 'invalid'
                                                            ? '#ef4444'
                                                            : '#d1d5db',
                                            }}
                                            placeholder="Enter your email"
                                            required
                                        />
                                        {/* Status icon inside input */}
                                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                            {emailStatus === 'checking' && (
                                                <svg
                                                    className="animate-spin w-5 h-5 text-gray-400"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    />
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8v8H4z"
                                                    />
                                                </svg>
                                            )}
                                            {emailStatus === 'valid' && (
                                                <svg
                                                    className="w-5 h-5"
                                                    style={{ color: '#77E954' }}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth={2.5}
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                            )}
                                            {emailStatus === 'invalid' && (
                                                <svg
                                                    className="w-5 h-5 text-red-400"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth={2.5}
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div>
                                    <label
                                        className="block text-sm font-medium mb-2"
                                        style={{
                                            color: '#000',
                                            fontFamily: 'Poppins',
                                            fontWeight: 500,
                                            fontSize: '16px',
                                        }}
                                    >
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all pr-12"
                                            placeholder="Create a password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-medium text-gray-500 hover:text-gray-700"
                                        >
                                            {showPassword ? '👁️' : '👁️‍🗨️'}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password Field */}
                                <div>
                                    <label
                                        className="block text-sm font-medium mb-2"
                                        style={{
                                            color: '#000',
                                            fontFamily: 'Poppins',
                                            fontWeight: 500,
                                            fontSize: '16px',
                                        }}
                                    >
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all pr-12"
                                            style={{ borderColor: !passwordsMatch ? '#ef4444' : '#d1d5db' }}
                                            placeholder="Re-enter your password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-medium text-gray-500 hover:text-gray-700"
                                        >
                                            {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                        </button>
                                    </div>
                                    {!passwordsMatch && (
                                        <p style={{ color: '#ef4444', fontFamily: 'Poppins', fontSize: '12px', marginTop: '4px' }}>
                                            Passwords do not match
                                        </p>
                                    )}
                                </div>

                                {/* Sign Up Button */}
                                {/* Sign Up Button */}
                                <button
                                    type="submit"
                                    disabled={!canSubmit || signUpLoading}
                                    className="w-full text-white py-3 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        background: '#77E954',
                                        fontFamily: '"Noto Sans"',
                                        fontWeight: 500,
                                        fontSize: '16px',
                                    }}
                                    onMouseEnter={(e) => canSubmit && !signUpLoading && (e.currentTarget.style.background = '#68D045')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = '#77E954')}
                                >
                                    {signUpLoading ? 'Creating account…' : 'Create Account →'}
                                </button>

                                {/* Sign-up result message */}
                                {signUpMessage && (
                                    <div
                                        style={{
                                            borderRadius: '8px',
                                            padding: '10px 14px',
                                            fontSize: '13px',
                                            fontFamily: 'Poppins',
                                            background: signUpMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
                                            color: signUpMessage.type === 'success' ? '#166534' : '#991b1b',
                                            border: `1px solid ${signUpMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                                        }}
                                    >
                                        {signUpMessage.text}
                                    </div>
                                )}
                            </form>

                            {/* Already have an account */}
                            <div className="mt-6 text-center">
                                <p
                                    style={{
                                        color: '#000',
                                        fontFamily: 'Poppins',
                                        fontWeight: 500,
                                        fontSize: '16px',
                                    }}
                                >
                                    Already have an account?{' '}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            // Clear all fields
                                            setEmail('');
                                            setPassword('');
                                            setConfirmPassword('');
                                            setEmailStatus('idle');
                                            setPopupType(null);
                                            // Fade out then navigate
                                            setIsLeaving(true);
                                            setTimeout(() => navigate('/login'), 400);
                                        }}
                                        className="font-medium bg-transparent border-none cursor-pointer p-0"
                                        style={{ color: '#77E954', fontFamily: 'Poppins', fontWeight: 500, fontSize: '16px' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.color = '#68D045')}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = '#77E954')}
                                    >
                                        Login →
                                    </button>
                                </p>
                            </div>

                        </div>
                    </div>
                </div>

            </div>

            {/* Already-registered popup */}
            {popupType === 'registered' && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '32px',
                        right: '32px',
                        background: '#fff',
                        border: '1px solid #93c5fd',
                        borderLeft: '4px solid #3b82f6',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        zIndex: 9999,
                        maxWidth: '360px',
                        animation: 'slideUp 0.3s ease',
                    }}
                >
                    <svg style={{ color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                    </svg>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '14px', color: '#111', margin: 0 }}>
                            You're already registered!
                        </p>
                        <p style={{ fontFamily: 'Poppins', fontSize: '13px', color: '#6b7280', margin: '4px 0 8px' }}>
                            An account with this email already exists. Please log in to access your Job Board dashboard.
                        </p>
                        <a
                            href="/login"
                            style={{ fontFamily: 'Poppins', fontSize: '13px', fontWeight: 600, color: '#3b82f6', textDecoration: 'none' }}
                            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                        >
                            Go to Login →
                        </a>
                    </div>
                    <button onClick={() => setPopupType(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', flexShrink: 0, padding: 0, lineHeight: 1 }}>✕</button>
                </div>
            )}

            {/* Email-not-recognised popup */}
            {popupType === 'invalid' && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '32px',
                        right: '32px',
                        background: '#fff',
                        border: '1px solid #fca5a5',
                        borderLeft: '4px solid #ef4444',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        zIndex: 9999,
                        maxWidth: '340px',
                        animation: 'slideUp 0.3s ease',
                    }}
                >
                    <svg style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                    </svg>
                    <div>
                        <p style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '14px', color: '#111', margin: 0 }}>Email not recognized</p>
                        <p style={{ fontFamily: 'Poppins', fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                            You have not entered the correct email. Please use the email associated with your ApplyWizz account.
                        </p>
                    </div>
                    <button onClick={() => setPopupType(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', flexShrink: 0, padding: 0, lineHeight: 1 }}>✕</button>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default JobBoardSignUpForm;
