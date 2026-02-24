import { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
        const { applywizz_id, fileType, fileContent } = typeof req.body === "string"
            ? JSON.parse(req.body)
            : req.body;

        if (!applywizz_id) return cors(req, res, 400, { error: "Missing applywizz_id" });
        if (!fileContent) return cors(req, res, 400, { error: "Missing fileContent (base64)" });

        // ── DEV-only environment variables (_DEV suffix required) ──────────────
        const region = process.env.VITE_AWS_REGION_DEV;
        const accessKeyId = process.env.VITE_AWS_ACCESS_KEY_ID_DEV;
        const secretAccessKey = process.env.VITE_AWS_SECRET_ACCESS_KEY_DEV;
        const bucketName = process.env.VITE_AWS_S3_BUCKET_DEV;

        if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
            console.error("[DEV] Missing AWS _DEV env vars");
            return cors(req, res, 500, { error: "Dev server config error: missing _DEV AWS env vars" });
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

        // ── Server-side upload: browser never touches S3 directly ──────────────
        const fileBuffer = Buffer.from(fileContent, 'base64');

        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: fileBuffer,
            ContentType: fileType || 'application/pdf',
        }));

        console.log(`[DEV] ✅ Uploaded: ${key} → s3://${bucketName}`);

        return cors(req, res, 200, {
            key,
            message: `[DEV] Resume uploaded server-side: "${key}"`,
        });

    } catch (error: any) {
        console.error("[DEV] Upload error:", error);
        return cors(req, res, 500, { error: error.message });
    }
}
