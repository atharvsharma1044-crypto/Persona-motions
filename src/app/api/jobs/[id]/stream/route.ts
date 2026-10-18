import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getJobFromStore } from "@/lib/job_store";
import { pollFalJobStatus } from "@/lib/serverless_gpu";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const jobId = params.id;

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Helper to send formatted SSE packet
  const sendEvent = async (event: string, data: Record<string, unknown>) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(payload));
  };

  (async () => {
    let isTerminated = false;
    let pollCount = 0;
    const maxPolls = 200; // ~5-6 minutes max lifetime for SSE connection

    // Monitor for client disconnect / navigation away
    req.signal.addEventListener("abort", () => {
      isTerminated = true;
      writer.close().catch(() => {});
    });

    try {
      while (!isTerminated && pollCount < maxPolls) {
        pollCount++;

        // 1. If job has Fal.ai request_id, refresh status directly from Fal API
        const inMemJob = getJobFromStore(jobId);
        if (inMemJob && inMemJob.falRequestId && inMemJob.status !== "COMPLETED" && inMemJob.status !== "FAILED") {
          try {
            await pollFalJobStatus(jobId);
          } catch (pollErr) {
            console.warn(`[SSE Fal Poll Warning]:`, pollErr);
          }
        }

        // 2. Read latest snapshot from in-memory store
        let currentJob = getJobFromStore(jobId);

        // 3. If not in memory store, try Prisma DB
        if (!currentJob) {
          try {
            const dbJob = await prisma.generationJob.findUnique({
              where: { id: jobId },
            });
            if (dbJob) {
              currentJob = {
                id: dbJob.id,
                userId: dbJob.userId,
                type: dbJob.type,
                status: dbJob.status,
                progressPercent: dbJob.progressPercent,
                currentStage: dbJob.currentStage || undefined,
                resultUrl: dbJob.resultUrl || undefined,
                error: dbJob.error || undefined,
                createdAt: dbJob.createdAt.toISOString(),
                updatedAt: dbJob.updatedAt.toISOString(),
              };
            }
          } catch {
            // DB offline or detached execution
          }
        }

        if (currentJob) {
          // Send live SSE progress update
          await sendEvent("progress", {
            jobId: currentJob.id,
            status: currentJob.status,
            progressPercent: currentJob.progressPercent,
            currentStage: currentJob.currentStage || "Processing neural diffusion layers...",
            resultUrl: currentJob.resultUrl,
            error: currentJob.error,
          });

          // Check for terminal states
          if (currentJob.status === "COMPLETED") {
            await sendEvent("done", {
              jobId: currentJob.id,
              status: "COMPLETED",
              progressPercent: 100,
              resultUrl: currentJob.resultUrl,
              currentStage: currentJob.currentStage || "Retargeting pipeline completed successfully!",
            });
            break;
          }

          if (currentJob.status === "FAILED") {
            await sendEvent("done", {
              jobId: currentJob.id,
              status: "FAILED",
              progressPercent: currentJob.progressPercent,
              error: currentJob.error || "Inference pipeline encountered an unrecoverable error.",
              currentStage: currentJob.currentStage || "Failed",
            });
            break;
          }
        } else {
          // Job not found or initial registration window
          await sendEvent("progress", {
            jobId,
            status: "QUEUED",
            progressPercent: Math.min(15, pollCount * 3),
            currentStage: "Locating job in orchestration queue...",
          });
        }

        // Poll interval: 1500ms
        await new Promise((resolve) => setTimeout(resolve, 1500));
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
      "X-Accel-Buffering": "no", // Nginx / Vercel direct flush
    },
  });
}
