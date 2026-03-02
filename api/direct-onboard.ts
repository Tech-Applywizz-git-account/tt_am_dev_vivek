import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_ONBOARDED_BY_ID = process.env.VITE_DEFAULT_ONBOARDED_BY_ID;
const DEFAULT_SUBMITTED_BY_ID = 'd92f960d-b244-45e8-a13d-d0ad08828c89';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '';
const EXTERNAL_API_URL = process.env.VITE_EXTERNAL_API_URL;
const KARMAFY_USERNAME = process.env.VITE_KARMAFY_USERNAME;
const KARMAFY_PASSWORD = process.env.VITE_KARMAFY_PASSWORD;

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

if (!DEFAULT_ONBOARDED_BY_ID) {
    throw new Error('Missing VITE_DEFAULT_ONBOARDED_BY_ID environment variable');
}

if (!EXTERNAL_API_URL) {
    throw new Error('Missing VITE_EXTERNAL_API_URL2 environment variable');
}

if (!KARMAFY_USERNAME || !KARMAFY_PASSWORD) {
    throw new Error('Missing VITE_KARMAFY_USERNAME or VITE_KARMAFY_PASSWORD environment variable');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
});

// Helper function to safely construct S3 URL
function getS3Url(s3Path: string | null | undefined): string | null {
    if (!s3Path) return null;

    const S3_BASE_URL = 'https://applywizz-prod.s3.us-east-2.amazonaws.com/';

    // Check if the path already contains the S3 base URL
    if (s3Path.includes(S3_BASE_URL)) {
        return s3Path;
    }

    // Otherwise, append the base URL
    return `${S3_BASE_URL}${s3Path}`;
}

// Validation Constants
const ALLOWED_GENDERS = ["Male", "Female", "Other", "Prefer Not to Say"];
const ALLOWED_WORK_AUTH = ["F1", "OPT", "H1B", "Green Card", "Citizen", "H4EAD", "Other"];
const ALLOWED_WORK_PREF = ["Remote", "Hybrid", "On-site", "All"];

// Define the structure of the incoming client data
interface DirectOnboardData {
    // Required fields
    full_name: string;
    email: string;
    phone: string;
    experience: string;
    applywizz_id: string;
    gender: string;
    state_of_residence: string;
    zip_or_country: string;
    resume_s3_path: string;
    start_date: string;
    job_role_preferences: string[];
    visa_type: string;
    location_preferences: string[];

    // Optional fields
    submission_type?: 'direct' | 'pending';
    personal_email?: string;
    work_preferences?: string;
    salary_range?: string;
    work_auth_details?: string;
    sponsorship?: boolean;
    github_url?: string;
    linked_in_url?: string;
    end_date?: string;
    willing_to_relocate?: boolean;
    alternate_job_roles?: string[];
    no_of_applications?: string;
    highest_education?: string;
    university_name?: string;
    cumulative_gpa?: string;
    main_subject?: string;
    graduation_year?: string;
    badge_value?: number;
    is_over_18?: boolean;
    eligible_to_work_in_us?: boolean;
    authorized_without_visa?: boolean;
    require_future_sponsorship?: boolean;
    can_perform_essential_functions?: boolean;
    worked_for_company_before?: boolean;
    discharged_for_policy_violation?: boolean;
    referred_by_agency?: boolean;
    desired_start_date?: string;
    can_work_3_days_in_office?: boolean;
    role?: string;
    convicted_of_felony?: boolean;
    felony_explanation?: string;
    pending_investigation?: boolean;
    willing_background_check?: boolean;
    willing_drug_screen?: boolean;
    failed_or_refused_drug_test?: boolean;
    uses_substances_affecting_duties?: boolean;
    substances_description?: string;
    can_provide_legal_docs?: boolean;
    is_hispanic_latino?: string;
    race_ethnicity?: string;
    veteran_status?: string;
    disability_status?: string;
    has_relatives_in_company?: boolean;
    relatives_details?: string;
    client_form_fill_date?: string;
    cover_letter_path?: string;
    full_address?: string;
    date_of_birth?: string;
    primary_phone?: string;
    is_new_domain?: boolean;
    add_ons_info?: string[];
    exclude_companies?: string | string[];
    [key: string]: any;
}

