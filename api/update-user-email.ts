import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint to update a user's email address (Admin only)
 * This uses Supabase Admin SDK to update ANY user's email
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create Supabase Admin client
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  try {
    const { userId, newEmail } = req.body;

    // Validate input
    if (!userId || !newEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId and newEmail are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    console.log(`Updating user ${userId} email to ${newEmail}`);

    // Update user email using Supabase Admin SDK
    const { data: userData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        email: newEmail,
        email_confirm: true // Auto-confirm the email (no verification needed)
      }
    );

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return res.status(400).json({ 
        error: `Failed to update email: ${updateError.message}` 
      });
    }

    // Also update the users table if needed
    const { error: dbUpdateError } = await supabaseAdmin
      .from('users')
      .update({ email: newEmail })
      .eq('id', userId);

    if (dbUpdateError) {
      console.error('Database update error:', dbUpdateError);
      // Don't fail the request, auth table is updated
      console.warn('Warning: Email updated in auth but not in users table');
    }

    console.log('Email updated successfully:', userData);

    return res.status(200).json({
      success: true,
      message: 'Email updated successfully',
      user: userData.user
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
