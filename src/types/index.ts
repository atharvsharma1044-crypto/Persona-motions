export type CharacterAngle =
  | "front"
  | "side"
  | "45_degree"
  | "expression"
  | "full_body";

export interface CharacterReferenceImage {
  id: string;
  url: string;
  angle: CharacterAngle;
  label?: string;
  isDefault?: boolean;
}

export interface CharacterModel {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  referenceImages: CharacterReferenceImage[];
  embeddingData?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export type ProjectMode = "STORY_TO_VIDEO" | "MOTION_SWAP";
export type ProjectStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
export type ShotStatus = "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
export type JobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
export type JobType =
  | "MOTION_SWAP"
  | "SHOT_SYNTHESIS"
  | "STORY_STITCH"
  | "EMBEDDING_EXTRACTION";

export interface ShotItem {
  id: string;
  projectId: string;
  sequenceOrder: number;
  prompt: string;
  negativePrompt?: string | null;
  cameraMovement: string;
  durationSeconds: number;
  characterState?: string | null;
  outputVideoUrl?: string | null;
  status: ShotStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectModel {
  id: string;
  userId: string;
  title: string;
  mode: ProjectMode;
  status: ProjectStatus;
  characterId?: string | null;
  character?: CharacterModel | null;
  drivingVideoUrl?: string | null;
  trimStartTime?: number | null;
  trimEndTime?: number | null;
  shots?: ShotItem[];
  stitchedVideoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationJobModel {
  id: string;
  userId: string;
  projectId?: string | null;
  characterId?: string | null;
  type: JobType;
  status: JobStatus;
  progressPercent: number;
  currentStage?: string | null;
  error?: string | null;
  resultUrl?: string | null;
  params?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// API Payloads
export interface PresignedUploadRequest {
  filename: string;
  contentType: string;
  fileSize: number;
  folder: "characters" | "driving_videos" | "rendered_shots" | "exports";
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
  expiresInSeconds: number;
  headers?: Record<string, string>;
}

export interface DecomposeStoryRequest {
  storyPrompt: string;
  characterContext?: {
    name: string;
    description?: string;
  };
  targetShotCount?: number;
  stylePreset?: "cinematic" | "anime" | "photorealistic" | "hyperlapse" | "noir";
}

export interface DecomposedShot {
  sequenceOrder: number;
  prompt: string;
  negativePrompt?: string;
  cameraMovement:
    | "Static Medium Shot"
    | "Push In Close-Up"
    | "Orbit Left"
    | "Orbit Right"
    | "Crane Down"
    | "Tracking Shot Following Subject"
    | "Wide Dutch Angle"
    | "Slow Zoom Out";
  durationSeconds: number;
  characterState: string;
  lightingAndAtmosphere: string;
  soundCue?: string;
}

export interface DecomposeStoryResponse {
  title: string;
  narrativeSummary: string;
  shots: DecomposedShot[];
  estimatedTotalDurationSeconds: number;
}

export interface MotionSwapRequest {
  projectId?: string;
  characterId: string;
  drivingVideoUrl: string;
  trimStartTime: number;
  trimEndTime: number;
  options?: {
    enableSam2Isolation?: boolean;
    useRifeInterpolation?: boolean;
    enableRealEsrganUpscale?: boolean;
    preserveSourceBackground?: boolean;
    motionFidelity?: number; // 0.0 to 1.0
  };
}
