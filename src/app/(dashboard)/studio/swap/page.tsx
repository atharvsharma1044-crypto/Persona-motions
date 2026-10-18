"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Key,
  ExternalLink,
  AlertTriangle,
  Play,
  Search,
} from "lucide-react";
import { VideoUploaderTrimmer } from "@/components/studio/VideoUploaderTrimmer";
import { CharacterVaultSelector } from "@/components/studio/CharacterVaultSelector";
import { SplitScreenComparePlayer } from "@/components/studio/SplitScreenComparePlayer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CharacterModel } from "@/types";
import { synthesizeNeuralCharacterSwap } from "@/lib/neural_face_swap";

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

const FAL_MODELS = [
  {
    id: "fal-ai/kling-video/v3/standard/motion-control",
    name: "Kling Motion Control v3",
    desc: "Industry standard pose & expression retargeting (Recommended)",
  },
  {
    id: "fal-ai/wan-motion",
    name: "Alibaba Wan Motion 2.1",
    desc: "Full skeleton pose adaptation matching reference body",
  },
  {
    id: "fal-ai/mimic-motion",
    name: "Tencent MimicMotion",
    desc: "Confidence-aware neural pose retargeting",
  },
  {
    id: "fal-ai/pixverse/swap",
    name: "PixVerse Character Swap",
    desc: "Video character & face replacement preserving scene",
  },
];

const DRIVING_PRESETS = [
  {
    id: "preset-action",
    title: "Cinematic Character Movement",
    desc: "Human locomotion & dynamic arm choreography",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
  },
  {
    id: "preset-drama",
    title: "Sci-Fi Character Gestures",
    desc: "Nuanced upper body & facial dynamic acting",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  },
];

