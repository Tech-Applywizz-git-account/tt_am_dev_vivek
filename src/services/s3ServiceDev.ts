/**
 * S3 Resume Upload Service — DEV
 * Uses /api/upload-resume-dev (reads env vars → dev S3 bucket).
 * Keep s3Service.ts (production) untouched.
 */

interface UploadResumeResponse {
    uploadUrl: string;
    key: string;
    message: string;
}

/**
 * Upload resume to DEV S3 bucket via presigned PUT URL.
 * Calls /api/upload-resume-dev via relative URL (current deployment's function).
 */
export const uploadResumeToS3Dev = async (file: File, applywizzId: string): Promise<string> => {
    console.log("[DEV] 🔍 Starting Secure S3 Upload...");

    if (!file || !applywizzId) {
        throw new Error("File and ApplyWizz ID are required");
    }

    try {
        // Relative URL — always hits the current deployment's own function
        const endpoint = '/api/upload-resume-dev';

        console.log(`[DEV] 📡 Requesting presigned URL for: ${applywizzId}`);

        const presignedResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                applywizz_id: applywizzId,
                fileType: file.type,
            }),
        });

        if (!presignedResponse.ok) {
            const errorData = await presignedResponse.json();
            throw new Error(errorData.error || 'Failed to get dev upload URL');
        }

        const { uploadUrl, key, message }: UploadResumeResponse = await presignedResponse.json();

        console.log(`[DEV] 📤 ${message}`);
        console.log(`[DEV] 📤 Uploading to S3: ${key}`);

        // PUT file directly to S3 using presigned URL
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
        });

        if (!uploadResponse.ok) {
            throw new Error(`[DEV] S3 Upload failed with status: ${uploadResponse.status}`);
        }

        console.log(`[DEV] ✅ Resume uploaded successfully: ${key}`);
        return key;

    } catch (error: any) {
        console.error("[DEV] ❌ Upload error:", error);
        throw new Error(`Resume upload failed: ${error.message}`);
    }
};

/**
 * Get the full DEV S3 URL from an S3 key
 */
export const getS3UrlDev = (s3Key: string): string => {
    const bucket = import.meta.env.VITE_AWS_S3_BUCKET || 'applywizz-prod';
    const region = import.meta.env.VITE_AWS_REGION || 'us-east-2';

    if (s3Key.startsWith('http://') || s3Key.startsWith('https://')) return s3Key;
    return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
};