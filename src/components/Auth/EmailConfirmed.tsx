// File: src/components/Auth/EmailConfirmed.tsx
"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import { supabase } from "../../lib/supabaseClient"; // Adjust path as needed

const EmailConfirmed = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");
  const [showPassword, setShowPassword] = useState(false);

  // 🔍 Extract token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");

    if (!t) {
      setStatus("invalid");
      return;
    }

    setToken(t);
    verifyToken(t);
  }, []);

  // 🔐 Verify token with database
  const verifyToken = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from("password_reset_tokens")
        .select("user_id, expires_at")
        .eq("token", token)
        .single();

      if (error || !data) {
        setStatus("invalid");
        return;
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(data.expires_at);

      if (now > expiresAt) {
        // Delete expired token
        await supabase
          .from("password_reset_tokens")
          .delete()
          .eq("token", token);
        setStatus("invalid");
        return;
      }

      setStatus("valid");
    } catch (error) {
      console.error("Token verification error:", error);
      setStatus("invalid");
    }
  };

  // 🔥 Handle Reset Password - SIMPLIFIED
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!token) {
      toast.error("Invalid or missing token.");
      return;
    }

    setLoading(true);

    try {
// ✅ CORRECT - Use your actual Supabase URL from environment variables
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/request-password-reset`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "reset-password",
      token: token,
      newPassword: newPassword,
    }),
  }
);

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Error resetting password.");
        return;
      }

      // Success
      toast.success("Password reset successfully! Redirecting to login...", {
        position: "top-center",
        autoClose: 3000,
      });

      setTimeout(() => navigate("/login"), 3000);
    } catch (e) {
      console.error("Reset error:", e);
      toast.error("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // ⏳ Loading
  if (status === "loading") {
    return (
      <div className="min-h-screen flex justify-center items-center text-xl">
        Validating reset link...
      </div>
    );
  }

  // ❌ Invalid / Expired Link
  if (status === "invalid") {
    return (
      <div className="min-h-screen flex justify-center items-center flex-col">
        <h2 className="text-red-600 text-xl font-bold mb-4">
          Invalid or Expired Reset Link
        </h2>
        <p className="text-gray-600 mb-4 text-center">
          This password reset link is invalid or has expired.<br />
          Please request a new reset link from the login page.
        </p>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          onClick={() => navigate("/login")}
        >
          Go to Login
        </button>
      </div>
    );
  }

  // ✅ Valid Reset Page
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="bg-white shadow-xl p-6 rounded-lg w-full max-w-md border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
          Reset Your Password
        </h2>

        {/* New Password Input */}
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            New Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* Confirm Password Input */}
        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <input
            type="password"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
          />
        </div>

        {/* Submit Button */}
        <button
          className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleResetPassword}
          disabled={loading}
        >
          {loading ? "Updating Password..." : "Update Password"}
        </button>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Password must be at least 6 characters long
        </p>
      </div>
    </div>
  );
};

export default EmailConfirmed;
