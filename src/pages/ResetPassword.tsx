import React, { useEffect, useState } from "react";
import { supabase1 as supabase } from "../lib/supabaseClient";


import { toast as toastify } from "react-toastify";

const ResetPassword: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // Read token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return alert("Invalid reset link");
    if (!password) return alert("Password cannot be empty");
    if (password !== confirm)
      return alert("Passwords do not match. Please re-enter.");

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "reset-password",
        {
          body: { token, newPassword: password },
        }
      );

      if (error) {
        alert(error.message || "Unable to reset password");
        setLoading(false);
        return;
      }

      toastify("Password reset successful! Please login.", {
        position: "top-center",
        autoClose: 3000,
        theme: "dark",
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Invalid or missing token.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <form
        onSubmit={handleResetPassword}
        className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md space-y-6"
      >
        <h2 className="text-xl font-semibold text-center mb-4">
          Reset Your Password
        </h2>

        <input
          type="password"
          placeholder="New Password"
          className="w-full border px-3 py-2 rounded-md"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Confirm Password"
          className="w-full border px-3 py-2 rounded-md"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Updating..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
