import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

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

// Define fields that belong to the clients table
const CLIENTS_TABLE_FIELDS = new Set([
  'full_name',
  'personal_email',
  'whatsapp_number',
  'callable_phone',
  'company_email',
  'job_role_preferences',
  'salary_range',
  'location_preferences',
  'work_auth_details',
  'update_at',
  'clientofficeid',
  'onboardingdate',
  'visa_type',
  'applywizz_id',
  'sponsorship',
  'badge_value',
  'coding_labs',
  'coding_lab_url',
  'opted_job_links',
  'lab_id_1',
  'lab_id_2',
  'mcq_results',
  'test_results',
  'status'
]);

// Define fields that belong to clients_additional_information table
const ADDITIONAL_INFO_TABLE_FIELDS = new Set([
  'resume_url',
  'resume_path',
  'start_date',
  'end_date',
  'no_of_applications',
  'is_over_18',
  'eligible_to_work_in_us',
  'authorized_without_visa',
  'require_future_sponsorship',
  'can_perform_essential_functions',
  'worked_for_company_before',
  'discharged_for_policy_violation',
  'referred_by_agency',
  'highest_education',
  'university_name',
  'cumulative_gpa',
  'desired_start_date',
  'willing_to_relocate',
  'can_work_3_days_in_office',
  'role',
  'experience',
  'work_preferences',
  'alternate_job_roles',
  'exclude_companies',
  'convicted_of_felony',
  'felony_explanation',
  'pending_investigation',
  'willing_background_check',
  'willing_drug_screen',
  'failed_or_refused_drug_test',
  'uses_substances_affecting_duties',
  'substances_description',
  'can_provide_legal_docs',
  'gender',
  'is_hispanic_latino',
  'race_ethnicity',
  'veteran_status',
  'disability_status',
  'has_relatives_in_company',
  'relatives_details',
  'state_of_residence',
  'zip_or_country',
  'main_subject',
  'graduation_year',
  'add_ons_info',
  'github_url',
  'linked_in_url',
  'client_form_fill_date',
  'cover_letter_path',
  'full_address',
  'date_of_birth',
  'primary_phone',
  'google_drive_resume_link'
]);

// Define the structure of the incoming client data
interface ClientSyncData {
  applywizz_id?: string;  // The common AWL-XXXXX ID
  full_name?: string;
  personal_email?: string;
  whatsapp_number?: string;
  callable_phone?: string;
  company_email?: string;
  job_role_preferences?: string[];
  salary_range?: string;
  location_preferences?: string[];
  status?: string;
  gender?: string;
  experience?: string;
  no_of_applications?: string;
  willing_to_relocate?: boolean;
  resume_url?: string;
  resume_path?: string;
  zip_or_country?: string;
  linked_in_url?: string;
  github_url?: string;
  google_drive_resume_link?: string;
  [key: string]: any; // Allow for additional fields
}

// ✅ Validation Constants
const ALLOWED_SERVICES = ["job-links", "resume", "portfolio", "linkedin", "github", "courses", "experience", "badge", "applications"];
const ALLOWED_GENDERS = ["Male", "Female", "Other", "Prefer Not to Say"];
const ALLOWED_WORK_AUTH = ["F1", "H1B", "Green Card", "Citizen", "H4EAD", "Other"];
const ALLOWED_WORK_PREF = ["Remote", "Hybrid", "On-site", "All"];
// const ALLOWED_NUM_APPS = ["20+", "40+"];

// Simple authentication middleware
function authenticateRequest(req: VercelRequest): boolean {
  // In production, use a proper API key system
  const authHeader = req.headers['authorization'];
  const expectedApiKey = process.env.SYNC_API_KEY;

  // If no API key is configured, allow the request (development mode)
  if (!expectedApiKey) {
    return true;
  }

  // Check if the authorization header contains the correct API key
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
  return apiKey === expectedApiKey;
}

