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
  company_email?: string;
  callable_phone?: string;
  job_role_preferences?: string[];
  salary_range?: string;
  location_preferences?: string[];
  work_auth_details?: string;
  visa_type?: string;
  sponsorship?: string;
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
  
  // Check if applywizz_id or awl_id exists
  const applywizzId = data.applywizz_id ;
  
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
    
    // Log detailed request information for debugging
    // console.log('=== REQUEST DEBUG INFO ===');
    // console.log('Method:', req.method);
    // console.log('Headers:', JSON.stringify(req.headers, null, 2));
    // console.log('Raw body:', req.body);
    // console.log('Body type:', typeof req.body);
    // console.log('Content-Type header:', req.headers['content-type']);
    // console.log('===========================');
    
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
    const validationData = clientData ? {...clientData, applywizz_id: applywizzId} : {applywizz_id: applywizzId};
    const validation = validateClientData(validationData);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }

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

    let upsertData;
    
    if (existingClient) {
      // UPDATE: Client exists, do not update company_email
      // Remove company_email from the update data
      const { company_email, ...updateData } = clientData;
      upsertData = {
        ...updateData,
        applywizz_id: applywizzId,
        update_at: new Date().toISOString()
      };
    } else {
      // INSERT: New client, handle company_email according to requirements:
      // 1. If company_email is provided, use it
      // 2. If company_email is not provided, use personal_email
      // 3. If neither is provided, use a default email
      let companyEmail = clientData.company_email;
      if (!companyEmail) {
        companyEmail = clientData.personal_email || `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}@noemail.com`;
      }

      upsertData = {
        ...clientData,
        company_email: companyEmail, // Ensure we always have a company_email for new records
        applywizz_id: applywizzId,
        update_at: new Date().toISOString()
      };
    }

    // Perform upsert operation based on the ApplyWizz ID
    // This uses the applywizz_id column as the conflict key
    const { data, error } = await supabaseAdmin
      .from('clients')
      .upsert(upsertData, {
        onConflict: 'applywizz_id'  // Specify the column to conflict on
      })
      .select('id, applywizz_id, full_name, company_email')
      .limit(1);

    if (error) {
      console.error('Supabase upsert error:', error);
      return res.status(500).json({ error: 'Failed to sync client data', details: error.message });
    }

    // Return success response
    return res.status(200).json({ 
      message: 'Client data synchronized successfully',
      applywizz_id: applywizzId,
      client: data?.[0] || null
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
