"use client";

import React, { useState, useRef } from "react";
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
  Upload,
  User,
  Image as ImageIcon,
  Check,
  Film,
  Camera,
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
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
    referenceImages: [
      {
        id: "r1",
        url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
        angle: "front",
        label: "Frontal Portrait",
      },
      {
        id: "r2",
        url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
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
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
    referenceImages: [
      {
        id: "r3",
        url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
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
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
    referenceImages: [
      {
        id: "r4",
        url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
        angle: "front",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const STYLE_PRESETS = [
  "Cyberpunk Tactical Armor",
  "Anime Cel-Shaded Style",
  "Photorealistic 8k Film",
  "High-Contrast Film Noir",
  "Retro 80s Synthwave",
];

export default function MotionSwapStudioPage() {
  const [characters, setCharacters] = useState<CharacterModel[]>(INITIAL_CHARACTERS);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterModel>(INITIAL_CHARACTERS[0]);

  // Target character mode: "vault" vs "custom"
  const [characterSelectionMode, setCharacterSelectionMode] = useState<"vault" | "custom">("vault");
  const [customCharacterImageUrl, setCustomCharacterImageUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const customPhotoInputRef = useRef<HTMLInputElement>(null);

  // Character style / modification prompt
  const [customPrompt, setCustomPrompt] = useState<string>("");

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4"
  );

  const handleTrimmedVideoReady = (url: string, start: number, end: number) => {
    setDrivingVideoUrl(url);
    setTrimStart(start);
    setTrimEnd(end);
  };

  const handleCustomPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (PNG, JPG, or WebP).");
      return;
    }

    try {
      setIsUploadingPhoto(true);

      // Attempt upload to presigned/direct route
      const presignedRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "image/jpeg",
          fileSize: file.size,
          folder: "characters",
        }),
      });

      if (presignedRes.ok) {
        const { uploadUrl, publicUrl } = await presignedRes.json();
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "image/jpeg" },
          body: file,
        });

        if (uploadRes.ok) {
          setCustomCharacterImageUrl(publicUrl);
          setCharacterSelectionMode("custom");
          return;
        }
      }

      // Local blob URL fallback
      const localUrl = URL.createObjectURL(file);
      setCustomCharacterImageUrl(localUrl);
      setCharacterSelectionMode("custom");
    } catch (err) {
      console.warn("Using local object URL fallback:", err);
      const localUrl = URL.createObjectURL(file);
      setCustomCharacterImageUrl(localUrl);
      setCharacterSelectionMode("custom");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleStartRetargeting = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setProgressPercent(5);
      setCurrentStage("Initializing Pose & Motion Retargeting pipeline...");
      setGeneratedVideoUrl(null);

      const targetImage =
        characterSelectionMode === "custom" && customCharacterImageUrl
          ? customCharacterImageUrl
          : selectedCharacter.avatarUrl || selectedCharacter.referenceImages[0]?.url;

      // 1. Create job via API
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MOTION_SWAP",
          characterId: selectedCharacter.id,
          characterImageUrl: targetImage,
          customPrompt: customPrompt.trim() || undefined,
          drivingVideoUrl,
          referenceImages: targetImage ? [targetImage] : [],
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
      if (!res.ok) throw new Error(data.error || "Failed to dispatch retargeting job");

      setJobId(data.jobId);

      // 2. Connect to Server-Sent Events (SSE) live progress stream
      const eventSource = new EventSource(`/api/jobs/${data.jobId}/stream`);

      eventSource.addEventListener("progress", (evt) => {
        const payload = JSON.parse(evt.data);
        setProgressPercent(payload.progressPercent || 10);
        setCurrentStage(payload.currentStage || "Processing neural motion diffusion layers...");
        if (payload.resultUrl) {
          setGeneratedVideoUrl(payload.resultUrl);
        }
      });

      eventSource.addEventListener("done", (evt) => {
        const payload = JSON.parse(evt.data);
        if (payload.status === "FAILED") {
          setIsProcessing(false);
          setErrorMessage(payload.error || "Inference failed");
          setCurrentStage(`Inference failed: ${payload.error || "Please check server logs"}`);
        } else {
          setProgressPercent(100);
          setCurrentStage("Character replacement & motion transfer completed successfully!");
          if (payload.resultUrl) {
            setGeneratedVideoUrl(payload.resultUrl);
          }
          setIsProcessing(false);
        }
        eventSource.close();
      });

      eventSource.onerror = (e) => {
        console.warn("SSE connection closed or ended:", e);
        setIsProcessing(false);
        eventSource.close();
      };
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      setErrorMessage((err as Error).message);
      setCurrentStage(`Error: ${(err as Error).message}`);
    }
  };

  const activePersonaImage =
    characterSelectionMode === "custom" && customCharacterImageUrl
      ? customCharacterImageUrl
      : selectedCharacter?.avatarUrl || selectedCharacter?.referenceImages?.[0]?.url || "";

  const activePersonaName =
    characterSelectionMode === "custom" ? "Custom Reference Persona" : selectedCharacter.name;

  return (
    <div className="space-y-8">
      {/* Studio Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="purple" className="text-xs uppercase tracking-wider font-mono">
              Mode B • Motion Clone & Swap
            </Badge>
            <Badge variant="outline" className="text-xs text-zinc-400">
              Fal.ai Wan-VACE / MimicMotion + SAM 2 + LivePortrait
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
            Neural Motion Retargeting & Character Swap Studio
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Upload driving footage, isolate subject motion via SAM 2 & DWPose keypoints, and execute
            high-fidelity character identity replacement conditioned on your chosen persona.
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
                Retargeting with AI GPU...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2 fill-current" />
                Synthesize Character Swap
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
                AI Video-to-Video Replacement in Progress
              </span>
              <span className="text-zinc-400 font-mono text-[11px]">• Job ID: {jobId}</span>
            </div>
            <span className="font-mono text-violet-300 font-bold">{progressPercent}%</span>
          </div>

          <Progress value={progressPercent} />

          <p className="text-xs text-zinc-300 font-mono flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{currentStage}</span>
          </p>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && !isProcessing && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start justify-between">
          <div>
            <span className="font-bold block mb-1">Execution Notice:</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 ml-4 font-mono"
          >
            ✕
          </button>
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
                <Button variant="outline" size="sm" className="text-xs border-violet-700/60 text-violet-200 hover:bg-violet-950/40">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download MP4
                </Button>
              </a>
              <Button variant="ghost" size="sm" className="text-xs text-zinc-400 hover:text-zinc-200">
                <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
              </Button>
            </div>
          </div>

          {/* Interactive Responsive Split-Screen Dual Compare Component */}
          <SplitScreenComparePlayer
            originalVideoUrl={drivingVideoUrl}
            generatedVideoUrl={generatedVideoUrl}
            originalLabel={`Original Driving Motion (${(trimEnd - trimStart).toFixed(1)}s)`}
            generatedLabel={`Swapped: ${activePersonaName} (Fal.ai / Wan-VACE)`}
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

          {/* Character / Style Modification Prompt */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <h3 className="font-semibold text-zinc-100 text-sm tracking-wide">
                  CHARACTER & STYLE PROMPT (OPTIONAL)
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px] text-zinc-400">
                Fal.ai Guided Injection
              </Badge>
            </div>

            <p className="text-xs text-zinc-400">
              Guide aesthetic nuances, lighting, and wardrobe while preserving the exact 3D skeletal motion.
            </p>

            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={2}
              placeholder="e.g. anime cel-shaded character, cyberpunk tactical armor, photorealistic neon lighting, 8k..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
            />

            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {STYLE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCustomPrompt((prev) => (prev ? `${prev}, ${preset}` : preset))}
                  className="px-2 py-1 rounded bg-zinc-950 hover:bg-violet-950/60 border border-zinc-800 hover:border-violet-700/60 text-[11px] text-zinc-300 hover:text-violet-200 transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

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

        {/* Right Column: Target Character Selection (Vault OR Custom Photo) */}
        <div className="space-y-6">
          {/* Character Mode Switcher Tabs */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-xl flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCharacterSelectionMode("vault")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                characterSelectionMode === "vault"
                  ? "bg-violet-600 text-white shadow"
                  : "bg-zinc-950 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Pick From Vault ({characters.length})
            </button>
            <button
              type="button"
              onClick={() => setCharacterSelectionMode("custom")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                characterSelectionMode === "custom"
                  ? "bg-violet-600 text-white shadow"
                  : "bg-zinc-950 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Upload Custom Photo
            </button>
          </div>

          {characterSelectionMode === "vault" ? (
            <CharacterVaultSelector
              characters={characters}
              selectedCharacterId={selectedCharacter?.id}
              onSelectCharacter={(char) => setSelectedCharacter(char)}
              onCharacterCreated={(newChar) => setCharacters([newChar, ...characters])}
            />
          ) : (
            /* Custom Photo Direct Upload Dropzone */
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-violet-400" />
                  <h3 className="font-semibold text-zinc-100 text-sm tracking-wide">
                    CUSTOM CHARACTER IDENTITY PHOTO
                  </h3>
                </div>
                <Badge variant="purple" className="text-[10px]">
                  Direct Conditioning
                </Badge>
              </div>

              <input
                ref={customPhotoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleCustomPhotoChange}
              />

              {customCharacterImageUrl ? (
                <div className="space-y-3">
                  <div className="relative aspect-square max-h-72 w-full rounded-xl overflow-hidden border-2 border-violet-500 shadow-xl bg-black flex items-center justify-center">
                    <img
                      src={customCharacterImageUrl}
                      alt="Custom Persona"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                      <Check className="w-3 h-3" /> Active Persona
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => customPhotoInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="flex-1 text-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Replace Photo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCustomCharacterImageUrl(null)}
                      className="text-xs text-rose-400 hover:text-rose-300"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => customPhotoInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-700 hover:border-violet-500 hover:bg-zinc-800/40 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition text-center group"
                >
                  <div className="p-3 rounded-full bg-zinc-800 group-hover:bg-violet-950/60 group-hover:text-violet-400 text-zinc-400 transition mb-3">
                    <Upload className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-200">
                    {isUploadingPhoto ? "Processing photo..." : "Upload target character portrait"}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Supports PNG, JPG, WebP. High frontal clarity gives best retargeting quality.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Active Persona Summary Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={activePersonaImage}
                alt={activePersonaName}
                className="w-16 h-16 rounded-xl object-cover border-2 border-violet-500/60 shadow-md bg-zinc-950"
              />
              <div>
                <Badge variant="purple" className="text-[10px] uppercase font-mono mb-1">
                  Conditioning Persona Locked
                </Badge>
                <h4 className="text-base font-bold text-zinc-100">{activePersonaName}</h4>
                <p className="text-xs text-zinc-400">
                  Target identity ready for pose transfer with Fal.ai (Wan-VACE / MimicMotion).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-zinc-300">
              <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">Source Identity:</span>
                <span className="text-violet-400 font-semibold truncate block">
                  {characterSelectionMode === "custom" ? "Direct User Photo" : "Vault Preset"}
                </span>
              </div>
              <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">AI Pipeline:</span>
                <span className="text-emerald-400 font-semibold truncate block">
                  Fal.ai / Wan-VACE
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
