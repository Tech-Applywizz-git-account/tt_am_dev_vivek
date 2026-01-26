import { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'https://ticketingtoolapplywizz.vercel.app',
    'https://apply-wizz.me',
    'https://ticketingtoolapplywi-git-ba5fa7-applywizz-tech-vercels-projects.vercel.app',
];

// Helper for CORS with dynamic origin
function cors(req: VercelRequest, res: VercelResponse, status = 200, body: any = {}) {
    const origin = req.headers.origin || '';

    // Check if origin is allowed
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
        // Fallback to wildcard (less secure but works)
        res.setHeader("Access-Control-Allow-Origin", "*");
    }

    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS,GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    return res.status(status).json(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS preflight
    if (req.method === "OPTIONS") return cors(req, res, 200, { ok: true });

    if (req.method !== "POST") {
        return cors(req, res, 405, { error: "Method not allowed" });
    }

    try {
        const { applywizz_id, fileType } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

        if (!applywizz_id) {
            return cors(req, res, 400, { error: "Missing applywizz_id" });
        }

        // 🔍 Step 1: Check if resume already exists
        let existingResumeUrl: string | null = null;
        let isReplacement = false;

        try {
            const apiUrl = process.env.VITE_TICKETING_TOOL_API_URL || 'https://ticketingtoolapplywizz.vercel.app';
            const clientDetailsUrl = `${apiUrl}/api/get-client-details?applywizz_id=${encodeURIComponent(applywizz_id)}`;
            const clientResponse = await fetch(clientDetailsUrl);

            if (clientResponse.ok) {
                const clientData = await clientResponse.json();
                if (clientData?.additional_information?.resume_s3_path ||
                    clientData?.additional_information?.resume_path ||
                    clientData?.additional_information?.resume_url) {
                    existingResumeUrl = clientData.additional_information.resume_s3_path ||
                        clientData.additional_information.resume_path ||
                        clientData.additional_information.resume_url;
                    isReplacement = true;
                }
            }
        } catch (checkError: any) {
            // Non-fatal: Continue even if check fails
            console.warn("Could not check existing resume:", checkError.message);
        }

        // Server-side environment variables (Secure)
        const region = process.env.VITE_AWS_REGION || process.env.AWS_REGION;
        const accessKeyId = process.env.VITE_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.VITE_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
        const bucketName = process.env.VITE_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET;

        if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
            console.error("Missing AWS Config");
            return cors(req, res, 500, { error: "Server configuration error" });
        }

        const s3Client = new S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        // 2. Sanitize ID
        const sanitizedId = applywizz_id.replace(/[^a-zA-Z0-9-_]/g, '');

        // 3. Determine File Extension (default to pdf if missing)
        let ext = "pdf";
        if (fileType) {
            if (fileType === "application/pdf") ext = "pdf";
            else if (fileType.includes("word") || fileType.includes("doc")) ext = "docx";
        }

        // 4. Generate timestamp for unique filename (YYYYMMDD format)
        const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, ''); // 20260123

        // 5. Always create NEW file with timestamp (no replacement)
        const key = `resumes/${sanitizedId}-${timestamp}-resume.${ext}`;

        console.log(`✨ Creating new resume file: ${key}${isReplacement ? ' (Previous version will be kept)' : ''}`);

        // 5. Generate Presigned URL
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: fileType || 'application/pdf',
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes

        return cors(req, res, 200, {
            uploadUrl,
            key,
            isReplacement,
            existingResumeUrl,
            message: isReplacement
                ? `New resume version created: "${key}". Previous version "${existingResumeUrl}" will be kept in S3.`
                : `New resume upload: "${key}"`
        });

    } catch (error: any) {
        console.error("API Error:", error);
        return cors(req, res, 500, { error: error.message });
    }
}
