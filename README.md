# PersonaMotion Web

> **Production-Ready, Cloud-Native AI Video Synthesis & Character Retargeting Studio**

PersonaMotion Web is an end-to-end cloud platform designed for character-consistent AI video generation and high-fidelity motion retargeting. Built on **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, **Cloudflare R2 / AWS S3**, **BullMQ / Redis**, and **Modal.com Serverless GPUs (A100/H100)**.

---

## 🌟 Core Application Capabilities

### Mode A: Story-to-Video (Character-Consistent Storyboard)
1. **Cloud Character Vault**: Store multi-angle character reference portraits (front, 45°, side, expressions) securely in Cloudflare R2 / AWS S3.
2. **AI Storyboard Breakdown**: LLM director (OpenAI GPT-4o / Claude 3.5) parses natural language story scripts into cinematic shot cards (visual prompts, camera motion, scene duration, character emotion).
3. **Consistent Video Generation**: Serverless GPU workers execute video diffusion (Wan 2.1 / CogVideoX) conditioned on InstantID and IP-Adapter facial embeddings.
4. **Cloud Auto-Stitching**: Automated video rendering worker concatenates individual shots and audio into a seamless MP4 sequence.

### Mode B: Motion Clone & Character Swap (Video-to-Video)
1. **Driving Video Ingestion & Browser Trimming**: Upload user videos with sub-second trimming (3–15 seconds) directly to Cloudflare R2 / AWS S3 using presigned PUT URLs.
2. **Target Persona Conditioning**: Select any persona from your Vault or upload a new photo.
3. **Full Neural Retargeting Stack**:
   - **SAM 2 (Segment Anything 2)**: Foreground subject isolation and alpha mask generation.
   - **DWPose + LivePortrait**: 3D skeletal dynamics and micro facial expression tracking.
   - **MimicMotion / LivePortrait**: Motion retargeting onto target character embeddings.
   - **RIFE & Real-ESRGAN**: Temporal jitter elimination via frame interpolation and 4K super-resolution upscaling.
4. **Synchronized Dual-View Playback**: Interactive split-curtain slider and side-by-side video player with synchronized scrub, frame stepping (1/30s), and variable speed controls.

---

## 🏗️ Cloud Tech Stack & Architecture

```mermaid
flowchart TD
    Client["Next.js 14 Client (React / Tailwind / Lucide)"]
    API["Next.js Route Handlers & Server Actions"]
    R2["Cloudflare R2 / AWS S3 (Presigned Direct Uploads)"]
    DB[("PostgreSQL (Prisma ORM)")]
    Redis[("Redis + BullMQ Queue")]
    ModalWorker["Modal.com Serverless GPU (A100 / L40S)"]

    Client -->|"1. Request Presigned Upload URL"| API
    API -->|"2. Generate Signed PUT URL"| R2
    Client -->|"3. Direct Browser-to-Bucket Upload"| R2
    Client -->|"4. Dispatch Retargeting Job"| API
    API -->|"5. Save Job State"| DB
    API -->|"6. Enqueue GPU Task"| Redis
    Redis -->|"7. Worker Dispatch"| ModalWorker
    ModalWorker -->|"8. Read Source Assets"| R2
    ModalWorker -->|"9. SAM 2 + DWPose + MimicMotion"| ModalWorker
    ModalWorker -->|"10. Upload Final Rendered MP4"| R2
    API -->|"11. SSE Live Progress Stream"| Client
```

---

## 📁 Project Structure

