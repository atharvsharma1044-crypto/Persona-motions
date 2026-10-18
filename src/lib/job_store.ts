import { JobStatus, JobType } from "@/types";

export interface ActiveJob {
  id: string;
  userId: string;
  projectId?: string;
  characterId?: string;
  characterImageUrl?: string;
  type: JobType;
  status: JobStatus;
  progressPercent: number;
  currentStage?: string;
  error?: string;
  resultUrl?: string;
  falRequestId?: string;
  falModelEndpoint?: string;
  falStatusUrl?: string;
  falResponseUrl?: string;
  params?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type JobState = ActiveJob;

// Global singleton map to ensure persistence across all Next.js API routes & dev reloads
const globalForJobs = globalThis as unknown as {
  __personaJobs: Map<string, ActiveJob> | undefined;
  inMemoryJobsStore: Map<string, ActiveJob> | undefined;
};

export const inMemoryJobsStore: Map<string, ActiveJob> =
  globalForJobs.__personaJobs ??
  globalForJobs.inMemoryJobsStore ??
  new Map<string, ActiveJob>();

globalForJobs.__personaJobs = inMemoryJobsStore;
globalForJobs.inMemoryJobsStore = inMemoryJobsStore;

export function saveJobToStore(job: ActiveJob): void {
  inMemoryJobsStore.set(job.id, {
    ...job,
    updatedAt: new Date().toISOString(),
  });
}

export function getJobFromStore(id: string): ActiveJob | undefined {
  return inMemoryJobsStore.get(id);
}

export function updateJobInStore(
  id: string,
  updates: Partial<ActiveJob>
): ActiveJob | undefined {
  const existing = inMemoryJobsStore.get(id);
  if (!existing) return undefined;

  const updated: ActiveJob = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  inMemoryJobsStore.set(id, updated);
  return updated;
}

export function listJobsFromStore(userId?: string): ActiveJob[] {
  const all = Array.from(inMemoryJobsStore.values());
  if (!userId) return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return all
    .filter((j) => j.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
