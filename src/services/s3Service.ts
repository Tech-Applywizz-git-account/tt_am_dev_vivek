/**
 * S3 Resume Upload Service
 * Handles secure resume uploads using presigned URLs
 */

interface UploadResumeResponse {
    uploadUrl: string;
    key: string;
    isReplacement: boolean;
    existingResumeUrl?: string;
    message: string;
}

/**
 * Upload resume to S3 using presigned URL approach
 * @param file - The resume file to upload
 * @param applywizzId - The user's ApplyWizz ID
 * @returns The S3 key (path) of the uploaded file
 */
export const uploadResumeToS3 = async (file: File, applywizzId: string): Promise<string> => {
    console.log("🔍 Starting Secure S3 Upload...");

    if (!file || !applywizzId) {
        throw new Error("File and ApplyWizz ID are required");
    }

    try {
        // Step 1: Get presigned URL from backend API
        const apiUrl = import.meta.env.VITE_TICKETING_TOOL_API_URL || '';
        const endpoint = apiUrl ? `${apiUrl}/api/upload-resume` : '/api/upload-resume';

        console.log(`📡 Requesting presigned URL for: ${applywizzId}`);

        const presignedResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                applywizz_id: applywizzId,
                fileType: file.type,
            }),
        });

        if (!presignedResponse.ok) {
            const errorData = await presignedResponse.json();
            throw new Error(errorData.error || 'Failed to get upload URL');
        }

        const { uploadUrl, key, isReplacement, message }: UploadResumeResponse = await presignedResponse.json();

        console.log(`📤 ${message}`);
        console.log(`📤 Uploading to S3: ${key}`);

        // Step 2: Upload file directly to S3 using presigned URL
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type,
            },
        });

        if (!uploadResponse.ok) {
            throw new Error(`S3 Upload failed with status: ${uploadResponse.status}`);
        }

        console.log(`✅ Resume uploaded successfully to: ${key}`);

        // Return the S3 key (path) for database update
        return key;

    } catch (error: any) {
        console.error("❌ S3 Upload Error:", error);
        throw new Error(`Resume upload failed: ${error.message}`);
    }
};

/**
 * Get the full S3 URL from a key/path
 * @param s3Key - The S3 key (e.g., "resumes/APW-123-resume.pdf")
 * @returns Full S3 URL
 */
export const getS3Url = (s3Key: string): string => {
    const bucket = import.meta.env.VITE_AWS_S3_BUCKET || 'applywizz-prod';
    const region = import.meta.env.VITE_AWS_REGION || 'us-east-2';

    // If it's already a full URL, return as-is
    if (s3Key.startsWith('http://') || s3Key.startsWith('https://')) {
        return s3Key;
    }

    // Construct S3 URL
    return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
};
