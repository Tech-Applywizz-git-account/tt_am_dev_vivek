// api/fermion-redirect.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

// GET /api/fermion-redirect?labId=...&uid=...   (uid is optional; see note below)
export default function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.FERMION_API_KEY;
  const schoolHost = process.env.FERMION_SCHOOL_HOST; // e.g. your-school.fermion.app

  if (!apiKey || !schoolHost) {
    return res.status(500).send('Server is not configured: missing FERMION_API_KEY or FERMION_SCHOOL_HOST');
  }

  const labId = (req.query.labId as string) || process.env.DEFAULT_FERMION_LAB_ID;
  if (!labId) return res.status(400).send('labId is required');

  // ⚠️ For production, resolve userId from your server-side session instead of query.
  const userId = (req.query.uid as string) || 'anon-user';

  const token = jwt.sign(
    {
      labId,
      userId,
      playgroundOptions: {
        isCodeCopyPasteAllowed: false,
        shouldHideLogo: false,
        overrideDefaultFilesystemForLab: { isEnabled: false },
      },
    },
    apiKey,
    { algorithm: 'HS256', expiresIn: '1h' }
  );

  const url = `https://careerbadge.apply-wizz.com/contest/situation-needs?token=${encodeURIComponent(token)}`
  res.setHeader('Cache-Control', 'no-store');
  return res.redirect(302, url);

}
