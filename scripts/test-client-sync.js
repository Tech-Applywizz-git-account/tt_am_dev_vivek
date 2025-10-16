/**
 * Test script for the client synchronization API
 * 
 * Usage:
 * node scripts/test-client-sync.js
 * 
 * Make sure to set the API_URL and API_KEY environment variables
 * or update the constants below
 */

// Configuration - Update these values
const API_URL = process.env.API_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/sync-client` : 'http://localhost:3000/api/sync-client';
const API_KEY = process.env.API_KEY || process.env.CRM_SYNC_API_KEY || process.env.VITE_CRM_SYNC_API_KEY || 'test-api-key'; // Set to null for development mode

// Test client data
const testClientData = {
  applywizz_id: 'AWL-5678',
  full_name: 'Jane Smith',
  personal_email: 'jane.smith@example.com',
  company_email: 'j.smith@company.com',
  whatsapp_number: '+1987654321',
  callable_phone: '+1987654321',
  job_role_preferences: ['Product Manager', 'Project Lead'],
  salary_range: '80000-100000',
  location_preferences: ['Chicago', 'Boston']
};

async function testClientSync() {
  console.log('Testing client synchronization API...');
  console.log('API URL:', API_URL);
  
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add API key if provided
    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(testClientData)
    });
    
    const result = await response.json();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Client synchronization successful!');
    } else {
      console.log('❌ Client synchronization failed!');
    }
  } catch (error) {
    console.error('Error testing client sync API:', error);
  }
}

// Run the test
if (require.main === module) {
  testClientSync();
}

module.exports = { testClientData, testClientSync };