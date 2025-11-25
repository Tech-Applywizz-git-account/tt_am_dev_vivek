import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      applywizz_id,
      contestId,
      contestName,
      lab_id_1,
      lab_id_2,
      mcq_results 
    } = req.body;

    if (!applywizz_id || !contestId) {
      return res.status(400).json({ 
        success: false, 
        error: 'applywizz_id and contestId are required' 
      });
    }

    // Fetch current test_results
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('test_results')
      .eq('applywizz_id', applywizz_id)
      .single();

    if (fetchError) {
      return res.status(500).json({ 
        success: false, 
        error: fetchError.message 
      });
    }

    if (!client) {
      return res.status(404).json({ 
        success: false, 
        error: 'Client not found' 
      });
    }

    // Parse existing test_results or initialize empty array
    let testResults = Array.isArray(client.test_results) ? client.test_results : [];

    // Find existing contest by contestId
    const existingIndex = testResults.findIndex((t: any) => t.contestId === contestId);

    const newTestResult = {
      contestId,
      contestName: contestName || `Contest ${contestId}`,
      lab_id_1: lab_id_1 || null,
      lab_id_2: lab_id_2 || null,
      mcq_results: mcq_results || null
    };

    if (existingIndex >= 0) {
      // Update existing contest
      testResults[existingIndex] = newTestResult;
    } else {
      // Add new contest
      testResults.push(newTestResult);
    }

    // Update database
    const { data, error: updateError } = await supabase
      .from('clients')
      .update({ test_results: testResults })
      .eq('applywizz_id', applywizz_id)
      .select();

    if (updateError) {
      console.error('Error updating test results:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Test results updated successfully',
      data: data[0]
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
}
