/**
 * S3 Resume Upload Service — DEV
 * POSTs file as base64 to /api/upload-resume-dev, which uploads server-side.
 * The browser never talks to S3 directly → no S3 CORS/IAM issues.
 * Keep s3Service.ts (production) untouched.
 */

/**
 * Upload resume to DEV S3 bucket via server-side POST.
 * File is converted to base64 and sent to /api/upload-resume-dev,
 * which uploads directly to S3 using the AWS SDK.
 */
export const uploadResumeToS3Dev = async (file: File, applywizzId: string): Promise<string> => {
    console.log("[DEV] 🔍 Starting server-side S3 upload...");

    if (!file || !applywizzId) {
        throw new Error("File and ApplyWizz ID are required");
    }

    try {
        // Convert file to base64
        const base64Data = await fileToBase64(file);

        console.log(`[DEV] 📡 POSTing ${file.name} (${(file.size / 1024).toFixed(1)} KB) to /api/upload-resume-dev...`);

        // POST to our Vercel function — server uploads to S3, no browser→S3 PUT needed
        const response = await fetch('/api/upload-resume-dev', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                applywizz_id: applywizzId,
                fileType: file.type,
                fileContent: base64Data,   // base64 string (no data URL prefix)
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Upload failed with status ${response.status}`);
        }

        const { key } = await response.json();
        console.log(`[DEV] ✅ Resume uploaded: ${key}`);
        return key;

    } catch (error: any) {
        console.error("[DEV] ❌ Upload error:", error);
        throw new Error(`Resume upload failed: ${error.message}`);
    }
};

/** Convert a File to a plain base64 string (no data URL prefix) */
async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Strip "data:<mime>;base64," prefix → pure base64 bytes
            resolve(result.split(',')[1]);
        };
        reader.onerror = (err) => reject(err);
    });
}

/**
 * Get the full DEV S3 URL from an S3 key
 */
export const getS3UrlDev = (s3Key: string): string => {
    const bucket = import.meta.env.VITE_AWS_S3_BUCKET_DEV || 'applywizz-dev';
    const region = import.meta.env.VITE_AWS_REGION_DEV || 'us-east-2';

    if (s3Key.startsWith('http://') || s3Key.startsWith('https://')) return s3Key;
    return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
};
