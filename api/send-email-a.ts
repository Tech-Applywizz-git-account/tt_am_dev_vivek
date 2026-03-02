import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

// Environment variables
const TENANT_ID = process.env.TENANT_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const SENDER_EMAIL = process.env.SENDER_EMAIL;

interface TokenResponse {
  token_type: string;
  expires_in: number;
  ext_expires_in: number;
  access_token: string;
}

interface EmailAttachment {
  '@odata.type': string;
  name: string;
  contentType: string;
  contentBytes: string;
}

// Get access token
async function getAccessToken() {
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID!);
  params.append('scope', 'https://graph.microsoft.com/.default');
  params.append('client_secret', CLIENT_SECRET!);
  params.append('grant_type', 'client_credentials');

  const res = await fetch(url, { method: 'POST', body: params });
  const data: TokenResponse = await res.json() as TokenResponse;

  if (!res.ok) throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  return data.access_token;
}

// Send email
async function sendEmail(to: string, subject: string, htmlBody: string, attachments?: EmailAttachment[]) {
  const token = await getAccessToken();
  
  const payload = {
    message: {
      subject,
      body: { contentType: 'HTML', content: htmlBody },
      toRecipients: [{ emailAddress: { address: to } }],
      ...(attachments && attachments.length > 0 && { attachments }),
    },
  };
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to send email: ${text}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  const { to, subject, htmlBody, attachments } = req.body;

  if (!to || !subject || !htmlBody) return res.status(400).send('Missing parameters');

  try {
    await sendEmail(to, subject, htmlBody, attachments);
    return res.status(200).json({ message: 'Email sent successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
