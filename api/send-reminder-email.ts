import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Email Configuration (Microsoft Graph API)
const TENANT_ID = process.env.TENANT_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const SENDER_EMAIL = process.env.SENDER_EMAIL;
const VIVEK_EMAIL = 'kalyan@applywizz.com';
const CC_EMAILS = ['shyam@applywizz.com', 'ramakrishna@applywizz.com', 'abhilash@applywizz.com', 'nikhil@applywizz.com', 'vivek@applywizz.com', 'bhanuteja@applywizz.com'];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getMicrosoftAccessToken(): Promise<string> {
    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) throw new Error('Missing Microsoft Graph env vars');
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type', 'client_credentials');
    const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, { method: 'POST', body: params });
    const data: any = await res.json();
    if (!res.ok) throw new Error(`Failed to get Microsoft token: ${JSON.stringify(data)}`);
    return data.access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { pending_client_id, email } = req.body;

    if (!pending_client_id || !email) {
        return res.status(400).json({ error: 'Missing pending_client_id or email' });
    }

    try {
        // 1. Fetch pending client details
        const { data: client, error: fetchErr } = await supabaseAdmin
            .from('pending_clients')
            .select('full_name, company_email, personal_email, whatsapp_number, job_role_preferences, client_form_fill_date')
            .eq('id', pending_client_id)
            .single();

        if (fetchErr || !client) {
            return res.status(404).json({ error: 'Pending client not found' });
        }

        // 2. Server-side 24h check (Safety)
        const fillDate = new Date(client.client_form_fill_date);
        const twentyFourHours = 24 * 60 * 60 * 1000;
        const now = new Date();
        if (now.getTime() - fillDate.getTime() < twentyFourHours) {
            return res.status(403).json({ error: 'Reminder can only be sent after 24 hours' });
        }

        // 3. Send Notification Email
        const token = await getMicrosoftAccessToken();
        const targetRole = Array.isArray(client.job_role_preferences) ? client.job_role_preferences[0] || 'Not specified' : 'Not specified';
        const subject = `REMINDER: Pending Onboarding: ${client.full_name}`;
        const htmlBody = `
            <h3>Reminder: New Pending Onboarding Request</h3>
            <p>This is a reminder for a pending registration that has been waiting for more than 24 hours.</p>
            <p><strong>Client Name:</strong> ${client.full_name}</p>
            <p><strong>Client Email:</strong> ${client.company_email || client.personal_email}</p>
            <p><strong>Client Phone:</strong> ${client.whatsapp_number}</p>
            <p><strong>Target Role:</strong> <code style="background:#f4f4f4;padding:2px 5px;border-radius:3px">${targetRole}</code></p>
            <p><strong>Action Required:</strong></p>
            <ol style="margin-left:20px;line-height:1.6">
                <li>Please add this new job role to the task management system.</li>
                <li>Once the role is created, go to the <strong>Customer Dashboard</strong> → <strong>Pending Onboarding</strong>.</li>
                <li>Locate the client and click <strong>"Onboard Directly"</strong>.</li>
            </ol>
            <br/><p><i>Automated Reminder from ApplyWizz Onboarding System</i></p>
        `;

        await fetch(`https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: {
                    subject,
                    body: { contentType: 'HTML', content: htmlBody },
                    toRecipients: [{ emailAddress: { address: VIVEK_EMAIL } }],
                    ccRecipients: CC_EMAILS.map(e => ({ emailAddress: { address: e } })),
                },
            }),
        });

        return res.status(200).json({ message: 'Reminder sent successfully' });

    } catch (err: any) {
        console.error('Error in send-reminder-email:', err);
        return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
}