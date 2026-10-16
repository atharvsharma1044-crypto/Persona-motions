import { Queue, QueueOptions } from "bullmq";
import Redis, { RedisOptions } from "ioredis";

const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;
const redisTls = process.env.REDIS_TLS === "true";

export const redisConnectionOptions: RedisOptions = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  tls: redisTls ? {} : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

let redisClientInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClientInstance) {
    redisClientInstance = new Redis(redisConnectionOptions);
    redisClientInstance.on("error", (err) => {
      // Graceful logging for dev environments where Redis might be starting or simulated
      console.warn("[Redis Connection Warning]", err.message);
    });
  }
  return redisClientInstance;
}

const queueOptions: QueueOptions = {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600, // keep completed jobs for 24h
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // keep failed jobs for 7 days
    },
  },
};

export const GPU_JOB_QUEUE_NAME = "personamotion-gpu-jobs";

// Lazy initialization of queue to prevent issues in environments without Redis at build time
let gpuQueueInstance: Queue | null = null;

export function getGpuJobQueue(): Queue {
  if (!gpuQueueInstance) {
    gpuQueueInstance = new Queue(GPU_JOB_QUEUE_NAME, queueOptions);
  }
  return gpuQueueInstance;
}

export interface EnqueueJobPayload {
  jobId: string;
  userId: string;
  type: "MOTION_SWAP" | "SHOT_SYNTHESIS" | "STORY_STITCH" | "EMBEDDING_EXTRACTION";
  projectId?: string;
  characterId?: string;
  drivingVideoUrl?: string;
  referenceImages?: string[];
  prompt?: string;
  trimStartTime?: number;
  trimEndTime?: number;
  shotIds?: string[];
  options?: Record<string, unknown>;
}

/**
 * Enqueues a high-performance GPU workload with priority and retry configs.
 */
export async function enqueueGpuJob(payload: EnqueueJobPayload) {
  try {
    const queue = getGpuJobQueue();
    const job = await queue.add(payload.type, payload, {
      jobId: payload.jobId,
      priority: payload.type === "MOTION_SWAP" ? 1 : 2,
    });
    return { success: true, queueJobId: job.id };
  } catch (error) {
    console.error("[Queue Error] Failed to enqueue GPU job:", error);
    // Return gracefully to allow direct serverless invocation fallback
    return { success: false, error: (error as Error).message };
  }
}