// Validate the client data
function validateClientData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Handle case where data is undefined or not an object
  if (!data || typeof data !== 'object') {
    errors.push('ApplyWizz ID is required');
    return {
      isValid: false,
      errors
    };
  }

  // Check if applywizz_id exists
  const applywizzId = data.applywizz_id;

  // Check if applywizz_id exists and follows the AWL-X to AWL-XXXXX pattern (1-5 digits)
  if (!applywizzId) {
    errors.push('ApplyWizz ID is required');
  } else if (!/^AWL-\d{1,5}$/.test(applywizzId)) {
    errors.push('ApplyWizz ID must follow the pattern AWL-X to AWL-XXXXX where X is a digit (1-5 digits)');
  }

  // ✅ XOR check for resume
  // const resumeUrl = data.resume_url;
  // const resumePath = data.resume_path || data.resume_s3_path;
  // if (!!resumeUrl !== !!resumePath) {
  //   errors.push('Both resume_url and resume_s3_path are required together.');
  // }

  // ✅ Enum checks
  if (data.services_opted) {
    const services = Array.isArray(data.services_opted) ? data.services_opted : [data.services_opted];
    if (services.some((opt: string) => !ALLOWED_SERVICES.includes(opt))) {
      errors.push(`Invalid service option found. Allowed: ${ALLOWED_SERVICES.join(', ')}`);
    }
  }

  if (data.gender && !ALLOWED_GENDERS.includes(data.gender)) {
    errors.push(`Invalid gender '${data.gender}'. Allowed: ${ALLOWED_GENDERS.join(', ')}`);
  }

  const workAuth = data.work_auth || data.visa_type;
  if (workAuth && !ALLOWED_WORK_AUTH.includes(workAuth)) {
    errors.push(`Invalid work authorization '${workAuth}'. Allowed: ${ALLOWED_WORK_AUTH.join(', ')}`);
  }

  const workPreference = data.work_preference || data.work_preferences;
  if (workPreference && !ALLOWED_WORK_PREF.includes(workPreference)) {
    errors.push(`Invalid work preference '${workPreference}'. Allowed: ${ALLOWED_WORK_PREF.join(', ')}`);
  }

  // const numApps = data.number_of_applications || data.no_of_applications;
  // if (numApps && !ALLOWED_NUM_APPS.includes(numApps)) {
  //   errors.push(`Invalid number_of_applications '${numApps}'. Allowed: ${ALLOWED_NUM_APPS.join(', ')}`);
  // }

  // ✅ Check if at least one field is provided (aside from applywizz_id)
  const fieldsToCheck = [
    'resume_url', 'experience', 'location_preferences', 'services_opted', 'gender',
    'work_auth', 'visa_type', 'work_preference', 'work_preferences', 'zip_or_country',
    'exclude_companies', 'full_name', 'job_role_preferences', 'resume_path', 'resume_s3_path',
    'status', 'willing_to_relocate', 'salary_range', 'github_url', 'linked_in_url',
    'sponsorship', 'no_of_applications', 'number_of_applications', 'google_drive_resume_link'
  ];

  const hasAtLeastOneField = fieldsToCheck.some(field => data[field] !== undefined && data[field] !== null);
  if (!hasAtLeastOneField) {
    errors.push('At least one field must be provided to update the client.');
  }

  // Validate email format if provided
  if (data.personal_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.personal_email)) {
    errors.push('Invalid personal email format');
  }

  if (data.company_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.company_email)) {
    errors.push('Invalid company email format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Split incoming data into clients table data and additional_information table data
function splitClientData(data: ClientSyncData): {
  clientsData: Record<string, any>;
  additionalInfoData: Record<string, any>
} {
  const clientsData: Record<string, any> = {};
  const additionalInfoData: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (CLIENTS_TABLE_FIELDS.has(key)) {
      clientsData[key] = value;
    } else if (ADDITIONAL_INFO_TABLE_FIELDS.has(key)) {
      additionalInfoData[key] = value;
    }
  }

  // ✅ Map services_opted to add_ons_info for Supabase
  if (data.services_opted && !data.add_ons_info) {
    additionalInfoData['add_ons_info'] = data.services_opted;
  } else if (data.add_ons_info) {
    additionalInfoData['add_ons_info'] = data.add_ons_info;
  }

  return { clientsData, additionalInfoData };
}

// ✅ Map data to Django's expected format
function mapToDjangoData(data: ClientSyncData): any {
  return {
    apw_id: data.applywizz_id,
    name: data.full_name,
    resume_url: data.resume_url,
    years_experience: data.experience,
    location: Array.isArray(data.location_preferences) ? data.location_preferences[0] : (data.location_preferences || data.location),
    services_opted: data.services_opted || data.add_ons_info,
    gender: data.gender,
    work_auth: data.work_auth || data.visa_type,
    work_preference: data.work_preference || data.work_preferences,
    country: data.zip_or_country || data.country,
    exclude_companies: data.exclude_companies,
    "target-role": Array.isArray(data.job_role_preferences) ? data.job_role_preferences[0] : (data.job_role_preferences || data["target-role"]),
    resume_s3_path: data.resume_path || data.resume_s3_path,
    number_of_applications: data.number_of_applications || data.no_of_applications,
    willing_to_relocate: data.willing_to_relocate,
    expected_salary: data.salary_range || data.expected_salary,
    github_url: data.github_url,
    linkedin_url: data.linked_in_url || data.linkedin_url,
    sponsorship: data.sponsorship,
    status: data.status,
    google_drive_resume_link: data.google_drive_resume_link
  };
}

// ✅ Sync with Django Project
async function syncToDjangoProject(data: any) {
  const DJANGO_API_URL = 'https://dashboard.apply-wizz.com/api/client-update';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

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
    // Authenticate the request
    if (!authenticateRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extract the client data from the request body
    let clientData: ClientSyncData = req.body;

    // In some cases, the body might be a string that needs to be parsed
    if (typeof clientData === 'string') {
      try {
        clientData = JSON.parse(clientData);
        console.log('Parsed clientData:', clientData);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return res.status(400).json({
          error: 'Invalid JSON in request body',
          details: 'Request body must be valid JSON'
        });
      }
    }

    // Check if clientData exists and is valid
    if (!clientData) {
      // Check if content-type is set correctly
      const contentType = req.headers['content-type'];
      console.log('Content-Type header:', contentType);

      // If no content-type or incorrect content-type, suggest fix
      if (!contentType || !contentType.includes('application/json')) {
        return res.status(400).json({
          error: 'Missing or invalid Content-Type header',
          details: 'Request must include Content-Type: application/json header',
          receivedContentType: contentType || 'none'
        });
      }

      return res.status(400).json({
        error: 'Missing request body',
        details: 'Request body is required and must contain client data'
      });
    }

    if (typeof clientData !== 'object') {
      return res.status(400).json({
        error: 'Invalid request body format',
        details: `Request body must be a JSON object, received ${typeof clientData}`
      });
    }

    if (Array.isArray(clientData)) {
      return res.status(400).json({
        error: 'Invalid request body format',
        details: 'Request body must be a JSON object, received an array'
      });
    }

    // Use applywizz_id as the applywizz_id
    const applywizzId = clientData.applywizz_id;

    // Validate the client data
    const validationData = clientData ? { ...clientData, applywizz_id: applywizzId } : { applywizz_id: applywizzId };
    const validation = validateClientData(validationData);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    // Split the data into clients table and additional_information table
    const { clientsData, additionalInfoData } = splitClientData(clientData);

    // First, check if the client already exists
    const { data: existingClient, error: fetchError } = await supabaseAdmin
      .from('clients')
      .select('id, company_email')
      .eq('applywizz_id', applywizzId)
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking existing client:', fetchError);
      return res.status(500).json({ error: 'Failed to check existing client', details: fetchError.message });
    }

    let clientUpsertData;

    if (existingClient) {
      // UPDATE: Client exists, do not update company_email
      // Remove company_email from the update data
      const { company_email, ...updateData } = clientsData;
      clientUpsertData = {
        ...updateData,
        applywizz_id: applywizzId,
        company_email: existingClient.company_email,
        update_at: new Date().toISOString()
      };
    } else {
      // INSERT: New client, handle company_email according to requirements:
      // 1. If company_email is provided, use it
      // 2. If company_email is not provided, use personal_email
      // 3. If neither is provided, use a default email
      let companyEmail = clientsData.company_email;
      if (!companyEmail) {
        companyEmail = clientsData.personal_email || `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}@noemail.com`;
      }

      clientUpsertData = {
        ...clientsData,
        company_email: companyEmail, // Ensure we always have a company_email for new records
        applywizz_id: applywizzId,
        update_at: new Date().toISOString()
      };
    }

    // Perform upsert operation on clients table
    const { data: clientResult, error: clientError } = await supabaseAdmin
      .from('clients')
      .upsert(clientUpsertData, {
        onConflict: 'applywizz_id'  // Specify the column to conflict on
      })
      .select('id, applywizz_id, full_name, company_email')
      .limit(1);

    if (clientError) {
      console.error('Supabase clients upsert error:', clientError);
      return res.status(500).json({ error: 'Failed to sync client data', details: clientError.message });
    }

    if (!clientResult || clientResult.length === 0) {
      console.error('No client data returned from upsert');
      return res.status(500).json({ error: 'Failed to sync client data', details: 'No data returned from database' });
    }

    const clientId = clientResult[0].id;

    // Perform upsert operation on clients_additional_information table
    // Always create/update with at least id and applywizz_id
    const additionalInfoUpsertData = {
      id: clientId,  // Same as clients.id (PK and FK)
      applywizz_id: applywizzId,
      ...additionalInfoData,
      updated_at: new Date().toISOString()
    };

    const { error: additionalInfoError } = await supabaseAdmin
      .from('clients_additional_information')
      .upsert(additionalInfoUpsertData, {
        onConflict: 'id'  // Use id as the conflict key
      });

    if (additionalInfoError) {
      console.error('Supabase additional_information upsert error:', additionalInfoError);
      return res.status(500).json({ error: 'Failed to sync additional information', details: additionalInfoError.message });
    }

    // ✅ NEW: Sync with Django Project (Option A: Both must succeed)
    try {
      const djangoMappedData = mapToDjangoData(clientData);
      await syncToDjangoProject(djangoMappedData);
    } catch (djangoError: any) {
      console.error('Django Sync Error:', djangoError);
      return res.status(500).json({
        error: 'Supabase sync succeeded but Django sync failed',
        details: djangoError.message || 'Unknown Django API error'
      });
    }

    // Return success response (only clients table data as requested)
    return res.status(200).json({
      message: 'Client data synchronized successfully to both Supabase and Django',
      applywizz_id: applywizzId,
      client: clientResult[0]
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