```
persona-motion-web/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── studio/
│   │   │   │   ├── story/page.tsx        # Mode A: Story-to-Video workspace
│   │   │   │   └── swap/page.tsx         # Mode B: Motion retargeting workspace
│   │   │   ├── vault/page.tsx            # Character management library
│   │   │   └── layout.tsx                # Studio navigation layout
│   │   ├── api/
│   │   │   ├── upload/presigned/route.ts # Direct S3/R2 presigned upload URL generator
│   │   │   ├── story/decompose/route.ts  # LLM script-to-shots parser
│   │   │   ├── jobs/route.ts             # Job creation and queueing
│   │   │   └── jobs/[id]/stream/route.ts # Server-Sent Events (SSE) live progress
│   │   ├── globals.css                   # Dark studio theme
│   │   ├── layout.tsx                    # Root Next.js layout
│   │   └── page.tsx                      # Root entry redirect
│   ├── components/
│   │   ├── studio/
│   │   │   ├── CharacterVaultSelector.tsx
│   │   │   ├── StoryboardShotCard.tsx
│   │   │   ├── VideoUploaderTrimmer.tsx
│   │   │   └── SplitScreenComparePlayer.tsx
│   │   └── ui/                           # Primitives (Button, Badge, Progress)
│   ├── lib/
│   │   ├── prisma.ts                     # Prisma singleton client
│   │   ├── s3.ts                         # AWS S3 / Cloudflare R2 presigned helper
│   │   ├── queue.ts                      # BullMQ Redis job dispatcher
│   │   ├── serverless_gpu.ts             # Modal.com API connector & emulator
│   │   └── utils.ts                      # Timecode and formatting utilities
│   └── types/
│       └── index.ts                      # TypeScript schemas & contracts
├── workers/
│   └── modal_inference_runner.py         # Modal.com Serverless GPU pipeline (A100)
├── prisma/
│   └── schema.prisma                     # Complete database schema
├── package.json
└── README.md
```

---

## 🚀 Quickstart & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Key environment configurations:
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/personamotion"

# Redis (BullMQ Queue)
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379

# Cloud Storage (Cloudflare R2 or AWS S3)
AWS_REGION="auto"
AWS_ACCESS_KEY_ID="your_access_key"
AWS_SECRET_ACCESS_KEY="your_secret_key"
AWS_S3_BUCKET="personamotion-vault"
AWS_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
NEXT_PUBLIC_STORAGE_CDN_URL="https://pub-your-bucket-id.r2.dev"

# Serverless GPU Inference (Modal.com)
MODAL_API_URL="https://your-workspace--personamotion-inference-web-endpoint.modal.run"
MODAL_API_TOKEN="your_modal_token"

# LLM Storyboard Director
OPENAI_API_KEY="sk-proj-your-openai-api-key"
```

### 3. Initialize Database Schema
```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the studio.

---

## ⚡ Modal.com Serverless GPU Deployment

To deploy the Python inference worker (`workers/modal_inference_runner.py`) on Modal:

1. **Install Modal CLI**:
   ```bash
   pip install modal
   modal setup
   ```
2. **Create Secret for Cloud Storage**:
   ```bash
   modal secret create personamotion-secrets \
     AWS_ACCESS_KEY_ID="your_key" \
     AWS_SECRET_ACCESS_KEY="your_secret" \
     AWS_S3_BUCKET="personamotion-vault" \
     AWS_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
   ```
3. **Deploy GPU Pipeline**:
   ```bash
   modal deploy workers/modal_inference_runner.py
   ```
Modal will output an HTTPS endpoint URL. Set this URL as `MODAL_API_URL` in your `.env`.

---

## 📡 API Endpoints Reference

### 1. Direct Presigned Upload URL
`POST /api/upload/presigned`
```json
{
  "filename": "driving_clip.mp4",
  "contentType": "video/mp4",
  "fileSize": 18450000,
  "folder": "driving_videos"
}
```
**Response:**
```json
{
  "success": true,
  "uploadUrl": "https://<bucket>.r2.cloudflarestorage.com/...",
  "publicUrl": "https://pub-id.r2.dev/driving_videos/clip.mp4",
  "key": "driving_videos/1729000-clip.mp4",
  "expiresInSeconds": 3600
}
```

### 2. Storyboard Script Breakdown
`POST /api/story/decompose`
```json
{
  "storyPrompt": "Elena Vance infiltrates a high-security penthouse in Neo-Tokyo during a thunderstorm.",
  "targetShotCount": 3,
  "stylePreset": "cinematic"
}
```
**Response:** Returns structured JSON shot descriptions with camera movement, visual prompts, and scene durations ready for video diffusion.

### 3. Asynchronous GPU Job Creation
`POST /api/jobs`
```json
{
  "type": "MOTION_SWAP",
  "characterId": "char-aurora",
  "drivingVideoUrl": "https://pub-id.r2.dev/driving_videos/clip.mp4",
  "trimStartTime": 0.0,
  "trimEndTime": 8.5
}
```

### 4. Server-Sent Events Live Progress Stream
`GET /api/jobs/[id]/stream`
Streams real-time JSON packets:
```
event: progress
data: {"jobId":"job_123","status":"PROCESSING","progressPercent":45,"currentStage":"Segmenting subject with SAM 2..."}
```
