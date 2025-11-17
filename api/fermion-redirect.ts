// api/fermion-redirect.ts - Consolidated endpoint for all Fermion environments
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

// Environment configuration map
const ENVIRONMENTS = {
  vivek: {
    productId: '68d24a4a1295f90e0e22a041', // Update with actual vivek product ID
    contestUrl: 'https://careerbadge.apply-wizz.com/contest/situation-needs' // Update with actual vivek URL
  },
  fe1: {
    productId: '68d24a4a1295f90e0e22a041',
    contestUrl: 'https://careerbadge.apply-wizz.com/contest/generally-dull'
  },
  fe2: {
    productId: '68d24a57d03833130b007f2c',
    contestUrl: 'https://careerbadge.apply-wizz.com/contest/weak-practice'
  },
  be1: {
    productId: '68d24a4a1295f90e0e22a041', // Update with actual be1 product ID
    contestUrl: 'https://careerbadge.apply-wizz.com/contest/be1-contest' // Update with actual be1 URL
  },
  be2: {
    productId: '68d24a4a1295f90e0e22a041', // Update with actual be2 product ID
    contestUrl: 'https://careerbadge.apply-wizz.com/contest/be2-contest' // Update with actual be2 URL
  },
  be3: {
    productId: '68d24a4a1295f90e0e22a041', // Update with actual be3 product ID
    contestUrl: 'https://careerbadge.apply-wizz.com/contest/be3-contest' // Update with actual be3 URL
  },
  aml1: {
    productId: '68df98d58c6253ef47a720c3',
    contestUrl: 'https://careerbadge.apply-wizz.com/contest/pond-pound'
  },
  default: {
    productId: '68d24a4a1295f90e0e22a041',
    contestUrl: 'https://careerbadge.apply-wizz.com/contest/situation-needs'
  }
};

const ENROLL_URL = 'https://backend.codedamn.com/api/public/enroll-user-into-digital-product';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const apiKey = process.env.FERMION_API_KEY;
    if (!apiKey) return res.status(500).send('Missing FERMION_API_KEY');

    // Get environment from query parameter (e.g., ?env=fe1&uid=...)
    const env = (req.query.env as string) || 'default';
    const userId = (req.query.uid as string) || 'anon-user';

    // Get environment config
    const config = ENVIRONMENTS[env] || ENVIRONMENTS.default;
    const labId = config.productId;

    // 1) Enroll user into the Fermion digital product
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
              fermionDigitalProductId: config.productId,
              userId: userId,
            },
          },
        ],
      }),
    });

    // Treat "already enrolled" as success (409)
    if (!enrollRes.ok && enrollRes.status !== 409) {
      const errText = await enrollRes.text();
      console.error(`Fermion enroll failed for ${env}:`, enrollRes.status, errText);
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
    const url = `${config.contestUrl}?token=${encodeURIComponent(token)}`;
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, url);
  } catch (e: any) {
    console.error('fermion-redirect error:', e);
    return res.status(500).send(`Unexpected server error: ${e?.message || e}`);
  }
}
