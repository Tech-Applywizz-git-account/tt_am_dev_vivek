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

// Define the structure of the incoming client data
interface ClientSyncData {
  applywizz_id?: string;  // The common AWL-XXXX ID
  full_name?: string;
  personal_email?: string;
  whatsapp_number?: string;
  callable_phone?: string;
  company_email?: string;
  job_role_preferences?: string[];
  salary_range?: string;
  location_preferences?: string[];
  // Add any other fields that might be updated
  [key: string]: any; // Allow for additional fields
}

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

  // Check if applywizz_id exists and follows the AWL-X to AWL-XXXX pattern
  if (!applywizzId) {
    errors.push('ApplyWizz ID is required');
  } else if (!/^AWL-\d{1,4}$/.test(applywizzId)) {
    errors.push('ApplyWizz ID must follow the pattern AWL-X, AWL-XX, AWL-XXX, or AWL-XXXX where X is a digit');
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



// Define which fields belong to the clients table (core fields)
// All other fields will be automatically sent to clients_additional_information
const CORE_CLIENT_FIELDS = [
  'applywizz_id',
  'full_name',
  'personal_email',
  'whatsapp_number',
  'callable_phone',
  'company_email',
  'job_role_preferences',
  'salary_range',
  'location_preferences',
  'work_auth_details',
  'account_manager_id',
  'onboarded_by',
  'careerassociateid',
  'scraperid',
  'careerassociatemanagerid',
  'clientofficeid',
  'onboardingdate',
  'visa_type',
  'sponsorship',
  'badge_value',
  'coding_labs',
  'coding_lab_url',
  'opted_job_links',
  'lab_id_1',
  'lab_id_2',
  'mcq_results',
  'test_results'
];

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
      const contentType = req.headers['content-type'];
      console.log('Content-Type header:', contentType);

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

    // ===== STEP 1: Separate fields for clients and clients_additional_information =====
    const clientsData: any = {};
    const additionalInfoData: any = {};

    Object.keys(clientData).forEach(key => {
      if (CORE_CLIENT_FIELDS.includes(key)) {
        clientsData[key] = clientData[key];
      } else {
        // All other fields go to additional_information (future-proof!)
        additionalInfoData[key] = clientData[key];
      }
    });

    // Always include applywizz_id in additional_info for linking
    additionalInfoData.applywizz_id = applywizzId;

    // ===== STEP 2: Check if client exists =====
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

    // ===== STEP 3: Prepare clients table upsert data =====
    let clientUpsertData;

    if (existingClient) {
      // UPDATE: Client exists, preserve company_email
      const { company_email, ...updateData } = clientsData;
      clientUpsertData = {
        ...updateData,
        applywizz_id: applywizzId,
        company_email: existingClient.company_email,
        update_at: new Date().toISOString()
      };
    } else {
      // INSERT: New client, handle company_email
      let companyEmail = clientsData.company_email;
      if (!companyEmail) {
        companyEmail = clientsData.personal_email || `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}@noemail.com`;
      }

      clientUpsertData = {
        ...clientsData,
        company_email: companyEmail,
        applywizz_id: applywizzId,
        update_at: new Date().toISOString()
      };
    }

    // ===== STEP 4: Upsert to clients table =====
    const { data: clientResult, error: clientError } = await supabaseAdmin
      .from('clients')
      .upsert(clientUpsertData, {
        onConflict: 'applywizz_id'
      })
      .select('id, applywizz_id, full_name, company_email')
      .single();

    if (clientError) {
      console.error('Supabase clients upsert error:', clientError);
      return res.status(500).json({ error: 'Failed to sync client data', details: clientError.message });
    }

    // ===== STEP 5: Upsert to clients_additional_information table =====
    // Only if there are additional fields beyond applywizz_id
    let additionalInfoResult = null;
    if (Object.keys(additionalInfoData).length > 1) { // More than just applywizz_id
      // Add the client ID (UUID) for the foreign key relationship
      additionalInfoData.id = clientResult.id;
      additionalInfoData.updated_at = new Date().toISOString();

      const { data: addInfoData, error: addInfoError } = await supabaseAdmin
        .from('clients_additional_information')
        .upsert(additionalInfoData, {
          onConflict: 'id' // Conflict on id (the foreign key)
        })
        .select();

      if (addInfoError) {
        console.error('Supabase additional_info upsert error:', addInfoError);
        // Don't fail the whole request, just log it
        console.warn('Additional information sync failed, but client data was saved');
      } else {
        additionalInfoResult = addInfoData?.[0] || null;
      }
    }

    // ===== STEP 6: Return success response =====
    return res.status(200).json({
      message: 'Client data synchronized successfully',
      applywizz_id: applywizzId,
      client: clientResult,
      additional_information: additionalInfoResult
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
