
// export default EmailVerifyRedirect;
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import DialogBox from "./DialogBox";

const EmailVerifyRedirect = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const confirmLogin = async () => {
      try {
        // Supabase should already have a session from access_token in URL
        const {
          data: { session },
          error
        } = await supabase.auth.getSession();

        if (error || !session) {
          console.error("❌ No active session from link:", error);
          setToast({ type: "error", message: "Verification failed. Please try again." });
          setTimeout(() => navigate("/link-expired"), 3000);
          return;
        }

        const email = session.user.email;
        console.log("✅ Verified user session:", email);

        setToast({ type: "success", message: "Email verified!" });

        // Optional: Save email if needed
        sessionStorage.setItem("signup_email", email);

        setTimeout(() => {
          navigate(`/EmailConfirmed?email=${encodeURIComponent(email)}`);
        }, 1500);
      } catch (err) {
        console.error("Unexpected error:", err);
        setToast({ type: "error", message: "Unexpected error during verification." });
        setTimeout(() => navigate("/link-expired"), 3000);
      }
    };

    confirmLogin();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-blue-600 text-lg font-medium">Verifying your email...</div>
      {toast && (
        <DialogBox
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default EmailVerifyRedirect;
