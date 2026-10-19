import { NextRequest, NextResponse } from "next/server";
import { getJobFromStore } from "@/lib/job_store";
import { pollFalJobStatus } from "@/lib/serverless_gpu";

export const dynamic = "force-dynamic";

/**
 * GET /api/v2v/status/[job_id]
 * Returns current job progress, state (queued, processing, completed, failed), stage message, and final output video URL.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { job_id: string } }
) {
  try {
    const { job_id } = params;

    if (!job_id) {
      return NextResponse.json({ error: "job_id is required" }, { status: 400 });
    }

    // Check if there is an active Fal.ai queue request to poll
    let job = getJobFromStore(job_id);
    if (job?.falRequestId && job.status === "PROCESSING") {
      try {
        await pollFalJobStatus(job_id);
        job = getJobFromStore(job_id);
      } catch (pollErr) {
        console.warn("[V2V Status Poll Warning]:", pollErr);
      }
    }

    if (!job) {
      return NextResponse.json({ error: "Job not found", job_id }, { status: 404 });
    }

    // Map internal status to requested schema: 'queued' | 'processing' | 'completed' | 'failed'
    const statusMap: Record<string, "queued" | "processing" | "completed" | "failed"> = {
      QUEUED: "queued",
      PROCESSING: "processing",
      COMPLETED: "completed",
      FAILED: "failed",
    };

    const status = statusMap[job.status] || "processing";

    return NextResponse.json({
      job_id: job.id,
      status,
      progress: job.progressPercent,
      stage: job.currentStage || "Processing video-to-video motion transfer...",
      output_video_url: job.resultUrl || null,
      error: job.error || null,
      created_at: job.createdAt,
      updated_at: job.updatedAt,
      completed_at: job.completedAt || null,
    });
  } catch (error) {
    console.error("[GET /api/v2v/status Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch V2V job status", details: (error as Error).message },
      { status: 500 }
    );
  }
}