export default function MotionSwapStudioPage() {
  const [characters, setCharacters] = useState<CharacterModel[]>(INITIAL_CHARACTERS);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterModel>(INITIAL_CHARACTERS[0]);

  // AI Connection State
  const [hasFalKey, setHasFalKey] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>("fal-ai/kling-video/v3/standard/motion-control");
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false);
  const [keyNotice, setKeyNotice] = useState<string | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);

  // Target character mode: "vault" vs "custom"
  const [characterSelectionMode, setCharacterSelectionMode] = useState<"vault" | "custom">("vault");
  const [customCharacterImageUrl, setCustomCharacterImageUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const customPhotoInputRef = useRef<HTMLInputElement>(null);

  // Character style / modification prompt
  const [customPrompt, setCustomPrompt] = useState<string>("");

  // Driving video state (from trimmer or presets)
  const [drivingVideoUrl, setDrivingVideoUrl] = useState<string>(
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4"
  );
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(8.5);

  // Advanced Retargeting Pipeline Options
  const [enableSam2, setEnableSam2] = useState<boolean>(true);
  const [useRife, setUseRife] = useState<boolean>(true);
  const [enableRealEsrgan, setEnableRealEsrgan] = useState<boolean>(true);
  const [preserveBg, setPreserveBg] = useState<boolean>(true);
  const [motionFidelity, setMotionFidelity] = useState<number>(0.85);
  const [blendStrength, setBlendStrength] = useState<number>(0.98);
  const [enableColorHarmonization, setEnableColorHarmonization] = useState<boolean>(true);
  const [enableHeadRotation, setEnableHeadRotation] = useState<boolean>(true);

  // Job Orchestration & SSE Streaming State
  const [jobId, setJobId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentStage, setCurrentStage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [swapEngine, setSwapEngine] = useState<"neural" | "cloud">("neural");

  // AI Prompt-to-Motion Search State
  const [searchPrompt, setSearchPrompt] = useState<string>("");
  const [isSearchingMotion, setIsSearchingMotion] = useState<boolean>(false);
  const [matchedMotionClip, setMatchedMotionClip] = useState<any | null>(null);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  const handleSearchMotionByPrompt = async (promptQuery?: string) => {
    const query = (promptQuery !== undefined ? promptQuery : searchPrompt).trim();
    if (!query) return;

    try {
      setIsSearchingMotion(true);
      setSearchFeedback(`Searching matching motion footage & scene choreography for: "${query}"...`);

      const res = await fetch("/api/motion/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query }),
      });

      const data = await res.json();
      if (data.matchedClip) {
        setMatchedMotionClip(data.matchedClip);
        setDrivingVideoUrl(data.matchedClip.videoUrl);
        setTrimStart(0);
        setTrimEnd(Math.min(10, data.matchedClip.duration || 8.5));
        if (data.synthesizedPrompt) {
          setCustomPrompt(data.synthesizedPrompt);
        }
        setSearchFeedback(
          `Matched: "${data.matchedClip.title}" (${data.matchedClip.motionType}). Driving video and style prompt loaded!`
        );
      }
    } catch (err) {
      console.error("Motion search error:", err);
      setSearchFeedback("Failed to search motion clips. Please try again.");
    } finally {
      setIsSearchingMotion(false);
    }
  };

  // Load key configuration on mount
  useEffect(() => {
    fetch("/api/settings/keys")
      .then((res) => res.json())
      .then((data) => {
        if (data.hasFalKey) {
          setHasFalKey(true);
        }
        if (data.falModel) {
          setSelectedModel(data.falModel);
        }
      })
      .catch((err) => console.warn("Could not check key status:", err));
  }, []);

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    try {
      setIsSavingKey(true);
      setKeyNotice(null);
      const res = await fetch("/api/settings/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          falKey: apiKeyInput.trim(),
          falModel: selectedModel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHasFalKey(true);
        setKeyNotice(data.message || "Key connected successfully!");
        setTimeout(() => {
          setIsKeyModalOpen(false);
          setKeyNotice(null);
        }, 1500);
      } else {
        setKeyNotice(data.error || "Failed to save key");
      }
    } catch (err) {
      setKeyNotice((err as Error).message);
    } finally {
      setIsSavingKey(false);
    }
  };

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
      setGeneratedVideoUrl(null);

      const targetImage =
        characterSelectionMode === "custom" && customCharacterImageUrl
          ? customCharacterImageUrl
          : selectedCharacter.avatarUrl || selectedCharacter.referenceImages[0]?.url;

      if (!targetImage) {
        throw new Error("Please select or upload a target character image first.");
      }

      // Mode 1: Real-Time Neural Face & Identity Swap (Active by default, zero API key required)
      if (swapEngine === "neural") {
        setCurrentStage("Initializing Neural Face & Identity Swap engine...");
        setProgressPercent(10);

        const swapResult = await synthesizeNeuralCharacterSwap({
          drivingVideoUrl,
          characterImageUrl: targetImage,
          trimStartTime: trimStart,
          trimEndTime: trimEnd,
          motionFidelity,
          customPrompt: customPrompt.trim() || undefined,
          blendStrength,
          enableColorHarmonization,
          enableHeadRotation,
          onProgress: ({ progressPercent: pct, stage }) => {
            setProgressPercent(pct);
            setCurrentStage(stage);
          },
        });

        setCurrentStage("Saving character replacement video to media library...");
        const newFilename = `swapped_${Date.now()}.webm`;
        let finalUrl = swapResult.videoUrl;

        try {
          const uploadRes = await fetch(
            `/api/upload/direct?filename=${encodeURIComponent(newFilename)}&folder=rendered_shots`,
            {
              method: "PUT",
              headers: { "Content-Type": swapResult.videoBlob.type || "video/webm" },
              body: swapResult.videoBlob,
            }
          );
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.publicUrl) {
              finalUrl = uploadData.publicUrl;
            }
          }
        } catch (uploadErr) {
          console.warn("Direct upload fallback to blob URL:", uploadErr);
        }

        setGeneratedVideoUrl(finalUrl);
        setProgressPercent(100);
        setCurrentStage("Character replaced successfully! Enjoy your dual-view comparison.");
        setIsProcessing(false);
        return;
      }

      // Mode 2: Cloud Generative Diffusion via Fal.ai / Modal cluster
      setCurrentStage(
        hasFalKey
          ? `Submitting to Fal.ai cloud GPU (${selectedModel})...`
          : "Connecting to Cloud GPU cluster..."
      );

      // 1. Create job via API
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MOTION_SWAP",
          characterId: selectedCharacter.id,
          characterImageUrl: targetImage,
          customPrompt: customPrompt.trim() || undefined,
          modelEndpoint: selectedModel,
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
        console.warn("SSE stream closed:", e);
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
            <Badge
              variant={hasFalKey ? "success" : "secondary"}
              className="text-xs cursor-pointer"
              onClick={() => setIsKeyModalOpen(true)}
            >
              {hasFalKey ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                  Fal.ai GPU Active
                </>
              ) : (
                <>
                  <Key className="w-3 h-3 mr-1 text-amber-400" />
                  Connect Fal.ai Key (Live GPU)
                </>
              )}
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

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setIsKeyModalOpen(true)}
            className="text-xs border-zinc-700 hover:border-violet-500"
          >
            <Key className="w-3.5 h-3.5 mr-1.5 text-violet-400" />
            {hasFalKey ? "AI Settings" : "Connect AI Key"}
          </Button>

          <Button
            variant="gradient"
            size="lg"
            onClick={handleStartRetargeting}
            disabled={isProcessing}
            className="font-semibold shadow-xl shadow-violet-600/25"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {swapEngine === "neural" ? "Compositing Swapped Character..." : "Retargeting with Cloud GPU..."}
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

      {/* AI Processing Engine Selector */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2.5 shadow-2xl flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => setSwapEngine("neural")}
          className={`flex-1 p-3 rounded-xl text-left transition border ${
            swapEngine === "neural"
              ? "bg-violet-600/20 border-violet-500/80 text-violet-200 shadow-lg shadow-violet-950/50"
              : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-xs flex items-center gap-1.5 text-zinc-100">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
              Neural Face & Identity Swap
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono">
              Active • Zero API Key Needed
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Real-time neural face & identity replacement. Tracks facial landmarks and composites target character directly into video.
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setSwapEngine("cloud");
            if (!hasFalKey) setIsKeyModalOpen(true);
          }}
          className={`flex-1 p-3 rounded-xl text-left transition border ${
            swapEngine === "cloud"
              ? "bg-violet-600/20 border-violet-500/80 text-violet-200 shadow-lg shadow-violet-950/50"
              : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-xs flex items-center gap-1.5 text-zinc-100">
              <Cpu className="w-3.5 h-3.5 text-violet-400" />
              Cloud Generative Diffusion
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              hasFalKey ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-400" : "bg-amber-950/80 border border-amber-500/40 text-amber-400"
            }`}>
              {hasFalKey ? "Fal.ai Connected" : "Requires FAL_KEY"}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Full 3D skeletal & diffusion motion synthesis using Kling v3 / Alibaba Wan 2.1 on cloud A100 GPU clusters.
          </p>
        </button>
      </div>

      {/* Fal.ai Key Setup Banner when key is missing */}
      {!hasFalKey && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-violet-950/40 via-zinc-900 to-zinc-900 border border-violet-800/50 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-violet-900/40 border border-violet-700/50 text-violet-300 shrink-0 mt-0.5">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                Enable Real Cloud AI Character Swapping
                <Badge variant="purple" className="text-[10px]">Zero GPU Setup</Badge>
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5 max-w-xl">
                Add your Fal.ai Key to run Kling Motion Control, Wan Motion 2.1, and MimicMotion on real A100 GPUs.
                Or test offline with pre-rendered cinematic motion samples.
              </p>
            </div>
          </div>
          <Button
            variant="gradient"
            size="sm"
            onClick={() => setIsKeyModalOpen(true)}
            className="shrink-0 text-xs font-semibold"
          >
            <Key className="w-3.5 h-3.5 mr-1.5" /> Configure Fal.ai Key
          </Button>
        </div>
      )}

      {/* AI Key & Model Configuration Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-violet-400" />
                <h3 className="font-bold text-zinc-100 text-base">
                  Fal.ai Cloud GPU Settings
                </h3>
              </div>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 font-medium block mb-1">
                  Fal.ai API Key (`FAL_KEY`)
                </label>
                <input
                  type="password"
                  placeholder="Paste your key here (e.g. 5d8f...:...)"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-violet-500 font-mono"
                />
                <div className="flex justify-between items-center mt-1 text-[11px] text-zinc-400">
                  <span>Current: {hasFalKey ? "Connected" : "Not configured"}</span>
                  <a
                    href="https://fal.ai/dashboard/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-violet-400 hover:underline flex items-center gap-1"
                  >
                    Get a Free Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-medium block mb-1">
                  Target Retargeting AI Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                >
                  {FAL_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">
                  {FAL_MODELS.find((m) => m.id === selectedModel)?.desc}
                </p>
              </div>

              {keyNotice && (
                <div className="p-2.5 rounded bg-zinc-950 border border-violet-800/60 text-violet-300 text-[11px]">
                  {keyNotice}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button variant="ghost" size="sm" onClick={() => setIsKeyModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="gradient"
                size="sm"
                onClick={handleSaveApiKey}
                disabled={isSavingKey || !apiKeyInput.trim()}
              >
                {isSavingKey ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Verifying...
                  </>
                ) : (
                  "Save & Activate"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-5 h-5 ${generatedVideoUrl ? "text-emerald-400" : "text-violet-400"}`} />
            <h2 className="font-bold text-zinc-100 text-base">
              {generatedVideoUrl
                ? "Rendered Result & Synchronized Dual Comparison"
                : "Driving Motion Video Stage (Input Preview)"}
            </h2>
            {generatedVideoUrl && (
              <Badge variant="success" className="text-[10px]">
                Character Swapped Successfully
              </Badge>
            )}
          </div>
          {generatedVideoUrl && (
            <div className="flex items-center gap-2">
              <a
                href={generatedVideoUrl}
                download="personamotion_swapped.webm"
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" size="sm" className="text-xs border-violet-700/60 text-violet-200 hover:bg-violet-950/40">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download Swapped Video
                </Button>
              </a>
              <Button variant="ghost" size="sm" className="text-xs text-zinc-400 hover:text-zinc-200">
                <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
              </Button>
            </div>
          )}
        </div>

        {/* Interactive Responsive Split-Screen Dual Compare Component */}
        <SplitScreenComparePlayer
          originalVideoUrl={drivingVideoUrl}
          generatedVideoUrl={generatedVideoUrl}
          originalLabel={`Source Driving Motion (${(trimEnd - trimStart).toFixed(1)}s)`}
          generatedLabel={`Swapped: ${activePersonaName}`}
        />
      </div>

      {/* Studio Inputs: Dual Column Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Driving Video & Browser Trimmer */}
        <div className="space-y-6">
          {/* AI Prompt-to-Motion Search & Scene Matcher */}
          <div className="bg-gradient-to-br from-violet-950/30 via-zinc-900 to-zinc-900 border border-violet-800/50 rounded-xl p-5 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <h3 className="font-semibold text-zinc-100 text-xs tracking-wide uppercase">
                  AI Prompt-to-Motion Search & Scene Matcher
                </h3>
              </div>
              <Badge variant="purple" className="text-[10px]">
                Smart Discovery
              </Badge>
            </div>

            <p className="text-xs text-zinc-400">
              Type any motion or scene action. Our search engine finds the matching driving video choreography and adapts the style just like the original video.
            </p>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchPrompt}
                  onChange={(e) => setSearchPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearchMotionByPrompt();
                  }}
                  placeholder="e.g. Street dancer doing spin, Martial arts kick, Samurai sword stance..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 font-medium"
                />
              </div>
              <Button
                type="button"
                variant="gradient"
                size="sm"
                onClick={() => handleSearchMotionByPrompt()}
                disabled={isSearchingMotion || !searchPrompt.trim()}
                className="text-xs shrink-0 font-semibold"
              >
                {isSearchingMotion ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5 mr-1.5" /> Search Motion
                  </>
                )}
              </Button>
            </div>

            {/* Quick Action Prompt Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">
                Quick Action Concepts:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "🥋 Martial Arts Combat", query: "martial arts kick strike combat" },
                  { label: "🕺 Street Dance", query: "urban street dance rhythm hip hop" },
                  { label: "🏃 Cinematic Movement", query: "cinematic running locomotion movement" },
                  { label: "🎙️ Keynote Speech", query: "professional keynote speech presentation talking head" },
                  { label: "⚡ Dramatic Acting", query: "sci-fi dramatic actor expressions gestures" },
                  { label: "🌧️ Cyberpunk Rain", query: "cyberpunk character walking rain moody neon" },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setSearchPrompt(item.query);
                      handleSearchMotionByPrompt(item.query);
                    }}
                    className="px-2 py-1 rounded-md bg-zinc-950 hover:bg-violet-950/70 border border-zinc-800 hover:border-violet-700/60 text-[11px] text-zinc-300 hover:text-violet-200 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback & Matched Clip Card */}
            {searchFeedback && (
              <div className="p-3 rounded-lg bg-zinc-950/80 border border-violet-700/40 text-xs text-zinc-300 space-y-2">
                <p className="flex items-center gap-1.5 text-violet-300 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {searchFeedback}
                </p>

                {matchedMotionClip && (
                  <div className="flex items-center gap-3 pt-1 border-t border-zinc-800/80">
                    <img
                      src={matchedMotionClip.thumbnailUrl}
                      alt={matchedMotionClip.title}
                      className="w-14 h-14 rounded-lg object-cover border border-violet-500/50"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-zinc-100 truncate">
                          {matchedMotionClip.title}
                        </span>
                        <Badge variant="purple" className="text-[9px]">
                          {matchedMotionClip.motionType}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                        {matchedMotionClip.description}
                      </p>
                      <button
                        type="button"
                        onClick={handleStartRetargeting}
                        className="mt-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3 fill-current" /> Synthesize Character Swap on this Scene →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preset Driving Videos selector */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-violet-400" />
                <h3 className="font-semibold text-zinc-100 text-xs tracking-wide uppercase">
                  Sample Driving Motion Clips
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px]">
                30fps Pose Data
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DRIVING_PRESETS.map((p) => {
                const isSelected = drivingVideoUrl === p.url;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setDrivingVideoUrl(p.url);
                      setTrimStart(0);
                      setTrimEnd(8.5);
                    }}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      isSelected
                        ? "bg-violet-950/60 border-violet-500 shadow"
                        : "bg-zinc-950/70 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-zinc-200">{p.title}</span>
                      {isSelected && <Check className="w-3 h-3 text-violet-400" />}
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-1">{p.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Video Uploader & Trimmer */}
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

              {/* Adaptive Lighting & Color Harmonization */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <div>
                  <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Adaptive Lighting & Skin Tone Match
                  </div>
                  <div className="text-zinc-400 text-[11px]">
                    Samples scene illumination and adapts character skin tones and ambient shadows dynamically.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableColorHarmonization}
                  onChange={(e) => setEnableColorHarmonization(e.target.checked)}
                  className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                />
              </div>

              {/* 3D Head Rotation & Tilt Tracking */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <div>
                  <div className="font-semibold text-zinc-200">3D Head Rotation & Angle Tracking</div>
                  <div className="text-zinc-400 text-[11px]">
                    Rotates and aligns character identity as actor tilts and turns their head.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableHeadRotation}
                  onChange={(e) => setEnableHeadRotation(e.target.checked)}
                  className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                />
              </div>

              {/* Identity Blend Strength Slider */}
              <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-zinc-200">Identity Blend Opacity</span>
                  <span className="font-mono text-violet-400">{Math.round(blendStrength * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.75}
                  max={1.0}
                  step={0.01}
                  value={blendStrength}
                  onChange={(e) => setBlendStrength(parseFloat(e.target.value))}
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
                  Target identity ready for motion transfer with {FAL_MODELS.find(m => m.id === selectedModel)?.name || "Fal.ai"}.
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
                <span className="text-zinc-500 block text-[10px]">Cloud GPU Cluster:</span>
                <span className="text-emerald-400 font-semibold truncate block">
                  {hasFalKey ? "Fal.ai Live" : "Preview Mode"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
