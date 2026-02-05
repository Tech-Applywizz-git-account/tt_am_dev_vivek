

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { v4 } from "https://esm.sh/uuid@9.0.1";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
const TENANT_ID = Deno.env.get("TENANT_ID");
const CLIENT_ID = Deno.env.get("CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("CLIENT_SECRET");
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL");

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Response helper
const createResponse = (body: any, status: number = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
};

// Fetch Graph Token
async function getGraphToken() {
  try {
    const body = new URLSearchParams({
      client_id: CLIENT_ID!,
      scope: "https://graph.microsoft.com/.default",
      client_secret: CLIENT_SECRET!,
      grant_type: "client_credentials",
    });

    const res = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        body,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to get Graph token: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error getting Graph token:', error);
    throw error;
  }
}


// Send email using Microsoft Graph - WORKING VERSION
async function sendGraphEmail(to: string, link: string) {
  try {
    const tokenData = await getGraphToken();

    if (!tokenData.access_token) {
      throw new Error('No access token received from Microsoft Graph');
    }

    console.log('🔗 Sending email with link:', link);

    const emailResponse = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(SENDER_EMAIL!)}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject: "Reset Your Password",
            body: {
              contentType: "HTML",
              content: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Password Reset</title>
      </head>

      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Password Reset</h2>
        <p>You requested to reset your password.</p>

        <p style="text-align: center; margin: 30px 0;">
          <a href="${link}"
            style="
              display: inline-block;
              background-color: #007bff;
              color: white;
              padding: 14px 28px;
              border-radius: 6px;
              text-decoration: none;
              font-size: 16px;
            ">
            Reset Password
          </a>
        </p>

        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all;">${link}</p>

        <p>This link will expire in 1 hour.</p>
      </body>
    </html>
  `,

            },
            toRecipients: [{ emailAddress: { address: to } }],
          },
        }),
      }
    );

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Failed to send email: ${emailResponse.status}`);
    }

    console.log(`✅ Password reset email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}




// ---------- MAIN ----------
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return createResponse({ message: "CORS preflight" });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return createResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Parse request body
    const body = await req.json();

    // Check if this is a password reset request or password update
    if (body.action === "reset-password") {
      // 🔄 HANDLE PASSWORD RESET (from EmailConfirmed page)
      const { token, newPassword } = body;

      if (!token || !newPassword) {
        return createResponse({ error: "Token and new password are required" }, 400);
      }

      if (newPassword.length < 6) {
        return createResponse({ error: "Password must be at least 6 characters" }, 400);
      }

      console.log(`Processing password reset for token: ${token}`);

      // 1. Verify the token exists and is not expired
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from("password_reset_tokens")
        .select("user_id, expires_at")
        .eq("token", token)
        .single();

      if (tokenError || !tokenData) {
        console.error("Token not found:", tokenError);
        return createResponse({ error: "Invalid or expired token" }, 400);
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);

      if (now > expiresAt) {
        // Delete expired token
        await supabaseAdmin
          .from("password_reset_tokens")
          .delete()
          .eq("token", token);

        return createResponse({ error: "Token has expired" }, 400);
      }

      // 2. Update the user's password using Supabase Admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        tokenData.user_id,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Error updating password:", updateError);
        return createResponse({ error: "Failed to update password" }, 500);
      }

      // 3. Delete the used token
      await supabaseAdmin
        .from("password_reset_tokens")
        .delete()
        .eq("token", token);

      console.log(`Password successfully reset for user: ${tokenData.user_id}`);

      return createResponse({
        message: "Password reset successfully"
      });

    } else {
      // 📧 HANDLE PASSWORD RESET REQUEST (original logic)
      const { email } = body;

      if (!email) {
        return createResponse({ error: "Email is required" }, 400);
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return createResponse({ error: "Invalid email format" }, 400);
      }

      console.log(`Processing password reset request for: ${email}`);

      // Find user by email
      const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();

      if (userError) {
        console.error("Error fetching users:", userError);
        // Return error for database issues
        return createResponse({
          error: "Unable to process request. Please try again later."
        }, 500);
      }

      const user = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

      // User not found - this shouldn't happen if client-side validation works
      if (!user) {
        console.log(`No user found with email: ${email}`);
        return createResponse({
          error: "User not found. Please check your email address."
        }, 404);
      }

      console.log(`User found: ${user.id}`);

      // Generate reset token
      const token = v4();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      // Store token in database
      const { error: dbError } = await supabaseAdmin
        .from("password_reset_tokens")
        .insert({
          user_id: user.id,
          token: token,
          expires_at: expiresAt,
        });

      if (dbError) {
        console.error("Error storing token:", dbError);
        // Continue anyway - we can still send the email
      } else {
        console.log("Token stored successfully");
      }

      const baseUrl = FRONTEND_URL.replace(/\/+$/, '');
      const resetLink = `${baseUrl}/EmailConfirmed?token=${encodeURIComponent(token)}`;


      console.log(`Reset link created: ${resetLink}`);

      // Send email if Microsoft Graph credentials are configured
      if (TENANT_ID && CLIENT_ID && CLIENT_SECRET && SENDER_EMAIL) {
        await sendGraphEmail(email, resetLink);
        console.log(`Password reset email sent to ${email}`);
      } else {
        console.log(`Microsoft Graph not configured. Reset link: ${resetLink}`);
        // In development, you might want to log the link instead of sending email
      }

      return createResponse({
        message: "Password reset link has been sent to your email. Please check your inbox and spam folder."
      });
    }

  } catch (error) {
    console.error("Edge function error:", error);

    // Return appropriate error based on the action
    if (body.action === "reset-password") {
      return createResponse({
        error: "An internal server error occurred while resetting password"
      }, 500);
    } else {
      return createResponse({
        error: "An error occurred while processing your request. Please try again."
      }, 500);
    }
  }
});