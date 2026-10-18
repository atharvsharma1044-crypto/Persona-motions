import { NextRequest, NextResponse } from "next/server";
import { createPresignedUploadUrl } from "@/lib/s3";
import { z } from "zod";
import crypto from "crypto";

const uploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().refine(
    (type) =>
      [
        "video/mp4",
        "video/quicktime",
        "video/webm",
        "image/png",
        "image/jpeg",
        "image/webp",
      ].includes(type),
    {
      message:
        "Invalid contentType. Allowed types: video/mp4, video/quicktime, video/webm, image/png, image/jpeg, image/webp",
    }
  ),
  fileSize: z.number().positive().max(500 * 1024 * 1024, "Max file size is 500MB"),
  folder: z.enum(["characters", "driving_videos", "rendered_shots", "exports"]),
  characterId: z.string().optional(),
  projectId: z.string().optional(),
});

function isS3Configured(): boolean {
  const key = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  if (!key || !secret) return false;
  if (
    key === "your_r2_or_s3_access_key" ||
    key === "your_access_key" ||
    key === "mock-access-key" ||
    key.includes("your_") ||
    key.includes("your-")
  ) {
    return false;
  }
  return true;
}

function hasValidFalKey(): boolean {
  const falKey = process.env.FAL_KEY;
  return (
    !!falKey &&
    falKey.trim().length > 0 &&
    falKey !== "your_fal_ai_key" &&
    !falKey.includes("your_")
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = uploadSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validated.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { filename, contentType, folder, characterId, projectId } = validated.data;

    // Sanitize filename and create unique collision-resistant key
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();
    const randomSuffix = crypto.randomBytes(6).toString("hex");
    const timestamp = Date.now();

    let keyPrefix = folder as string;
    if (folder === "characters" && characterId) {
      keyPrefix = `characters/${characterId}`;
    } else if (folder === "driving_videos" && projectId) {
      keyPrefix = `projects/${projectId}/driving`;
    }

    const uniqueFilename = `${timestamp}-${randomSuffix}-${sanitizedName}`;
    const key = `${keyPrefix}/${uniqueFilename}`;

    // 1. If real AWS S3 / Cloudflare R2 credentials exist, generate presigned PUT URL
    if (isS3Configured()) {
      try {
        const { uploadUrl, publicUrl } = await createPresignedUploadUrl({
          key,
          contentType,
          expiresInSeconds: 3600,
          metadata: {
            "original-name": encodeURIComponent(filename),
            "uploaded-at": new Date().toISOString(),
          },
        });

        return NextResponse.json({
          success: true,
          uploadUrl,
          publicUrl,
          key,
          expiresInSeconds: 3600,
          headers: {
            "Content-Type": contentType,
          },
          storageProvider: "s3_or_r2",
        });
      } catch (s3Err) {
        console.warn("[S3 Presigned Error, falling back to Fal/Direct]:", s3Err);
      }
    }

    // 2. If FAL_KEY is configured, use Fal.ai Cloud Storage API
    // https://rest.alpha.fal.ai/storage/upload/initiate returns a direct PUT upload URL and a public CDN URL
    if (hasValidFalKey()) {
      try {
        const falRes = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate", {
          method: "POST",
          headers: {
            Authorization: `Key ${process.env.FAL_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file_name: uniqueFilename,
            content_type: contentType,
          }),
        });

        if (falRes.ok) {
          const falData = await falRes.json();
          console.log(`[Fal.ai Storage Initiated] File: ${uniqueFilename} -> ${falData.file_url}`);
          return NextResponse.json({
            success: true,
            uploadUrl: falData.upload_url,
            publicUrl: falData.file_url,
            key,
            expiresInSeconds: 3600,
            headers: {
              "Content-Type": contentType,
            },
            storageProvider: "fal_storage",
          });
        }
      } catch (falErr) {
        console.warn("[Fal Storage Fallback Failed, falling back to local direct]:", falErr);
      }
    }

    // 3. Seamless local direct upload fallback for local development
    const directUploadUrl = `/api/upload/direct?filename=${encodeURIComponent(uniqueFilename)}&folder=${folder}`;
    const localPublicUrl = `/uploads/${uniqueFilename}`;

    return NextResponse.json({
      success: true,
      uploadUrl: directUploadUrl,
      publicUrl: localPublicUrl,
      key,
      expiresInSeconds: 3600,
      headers: {
        "Content-Type": contentType,
      },
      storageProvider: "local",
    });
  } catch (error) {
    console.error("[Presigned Upload API Error]:", error);
    return NextResponse.json(
      {
        error: "Failed to generate presigned upload URL",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
