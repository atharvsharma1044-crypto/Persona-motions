import { NextRequest, NextResponse } from "next/server";
import { saveJobToStore, updateJobInStore, ActiveJob } from "@/lib/job_store";
import { enqueueGpuJob } from "@/lib/queue";
import { dispatchMotionSwapToGpu, hasValidFalKey } from "@/lib/serverless_gpu";
import { normalizeDrivingVideo } from "@/lib/ffmpeg_pipeline";

export const dynamic = "force-dynamic";

/**
 * POST /api/v2v/generate
 * Accepts video file / URL, reference character image or prompt, and V2V parameters.
 * Pushes job to BullMQ / Redis queue, returns job_id and initial queued status.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      drivingVideoUrl,
      characterImageUrl,
      characterPrompt,
      aspectRatio = "16:9",
      model = "mimic-motion", // "mimic-motion" | "wan-v2v" | "champ" | "kling-motion"
      motionFidelity = 0.85,
      trimStartTime = 0,
      trimEndTime = 15,
      enableAudioSync = true,
      webhookUrl,
    } = body;

    if (!drivingVideoUrl) {
      return NextResponse.json(
        { error: "drivingVideoUrl is required for video-to-video motion transfer" },
        { status: 400 }
      );
    }

    if (!characterImageUrl && !characterPrompt) {
      return NextResponse.json(
        { error: "Either characterImageUrl or characterPrompt is required" },
        { status: 400 }
      );
    }

    const jobId = `v2v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Normalize model endpoint name to Fal.ai / Modal models
    let resolvedModelEndpoint = "fal-ai/mimic-motion";
    if (model === "wan-v2v" || model.includes("wan")) {
      resolvedModelEndpoint = "fal-ai/wan-vace";
    } else if (model === "champ" || model.includes("champ")) {
      resolvedModelEndpoint = "fal-ai/champ";
    } else if (model === "kling-motion" || model.includes("kling")) {
      resolvedModelEndpoint = "fal-ai/kling-video/v3/standard/motion-control";
    }

    // 1. Initial Job State
    const initialJob: ActiveJob = {
      id: jobId,
      userId: body.userId || "anonymous_v2v_user",
      type: "MOTION_SWAP",
      status: "QUEUED",
      progressPercent: 5,
      currentStage: "Job enqueued in BullMQ. Normalizing input video...",
      characterImageUrl: characterImageUrl || "",
      falModelEndpoint: resolvedModelEndpoint,
      params: {
        drivingVideoUrl,
        characterImageUrl,
        characterPrompt,
        aspectRatio,
        model,
        resolvedModelEndpoint,
        motionFidelity,
        trimStartTime,
        trimEndTime,
        enableAudioSync,
        webhookUrl,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveJobToStore(initialJob);

    // 2. Pre-processing: Normalize driving video if local path exists
    try {
      await normalizeDrivingVideo({
        inputPathOrUrl: drivingVideoUrl,
        aspectRatio: aspectRatio as any,
        targetFps: 30,
        maxDurationSeconds: Math.min(30, trimEndTime - trimStartTime || 15),
      });
    } catch (normErr) {
      console.warn("[V2V Normalization Note]:", normErr);
    }

    // 3. Push to Redis + BullMQ Queue
    await enqueueGpuJob({
      jobId,
      userId: initialJob.userId,
      type: "MOTION_SWAP",
      drivingVideoUrl,
      referenceImages: characterImageUrl ? [characterImageUrl] : [],
      prompt: characterPrompt,
      trimStartTime,
      trimEndTime,
      options: {
        aspectRatio,
        model: resolvedModelEndpoint,
        motionFidelity,
        enableAudioSync,
        webhookUrl,
      },
    });

    // 4. Dispatch to Inference Engine (Fal.ai, Modal, or Studio Neural Engine)
    dispatchMotionSwapToGpu({
      jobId,
      drivingVideoUrl,
      characterImageUrl,
      referenceImages: characterImageUrl ? [characterImageUrl] : [],
      modelEndpoint: resolvedModelEndpoint,
      customPrompt: characterPrompt,
      trimStartTime,
      trimEndTime,
      motionFidelity,
    }).catch((err) => {
      console.error("[V2V Background Execution Error]:", err);
      updateJobInStore(jobId, {
        status: "FAILED",
        error: (err as Error).message,
        currentStage: `Inference error: ${(err as Error).message}`,
      });
    });

    return NextResponse.json(
      {
        success: true,
        job_id: jobId,
        status: "queued",
        model: resolvedModelEndpoint,
        message: "Video-to-Video motion transfer job enqueued successfully.",
        poll_url: `/api/v2v/status/${jobId}`,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[POST /api/v2v/generate Error]:", error);
    return NextResponse.json(
      { error: "Failed to dispatch V2V job", details: (error as Error).message },
      { status: 500 }
    );
  }
}