// Validate origin
function validateOrigin(req: VercelRequest): boolean {
    const origin = req.headers.origin || req.headers.referer || '';

    // If no origins configured, allow all (development mode)
    if (!ALLOWED_ORIGINS) {
        return true;
    }

    const allowedOriginsList = ALLOWED_ORIGINS.split(',').map(o => o.trim());

    // Check if the request origin matches any allowed origin
    return allowedOriginsList.some(allowedOrigin =>
        origin.includes(allowedOrigin) || allowedOrigin === '*'
    );
}

// Validate the client data
function validateClientData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    const requiredFields = [
        'full_name', 'email', 'phone', 'experience', 'applywizz_id',
        'gender', 'state_of_residence', 'zip_or_country', 'resume_s3_path',
        'start_date', 'job_role_preferences', 'visa_type', 'location_preferences'
    ];

    for (const field of requiredFields) {
        if (!data[field]) {
            errors.push(`Missing required field: ${field}`);
        }
    }

    // Validate email format
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Invalid email format');
    }

    // Validate gender
    if (data.gender && !ALLOWED_GENDERS.includes(data.gender)) {
        errors.push(`Invalid gender '${data.gender}'. Allowed: ${ALLOWED_GENDERS.join(', ')}`);
    }

    // Validate visa_type (work_auth)
    if (data.visa_type && !ALLOWED_WORK_AUTH.includes(data.visa_type)) {
        errors.push(`Invalid work authorization '${data.visa_type}'. Allowed: ${ALLOWED_WORK_AUTH.join(', ')}`);
    }

    // Validate work_preferences (if provided)
    if (data.work_preferences && !ALLOWED_WORK_PREF.includes(data.work_preferences)) {
        errors.push(`Invalid work preference '${data.work_preferences}'. Allowed: ${ALLOWED_WORK_PREF.join(', ')}`);
    }

    // Validate arrays
    if (data.job_role_preferences && !Array.isArray(data.job_role_preferences)) {
        errors.push('job_role_preferences must be an array');
    }

    if (data.location_preferences && !Array.isArray(data.location_preferences)) {
        errors.push('location_preferences must be an array');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Sync with Django Project
async function syncToDjangoProject(data: any) {
    const DJANGO_API_URL = `${EXTERNAL_API_URL}/api/client-create`;

    const response = await fetch(DJANGO_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result.error || `Django API failed with status ${response.status}`);
    }

    return result;
}

// Extract Lead Data from Karmafy
async function extractLeadData(leadId: number) {
    const EXTRACT_API_URL = `${EXTERNAL_API_URL}/api/v1/leads/${leadId}/extract-data/`;

    // Create Basic Auth header
    const authString = `${KARMAFY_USERNAME}:${KARMAFY_PASSWORD}`;
    const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;

    const response = await fetch(EXTRACT_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
        },
        body: JSON.stringify({}) // Empty body as required by POST
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result.error || `Lead extraction failed with status ${response.status}`);
    }

    return result;
}

// Helper to get Microsoft Graph Access Token
async function getMicrosoftAccessToken() {
    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
        throw new Error('Missing Microsoft Graph environment variables');
    }

    const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type', 'client_credentials');

    const res = await fetch(url, { method: 'POST', body: params });
    const data: any = await res.json();

    if (!res.ok) {
        throw new Error(`Failed to get Microsoft access token: ${JSON.stringify(data)}`);
    }

    return data.access_token;
}

