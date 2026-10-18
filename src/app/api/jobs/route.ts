import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseAvailable } from "@/lib/prisma";
import { enqueueGpuJob } from "@/lib/queue";
import {
  dispatchMotionSwapToGpu,
  dispatchShotSynthesisToGpu,
  dispatchStoryStitchToGpu,
} from "@/lib/serverless_gpu";
import { saveJobToStore, listJobsFromStore } from "@/lib/job_store";
import { z } from "zod";
import crypto from "crypto";

const PRESET_CHARACTERS: Record<string, string> = {
  "char-aurora":
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
  "char-kai":
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
  "char-marcus":
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
  "char-sora":
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
};

const jobCreateSchema = z.object({
  type: z.enum(["MOTION_SWAP", "SHOT_SYNTHESIS", "STORY_STITCH", "EMBEDDING_EXTRACTION"]),
  userId: z.string().default("user_default"),
  projectId: z.string().optional(),
  characterId: z.string().optional(),
  characterImageUrl: z.string().optional(),
  customPrompt: z.string().optional(),
  drivingVideoUrl: z.string().optional(),
  referenceImages: z.array(z.string()).optional(),
  prompt: z.string().optional(),
  trimStartTime: z.number().default(0),
  trimEndTime: z.number().default(10),
  shotId: z.string().optional(),
  shotVideoUrls: z.array(z.string()).optional(),
  options: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = jobCreateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "Invalid job parameters",
          details: validated.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      type,
      userId,
      projectId,
      characterId,
      characterImageUrl,
      customPrompt,
      drivingVideoUrl,
      referenceImages,
      prompt,
      trimStartTime,
      trimEndTime,
      shotVideoUrls,
      options,
    } = validated.data;

    const jobId = `job_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    // Resolve target character portrait
    let resolvedCharacterImage = characterImageUrl;
    if (!resolvedCharacterImage && referenceImages && referenceImages.length > 0) {
      resolvedCharacterImage = referenceImages[0];
    }
    if (!resolvedCharacterImage && characterId && PRESET_CHARACTERS[characterId]) {
      resolvedCharacterImage = PRESET_CHARACTERS[characterId];
    }
    if (!resolvedCharacterImage) {
      resolvedCharacterImage = PRESET_CHARACTERS["char-aurora"];
    }

    // 1. Save immediately to in-memory store (globalThis.__personaJobs) for resilience
    saveJobToStore({
      id: jobId,
      userId,
      projectId,
      characterId,
      characterImageUrl: resolvedCharacterImage,
      type,
      status: "QUEUED",
      progressPercent: 5.0,
      currentStage: "Job queued in orchestration pool...",
      params: {
        drivingVideoUrl,
        referenceImages: resolvedCharacterImage ? [resolvedCharacterImage] : referenceImages,
        characterImageUrl: resolvedCharacterImage,
        customPrompt,
        trimStartTime,
        trimEndTime,
        prompt,
        shotVideoUrls,
        options,
      },
      createdAt: now,
      updatedAt: now,
    });

    // 2. Non-blocking persist to Prisma DB if accessible
    (async () => {
      if (!(await isDatabaseAvailable())) return;
      try {
        await prisma.generationJob.create({
          data: {
            id: jobId,
            userId,
            projectId,
            characterId,
            type,
            status: "QUEUED",
            progressPercent: 5.0,
            currentStage: "Job queued in orchestration pool...",
            params: JSON.parse(
              JSON.stringify({
                drivingVideoUrl,
                characterImageUrl: resolvedCharacterImage,
                referenceImages: resolvedCharacterImage ? [resolvedCharacterImage] : referenceImages,
                customPrompt,
                trimStartTime,
                trimEndTime,
                prompt,
                options,
              })
            ),
          },
        });
      } catch (dbErr) {
        // Fallback in-memory store holds state gracefully
      }
    })();

    // 3. Enqueue to BullMQ worker queue (with timeout safety)
    enqueueGpuJob({
      jobId,
      userId,
      type,
      projectId,
      characterId,
      drivingVideoUrl,
      referenceImages: resolvedCharacterImage ? [resolvedCharacterImage] : referenceImages,
      prompt,
      trimStartTime,
      trimEndTime,
      options,
    }).catch(() => {});

    // 4. Dispatch directly to serverless GPU inference runner (Fal.ai, Modal, or local emulator)
    if (type === "MOTION_SWAP") {
      dispatchMotionSwapToGpu({
        jobId,
        drivingVideoUrl:
          drivingVideoUrl ||
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        referenceImages: resolvedCharacterImage ? [resolvedCharacterImage] : (referenceImages || []),
        referenceImageUrl: resolvedCharacterImage,
        characterImageUrl: resolvedCharacterImage,
        prompt,
        customPrompt,
        trimStartTime,
        trimEndTime,
        enableSam2Isolation: (options?.enableSam2Isolation as boolean) ?? true,
        useRifeInterpolation: (options?.useRifeInterpolation as boolean) ?? true,
        enableRealEsrganUpscale: (options?.enableRealEsrganUpscale as boolean) ?? true,
        motionFidelity: (options?.motionFidelity as number) ?? 0.85,
      }).catch((err) => console.error("GPU dispatch error:", err));
    } else if (type === "SHOT_SYNTHESIS") {
      dispatchShotSynthesisToGpu({
        jobId,
        prompt: prompt || "Cinematic video shot",
        characterImages: resolvedCharacterImage ? [resolvedCharacterImage] : (referenceImages || []),
        cameraMovement: (options?.cameraMovement as string) || "Static Medium Shot",
        durationSeconds: (options?.durationSeconds as number) || 4.0,
      }).catch((err) => console.error("Shot dispatch error:", err));
    } else if (type === "STORY_STITCH") {
      dispatchStoryStitchToGpu({
        jobId,
        shotVideoUrls: shotVideoUrls || [],
        audioTrackUrl: (options?.audioTrackUrl as string) || undefined,
      }).catch((err) => console.error("Story stitch dispatch error:", err));
    }

    return NextResponse.json({
      success: true,
      jobId,
      status: "QUEUED",
      streamUrl: `/api/jobs/${jobId}/stream`,
      characterImageUrl: resolvedCharacterImage,
      createdAt: now,
    });
  } catch (error) {
    console.error("[Job Creation Error]:", error);
    return NextResponse.json(
      {
        error: "Failed to create generation job",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "user_default";

    // Attempt Prisma first if database is available, fallback to in-memory store
    if (await isDatabaseAvailable()) {
      try {
        const dbJobs = await prisma.generationJob.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 20,
        });
        if (dbJobs.length > 0) {
          return NextResponse.json({ jobs: dbJobs });
        }
      } catch {
        // Fallback
      }
    }

    const inMemJobs = listJobsFromStore(userId);
    return NextResponse.json({ jobs: inMemJobs });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to list jobs", message: (error as Error).message },
      { status: 500 }
    );
  }
}
