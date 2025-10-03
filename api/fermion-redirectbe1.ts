// api/fermion-redirectbe1.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

// Hardcoded API URL (as requested)
const ENROLL_URL =
  'https://backend.codedamn.com/api/public/enroll-user-into-digital-product';

// Hardcode the Fermion digital product ID (from your screenshot URL)
// const FERMION_PRODUCT_ID = '68d24a8b5824ea0d74588d52';
const FERMION_PRODUCT_ID = '68d1013f7183c17964b104c8';

// Your published contest URL (from your dashboard)
const CONTEST_URL = 'https://careerbadge.apply-wizz.com/contest/just-believed';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const apiKey = process.env.FERMION_API_KEY; // keep secret in env
    if (!apiKey) return res.status(500).send('Missing FERMION_API_KEY');

    const labId = (req.query.labId as string) || process.env.DEFAULT_FERMION_LAB_ID;
    if (!labId) return res.status(400).send('labId is required');

    // ⚠️ In production, derive userId from your session
    const userId = (req.query.uid as string) || 'anon-user';

    // 1) Enroll user into the Fermion digital product (contest)
    const enrollRes = await fetch(ENROLL_URL, {
      method: 'POST',
      headers: {
        'FERMION-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [
          {
            data: {
              fermionDigitalProductId: FERMION_PRODUCT_ID,
              userId: userId,
            },
          },
        ],
      }),
    });

    // Treat "already enrolled" as success (409)
    if (!enrollRes.ok && enrollRes.status !== 409) {
      const errText = await enrollRes.text();
      console.error('Fermion enroll failed:', enrollRes.status, errText);
      return res
        .status(enrollRes.status)
        .send(`Enrollment failed: ${errText || 'unknown error'}`);
    }

    // 2) Sign the playground token
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

    // 3) Redirect to the contest page with token
    const url = `${CONTEST_URL}?token=${encodeURIComponent(token)}`;
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, url);
  } catch (e: any) {
    console.error('fermion-redirectbe3 error:', e);
    return res.status(500).send(`Unexpected server error: ${e?.message || e}`);
  }
}
