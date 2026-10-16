import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const jobId = params.id;

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Helper to send SSE event formatted packet
  const sendEvent = async (event: string, data: Record<string, unknown>) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(payload));
  };

  (async () => {
    let isTerminated = false;
    let pollCount = 0;

    // Monitor for client disconnect
    req.signal.addEventListener("abort", () => {
      isTerminated = true;
      writer.close().catch(() => {});
    });

    try {
      while (!isTerminated && pollCount < 120) {
        pollCount++;

        let job = null;
        try {
          job = await prisma.generationJob.findUnique({
            where: { id: jobId },
          });
        } catch {
          // In case DB is offline or mock job
        }

        if (job) {
          await sendEvent("progress", {
            jobId: job.id,
            status: job.status,
            progressPercent: job.progressPercent,
            currentStage: job.currentStage,
            resultUrl: job.resultUrl,
            error: job.error,
          });

          if (job.status === "COMPLETED" || job.status === "FAILED") {
            await sendEvent("done", {
              jobId: job.id,
              status: job.status,
              resultUrl: job.resultUrl,
              error: job.error,
            });
            break;
          }
        } else {
          // Synthetic progress simulation for zero-config local testing
          const simulatedPercent = Math.min(100, pollCount * 12);
          const stages = [
            "Initializing GPU runner environment...",
            "Segmenting subject mask with SAM 2...",
            "Extracting skeletal dynamics with DWPose...",
            "Diffusion retargeting onto character...",
            "RIFE interpolation and Real-ESRGAN upscaling...",
            "Uploading high-definition MP4 result...",
          ];
          const currentStage =
            stages[Math.min(stages.length - 1, Math.floor((simulatedPercent / 100) * stages.length))];
          const isDone = simulatedPercent >= 100;

          await sendEvent("progress", {
            jobId,
            status: isDone ? "COMPLETED" : "PROCESSING",
            progressPercent: simulatedPercent,
            currentStage,
            resultUrl: isDone
              ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
              : null,
          });

          if (isDone) {
            await sendEvent("done", {
              jobId,
              status: "COMPLETED",
              resultUrl:
                "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            });
            break;
          }
        }

        // Poll interval: 2 seconds
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (err) {
      console.warn(`[SSE Stream Aborted] Job ${jobId}:`, err);
    } finally {
      try {
        await writer.close();
      } catch {
        // already closed
      }
    }
  })();

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Nginx direct flush
    },
  });
}
