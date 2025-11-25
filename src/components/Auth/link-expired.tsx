// ✅ File: src/components/Auth/LinkExpired.tsx
"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabaseClient';

import {toast} from 'react-toastify';

export default function LinkExpired() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedEmail =
      sessionStorage.getItem("signup_email") ||
      localStorage.getItem("applywizz_user_email") ||
      "";
    if (storedEmail) {
      setEmail(storedEmail);
      console.log("🪪 Found email:", storedEmail);
    }
  }, []);

  // const handleResend = async () => {
  //   if (!email) return alert("Email not found");
  //   setLoading(true);
  //   try {
  //     const { error } = await supabase.auth.resend({
  //       type: "signup",
  //       email,
  //       options: {
  //         emailRedirectTo: "https://ticketingtoolapplywizz.vercel.app/EmailConfirmed",
  //       },
  //     });
  //     if (error) throw error;

  //     alert("✅ Verification link resent");
  //     setTimeout(() => {
  //       navigate("/EmailVerifyRedirect?email=" + encodeURIComponent(email));
  //     }, 3000);
  //   } catch (err: any) {
  //     alert("❌ " + err.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const handleResend = async () => {
    if (!email) return;

    setLoading(true);
    try {
      // ✅ Resend verification with same redirect format
      const redirectUrl = `https://ticketingtoolapplywizz.vercel.app/EmailVerifyRedirect?email=${encodeURIComponent(email)}`;
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: redirectUrl }
      });

      if (error) throw error;

      alert("Verification email resent!");
      setTimeout(() => navigate("/"), 3000);
    } catch (err: any) {
      alert("Error resending email: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl text-red-600 font-bold mb-4 text-center">
          Your confirmation link has expired
        </h2>
        <p className="text-gray-600 text-center mb-4">
          No problem. Click the button below to resend.
        </p>
        <label htmlFor="expired-email" className="sr-only">
          Email address
        </label>
        <input
          id="expired-email"
          type="email"
          className="w-full p-2 mb-4 border border-gray-300 rounded bg-gray-100 cursor-not-allowed"
          value={email}
          disabled
          placeholder="Email address"
          title="Email address"
        />
        <button
          onClick={handleResend}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? "Sending..." : "Resend Confirmation Email"}
        </button>
      </div>
    </div>
  );
};

// export default LinkExpired;
