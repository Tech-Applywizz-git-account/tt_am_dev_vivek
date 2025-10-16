import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../src/lib/supabaseAdminClient';

// Define the structure of the incoming client data
interface ClientSyncData {
  applywizz_id?: string;  // The common AWL-XXXX ID
  awl_id?: string;  // Alternative field name for backward compatibility
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
  const expectedApiKey = process.env.CRM_SYNC_API_KEY;
  
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
  
  // Check if applywizz_id or awl_id exists
  const applywizzId = data.applywizz_id || data.awl_id;
  
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

  try {
    // Authenticate the request
    if (!authenticateRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Extract the client data from the request body
    const clientData: ClientSyncData = req.body;

    // Use applywizz_id or awl_id as the applywizz_id
    const applywizzId = clientData.applywizz_id || clientData.awl_id;

    // Validate the client data
    const validation = validateClientData({...clientData, applywizz_id: applywizzId});
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }

    // Prepare the data for upsert - map to the correct database column
    const upsertData = {
      ...clientData,
      applywizz_id: applywizzId, // Ensure we have the applywizz_id
      update_at: new Date().toISOString() // Use the correct column name from your schema
    };
    
    // Remove awl_id if it exists to avoid conflicts
    if ('awl_id' in upsertData) {
      delete (upsertData as any).awl_id;
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