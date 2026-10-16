import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueGpuJob } from "@/lib/queue";
import { dispatchMotionSwapToGpu, dispatchShotSynthesisToGpu } from "@/lib/serverless_gpu";
import { z } from "zod";
import crypto from "crypto";

const jobCreateSchema = z.object({
  type: z.enum(["MOTION_SWAP", "SHOT_SYNTHESIS", "STORY_STITCH", "EMBEDDING_EXTRACTION"]),
  userId: z.string().default("user_default"),
  projectId: z.string().optional(),
  characterId: z.string().optional(),
  drivingVideoUrl: z.string().url().optional(),
  referenceImages: z.array(z.string().url()).optional(),
  prompt: z.string().optional(),
  trimStartTime: z.number().default(0),
  trimEndTime: z.number().default(10),
  shotId: z.string().optional(),
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
      drivingVideoUrl,
      referenceImages,
      prompt,
      trimStartTime,
      trimEndTime,
      shotId,
      options,
    } = validated.data;

    const jobId = `job_${crypto.randomUUID()}`;

    // Attempt to persist in Prisma DB
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
              referenceImages,
              trimStartTime,
              trimEndTime,
              prompt,
              options,
            })
          ),
        },
      });
    } catch (dbErr) {
      console.warn("[Prisma DB Warning - using detached execution]:", (dbErr as Error).message);
    }

    // Enqueue to BullMQ worker queue
    await enqueueGpuJob({
      jobId,
      userId,
      type,
      projectId,
      characterId,
      drivingVideoUrl,
      referenceImages,
      prompt,
      trimStartTime,
      trimEndTime,
      options,
    });

    // Dispatch directly to serverless GPU inference runner
    if (type === "MOTION_SWAP" && drivingVideoUrl) {
      await dispatchMotionSwapToGpu({
        jobId,
        drivingVideoUrl,
        referenceImages: referenceImages || [],
        trimStartTime,
        trimEndTime,
        enableSam2Isolation: (options?.enableSam2Isolation as boolean) ?? true,
        useRifeInterpolation: (options?.useRifeInterpolation as boolean) ?? true,
        enableRealEsrganUpscale: (options?.enableRealEsrganUpscale as boolean) ?? true,
      });
    } else if (type === "SHOT_SYNTHESIS" && prompt) {
      await dispatchShotSynthesisToGpu({
        jobId,
        prompt,
        characterImages: referenceImages || [],
        cameraMovement: (options?.cameraMovement as string) || "Static Medium Shot",
        durationSeconds: (options?.durationSeconds as number) || 4.0,
      });
    }

    return NextResponse.json({
      success: true,
      jobId,
      status: "QUEUED",
      streamUrl: `/api/jobs/${jobId}/stream`,
      createdAt: new Date().toISOString(),
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

    try {
      const jobs = await prisma.generationJob.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return NextResponse.json({ jobs });
    } catch {
      return NextResponse.json({ jobs: [] });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to list jobs", message: (error as Error).message },
      { status: 500 }
    );
  }
}
