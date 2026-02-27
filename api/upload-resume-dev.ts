import { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// CORS helper — allow all Vercel preview deployments and localhost
function cors(req: VercelRequest, res: VercelResponse, status = 200, body: any = {}) {
    const origin = req.headers.origin || '';
    if (origin.endsWith('.vercel.app') || origin.startsWith('http://localhost')) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
        res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS,GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    return res.status(status).json(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === "OPTIONS") return cors(req, res, 200, { ok: true });
    if (req.method !== "POST") return cors(req, res, 405, { error: "Method not allowed" });

    try {
        const { applywizz_id, fileType } = typeof req.body === "string"
            ? JSON.parse(req.body)
            : req.body;

        if (!applywizz_id) return cors(req, res, 400, { error: "Missing applywizz_id" });

        // ── environment variables ( suffix required) ──────────────
        const region = process.env.VITE_AWS_REGION;
        const accessKeyId = process.env.VITE_AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.VITE_AWS_SECRET_ACCESS_KEY;
        const bucketName = process.env.VITE_AWS_S3_BUCKET;

        if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
            console.error("Missing AWS env vars");
            return cors(req, res, 500, { error: "Dev server config error: missing AWS env vars" });
        }

        const s3Client = new S3Client({
            region,
            credentials: { accessKeyId, secretAccessKey },
        });

        // Sanitize ID & determine extension
        const sanitizedId = applywizz_id.replace(/[^a-zA-Z0-9-_]/g, '');
        let ext = "pdf";
        if (fileType) {
            if (fileType === "application/pdf") ext = "pdf";
            else if (fileType.includes("word") || fileType.includes("doc")) ext = "docx";
        }

        const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const key = `resumes/${sanitizedId}-${timestamp}-resume.${ext}`;

        console.log(`[DEV] ✨ Generating presigned URL for: ${key} in bucket: ${bucketName}`);

        // Generate Presigned URL for browser PUT
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: fileType || 'application/pdf',
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        return cors(req, res, 200, {
            uploadUrl,
            key,
            message: `[DEV] New resume upload: "${key}"`,
        });

    } catch (error: any) {
        console.error("[DEV] Upload error:", error);
        return cors(req, res, 500, { error: error.message });
    }
}
