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
      scenePrompt,
      negativePrompt = "blurry, extra limbs, distorted fingers, warped card, bad anatomy",
      preserveProps = true,
      modelEngine = "wan2.1-v2v",
      depthWeight = 0.85,
      poseWeight = 0.70,
      aspectRatio = "16:9",
      model = "wan2.1-v2v", // "wan2.1-v2v" | "cogvideox-fun" | "mimic-motion" | "champ"
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

    // Normalize model endpoint name to open-weights Wan 2.1 / CogVideoX / Modal models
    const chosenModel = modelEngine || model;
    let resolvedModelEndpoint = "wan2.1-v2v";
    if (chosenModel === "cogvideox-fun" || chosenModel.includes("cogvideo")) {
      resolvedModelEndpoint = "cogvideox-fun";
    } else if (chosenModel === "mimic-motion" || chosenModel.includes("mimic")) {
      resolvedModelEndpoint = "mimic-motion";
    } else if (chosenModel === "champ" || chosenModel.includes("champ")) {
      resolvedModelEndpoint = "champ";
    }

    // 1. Initial Job State
    const initialJob: ActiveJob = {
      id: jobId,
      userId: body.userId || "anonymous",
      type: "CREATIVE_V2V",
      status: "QUEUED",
      progressPercent: 5,
      currentStage: "Job enqueued in open-source V2V pipeline. Normalizing video & extracting depth...",
      characterImageUrl: characterImageUrl || "",
      falModelEndpoint: resolvedModelEndpoint,
      params: {
        drivingVideoUrl,
        characterImageUrl,
        characterPrompt,
        scenePrompt,
        negativePrompt,
        preserveProps,
        modelEngine: resolvedModelEndpoint,
        depthWeight,
        poseWeight,
        aspectRatio,
        model: resolvedModelEndpoint,
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
