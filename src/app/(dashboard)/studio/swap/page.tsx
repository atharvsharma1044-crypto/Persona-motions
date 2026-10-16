"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Download,
  Share2,
  Cpu,
  Layers,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { VideoUploaderTrimmer } from "@/components/studio/VideoUploaderTrimmer";
import { CharacterVaultSelector } from "@/components/studio/CharacterVaultSelector";
import { SplitScreenComparePlayer } from "@/components/studio/SplitScreenComparePlayer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CharacterModel } from "@/types";

const INITIAL_CHARACTERS: CharacterModel[] = [
  {
    id: "char-aurora",
    userId: "user-1",
    name: "Elena Vance (Neo-Tokyo)",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    referenceImages: [
      {
        id: "r1",
        url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        angle: "front",
        label: "Frontal Portrait",
      },
      {
        id: "r2",
        url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
        angle: "45_degree",
        label: "45-Degree Profile",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "char-kai",
    userId: "user-1",
    name: "Marcus Cole (Urban Pilot)",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    referenceImages: [
      {
        id: "r3",
        url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        angle: "front",
        label: "Direct Portrait",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "char-sora",
    userId: "user-1",
    name: "Aiko Tanaka (Cyberpunk Operative)",
    avatarUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
    referenceImages: [
      {
        id: "r4",
        url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
        angle: "front",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function MotionSwapStudioPage() {
  const [characters, setCharacters] = useState<CharacterModel[]>(INITIAL_CHARACTERS);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterModel>(INITIAL_CHARACTERS[0]);

  // Driving video state (from trimmer)
  const [drivingVideoUrl, setDrivingVideoUrl] = useState<string>(
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
  );
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(8.5);

  // Advanced Retargeting Pipeline Options
  const [enableSam2, setEnableSam2] = useState<boolean>(true);
  const [useRife, setUseRife] = useState<boolean>(true);
  const [enableRealEsrgan, setEnableRealEsrgan] = useState<boolean>(true);
  const [preserveBg, setPreserveBg] = useState<boolean>(true);
  const [motionFidelity, setMotionFidelity] = useState<number>(0.85);

  // Job Orchestration & SSE Streaming State
  const [jobId, setJobId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentStage, setCurrentStage] = useState<string>("");
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4"
  );

  const handleTrimmedVideoReady = (url: string, start: number, end: number) => {
    setDrivingVideoUrl(url);
    setTrimStart(start);
    setTrimEnd(end);
  };

  const handleStartRetargeting = async () => {
    try {
      setIsProcessing(true);
      setProgressPercent(5);
      setCurrentStage("Dispatching payload to Modal serverless GPU queue...");
      setGeneratedVideoUrl(null);

      // 1. Create job via API
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MOTION_SWAP",
          characterId: selectedCharacter.id,
          drivingVideoUrl,
          referenceImages: selectedCharacter.referenceImages.map((r) => r.url),
          trimStartTime: trimStart,
          trimEndTime: trimEnd,
          options: {
            enableSam2Isolation: enableSam2,
            useRifeInterpolation: useRife,
            enableRealEsrganUpscale: enableRealEsrgan,
            preserveSourceBackground: preserveBg,
            motionFidelity,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch job");

      setJobId(data.jobId);

      // 2. Connect to Server-Sent Events (SSE) live progress stream
      const eventSource = new EventSource(`/api/jobs/${data.jobId}/stream`);

      eventSource.addEventListener("progress", (evt) => {
        const payload = JSON.parse(evt.data);
        setProgressPercent(payload.progressPercent || 10);
        setCurrentStage(payload.currentStage || "Processing neural diffusion pass...");
        if (payload.resultUrl) {
          setGeneratedVideoUrl(payload.resultUrl);
        }
      });

      eventSource.addEventListener("done", (evt) => {
        const payload = JSON.parse(evt.data);
        setProgressPercent(100);
        setCurrentStage("Retargeting pipeline completed successfully!");
        if (payload.resultUrl) {
          setGeneratedVideoUrl(payload.resultUrl);
        }
        setIsProcessing(false);
        eventSource.close();
      });

      eventSource.onerror = () => {
        // Fallback completion if SSE disconnects in preview
        setIsProcessing(false);
        eventSource.close();
      };
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      setCurrentStage(`Error: ${(err as Error).message}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title & Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="purple" className="text-xs uppercase tracking-wider font-mono">
              Mode B • Motion Clone & Character Swap
            </Badge>
            <Badge variant="outline" className="text-xs text-zinc-400">
              SAM 2 + DWPose + LivePortrait + MimicMotion
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
            Video Motion Retargeting Studio
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Upload driving footage, isolate the subject motion with SAM 2 and DWPose keypoints,
            and transfer nuanced bodily choreography and facial expressions onto any persona.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="gradient"
            size="lg"
            onClick={handleStartRetargeting}
            disabled={isProcessing}
            className="w-full md:w-auto font-semibold shadow-xl shadow-violet-600/25"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Retargeting on GPU...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2 fill-current" />
                Synthesize Motion Retargeting
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Live Job Progress Notification Banner (SSE) */}
      {isProcessing && (
        <div className="p-4 rounded-xl bg-violet-950/40 border border-violet-800/60 shadow-lg space-y-3 animate-pulse-glow">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping" />
              <span className="font-semibold text-violet-200 uppercase tracking-wide">
                Serverless GPU Retargeting in Progress
              </span>
              <span className="text-zinc-400 font-mono text-[11px]">• Job ID: {jobId}</span>
            </div>
            <span className="font-mono text-violet-300 font-bold">{progressPercent}%</span>
          </div>

          <Progress value={progressPercent} />

          <p className="text-xs text-zinc-300 font-mono flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentStage}</span>
          </p>
        </div>
      )}

      {/* Synchronized Side-by-Side Comparison Stage */}
      {generatedVideoUrl && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-zinc-100 text-base">
                Rendered Result & Synchronized Dual Comparison
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={generatedVideoUrl}
                download="personamotion_retargeted.mp4"
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download MP4
                </Button>
              </a>
              <Button variant="ghost" size="sm" className="text-xs">
                <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
              </Button>
            </div>
          </div>

          {/* Interactive Responsive Split-Screen Dual Compare Component */}
          <SplitScreenComparePlayer
            originalVideoUrl={drivingVideoUrl}
            generatedVideoUrl={generatedVideoUrl}
            originalLabel={`Original Driving Motion (${(trimEnd - trimStart).toFixed(1)}s)`}
            generatedLabel={`Retargeted: ${selectedCharacter.name} (LivePortrait + MimicMotion)`}
          />
        </div>
      )}

      {/* Studio Inputs: Dual Column Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Driving Video & Browser Trimmer */}
        <div className="space-y-6">
          <VideoUploaderTrimmer
            onTrimmedVideoReady={handleTrimmedVideoReady}
            minDuration={3}
            maxDuration={15}
          />

          {/* Retargeting Neural Pipeline Controls */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Sliders className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold text-zinc-100 text-sm tracking-wide">
                NEURAL RETARGETING & POST-PROCESSING STACK
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              {/* SAM 2 Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <div>
                  <div className="font-semibold text-zinc-200">SAM 2 Foreground Isolation</div>
                  <div className="text-zinc-400 text-[11px]">
                    Segments subject cleanly from source backdrop before pose transfer.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableSam2}
                  onChange={(e) => setEnableSam2(e.target.checked)}
                  className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                />
              </div>

              {/* RIFE Interpolation */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <div>
                  <div className="font-semibold text-zinc-200">RIFE Temporal Smoothing</div>
                  <div className="text-zinc-400 text-[11px]">
                    Interpolates intermediary latents to eliminate jitter and micro-flicker.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={useRife}
                  onChange={(e) => setUseRife(e.target.checked)}
                  className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                />
              </div>

              {/* Real-ESRGAN Upscaling */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <div>
                  <div className="font-semibold text-zinc-200">Real-ESRGAN 4K Super-Resolution</div>
                  <div className="text-zinc-400 text-[11px]">
                    Enhances facial skin textures, iris clarity, and fine fabric weaves.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableRealEsrgan}
                  onChange={(e) => setEnableRealEsrgan(e.target.checked)}
                  className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                />
              </div>

              {/* Motion Fidelity Slider */}
              <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-zinc-200">Pose & Expression Fidelity</span>
                  <span className="font-mono text-violet-400">{Math.round(motionFidelity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1.0}
                  step={0.05}
                  value={motionFidelity}
                  onChange={(e) => setMotionFidelity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Target Character Vault Selector */}
        <div className="space-y-6">
          <CharacterVaultSelector
            characters={characters}
            selectedCharacterId={selectedCharacter?.id}
            onSelectCharacter={(char) => setSelectedCharacter(char)}
            onCharacterCreated={(newChar) => setCharacters([newChar, ...characters])}
          />

          {/* Active Persona Summary Card */}
          {selectedCharacter && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedCharacter.avatarUrl || ""}
                  alt={selectedCharacter.name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-violet-500/60 shadow-md"
                />
                <div>
                  <Badge variant="purple" className="text-[10px] uppercase font-mono mb-1">
                    Conditioning Persona Locked
                  </Badge>
                  <h4 className="text-base font-bold text-zinc-100">{selectedCharacter.name}</h4>
                  <p className="text-xs text-zinc-400">
                    InstantID & IP-Adapter pre-conditioned weights ready for motion injection.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-zinc-300">
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Reference Angles:</span>
                  <span className="text-violet-400 font-semibold">
                    {selectedCharacter.referenceImages.length} Multi-Angle Photos
                  </span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Latent Alignment:</span>
                  <span className="text-emerald-400 font-semibold">Calibrated (0.98)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
