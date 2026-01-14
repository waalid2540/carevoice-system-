import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export interface UploadResult {
  url: string;
  key: string;
}

/**
 * Upload a file to R2 storage
 */
export async function uploadToR2(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string = "audio"
): Promise<UploadResult> {
  const key = `${folder}/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return {
    url: `${R2_PUBLIC_URL}/${key}`,
    key,
  };
}

/**
 * Delete a file from R2 storage
 */
export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Get the key from a full R2 URL
 */
export function getKeyFromUrl(url: string): string | null {
  if (!url.startsWith(R2_PUBLIC_URL)) {
    return null;
  }
  return url.replace(`${R2_PUBLIC_URL}/`, "");
}

/**
 * Validate audio file type
 */
export function isValidAudioType(contentType: string): boolean {
  const validTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"];
  return validTypes.includes(contentType);
}

/**
 * Max file size in bytes (10MB)
 */
export const MAX_AUDIO_SIZE = 10 * 1024 * 1024;
