import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_ONBOARDED_BY_ID = process.env.VITE_DEFAULT_ONBOARDED_BY_ID;
const DEFAULT_SUBMITTED_BY_ID = 'd92f960d-b244-45e8-a13d-d0ad08828c89';
const EXTERNAL_API_URL = process.env.VITE_EXTERNAL_API_URL_DEV;
const KARMAFY_USERNAME = process.env.VITE_KARMAFY_USERNAME_DEV;
const KARMAFY_PASSWORD = process.env.VITE_KARMAFY_PASSWORD_DEV;

// Email Configuration (Microsoft Graph API)
const TENANT_ID = process.env.TENANT_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const SENDER_EMAIL = process.env.SENDER_EMAIL;
const VIVEK_EMAIL = 'vivek@applywizz.com';
const CC_EMAILS = ['nikhil@applywizz.com', 'bhanuteja@applywizz.com'];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
}

if (!DEFAULT_ONBOARDED_BY_ID) {
    throw new Error('Missing VITE_DEFAULT_ONBOARDED_BY_ID environment variable');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getS3Url(s3Path: string | null | undefined): string | null {
    if (!s3Path) return null;
    const S3_BASE_URL = 'https://applywizz-dev.s3.us-east-2.amazonaws.com/';
    return s3Path.includes(S3_BASE_URL) ? s3Path : `${S3_BASE_URL}${s3Path}`;
}

const ALLOWED_GENDERS = ['Male', 'Female', 'Other', 'Prefer Not to Say'];
const ALLOWED_WORK_AUTH = ['F1', 'H1B', 'Green Card', 'Citizen', 'H4EAD', 'Other'];
const ALLOWED_WORK_PREF = ['Remote', 'Hybrid', 'On-site', 'All'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobBoardOnboardData {
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
    submission_type?: 'direct' | 'pending';
    personal_email?: string;
    work_preferences?: string;
    salary_range?: string;
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
    add_ons_info?: string[];
    exclude_companies?: string | string[];
    work_auth_details?: string;
    [key: string]: any;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateClientData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const required = [
        'full_name', 'email', 'phone', 'experience', 'applywizz_id',
        'gender', 'state_of_residence', 'zip_or_country', 'resume_s3_path',
        'start_date', 'job_role_preferences', 'visa_type', 'location_preferences',
    ];
    for (const field of required) {
        if (!data[field]) errors.push(`Missing required field: ${field}`);
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Invalid email format');
    if (data.gender && !ALLOWED_GENDERS.includes(data.gender)) errors.push(`Invalid gender '${data.gender}'`);
    if (data.visa_type && !ALLOWED_WORK_AUTH.includes(data.visa_type)) errors.push(`Invalid visa_type '${data.visa_type}'`);
    if (data.work_preferences && !ALLOWED_WORK_PREF.includes(data.work_preferences)) errors.push(`Invalid work_preferences '${data.work_preferences}'`);
    if (data.job_role_preferences && !Array.isArray(data.job_role_preferences)) errors.push('job_role_preferences must be an array');
    if (data.location_preferences && !Array.isArray(data.location_preferences)) errors.push('location_preferences must be an array');
    return { isValid: errors.length === 0, errors };
}

// ─── Django Sync ──────────────────────────────────────────────────────────────

async function syncToDjangoProject(payload: any) {
    if (!EXTERNAL_API_URL) throw new Error('VITE_EXTERNAL_API_URL not configured');
    const res = await fetch(`${EXTERNAL_API_URL}/api/client-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.error || `Django API failed with status ${res.status}`);
    return result;
}

async function extractLeadData(leadId: number) {
    if (!EXTERNAL_API_URL || !KARMAFY_USERNAME || !KARMAFY_PASSWORD) return;
    const authHeader = `Basic ${Buffer.from(`${KARMAFY_USERNAME}:${KARMAFY_PASSWORD}`).toString('base64')}`;
    await fetch(`${EXTERNAL_API_URL}/api/v1/leads/${leadId}/extract-data/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({}),
    });
}

// ─── Email Helpers ────────────────────────────────────────────────────────────

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

async function sendNotificationToVivek(clientName: string, email: string, phone: string, targetRole: string) {
    try {
        if (!SENDER_EMAIL || !TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
            console.warn('⚠️ Email notification skipped: missing email env vars');
            return;
        }
        const token = await getMicrosoftAccessToken();
        const subject = `Pending Onboarding: ${clientName}`;
        const htmlBody = `
            <h3>New Pending Onboarding Request</h3>
            <p>A new domain client has come to pending onboarding.</p>
            <p><strong>Client Name:</strong> ${clientName}</p>
            <p><strong>Client Email:</strong> ${email}</p>
            <p><strong>Client Phone:</strong> ${phone}</p>
            <p><strong>Target Role:</strong> <code style="background:#f4f4f4;padding:2px 5px;border-radius:3px">${targetRole}</code></p>
            <p><strong>Action Required:</strong></p>
            <ol style="margin-left:20px;line-height:1.6">
                <li>Please add this new job role to the task management system.</li>
                <li>Once the role is created, go to the <strong>Customer Dashboard</strong> → <strong>Pending Onboarding</strong>.</li>
                <li>Locate the client and click <strong>"Onboard Directly"</strong> to send onboarding credentials.</li>
            </ol>
            <p style="color:#666;font-style:italic"><strong>Note:</strong> Record the domain exactly as provided, preserving original character casing.</p>
            <br/><p><i>Automated Notification from ApplyWizz Onboarding System</i></p>
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
        console.log(`✅ Notification email sent to Vivek for ${clientName}`);
    } catch (err) {
        console.error('Error sending notification to Vivek:', err);
    }
}

// ─── Pending Handler ──────────────────────────────────────────────────────────

async function handlePending(
    d: JobBoardOnboardData,
    res: VercelResponse,
    defaults: { workPreferences: string; addOnsInfo: string[]; excludeCompanies: string[] }
) {
    const normalizedEmail = d.email.trim().toLowerCase();
    const normalizedPersonalEmail = d.personal_email ? d.personal_email.trim().toLowerCase() : normalizedEmail;

    // Duplicate check
    const { data: existing, error: checkErr } = await supabaseAdmin
        .from('pending_clients')
        .select('id')
        .or(`company_email.eq.${normalizedEmail},personal_email.eq.${normalizedPersonalEmail}`);

    if (checkErr) return res.status(500).json({ error: 'Failed to check duplicates', details: checkErr.message });
    if (existing && existing.length > 0) {
        return res.status(409).json({ error: 'Email already exists', details: `A pending client with email ${normalizedEmail} already exists` });
    }

    const pendingClientId = crypto.randomUUID();
    const fillDate = d.client_form_fill_date || new Date().toISOString();
    const { error: insertErr } = await supabaseAdmin.from('pending_clients').insert({
        id: pendingClientId,
        full_name: d.full_name,
        personal_email: normalizedPersonalEmail,
        whatsapp_number: d.phone,
        callable_phone: d.phone,
        company_email: normalizedEmail,
        job_role_preferences: d.job_role_preferences,
        salary_range: d.salary_range || null,
        location_preferences: d.location_preferences,
        work_auth_details: d.work_auth_details || null,
        submitted_by: DEFAULT_SUBMITTED_BY_ID,
        visa_type: d.visa_type,
        applywizz_id: d.applywizz_id,
        sponsorship: d.sponsorship || false,
        badge_value: d.badge_value || 0,
        resume_url: getS3Url(d.resume_s3_path),
        resume_path: d.resume_s3_path,
        start_date: d.start_date,
        end_date: d.end_date || null,
        no_of_applications: d.no_of_applications || '20',
        is_over_18: d.is_over_18 ?? null,
        eligible_to_work_in_us: d.eligible_to_work_in_us ?? null,
        require_future_sponsorship: d.require_future_sponsorship ?? null,
        can_perform_essential_functions: d.can_perform_essential_functions ?? null,
        worked_for_company_before: d.worked_for_company_before ?? null,
        discharged_for_policy_violation: d.discharged_for_policy_violation ?? null,
        referred_by_agency: d.referred_by_agency ?? null,
        highest_education: d.highest_education || null,
        university_name: d.university_name || null,
        cumulative_gpa: d.cumulative_gpa || null,
        desired_start_date: d.desired_start_date || null,
        willing_to_relocate: d.willing_to_relocate ?? null,
        can_work_3_days_in_office: d.can_work_3_days_in_office ?? null,
        role: d.role || null,
        experience: d.experience || '0',
        work_preferences: defaults.workPreferences,
        alternate_job_roles: d.alternate_job_roles || null,
        exclude_companies: defaults.excludeCompanies,
        convicted_of_felony: d.convicted_of_felony ?? null,
        felony_explanation: d.felony_explanation || null,
        pending_investigation: d.pending_investigation ?? null,
        willing_background_check: d.willing_background_check ?? null,
        willing_drug_screen: d.willing_drug_screen ?? null,
        failed_or_refused_drug_test: d.failed_or_refused_drug_test ?? null,
        uses_substances_affecting_duties: d.uses_substances_affecting_duties ?? null,
        substances_description: d.substances_description || null,
        can_provide_legal_docs: d.can_provide_legal_docs ?? null,
        gender: d.gender,
        is_hispanic_latino: d.is_hispanic_latino || null,
        race_ethnicity: d.race_ethnicity || null,
        veteran_status: d.veteran_status || null,
        disability_status: d.disability_status || null,
        has_relatives_in_company: d.has_relatives_in_company ?? null,
        relatives_details: d.relatives_details || null,
        state_of_residence: d.state_of_residence,
        zip_or_country: d.zip_or_country,
        main_subject: d.main_subject || null,
        graduation_year: d.graduation_year || null,
        add_ons_info: defaults.addOnsInfo,
        github_url: d.github_url || null,
        linked_in_url: d.linked_in_url || null,
        client_form_fill_date: fillDate,
        cover_letter_path: d.cover_letter_path || null,
        full_address: d.full_address || null,
        date_of_birth: d.date_of_birth || null,
        primary_phone: d.primary_phone || d.phone,
        is_new_domain: true,
        created_at: new Date().toISOString(),
    });

    if (insertErr) {
        if (insertErr.code === '23505') {
            return res.status(409).json({ error: 'Email already exists', details: insertErr.message });
        }
        return res.status(500).json({ error: 'Failed to create pending client', details: insertErr.message });
    }

    // Notify Vivek
    const targetRole = Array.isArray(d.job_role_preferences) ? d.job_role_preferences[0] || 'Not specified' : 'Not specified';
    await sendNotificationToVivek(d.full_name, normalizedEmail, d.phone, targetRole);

    return res.status(200).json({
        message: 'Pending client submitted successfully',
        applywizz_id: d.applywizz_id,
        pending_client_id: pendingClientId,
        client_form_fill_date: fillDate,
        email: normalizedEmail,
        status: 'pending_review',
    });
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        let data: JobBoardOnboardData = req.body;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch {
                return res.status(400).json({ error: 'Invalid JSON in request body' });
            }
        }
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return res.status(400).json({ error: 'Request body must be a JSON object' });
        }

        const validation = validateClientData(data);
        if (!validation.isValid) return res.status(400).json({ error: 'Validation failed', details: validation.errors });

        // Defaults
        const workPreferences = data.work_preferences || 'All';
        const addOnsInfo = data.add_ons_info || ['job-links'];
        const excludeCompanies = Array.isArray(data.exclude_companies)
            ? data.exclude_companies
            : data.exclude_companies ? [data.exclude_companies] : ['NA'];
        const resumeUrl = getS3Url(data.resume_s3_path) || '';

        // ── PENDING path (Others/custom role) ──────────────────────────────────
        if (data.submission_type === 'pending') {
            return await handlePending(data, res, { workPreferences, addOnsInfo, excludeCompanies });
        }

        // ── DIRECT path (known role) ───────────────────────────────────────────
        const normalizedEmail = data.email.trim().toLowerCase();

        // Duplicate check
        const { data: existing } = await supabaseAdmin
            .from('clients')
            .select('id')
            .eq('company_email', normalizedEmail)
            .limit(1);
        if (existing && existing.length > 0) {
            return res.status(409).json({ error: 'Client already onboarded', details: `A client with email ${normalizedEmail} already exists` });
        }

        const clientId = crypto.randomUUID();

        // 1. Insert into clients table
        const { error: clientErr } = await supabaseAdmin.from('clients').insert({
            id: clientId,
            full_name: data.full_name,
            personal_email: data.personal_email ? data.personal_email.trim().toLowerCase() : normalizedEmail,
            whatsapp_number: data.phone,
            callable_phone: data.phone,
            company_email: normalizedEmail,
            job_role_preferences: data.job_role_preferences,
            salary_range: data.salary_range || null,
            location_preferences: data.location_preferences,
            work_auth_details: data.work_auth_details || null,
            visa_type: data.visa_type,
            onboarded_by: DEFAULT_ONBOARDED_BY_ID,
            sponsorship: data.sponsorship || false,
            applywizz_id: data.applywizz_id,
            badge_value: data.badge_value || 0,
            created_at: new Date().toISOString(),
            update_at: new Date().toISOString(),
            opted_job_links: true,
        });

        if (clientErr) {
            console.error('clients insert error:', clientErr);
            return res.status(500).json({ error: 'Failed to create client', details: clientErr.message });
        }

        // 2. Insert into clients_additional_information
        const { error: addInfoErr } = await supabaseAdmin.from('clients_additional_information').insert({
            id: clientId,
            applywizz_id: data.applywizz_id,
            resume_url: data.resume_s3_path,
            resume_path: data.resume_s3_path,
            start_date: data.start_date,
            end_date: data.end_date || null,
            no_of_applications: data.no_of_applications || null,
            is_over_18: data.is_over_18 ?? null,
            eligible_to_work_in_us: data.eligible_to_work_in_us ?? null,
            authorized_without_visa: data.authorized_without_visa ?? null,
            require_future_sponsorship: data.require_future_sponsorship ?? null,
            can_perform_essential_functions: data.can_perform_essential_functions ?? null,
            worked_for_company_before: data.worked_for_company_before ?? null,
            discharged_for_policy_violation: data.discharged_for_policy_violation ?? null,
            referred_by_agency: data.referred_by_agency ?? null,
            highest_education: data.highest_education || null,
            university_name: data.university_name || null,
            cumulative_gpa: data.cumulative_gpa || null,
            desired_start_date: data.desired_start_date || null,
            willing_to_relocate: data.willing_to_relocate ?? null,
            can_work_3_days_in_office: data.can_work_3_days_in_office ?? null,
            role: data.role || null,
            experience: data.experience,
            work_preferences: workPreferences,
            alternate_job_roles: data.alternate_job_roles || null,
            exclude_companies: excludeCompanies,
            convicted_of_felony: data.convicted_of_felony ?? null,
            felony_explanation: data.felony_explanation || null,
            pending_investigation: data.pending_investigation ?? null,
            willing_background_check: data.willing_background_check ?? null,
            willing_drug_screen: data.willing_drug_screen ?? null,
            failed_or_refused_drug_test: data.failed_or_refused_drug_test ?? null,
            uses_substances_affecting_duties: data.uses_substances_affecting_duties ?? null,
            substances_description: data.substances_description || null,
            can_provide_legal_docs: data.can_provide_legal_docs ?? null,
            gender: data.gender,
            is_hispanic_latino: data.is_hispanic_latino ?? null,
            race_ethnicity: data.race_ethnicity || null,
            veteran_status: data.veteran_status || null,
            disability_status: data.disability_status || null,
            has_relatives_in_company: data.has_relatives_in_company ?? null,
            relatives_details: data.relatives_details || null,
            state_of_residence: data.state_of_residence,
            zip_or_country: data.zip_or_country,
            main_subject: data.main_subject || null,
            graduation_year: data.graduation_year || null,
            add_ons_info: addOnsInfo,
            github_url: data.github_url || null,
            linked_in_url: data.linked_in_url || null,
            client_form_fill_date: data.client_form_fill_date || null,
            cover_letter_path: data.cover_letter_path || null,
            full_address: data.full_address || null,
            date_of_birth: data.date_of_birth || null,
            primary_phone: data.primary_phone || data.phone,
        });

        if (addInfoErr) {
            console.error('clients_additional_information insert error:', addInfoErr);
            // Rollback clients row
            await supabaseAdmin.from('clients').delete().eq('id', clientId);
            return res.status(500).json({ error: 'Failed to insert additional client information', details: addInfoErr.message });
        }

        // 3. Django / Karmafy sync (required — rollback on failure)
        const djangoPayload = {
            email: normalizedEmail,
            name: data.full_name.trim(),
            years_experience: data.experience ? parseInt(String(data.experience)) : 0,
            location: data.state_of_residence,
            country: data.zip_or_country || '',
            services_opted: addOnsInfo,
            start_date: data.start_date,
            willing_to_relocate: Boolean(data.willing_to_relocate),
            work_auth: data.visa_type || '',
            work_preference: (() => {
                if (Array.isArray(data.location_preferences) && data.location_preferences.length > 1) return 'All';
                if (Array.isArray(data.location_preferences) && data.location_preferences.length === 1) return data.location_preferences[0];
                return 'All';
            })(),
            sponsorship: data.sponsorship ? 'yes' : 'No',
            gender: data.gender || '',
            exclude_companies: excludeCompanies,
            resume_s3_path: data.resume_s3_path,
            resume_url: resumeUrl,
            expected_salary: data.salary_range || '',
            number_of_applications: data.no_of_applications ? `${data.no_of_applications}+` : '0',
            github_url: data.github_url || '',
            linkedin_url: data.linked_in_url || '',
            status: 'Active',
            apw_id: data.applywizz_id,
            target_role: Array.isArray(data.job_role_preferences) ? data.job_role_preferences[0] || '' : data.job_role_preferences || '',
            plan: 'Standard',
        };

        let karmafyUserId: number | null = null;
        let karmafyLeadId: number | null = null;

        try {
            const djangoRes = await syncToDjangoProject(djangoPayload);
            if (djangoRes?.user_id) karmafyUserId = djangoRes.user_id;
            if (djangoRes?.lead_id) karmafyLeadId = djangoRes.lead_id;
            console.log('✅ Django sync successful for', data.applywizz_id);

            if (karmafyLeadId) {
                try {
                    await extractLeadData(karmafyLeadId);
                    try {
                        await fetch('https://l2pswfvyrw4xyta62lfbgypuuu0kxsqg.lambda-url.us-east-1.on.aws');
                    } catch { /* fire-and-forget */ }
                } catch (e: any) {
                    console.warn('⚠️ Lead extraction failed (continuing):', e.message);
                }
            }
        } catch (djangoErr: any) {
            console.error('❌ Django sync error:', djangoErr);
            await supabaseAdmin.from('clients_additional_information').delete().eq('id', clientId);
            await supabaseAdmin.from('clients').delete().eq('id', clientId);
            return res.status(500).json({ error: 'Failed to sync with external database', details: djangoErr.message });
        }

        return res.status(200).json({
            message: 'Client onboarded successfully',
            applywizz_id: data.applywizz_id,
            client_id: clientId,
            ...(karmafyUserId && { karmafy_user_id: karmafyUserId }),
            ...(karmafyLeadId && { karmafy_lead_id: karmafyLeadId }),
        });

    } catch (err: any) {
        console.error('Unexpected error in jobboard-onboard:', err);
        return res.status(500).json({ error: 'Internal server error', details: err.message || 'Unknown error' });
    }
}
