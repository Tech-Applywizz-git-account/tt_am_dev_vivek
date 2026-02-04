import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_SUBMITTED_BY_ID = 'd92f960d-b244-45e8-a13d-d0ad08828c89';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
});

// Validation Constants
const ALLOWED_GENDERS = ["Male", "Female", "Other", "Prefer Not to Say"];
const ALLOWED_WORK_AUTH = ["F1", "H1B", "Green Card", "Citizen", "H4EAD", "Other"];
const ALLOWED_WORK_PREF = ["Remote", "Hybrid", "On-site", "All"];

// Define the structure of the incoming client data
interface PendingClientData {
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
    work_preferences?: string;
    salary_range?: string;
    work_auth_details?: string;
    sponsorship?: boolean;
    github_url?: string;
    linked_in_url?: string;
    end_date?: string;
    willing_to_relocate?: boolean;
    alternate_job_roles?: string;
    no_of_applications?: string;
    highest_education?: string;
    university_name?: string;
    cumulative_gpa?: string;
    main_subject?: string;
    graduation_year?: string;
    badge_value?: number;
    is_over_18?: boolean;
    eligible_to_work_in_us?: boolean;
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
        let clientData: PendingClientData = req.body;

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

        // Validate the client data
        const validation = validateClientData(clientData);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Validation failed',
                details: validation.errors
            });
        }

        // Normalize email
        const normalizedEmail = clientData.email.trim().toLowerCase();

        // Check for duplicate emails in pending_clients table
        const { data: existingClients, error: checkError } = await supabaseAdmin
            .from('pending_clients')
            .select('id, company_email, personal_email')
            .or(`company_email.eq.${normalizedEmail},personal_email.eq.${normalizedEmail}`);

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
            personal_email: normalizedEmail,
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
            resume_url: clientData.resume_s3_path ? `https://applywizz-prod.s3.us-east-2.amazonaws.com/${clientData.resume_s3_path}` : null,
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
            work_preferences: clientData.work_preferences || null,
            alternate_job_roles: clientData.alternate_job_roles || null,
            exclude_companies: clientData.exclude_companies || 'NA',
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
            add_ons_info: clientData.add_ons_info || null,
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

        // Return success response
        return res.status(200).json({
            message: 'Pending client submitted successfully',
            applywizz_id: clientData.applywizz_id,
            pending_client_id: pendingClientId,
            email: normalizedEmail,
            status: 'pending_review'
        });

    } catch (err: any) {
        console.error('Unexpected error:', err);
        return res.status(500).json({
            error: 'Internal server error',
            details: err.message || 'Unknown error occurred'
        });
    }
}
