// supabase/functions/reset-password/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const token = body?.token;
  const newPassword = body?.newPassword;

  if (!token || !newPassword) {
    return new Response(
      JSON.stringify({ error: "token and newPassword are required" }),
      { status: 400 }
    );
  }

  // 1. Look up token
  const { data: row, error: tokenErr } = await supabaseAdmin
    .from("password_reset_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (tokenErr || !row) {
    return new Response(
      JSON.stringify({ error: "Invalid token" }),
      { status: 400 }
    );
  }

  // 2. Check expiry
  if (new Date(row.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: "Token expired" }),
      { status: 400 }
    );
  }

  // 3. Check if already used
  if (row.used) {
    return new Response(
      JSON.stringify({ error: "Token already used" }),
      { status: 400 }
    );
  }

  // 4. Update password in Supabase Auth
  const { error: updateErr } =
    await supabaseAdmin.auth.admin.updateUserById(row.user_id, {
      password: newPassword,
    });

  if (updateErr) {
    return new Response(
      JSON.stringify({ error: "Password update failed" }),
      { status: 500 }
    );
  }

  // 5. Mark the token as used
  await supabaseAdmin
    .from("password_reset_tokens")
    .update({ used: true })
    .eq("id", row.id);

  return new Response(
    JSON.stringify({ message: "Password updated successfully" }),
    { status: 200 }
  );
});
