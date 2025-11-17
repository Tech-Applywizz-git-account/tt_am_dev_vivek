import React, { useEffect, useState } from 'react';
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
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);


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
    setShowResetModal(true);
  };

  const handleSendResetLink = async () => {
    if (!resetEmail) {
      setShowResetModal(false);
      return setError("Please enter your email above to reset your password.");
    }

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: 'https://ticketingtoolapplywizz.vercel.app/EmailConfirmed',
    });

    if (error) {
      // setToast({ type: 'error', message: error.message });
      alert("Unable to send reset link. Please try again");
    } else {
      // setToast({ type: 'success', message: 'Reset link sent to your email!' });
      toastify("Reset link sent to your email!", {
        position: "top-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });
      setShowResetModal(false);
      setResetEmail('');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* ... (header remains same) ... */}
        <h2 className="text-lg text-center justify-center  font-semibold mb-2"> Applywizz Login</h2>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="your.email@company.com"
              required
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="text-right mt-4">
          <button
            type="button"
            onClick={handleForgotPasswordClick}
            className="text-sm text-blue-600 hover:underline"
          >
            Forgot Password?
          </button>
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Login Instructions:</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            {/* <li>• You’re now using the beta version of our internal ticketing system. 🎉
              We’re testing and improving how tickets are created, tracked, and resolved across teams.
              💬 Found a bug or have feedback? Let us know — your input helps us make it better!</li> */}
            <li>• Use the email and password provided by your administrator</li>
            <li>• Contact your system admin if you need credentials</li>
            <li>• Never share your password with anyone</li>
          </ul>
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-gray-500 border-4 border-blue-100 p-16 rounded-lg max-w-xl w-full"
          //  style={{background: "linear-gradient(to left, rgba(0, 255, 94, 1) 0%, rgba(0, 217, 255, 1) 70%, rgba(0, 89, 255, 0.64) 100%)",}}
          >
            <h2 className="text-lg text-center justify-center  font-semibold mb-2">Reset Password</h2>
            <p className="text-sm text-center mb-4">Enter your email to receive a reset link:</p>
            <input
              type="email"
              placeholder="you@example.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSendResetLink}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Send Reset Link
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
