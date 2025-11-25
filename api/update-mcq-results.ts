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
      totalAttempted,
      passed,
      failed,
      notAttempted,
      points,
      totalQuestions 
    } = req.body;

    if (!applywizz_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'applywizz_id is required' 
      });
    }

    // Validate MCQ data
    if (
      typeof totalAttempted !== 'number' ||
      typeof passed !== 'number' ||
      typeof failed !== 'number' ||
      typeof notAttempted !== 'number' ||
      typeof points !== 'number' ||
      typeof totalQuestions !== 'number'
    ) {
      return res.status(400).json({ 
        success: false, 
        error: 'All MCQ fields must be numbers' 
      });
    }

    const mcqResults = {
      totalAttempted,
      passed,
      failed,
      notAttempted,
      points,
      totalQuestions
    };

    const { data, error } = await supabase
      .from('clients')
      .update({ mcq_results: mcqResults })
      .eq('applywizz_id', applywizz_id)
      .select();

    if (error) {
      console.error('Error updating MCQ results:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Client not found' 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'MCQ results updated successfully',
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
