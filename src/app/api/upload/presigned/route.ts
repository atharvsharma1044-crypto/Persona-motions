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

    const key = `${keyPrefix}/${timestamp}-${randomSuffix}-${sanitizedName}`;

    // Generate presigned PUT URL with 60-minute expiration
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
