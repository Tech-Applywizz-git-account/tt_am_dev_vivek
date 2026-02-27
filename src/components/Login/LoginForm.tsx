import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { User } from '../../types';
import { roleLabels } from '../../data/mockData';
import { toast as toastify } from 'react-toastify';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false); // New state for password visibility
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLinkLoading, setResetLinkLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Typewriter animation states
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const fullText = "You've got this...";

  // Typewriter effect
  useEffect(() => {
    let currentIndex = 0;
    const words = fullText.split(' ');
    let currentWordIndex = 0;
    let currentText = '';

    const typeInterval = setInterval(() => {
      if (currentWordIndex < words.length) {
        currentText = words.slice(0, currentWordIndex + 1).join(' ');
        setDisplayedText(currentText);
        currentWordIndex++;
      } else {
        // Pause at the end, then restart
        setTimeout(() => {
          currentWordIndex = 0;
          currentText = '';
        }, 1000);
      }
    }, 400); // Each word appears every 400ms

    return () => clearInterval(typeInterval);
  }, []);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      if (!data.user) throw new Error('No user data returned');

      const { data: publicUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError || !publicUser) {
        throw new Error('Could not fetch user profile');
      }
      onLogin(publicUser);
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordClick = () => {
    setError(""); // Clear any previous errors
    setShowResetModal(true);
  };

  const handleSendResetLink = async () => {
    if (!resetEmail) {
      setError("Please enter your email to reset your password.");
      return;
    }

    setResetLinkLoading(true);
    setError(""); // Clear any previous errors

    try {
      // First, check if the email exists in the database
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', resetEmail.trim().toLowerCase())
        .single();

      if (checkError || !existingUser) {
        // User not found in database
        setError("User not registered. Please check your entered email.");
        setResetLinkLoading(false);
        return;
      }

      // User exists, proceed with sending reset link
      const response = await fetch(
        "https://zkebbnegghodwmgmkynt.supabase.co/functions/v1/request-password-reset",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: resetEmail }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send reset link");
      }

      toastify(result.message || "Reset link sent to your email!", {
        position: "top-center",
        autoClose: 4000,
        theme: "dark",
      });

      setShowResetModal(false);
      setResetEmail("");
      setError(""); // Clear error on success
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || "Unable to send reset link. Please try again.");
    } finally {
      setResetLinkLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F1FFF3' }}>
      {/* Main container with split screen layout */}
      <div className="w-full max-w-7xl flex flex-col lg:flex-row items-stretch min-h-screen">

        {/* LEFT SECTION - Illustration */}
        <div className="flex-1 flex flex-col items-start justify-center p-8 lg:p-16 relative">
          {/* Logo - top left */}
          <div className="absolute top-8 left-8">
            <div className="flex items-center gap-2">
              {/* Placeholder for logo - will be replaced */}
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
            <div className="ml-24 pl-24 pr-24 pt-12 pb-12 shadow-lg" style={{ background: '#9BDA88', borderRadius: '50%' }}>
              <p className="text-white text-lg font-handwriting italic">
                {displayedText}
                <span style={{ opacity: showCursor ? 1 : 0 }}>|</span>
              </p>
            </div>
            {/* Speech bubble tail */}
            <div className="absolute -bottom-4 left-36 w-0 h-0 border-l-[40px] border-l-transparent border-r-[40px] border-r-transparent border-t-[40px]" style={{ borderTopColor: '#9BDA88' }}></div>
          </div>

          {/* Illustration placeholder - will be replaced with actual image */}
          <div className="w-128 h-96 flex items-start justify-start">
            <img
              src="/login-page-image-1.png"
              alt="Woman working on laptop"
              className="w-full h-full object-contain lightgray -6px 0px / 100.809% 100% no-repeat"
            />
          </div>
        </div>

        {/* RIGHT SECTION - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
          <div className="w-full max-w-md">
            {/* Login Card */}
            <div className="bg-white rounded-3xl shadow-lg p-10 border border-gray-200">
              {/* Header */}
              <div className="mb-16">
                <h1 className="mb-2" style={{ color: '#424141', fontFamily: '"Darker Grotesque"', fontSize: '32px', fontWeight: 500, lineHeight: 'normal' }}>Welcome back!</h1>
                <p className="text-sm" style={{ color: '#989898', fontFamily: '"Noto Sans"', fontStyle: 'normal', fontSize: '16px' }}>Enter your credentials to access your account</p>
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#000', fontFamily: 'Poppins', fontWeight: 500, fontSize: '16px' }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
                    placeholder="Enter your mail"
                    required
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#000', fontFamily: 'Poppins', fontWeight: 500, fontSize: '16px' }}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all pr-12"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white py-3 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#77E954', fontFamily: '"Noto Sans"', fontWeight: 500, fontSize: '16px' }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#68D045')}
                  onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#77E954')}
                >
                  {loading ? 'Logging in...' : (
                    <>
                      Login
                      <span>→</span>
                    </>
                  )}
                </button>
              </form>

              {/* Sign up link */}
              <div className="mt-6 text-center">
                <p style={{ color: '#000', fontFamily: 'Poppins', fontWeight: 500, fontSize: '16px' }}>
                  Don't remember your password?{' '} <br />
                  <button
                    type="button"
                    onClick={handleForgotPasswordClick}
                    className="font-medium"
                    style={{ color: '#77E954', fontFamily: 'Poppins', fontWeight: 500, fontSize: '16px' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#68D045'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#77E954'}
                  >
                    Reset Password →
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Reset Password</h2>
            <p className="text-sm text-gray-600 mb-6">Enter your email to receive a reset link:</p>

            {/* Error message in modal */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <input
              type="email"
              placeholder="you@example.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 mb-6"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setError(""); // Clear error when closing modal
                  setShowResetModal(false);
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendResetLink}
                disabled={resetLinkLoading}
                className="px-6 py-2 bg-green-400 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetLinkLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
