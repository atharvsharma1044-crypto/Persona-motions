import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION || "auto";
const endpoint = process.env.AWS_ENDPOINT; // Set for Cloudflare R2 or MinIO
const bucket = process.env.AWS_S3_BUCKET || "personamotion-vault";
const cdnUrl = process.env.NEXT_PUBLIC_STORAGE_CDN_URL;

export const s3Client = new S3Client({
  region,
  endpoint: endpoint || undefined,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "mock-access-key",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "mock-secret-key",
  },
  forcePathStyle: !!endpoint, // Required for Cloudflare R2 and MinIO custom endpoints
});

export interface PresignedUploadOptions {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
  maxContentLength?: number;
  metadata?: Record<string, string>;
}

/**
 * Generates an authorized presigned PUT URL allowing client-side direct upload to S3/R2.
 */
export async function createPresignedUploadUrl({
  key,
  contentType,
  expiresInSeconds = 3600,
  metadata = {},
}: PresignedUploadOptions): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    Metadata: metadata,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: expiresInSeconds,
  });

  const publicUrl = getPublicFileUrl(key);

  return {
    uploadUrl,
    publicUrl,
    key,
  };
}

/**
 * Generates a presigned GET URL for private files with time-limited read access.
 */
export async function createPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, {
    expiresIn: expiresInSeconds,
  });
}

/**
 * Returns the public CDN / direct URL for an object key.
 */
export function getPublicFileUrl(key: string): string {
  if (cdnUrl) {
    const cleanCdn = cdnUrl.replace(/\/$/, "");
    return `${cleanCdn}/${key}`;
  }
  if (endpoint) {
    return `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Deletes an object from the S3/R2 storage bucket.
 */
export async function deleteS3File(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  await s3Client.send(command);
}