// Helper to send notification email to Vivek
async function sendNotificationToVivek(clientName: string, email: string, phone: string, targetRole: string) {
    console.log(`Starting email notification for ${clientName}...`);
    try {
        if (!SENDER_EMAIL || !TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
            console.error('❌ Email notification skipped: Missing one or more environment variables (SENDER_EMAIL, TENANT_ID, CLIENT_ID, CLIENT_SECRET)');
            return;
        }

        const token = await getMicrosoftAccessToken();
        console.log('✅ Microsoft token acquired');

        const subject = `Pending Onboarding: ${clientName}`;
        const htmlBody = `
            <h3>New Pending Onboarding Request</h3>
            <p>A new domain client has come to pending onboarding.</p>
            <p><strong>Client Name:</strong> ${clientName}</p>
            <p><strong>Client Email:</strong> ${email}</p>
            <p><strong>Client Phone:</strong> ${phone}</p>
            <p><strong>Target Role:</strong> <code style="background: #f4f4f4; padding: 2px 5px; border-radius: 3px;">${targetRole}</code></p>
            <p><strong>Action Required:</strong></p>
            <ol style="margin-left: 20px; line-height: 1.6;">
                <li>Please add this new job role to the task management system.</li>
                <li>Once the role is created, kindly proceed to the <strong>Customer Dashboard</strong> and navigate to the <strong>Pending Onboarding</strong> section.</li>
                <li>Locate the client in the list and click the <strong>"Onboard Directly"</strong> button to send the onboarding credentials to the client.</li>
            </ol>
            <p style="color: #666; font-style: italic; margin-top: 15px;"><strong>Note:</strong> We kindly request that you ensure the domain is recorded exactly as provided, maintaining the original character casing.</p>
            <br/>
            <p><i>Automated Notification from ApplyWizz Onboarding System</i></p>
        `;

        const payload = {
            message: {
                subject,
                body: { contentType: 'HTML', content: htmlBody },
                toRecipients: [{ emailAddress: { address: VIVEK_EMAIL } }],
                ccRecipients: CC_EMAILS.map(email => ({ emailAddress: { address: email } })),
            },
        };

        const res = await fetch(`https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const text = await res.text();
            console.error('Failed to send notification email to Vivek:', text);
        } else {
            console.log('✅ Notification email sent to Vivek for', clientName);
        }
    } catch (error) {
        console.error('Error in sendNotificationToVivek:', error);
    }
}

// Handle Pending Client Submission
async function handlePendingClientSubmission(
    clientData: DirectOnboardData,
    res: VercelResponse,
    defaults: { workPreferences: string, addOnsInfo: string[], excludeCompanies: string[], resumeUrl: string }
) {
    try {
        // Normalize email
        const normalizedEmail = clientData.email.trim().toLowerCase();
        const normalizedPersonalEmail = clientData.personal_email
            ? clientData.personal_email.trim().toLowerCase()
            : normalizedEmail;

        // Check for duplicate emails in pending_clients table
        const { data: existingClients, error: checkError } = await supabaseAdmin
            .from('pending_clients')
            .select('id, company_email, personal_email')
            .or(`company_email.eq.${normalizedEmail},personal_email.eq.${normalizedPersonalEmail}`);

        if (checkError) {
            console.error('Error checking for duplicate emails:', checkError);
            return res.status(500).json({
                error: 'Failed to check for duplicate emails',
                details: checkError.message
            });
        }

        if (existingClients && existingClients.length > 0) {
            return res.status(409).json({
                error: 'Email already exists',
                details: `A pending client with email ${normalizedEmail} already exists`
            });
        }

        // Generate a unique ID for the pending client
        const pendingClientId = crypto.randomUUID();

        // Prepare pending_clients table data
        const pendingClientData = {
            id: pendingClientId,
            full_name: clientData.full_name,
            personal_email: normalizedPersonalEmail,
            whatsapp_number: clientData.phone,
            callable_phone: clientData.phone,
            company_email: normalizedEmail,
            job_role_preferences: clientData.job_role_preferences,
            salary_range: clientData.salary_range || null,
            location_preferences: clientData.location_preferences,
            work_auth_details: clientData.work_auth_details || null,
            submitted_by: DEFAULT_SUBMITTED_BY_ID,
            visa_type: clientData.visa_type,
            applywizz_id: clientData.applywizz_id,
            sponsorship: clientData.sponsorship || false,
            badge_value: clientData.badge_value || 0,
            resume_url: getS3Url(clientData.resume_s3_path),
            resume_path: clientData.resume_s3_path,
            start_date: clientData.start_date,
            end_date: clientData.end_date || null,
            no_of_applications: clientData.no_of_applications || '20',
            is_over_18: clientData.is_over_18 ?? null,
            eligible_to_work_in_us: clientData.eligible_to_work_in_us ?? null,
            require_future_sponsorship: clientData.require_future_sponsorship ?? null,
            can_perform_essential_functions: clientData.can_perform_essential_functions ?? null,
            worked_for_company_before: clientData.worked_for_company_before ?? null,
            discharged_for_policy_violation: clientData.discharged_for_policy_violation ?? null,
            referred_by_agency: clientData.referred_by_agency ?? null,
            highest_education: clientData.highest_education || null,
            university_name: clientData.university_name || null,
            cumulative_gpa: clientData.cumulative_gpa || null,
            desired_start_date: clientData.desired_start_date || null,
            willing_to_relocate: clientData.willing_to_relocate ?? null,
            can_work_3_days_in_office: clientData.can_work_3_days_in_office ?? null,
            role: clientData.role || null,
            experience: clientData.experience || '0',
            work_preferences: defaults.workPreferences,
            alternate_job_roles: clientData.alternate_job_roles || null,
            exclude_companies: defaults.excludeCompanies,
            convicted_of_felony: clientData.convicted_of_felony ?? null,
            felony_explanation: clientData.felony_explanation || null,
            pending_investigation: clientData.pending_investigation ?? null,
            willing_background_check: clientData.willing_background_check ?? null,
            willing_drug_screen: clientData.willing_drug_screen ?? null,
            failed_or_refused_drug_test: clientData.failed_or_refused_drug_test ?? null,
            uses_substances_affecting_duties: clientData.uses_substances_affecting_duties ?? null,
            substances_description: clientData.substances_description || null,
            can_provide_legal_docs: clientData.can_provide_legal_docs ?? null,
            gender: clientData.gender,
            is_hispanic_latino: clientData.is_hispanic_latino || null,
            race_ethnicity: clientData.race_ethnicity || null,
            veteran_status: clientData.veteran_status || null,
            disability_status: clientData.disability_status || null,
            has_relatives_in_company: clientData.has_relatives_in_company ?? null,
            relatives_details: clientData.relatives_details || null,
            state_of_residence: clientData.state_of_residence,
            zip_or_country: clientData.zip_or_country,
            main_subject: clientData.main_subject || null,
            graduation_year: clientData.graduation_year || null,
            add_ons_info: defaults.addOnsInfo,
            github_url: clientData.github_url || null,
            linked_in_url: clientData.linked_in_url || null,
            client_form_fill_date: clientData.client_form_fill_date || null,
            cover_letter_path: clientData.cover_letter_path || null,
            full_address: clientData.full_address || null,
            date_of_birth: clientData.date_of_birth || null,
            primary_phone: clientData.primary_phone || clientData.phone,
            is_new_domain: clientData.is_new_domain ?? true,
            created_at: new Date().toISOString(),
        };

        // Insert into pending_clients table
        const { error: insertError } = await supabaseAdmin
            .from('pending_clients')
            .insert(pendingClientData);

        if (insertError) {
            console.error('Supabase pending_clients insert error:', insertError);

            // Check if it's a duplicate key error
            if (insertError.message.includes('duplicate key') || insertError.code === '23505') {
                return res.status(409).json({
                    error: 'Email already exists',
                    details: `A pending client with email ${normalizedEmail} already exists`
                });
            }

            return res.status(500).json({
                error: 'Failed to create pending client',
                details: insertError.message
            });
        }

        // Send notification email to Vivek (Awaited to ensure completion in Serverless)
        try {
            const targetRole = Array.isArray(clientData.job_role_preferences)
                ? clientData.job_role_preferences[0] || 'Not specified'
                : 'Not specified';
            await sendNotificationToVivek(clientData.full_name, normalizedEmail, clientData.phone, targetRole);
        } catch (emailErr: any) {
            console.error('Email notification failed but continuing:', emailErr);
        }

        // Return success response
        return res.status(200).json({
            message: 'Pending client submitted successfully',
            applywizz_id: clientData.applywizz_id,
            pending_client_id: pendingClientId,
            email: normalizedEmail,
            status: 'pending_review'
        });

    } catch (err: any) {
        console.error('Unexpected error in pending client submission:', err);
        return res.status(500).json({
            error: 'Internal server error',
            details: err.message || 'Unknown error occurred'
        });
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS for cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check if required environment variables are set
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(500).json({ error: 'Server configuration error', details: 'Missing Supabase environment variables' });
    }

    try {
        // Validate origin
        if (!validateOrigin(req)) {
            return res.status(403).json({ error: 'Forbidden', details: 'Origin not allowed' });
        }

        // Extract the client data from the request body
        let clientData: DirectOnboardData = req.body;

        // Parse body if it's a string
        if (typeof clientData === 'string') {
            try {
                clientData = JSON.parse(clientData);
            } catch (parseError) {
                return res.status(400).json({
                    error: 'Invalid JSON in request body',
                    details: 'Request body must be valid JSON'
                });
            }
        }

        // Validate request body
        if (!clientData || typeof clientData !== 'object' || Array.isArray(clientData)) {
            return res.status(400).json({
                error: 'Invalid request body format',
                details: 'Request body must be a JSON object'
            });
        }

        // Map OPT → F1 before validation and all downstream processing
        if (clientData.visa_type === "OPT") {
            console.log('ℹ️ OPT visa type received — mapping to F1 before processing');
            clientData.visa_type = "F1";
        }

        // Validate the client data
        const validation = validateClientData(clientData);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Validation failed',
                details: validation.errors
            });
        }

        // Set defaults
        const workPreferences = clientData.work_preferences || "All";
        const addOnsInfo = clientData.add_ons_info || ["job-links"];
        const excludeCompanies = Array.isArray(clientData.exclude_companies)
            ? clientData.exclude_companies
            : clientData.exclude_companies
                ? [clientData.exclude_companies]
                : ["NA"];
        const resumeUrl = getS3Url(clientData.resume_s3_path) || "";

        // Check submission type - handle pending clients separately
        if (clientData.submission_type === 'pending') {
            return await handlePendingClientSubmission(clientData, res, {
                workPreferences,
                addOnsInfo,
                excludeCompanies,
                resumeUrl
            });
        }

        // Generate a unique ID for the client
        const clientId = crypto.randomUUID();

        // Prepare clients table data
        const clientsData = {
            id: clientId,
            full_name: clientData.full_name,
            personal_email: clientData.personal_email ? clientData.personal_email.trim().toLowerCase() : clientData.email.trim().toLowerCase(),
            whatsapp_number: clientData.phone,
            callable_phone: clientData.phone,
            company_email: clientData.email.trim().toLowerCase(),
            job_role_preferences: clientData.job_role_preferences,
            salary_range: clientData.salary_range || null,
            location_preferences: clientData.location_preferences,
            work_auth_details: clientData.work_auth_details || null,
            visa_type: clientData.visa_type,
            onboarded_by: DEFAULT_ONBOARDED_BY_ID,
            sponsorship: clientData.sponsorship || false,
            applywizz_id: clientData.applywizz_id,
            badge_value: clientData.badge_value || 0,
            created_at: new Date().toISOString(),
            update_at: new Date().toISOString(),
            opted_job_links: true,
            status: clientData.is_new_domain ? 'new_role' : 'active',
        };

        // Insert into clients table
        const { error: insertError } = await supabaseAdmin.from('clients').insert(clientsData);

        if (insertError) {
            console.error('Supabase clients insert error:', insertError);
            return res.status(500).json({
                error: 'Failed to create client',
                details: insertError.message
            });
        }

        // Prepare additional information data
        const additionalInfoData = {
            id: clientId,
            applywizz_id: clientData.applywizz_id,
            resume_url: clientData.resume_s3_path,
            resume_path: clientData.resume_s3_path,
            start_date: clientData.start_date,
            end_date: clientData.end_date || null,
            no_of_applications: clientData.no_of_applications || null,
            is_over_18: clientData.is_over_18 ?? null,
            eligible_to_work_in_us: clientData.eligible_to_work_in_us ?? null,
            authorized_without_visa: clientData.authorized_without_visa ?? null,
            require_future_sponsorship: clientData.require_future_sponsorship ?? null,
            can_perform_essential_functions: clientData.can_perform_essential_functions ?? null,
            worked_for_company_before: clientData.worked_for_company_before ?? null,
            discharged_for_policy_violation: clientData.discharged_for_policy_violation ?? null,
            referred_by_agency: clientData.referred_by_agency ?? null,
            highest_education: clientData.highest_education || null,
            university_name: clientData.university_name || null,
            cumulative_gpa: clientData.cumulative_gpa || null,
            desired_start_date: clientData.desired_start_date || null,
            willing_to_relocate: clientData.willing_to_relocate ?? null,
            can_work_3_days_in_office: clientData.can_work_3_days_in_office ?? null,
            role: clientData.role || null,
            experience: clientData.experience,
            work_preferences: workPreferences,
            alternate_job_roles: clientData.alternate_job_roles || null,
            exclude_companies: excludeCompanies,
            convicted_of_felony: clientData.convicted_of_felony ?? null,
            felony_explanation: clientData.felony_explanation || null,
            pending_investigation: clientData.pending_investigation ?? null,
            willing_background_check: clientData.willing_background_check ?? null,
            willing_drug_screen: clientData.willing_drug_screen ?? null,
            failed_or_refused_drug_test: clientData.failed_or_refused_drug_test ?? null,
            uses_substances_affecting_duties: clientData.uses_substances_affecting_duties ?? null,
            substances_description: clientData.substances_description || null,
            can_provide_legal_docs: clientData.can_provide_legal_docs ?? null,
            gender: clientData.gender,
            is_hispanic_latino: clientData.is_hispanic_latino ?? null,
            race_ethnicity: clientData.race_ethnicity || null,
            veteran_status: clientData.veteran_status || null,
            disability_status: clientData.disability_status || null,
            has_relatives_in_company: clientData.has_relatives_in_company ?? null,
            relatives_details: clientData.relatives_details || null,
            state_of_residence: clientData.state_of_residence,
            zip_or_country: clientData.zip_or_country,
            main_subject: clientData.main_subject || null,
            graduation_year: clientData.graduation_year || null,
            add_ons_info: addOnsInfo,
            github_url: clientData.github_url || null,
            linked_in_url: clientData.linked_in_url || null,
            client_form_fill_date: clientData.client_form_fill_date || null,
            cover_letter_path: clientData.cover_letter_path || null,
            full_address: clientData.full_address || null,
            date_of_birth: clientData.date_of_birth || null,
            primary_phone: clientData.primary_phone || clientData.phone,
        };

        // Insert into clients_additional_information table
        const { error: additionalInfoError } = await supabaseAdmin
            .from('clients_additional_information')
            .insert(additionalInfoData);

        if (additionalInfoError) {
            console.error('Supabase additional_information insert error:', additionalInfoError);
            // Rollback: Delete the client record
            await supabaseAdmin.from('clients').delete().eq('id', clientId);
            return res.status(500).json({
                error: 'Failed to insert additional client information',
                details: additionalInfoError.message
            });
        }

        // 3. Create Supabase auth user
        console.log('Creating auth account for regular client:', clientData.applywizz_id);
        const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: clientData.email.trim().toLowerCase(),
            password: "Applywizz@2026",
            email_confirm: true,
        });

        if (authError) {
            console.error('Supabase auth user creation error:', authError);
            // Rollback: Delete client and additional info
            await supabaseAdmin.from('clients_additional_information').delete().eq('id', clientId);
            await supabaseAdmin.from('clients').delete().eq('id', clientId);

            if (authError.message.includes('already been registered')) {
                return res.status(409).json({
                    error: 'User already exists',
                    details: `User with email ${clientData.email} is already registered`
                });
            }

            return res.status(500).json({
                error: 'Failed to create auth user',
                details: authError.message
            });
        }

        const finalUserId = userData.user.id;

        // 4. Insert into users table
        const { error: userInsertError } = await supabaseAdmin.from('users').insert({
            id: finalUserId,
            name: clientData.full_name,
            email: clientData.email.trim().toLowerCase(),
            role: 'client',
            department: 'Client Services',
            is_active: true,
        });

        if (userInsertError) {
            console.error('Supabase users insert error:', userInsertError);
            // Rollback: Delete auth user, client, and additional info
            await supabaseAdmin.auth.admin.deleteUser(finalUserId);
            await supabaseAdmin.from('clients_additional_information').delete().eq('id', clientId);
            await supabaseAdmin.from('clients').delete().eq('id', clientId);
            return res.status(500).json({
                error: 'Failed to insert into users table',
                details: userInsertError.message
            });
        }

        // Prepare Django payload
        const djangoPayload = {
            email: clientData.email.trim().toLowerCase(),
            name: clientData.full_name.trim(),
            years_experience: clientData.experience ? parseInt(String(clientData.experience)) : 0,
            location: clientData.state_of_residence,
            country: clientData.zip_or_country || "",
            services_opted: addOnsInfo,
            start_date: clientData.start_date,
            willing_to_relocate: Boolean(clientData.willing_to_relocate),
            work_auth: clientData.visa_type || "",
            work_preference: (() => {
                const pref = clientData.work_preferences;
                if (pref === "All") {
                    return "All";
                }
                return "Remote";
            })(),
            sponsorship: clientData.sponsorship ? "yes" : "No",
            gender: clientData.gender || "",
            exclude_companies: excludeCompanies,
            resume_s3_path: clientData.resume_s3_path,
            resume_url: resumeUrl,
            expected_salary: clientData.salary_range || "",
            number_of_applications: clientData.no_of_applications ? `${clientData.no_of_applications}+` : "0",
            github_url: clientData.github_url || "",
            linkedin_url: clientData.linked_in_url || "",
            status: "Active",
            apw_id: clientData.applywizz_id,
            target_role: Array.isArray(clientData.job_role_preferences) ? clientData.job_role_preferences[0] || "" : clientData.job_role_preferences || "",
            plan: "Standard",
        };

        // Sync to Django (REQUIRED - will rollback all changes if this fails)
        let karmafyUserId = null;
        let karmafyLeadId = null;

        try {
            const djangoResponse = await syncToDjangoProject(djangoPayload);

            // Extract user_id and lead_id from Django response
            if (djangoResponse && djangoResponse.user_id) {
                karmafyUserId = djangoResponse.user_id;
            }
            if (djangoResponse && djangoResponse.lead_id) {
                karmafyLeadId = djangoResponse.lead_id;
            }

            console.log('✅ Django sync successful for', clientData.applywizz_id, {
                karmafy_user_id: karmafyUserId,
                karmafy_lead_id: karmafyLeadId
            });

            // Extract lead data (optional - don't fail if this doesn't work)
            if (karmafyLeadId) {
                try {
                    await extractLeadData(karmafyLeadId);
                    console.log('✅ Lead data extraction successful for lead ID:', karmafyLeadId);

                    // Trigger Lambda endpoint (fire-and-forget)
                    try {
                        await fetch('https://3kmoesctlmtd74fipiogiyc4f40ntetq.lambda-url.us-east-1.on.aws');
                        console.log('Lambda endpoint triggered');
                    } catch (lambdaError: any) {
                        console.error('Lambda endpoint error:', lambdaError);
                        // Continue execution - this is fire-and-forget
                    }

                } catch (extractError: any) {
                    console.error('⚠️ Lead data extraction failed (continuing anyway):', extractError);
                    // Don't rollback - client is already created
                    // This can be retried later via a background job
                }
            }
        } catch (djangoError: any) {
            console.error('❌ Django sync error:', djangoError);
            // Rollback all changes
            if (finalUserId) {
                await supabaseAdmin.auth.admin.deleteUser(finalUserId);
                await supabaseAdmin.from('users').delete().eq('id', finalUserId);
            }
            await supabaseAdmin.from('clients_additional_information').delete().eq('id', clientId);
            await supabaseAdmin.from('clients').delete().eq('id', clientId);
            return res.status(500).json({
                error: 'Failed to sync with external database',
                details: djangoError.message || 'Unknown Django API error'
            });
        }

        // Return success response
        return res.status(200).json({
            message: 'Client onboarded successfully',
            applywizz_id: clientData.applywizz_id,
            client_id: clientId,
            user_id: finalUserId,
            ...(karmafyUserId && { karmafy_user_id: karmafyUserId }),
            ...(karmafyLeadId && { karmafy_lead_id: karmafyLeadId })
        });

    } catch (err: any) {
        console.error('Unexpected error:', err);
        return res.status(500).json({
            error: 'Internal server error',
            details: err.message || 'Unknown error occurred'
        });
    }
}
