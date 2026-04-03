// api/scheduling/sale.ts
// POST /api/scheduling/sale
// Called when a sale is made: creates a DISCOVERY call_request immediately.
// Body: { clientId, amId }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createDiscoveryCall } from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { clientId, amId } = req.body || {};
  if (!clientId || !amId) {
    return res.status(400).json({ error: 'clientId and amId are required' });
  }

  try {
    const callId = await createDiscoveryCall(clientId, amId);
    return res.status(200).json({ success: true, callId });
  } catch (err: any) {
    console.error('[/api/scheduling/sale]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
