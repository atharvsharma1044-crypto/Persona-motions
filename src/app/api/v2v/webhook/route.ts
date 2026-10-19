import { NextRequest, NextResponse } from "next/server";
import { updateJobInStore, getJobFromStore } from "@/lib/job_store";
import { remuxAudioToGeneratedVideo } from "@/lib/ffmpeg_pipeline";

export const dynamic = "force-dynamic";

/**
 * POST /api/v2v/webhook
 * Receives async completion / failure payloads from Fal.ai, Modal, or external GPU inference workers.
 * Updates central job store and optionally triggers audio remuxing post-processing.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Support standard webhook formats: Fal.ai, Replicate, Modal, custom GPU workers
    const jobId =
      payload.job_id ||
      payload.jobId ||
      payload.request_id ||
      payload.requestId ||
      (req.nextUrl.searchParams.get("job_id") as string);

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing job_id in webhook payload or query params" },
        { status: 400 }
      );
    }

    const job = getJobFromStore(jobId);

    // Extract status & output URL from various provider formats
    const isSuccess =
      payload.status === "OK" ||
      payload.status === "COMPLETED" ||
      payload.status === "succeeded" ||
      !!payload.video_url ||
      !!payload.output_url ||
      !!payload.output?.video_url;

    const isFailure =
      payload.status === "FAILED" ||
      payload.status === "failed" ||
      payload.status === "ERROR" ||
      !!payload.error;

    if (isSuccess) {
      let outputVideoUrl =
        payload.output_video_url ||
        payload.video_url ||
        payload.output_url ||
        payload.output?.video_url ||
        payload.output?.video?.url ||
        payload.video?.url ||
        payload.resultUrl;

      // Optional post-processing: If driving video had audio and enableAudioSync was requested
      if (job?.params?.drivingVideoUrl && job?.params?.enableAudioSync) {
        try {
          const remuxResult = await remuxAudioToGeneratedVideo(
            job.params.drivingVideoUrl as string,
            outputVideoUrl
          );
          if (remuxResult.success && remuxResult.publicUrl) {
            outputVideoUrl = remuxResult.publicUrl;
          }
        } catch (remuxErr) {
          console.warn("[V2V Webhook Remux Warning]:", remuxErr);
        }
      }

      updateJobInStore(jobId, {
        status: "COMPLETED",
        progressPercent: 100,
        currentStage: "Inference completed via webhook notification. Master video ready.",
        resultUrl: outputVideoUrl,
        completedAt: new Date().toISOString(),
      });

      return NextResponse.json({
        received: true,
        job_id: jobId,
        status: "completed",
        output_video_url: outputVideoUrl,
      });
    }

    if (isFailure) {
      const errorMessage =
        payload.error ||
        payload.message ||
        payload.logs ||
        "Inference failed on remote worker.";

      updateJobInStore(jobId, {
        status: "FAILED",
        error: errorMessage,
        currentStage: `Inference failed: ${errorMessage}`,
      });

      return NextResponse.json({
        received: true,
        job_id: jobId,
        status: "failed",
        error: errorMessage,
      });
    }

    // Intermediate progress update webhook
    if (payload.progress || payload.progressPercent) {
      updateJobInStore(jobId, {
        status: "PROCESSING",
        progressPercent: payload.progress || payload.progressPercent,
        currentStage: payload.stage || payload.message || "Generating frames on GPU worker...",
      });
    }

    return NextResponse.json({ received: true, job_id: jobId, status: "processing" });
  } catch (error) {
    console.error("[POST /api/v2v/webhook Error]:", error);
    return NextResponse.json(
      { error: "Webhook processing failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}
