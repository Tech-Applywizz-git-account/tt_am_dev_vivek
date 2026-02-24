/**
 * S3 Resume Upload Service — DEV
 * Uses /api/upload-resume-dev (reads _DEV env vars → dev S3 bucket).
 * Keep s3Service.ts (production) untouched.
 */

interface UploadResumeResponse {
    uploadUrl: string;
    key: string;
    isReplacement: boolean;
    existingResumeUrl?: string;
    message: string;
}

/**
 * Upload resume to the DEV S3 bucket via /api/upload-resume-dev.
 * Relative URL → always hits the current deployment's own function.
 *
 * @param file - The resume file to upload
 * @param applywizzId - The user's ApplyWizz ID
 * @returns The S3 key (path) of the uploaded file
 */
export const uploadResumeToS3Dev = async (file: File, applywizzId: string): Promise<string> => {
    console.log("🔍 [DEV] Starting Secure S3 Upload...");

    if (!file || !applywizzId) {
        throw new Error("File and ApplyWizz ID are required");
    }

    try {
        // Always use relative URL — hits this deployment's own /api/upload-resume-dev
        // which reads VITE_AWS_*_DEV env vars and uploads to the dev S3 bucket.
        const endpoint = '/api/upload-resume-dev';

        console.log(`📡 [DEV] Requesting presigned URL for: ${applywizzId}`);

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

        const { uploadUrl, key, isReplacement, message }: UploadResumeResponse = await presignedResponse.json();

        console.log(`📤 [DEV] ${message}`);
        console.log(`📤 [DEV] Uploading to S3: ${key}`);

        // Upload file directly to dev S3 using presigned URL
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
        });

        if (!uploadResponse.ok) {
            throw new Error(`[DEV] S3 Upload failed with status: ${uploadResponse.status}`);
        }

        console.log(`✅ [DEV] Resume uploaded successfully to: ${key}`);
        return key;

    } catch (error: any) {
        console.error("❌ [DEV] S3 Upload Error:", error);
        throw new Error(`Resume upload failed: ${error.message}`);
    }
};

/**
 * Get the full DEV S3 URL from a key/path
 */
export const getS3UrlDev = (s3Key: string): string => {
    const bucket = import.meta.env.VITE_AWS_S3_BUCKET_DEV || 'applywizz-dev';
    const region = import.meta.env.VITE_AWS_REGION_DEV || 'us-east-2';

    if (s3Key.startsWith('http://') || s3Key.startsWith('https://')) {
        return s3Key;
    }

    return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
};
