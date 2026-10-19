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
  Film,
  Camera,
  Play,
  Search,
  Code,
  Terminal,
  Copy,
  Compass,
  Box,
  Eye,
  Palette,
  Check,
  Upload,
  Image as ImageIcon,
  Ratio,
} from "lucide-react";
import { VideoUploaderTrimmer } from "@/components/studio/VideoUploaderTrimmer";
import { SplitScreenComparePlayer } from "@/components/studio/SplitScreenComparePlayer";
import { ThreeDCharacterMotionViewport } from "@/components/studio/ThreeDCharacterMotionViewport";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { synthesizeNeuralCharacterSwap } from "@/lib/neural_face_swap";
import {
  analyzePromptCharacter,
  CharacterIntelligenceResult,
} from "@/lib/character_intelligence";

const STYLE_PRESETS = [
  "Cyberpunk Tactical Armor",
  "Anime Cel-Shaded Style",
  "Photorealistic 8k Film",
  "High-Contrast Film Noir",
  "Retro 80s Synthwave",
];

const PROMPT_INSPIRATIONS = [
  {
    icon: "🕷️",
    label: "Spider-Man 3D Acrobatics",
    prompt: "Spider-Man performing dynamic 3D acrobatics and web swinging between skyscrapers in sunset city",
  },
  {
    icon: "🦾",
    label: "Iron Man 3D Flight & Hover",
    prompt: "Iron Man hovering in 3D space with glowing blue arc reactor and repulsors over futuristic city",
  },
  {
    icon: "🗡️",
    label: "Cyberpunk Samurai 3D Strike",
    prompt: "Cyberpunk samurai executing rapid katana strikes in 3D neon rain with volumetric steam",
  },
  {
    icon: "⚡",
    label: "Goku Super Saiyan 3D Blast",
    prompt: "Goku powering up in 3D with golden ki aura particles and energy shockwaves",
  },
  {
    icon: "🦇",
    label: "Batman 3D Gotham Glide",
    prompt: "Batman in 3D tactical suit with billowing cape standing on Gotham gargoyle in volumetric moonlight",
  },
  {
    icon: "🚀",
    label: "Astronaut 3D Spacewalk",
    prompt: "Astronaut floating weightless in 3D orbit above rotating earth with reflective gold visor",
  },
];

export default function MotionSwapStudioPage() {
  // Main AI Director Prompt
  const [directorPrompt, setDirectorPrompt] = useState<string>(
    "Spider-Man performing dynamic 3D acrobatics and web swinging between skyscrapers in sunset city"
  );

  // AI Character Intelligence State (Automatically detected from prompt - Zero photo upload required)
  const [aiCharacter, setAiCharacter] = useState<CharacterIntelligenceResult>(() =>
    analyzePromptCharacter("Spider-Man performing dynamic 3D acrobatics")
  );

  // Character Live Search State
  const [isSearchingCharacter, setIsSearchingCharacter] = useState<boolean>(false);

  // Driving Video Playback & 3D Synchronization State
  const [drivingVideoTime, setDrivingVideoTime] = useState<number>(0);
  const [isDrivingVideoPlaying, setIsDrivingVideoPlaying] = useState<boolean>(false);
  const [drivingVideoDuration, setDrivingVideoDuration] = useState<number>(8.5);

  // Developer API Modal State
  const [isApiModalOpen, setIsApiModalOpen] = useState<boolean>(false);
  const [apiTab, setApiTab] = useState<"motion_swap" | "motion_search" | "story">("motion_swap");
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);

  // Active Center Stage View: "3d_spatial" vs "split_compare"
  const [activeStageView, setActiveStageView] = useState<"3d_spatial" | "split_compare">("3d_spatial");

  // Character search input (in sidebar)
  const [characterSearchQuery, setCharacterSearchQuery] = useState<string>("");

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

  // V2V Aspect Ratio & Generation Model Options
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [v2vModel, setV2vModel] = useState<"mimic-motion" | "wan-v2v" | "champ" | "kling-motion">("mimic-motion");
  const [customCharacterImageUrl, setCustomCharacterImageUrl] = useState<string | null>(null);
  const [isUploadingCharacterImage, setIsUploadingCharacterImage] = useState<boolean>(false);

  // Job Orchestration & SSE Streaming State
  const [jobId, setJobId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentStage, setCurrentStage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [swapEngine, setSwapEngine] = useState<"neural" | "cloud">("neural");

  // Character Image Upload Handler
  const handleCharacterImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCharacterImage(true);
      const filename = `char_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const res = await fetch(`/api/upload/direct?filename=${encodeURIComponent(filename)}&folder=characters`, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/png" },
        body: file,
      });

      const data = await res.json();
      if (data.publicUrl) {
        setCustomCharacterImageUrl(data.publicUrl);
        setAiCharacter((prev) => ({
          ...prev,
          avatarUrl: data.publicUrl,
          characterName: file.name.split(".")[0] || "Custom Character",
          summary: "Custom character reference image uploaded for V2V motion transfer.",
        }));
      }
    } catch (uploadErr) {
      console.warn("Character image upload error:", uploadErr);
    } finally {
      setIsUploadingCharacterImage(false);
    }
  };

  // Motion Search State
  const [isSearchingMotion, setIsSearchingMotion] = useState<boolean>(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const [matchedMotionClip, setMatchedMotionClip] = useState<any | null>(null);

  // Live Online Character Identity Search (Wikipedia / Curated DB)
  const fetchCharacterIdentity = async (query: string): Promise<CharacterIntelligenceResult> => {
    const q = query.trim();
    if (!q) return aiCharacter;

    try {
      setIsSearchingCharacter(true);
      const res = await fetch("/api/character/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: q }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.character) {
          setAiCharacter(data.character);
          return data.character;
        }
      }
    } catch (err) {
      console.warn("Character search query error:", err);
    } finally {
      setIsSearchingCharacter(false);
    }

    const fallback = analyzePromptCharacter(q);
    setAiCharacter(fallback);
    return fallback;
  };

  // Debounced search when user types in director prompt
  useEffect(() => {
    const timer = setTimeout(() => {
      if (directorPrompt && directorPrompt.length > 3) {
        fetchCharacterIdentity(directorPrompt);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [directorPrompt]);

  // Search matching motion by prompt
  const handleSearchMotionByPrompt = async (promptQuery?: string) => {
    const query = (promptQuery !== undefined ? promptQuery : directorPrompt).trim();
    if (!query) return;

    try {
      setIsSearchingMotion(true);
      setSearchFeedback(`Analyzing 3D choreography & scene dynamics for: "${query}"...`);

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
        setSearchFeedback(
          `3D Choreography matched: "${data.matchedClip.title}" (${data.matchedClip.motionType}).`
        );
      }
    } catch (err) {
      console.error("Motion search error:", err);
      setSearchFeedback("Using standard 3D motion kinematics.");
    } finally {
      setIsSearchingMotion(false);
    }
  };

  // Full Prompt Execution: Detects character intelligence + 3D motion + Generates video
  const handleGenerate3DVideo = async (overridePrompt?: string) => {
    const promptToUse = (overridePrompt || directorPrompt).trim();
    if (!promptToUse) return;

    // 1. Search authentic character identity (Wikipedia + Curated DB)
    setCurrentStage(`Searching authentic character identity for "${promptToUse}"...`);
    const detectedCharacter = await fetchCharacterIdentity(promptToUse);

    // 2. Search matching driving video choreography
    await handleSearchMotionByPrompt(promptToUse);

    // 3. Trigger 3D synthesis with full character synchronization
    await handleStartRetargeting(detectedCharacter, promptToUse);
  };

  // Manual character search from sidebar
  const handleDirectCharacterSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterSearchQuery.trim()) return;
    await fetchCharacterIdentity(characterSearchQuery);
    setCharacterSearchQuery("");
  };

  // Trimmed video ready callback
  const handleTrimmedVideoReady = (url: string, start: number, end: number) => {
    setDrivingVideoUrl(url);
    setTrimStart(start);
    setTrimEnd(end);
  };

  // Synthesize Character Swap & 3D Motion
  const handleStartRetargeting = async (
    charOverride?: CharacterIntelligenceResult,
    promptOverride?: string
  ) => {
    const char = charOverride || aiCharacter;
    const promptText = promptOverride || directorPrompt;

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setProgressPercent(5);
      setGeneratedVideoUrl(null);

      const targetImage = customCharacterImageUrl || char.avatarUrl;

      // Mode 1: Instant Neural Face & Character Swap (Hardware Accelerated)
      if (swapEngine === "neural") {
        setCurrentStage(`Synchronizing ${char.characterName} 3D geometry & wardrobe with video character...`);
        setProgressPercent(15);

        const swapResult = await synthesizeNeuralCharacterSwap({
          drivingVideoUrl,
          characterImageUrl: targetImage,
          characterName: char.characterName,
          accentColor: char.accentColor,
          secondaryColor: char.secondaryColor,
          characterArchetype: char.archetype,
          trimStartTime: trimStart,
          trimEndTime: trimEnd,
          motionFidelity,
          customPrompt: `${promptText}. Character: ${char.characterName}. 3D Motion: ${char.suggested3DMotion}. ${char.lightingAesthetic}`,
          blendStrength,
          enableColorHarmonization,
          enableHeadRotation,
          onProgress: ({ progressPercent: pct, stage }) => {
            setProgressPercent(pct);
            setCurrentStage(stage);
          },
        });

        setCurrentStage("Encoding 3D character video stream...");
        const newFilename = `swapped_3d_${Date.now()}.webm`;
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
        setCurrentStage("3D Character video generated successfully! Switching to comparison player.");
        setActiveStageView("split_compare");
        setIsProcessing(false);
        return;
      }

      // Mode 2: Studio Multi-Pass Neural Diffusion Pipeline
      setCurrentStage(`Connecting to PersonaMotion Studio Neural Pipeline for ${char.characterName}...`);

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MOTION_SWAP",
          characterId: char.characterName,
          characterImageUrl: targetImage,
          customPrompt: promptText,
          modelEndpoint: "personamotion-studio-v3.5",
          drivingVideoUrl,
          referenceImages: [targetImage],
          trimStartTime: trimStart,
          trimEndTime: trimEnd,
          options: {
            enableSam2Isolation: enableSam2,
            useRifeInterpolation: useRife,
            enableRealEsrganUpscale: enableRealEsrgan,
            preserveSourceBackground: preserveBg,
            motionFidelity,
            motion3DType: char.suggested3DMotion,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch 3D retargeting job");

      setJobId(data.jobId);

      const eventSource = new EventSource(`/api/jobs/${data.jobId}/stream`);

      eventSource.addEventListener("progress", (evt) => {
        const payload = JSON.parse(evt.data);
        setProgressPercent(payload.progressPercent || 10);
        setCurrentStage(payload.currentStage || "Synthesizing 3D character motion...");
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
          setCurrentStage("3D Character video generated successfully!");
          if (payload.resultUrl) {
            setGeneratedVideoUrl(payload.resultUrl);
          }
          setActiveStageView("split_compare");
          setIsProcessing(false);
        }
        eventSource.close();
      });

      eventSource.onerror = (e) => {
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

  return (
    <div className="space-y-8">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="purple" className="text-xs uppercase tracking-wider font-mono">
              AI 3D Video Studio • Pure Prompt Mode
            </Badge>
            <Badge variant="success" className="text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              PersonaMotion 3D Neural Engine (Active • Unlimited Free)
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <Compass className="w-7 h-7 text-violet-400" />
            AI Prompt-to-3D Character Motion & Video Studio
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Simply describe any character and motion in natural language. Our AI intelligence automatically discovers the character identity, calibrates 3D spatial kinematics, and synthesizes 3D video with zero photo upload needed!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setIsApiModalOpen(true)}
            className="text-xs border-zinc-700 hover:border-violet-500 text-zinc-200"
          >
            <Code className="w-3.5 h-3.5 mr-1.5 text-violet-400" />
            Developer API
          </Button>

          <Button
            variant="gradient"
            size="lg"
            onClick={() => handleGenerate3DVideo()}
            disabled={isProcessing}
            className="font-semibold shadow-xl shadow-violet-600/25"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Synthesizing 3D Video...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2 fill-current" />
                Generate 3D Video
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Prominent AI Director Prompt & Inspiration Hub */}
      <div className="bg-gradient-to-br from-violet-950/40 via-zinc-900 to-zinc-900 border border-violet-800/60 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h2 className="font-bold text-zinc-100 text-sm tracking-wide uppercase">
              AI 3D Video Director Prompt
            </h2>
          </div>
          {isSearchingCharacter ? (
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-violet-950/80 border border-violet-500/50 text-violet-300 font-mono flex items-center gap-1.5 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin text-violet-400" /> Searching Wikipedia Character Intelligence...
            </span>
          ) : (
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" /> Auto-Character Search Active • No Photo Needed
            </span>
          )}
        </div>

        <p className="text-xs text-zinc-300">
          Enter any character and their 3D motion. The AI searches the character identity and sets up the 3D spatial animation automatically:
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <textarea
              rows={2}
              value={directorPrompt}
              onChange={(e) => setDirectorPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate3DVideo();
                }
              }}
              placeholder="e.g. Iron Man hovering in 3D with glowing repulsors in futuristic city, Spider-Man swinging in 3D, Cyberpunk samurai katana strike..."
              className="w-full bg-zinc-950/90 border border-violet-700/60 rounded-xl p-3 text-sm text-zinc-100 focus:outline-none focus:border-violet-400 font-medium shadow-inner resize-none"
            />
          </div>

          <Button
            type="button"
            variant="gradient"
            size="lg"
            onClick={() => handleGenerate3DVideo()}
            disabled={isProcessing || !directorPrompt.trim()}
            className="sm:w-48 font-bold text-xs shadow-xl shadow-violet-900/50 h-auto py-3 shrink-0"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Compass className="w-4 h-4 mr-2" /> Make 3D Video
              </>
            )}
          </Button>
        </div>

        {/* Quick Inspiration Chips */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold block">
            Click Quick 3D Character Inspirations:
          </span>
          <div className="flex flex-wrap gap-2">
            {PROMPT_INSPIRATIONS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setDirectorPrompt(item.prompt);
                  handleGenerate3DVideo(item.prompt);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-950/80 hover:bg-violet-950/80 border border-zinc-800 hover:border-violet-600 text-xs text-zinc-300 hover:text-violet-200 transition-all shadow-sm flex items-center gap-1.5 group"
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Viewport & Stage View Switcher */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveStageView("3d_spatial")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                activeStageView === "3d_spatial"
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-950/60"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              <Compass className="w-4 h-4 text-violet-300" />
              🎮 3D Spatial Motion Viewport (Three.js)
            </button>

            <button
              type="button"
              onClick={() => setActiveStageView("split_compare")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                activeStageView === "split_compare"
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-950/60"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              <Film className="w-4 h-4 text-violet-300" />
              🎬 Dual Video Player & Export
              {generatedVideoUrl && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Character Locked: <strong className="text-zinc-100">{aiCharacter.characterName}</strong></span>
          </div>
        </div>

        {/* Dynamic Center Stage Component */}
        {activeStageView === "3d_spatial" ? (
          <ThreeDCharacterMotionViewport
            characterName={aiCharacter.characterName}
            avatarUrl={customCharacterImageUrl || aiCharacter.avatarUrl}
            accentColor={aiCharacter.accentColor}
            secondaryColor={aiCharacter.secondaryColor}
            motionType={aiCharacter.suggested3DMotion}
            isGenerating={isProcessing}
            drivingVideoTime={drivingVideoTime}
            isDrivingVideoPlaying={isDrivingVideoPlaying}
            drivingVideoDuration={drivingVideoDuration}
            onVideoCaptured={(blob, url) => {
              setGeneratedVideoUrl(url);
              setActiveStageView("split_compare");
            }}
          />
        ) : (
          <div className="space-y-3">
            <SplitScreenComparePlayer
              originalVideoUrl={drivingVideoUrl}
              generatedVideoUrl={generatedVideoUrl}
              originalLabel={`Driving Motion (${(trimEnd - trimStart).toFixed(1)}s)`}
              generatedLabel={`3D Character: ${aiCharacter.characterName}`}
            />
          </div>
        )}
      </div>

      {/* Live Job Progress Notification Banner (SSE) */}
      {isProcessing && (
        <div className="p-4 rounded-xl bg-violet-950/40 border border-violet-800/60 shadow-lg space-y-3 animate-pulse-glow">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping" />
              <span className="font-semibold text-violet-200">
                {currentStage || "Synthesizing 3D character kinematics..."}
              </span>
            </div>
            <span className="font-mono text-violet-300 font-bold">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-zinc-800" />
        </div>
      )}

      {/* Dual Column Configuration: 3D Motion Controls & AI Character Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: 3D Motion & Driving Choreography */}
        <div className="space-y-6">
          {/* AI 3D Kinematics & Motion Presets */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-violet-400" />
                <h3 className="font-semibold text-zinc-100 text-sm tracking-wide">
                  3D MOTION DYNAMICS & KINEMATICS
                </h3>
              </div>
              <Badge variant="purple" className="text-[10px] uppercase font-mono">
                {aiCharacter.suggested3DMotion.replace("_", " ")}
              </Badge>
            </div>

            <p className="text-xs text-zinc-400">
              Select or customize the 3D movement physics for {aiCharacter.characterName}:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: "orbit_combat", label: "🥋 360° Combat Stance", desc: "Rotational swordplay & striking" },
                { id: "depth_flight", label: "🚀 3D Flight & Hover", desc: "Z-axis swooping & thrust" },
                { id: "acrobatic_swing", label: "🕷️ Acrobatic Swing", desc: "Pendulum physics & roll" },
                { id: "ground_sprint", label: "🏃 Rapid Sprint", desc: "High-speed ground locomotion" },
                { id: "dramatic_float", label: "🌌 Cosmic Float", desc: "Zero-gravity floating" },
              ].map((m) => {
                const isSelected = aiCharacter.suggested3DMotion === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setAiCharacter((prev) => ({
                        ...prev,
                        suggested3DMotion: m.id as any,
                      }));
                    }}
                    className={`p-2.5 rounded-lg text-left transition border ${
                      isSelected
                        ? "bg-violet-600/30 border-violet-500 text-violet-200 shadow"
                        : "bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                    }`}
                  >
                    <div className="font-bold text-xs text-zinc-100">{m.label}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Driving Video Trimmer */}
          <VideoUploaderTrimmer
            onTrimmedVideoReady={handleTrimmedVideoReady}
            minDuration={3}
            maxDuration={15}
            onPlaybackSync={(time, isPlaying, duration) => {
              setDrivingVideoTime(time);
              setIsDrivingVideoPlaying(isPlaying);
              setDrivingVideoDuration(duration);
            }}
          />
        </div>

        {/* Right Column: AI Character Intelligence Inspector (NO PHOTO UPLOAD NEEDED) */}
        <div className="space-y-6">
          {/* AI Character Discovery Card */}
          <div className="bg-gradient-to-br from-violet-950/30 via-zinc-900 to-zinc-900 border border-violet-800/50 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-violet-400" />
                <h3 className="font-semibold text-zinc-100 text-sm tracking-wide">
                  AI-DISCOVERED CHARACTER IDENTITY
                </h3>
              </div>
              <Badge variant="purple" className="text-[10px] uppercase font-mono">
                {aiCharacter.archetype}
              </Badge>
            </div>

            <div className="flex items-start gap-4">
              <img
                src={customCharacterImageUrl || aiCharacter.avatarUrl}
                alt={aiCharacter.characterName}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-violet-500/80 shadow-xl bg-zinc-950 shrink-0"
              />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Badge variant="success" className="text-[9px] uppercase font-mono">
                  Identified & Rigged in 3D
                </Badge>
                <h4 className="text-lg font-extrabold text-zinc-100 truncate">
                  {aiCharacter.characterName}
                </h4>
                <p className="text-xs text-zinc-300 line-clamp-2">
                  {aiCharacter.costumeDetails}
                </p>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: aiCharacter.accentColor }} />
                    Key Light
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: aiCharacter.secondaryColor }} />
                    Rim Light
                  </span>
                </div>
              </div>
            </div>

            {/* Character Selection: Text Prompt Search OR Direct Image Reference Upload */}
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <form onSubmit={handleDirectCharacterSearch} className="flex gap-2">
                <input
                  type="text"
                  value={characterSearchQuery}
                  onChange={(e) => setCharacterSearchQuery(e.target.value)}
                  placeholder="Search character name (e.g. Iron Man, Batman, Goku, Samurai)..."
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
                />
                <Button type="submit" variant="gradient" size="sm" className="text-xs shrink-0 font-semibold">
                  <Search className="w-3.5 h-3.5 mr-1" /> Search
                </Button>
              </form>

              {/* Direct Character Reference Image Upload */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-violet-400" />
                  <span className="text-xs text-zinc-300">Or Upload Reference Image:</span>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCharacterImageUpload}
                    className="hidden"
                  />
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-violet-950/80 hover:bg-violet-900 border border-violet-700/60 text-violet-200 transition">
                    <Upload className="w-3.5 h-3.5" />
                    {isUploadingCharacterImage ? "Uploading..." : "Upload Image"}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* V2V Generation Controls: Aspect Ratio & Model Picker */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ratio className="w-4 h-4 text-violet-400" />
                <h3 className="font-semibold text-zinc-100 text-sm tracking-wide">
                  V2V GENERATION CONTROLS
                </h3>
              </div>
              <Badge variant="purple" className="text-[10px] uppercase font-mono">
                {aspectRatio} • {v2vModel}
              </Badge>
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
                Output Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["16:9", "9:16", "1:1"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAspectRatio(r)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${
                      aspectRatio === r
                        ? "bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-900/40"
                        : "bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {r === "16:9" ? "16:9 Landscape" : r === "9:16" ? "9:16 Portrait" : "1:1 Square"}
                  </button>
                ))}
              </div>
            </div>

            {/* V2V Motion Diffusion Model Picker */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
                Inference Model Engine
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "mimic-motion", name: "MimicMotion", tag: "Pose-Guided" },
                  { id: "wan-v2v", name: "Wan-Video V2V", tag: "Temporal 4K" },
                  { id: "champ", name: "Champ 3D", tag: "Parametric" },
                  { id: "kling-motion", name: "Kling Motion", tag: "Cinema Flow" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setV2vModel(m.id as any)}
                    className={`p-2.5 rounded-lg text-left transition border ${
                      v2vModel === m.id
                        ? "bg-violet-600/30 border-violet-500 text-violet-200 shadow"
                        : "bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="font-bold text-xs text-zinc-100">{m.name}</div>
                    <div className="text-[10px] text-zinc-400 font-mono">{m.tag}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3D Rendering & Post-Processing Controls */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Sliders className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold text-zinc-100 text-sm tracking-wide">
                3D SPATIAL & COHERENCE CONTROLS
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              {/* SAM 2 Isolation */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <div>
                  <div className="font-semibold text-zinc-200">SAM 2 3D Foreground Isolation</div>
                  <div className="text-zinc-400 text-[11px]">
                    Isolates 3D character mesh cleanly from background.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableSam2}
                  onChange={(e) => setEnableSam2(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 text-violet-600 focus:ring-violet-500 bg-zinc-900 cursor-pointer"
                />
              </div>

              {/* 3D Head & Torso Rotation */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <div>
                  <div className="font-semibold text-zinc-200">3D Yaw & Pitch Rotation Tracking</div>
                  <div className="text-zinc-400 text-[11px]">
                    Tracks 3D head and torso rotational angles ($\theta$).
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableHeadRotation}
                  onChange={(e) => setEnableHeadRotation(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 text-violet-600 focus:ring-violet-500 bg-zinc-900 cursor-pointer"
                />
              </div>

              {/* Dynamic 3D Lighting Match */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <div>
                  <div className="font-semibold text-zinc-200">Volumetric 3D Lighting Harmonization</div>
                  <div className="text-zinc-400 text-[11px]">
                    Matches character skin tone to 3D scene ambient lighting.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableColorHarmonization}
                  onChange={(e) => setEnableColorHarmonization(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 text-violet-600 focus:ring-violet-500 bg-zinc-900 cursor-pointer"
                />
              </div>

              {/* Motion Fidelity Slider */}
              <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-zinc-200">3D Motion Fidelity</span>
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
      </div>

      {/* Developer API & Code Snippet Modal */}
      {isApiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-950/60 border border-violet-700/50 text-violet-400">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-100 text-sm">
                    PersonaMotion 3D Video AI Engine API
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Production-grade, zero-cost 3D video-to-video API.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsApiModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm font-mono p-1 rounded-md hover:bg-zinc-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Code Snippet Box with Tabs */}
            <div className="flex gap-2 border-b border-zinc-800 pb-2 text-xs">
              <button
                type="button"
                onClick={() => setApiTab("motion_swap")}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  apiTab === "motion_swap"
                    ? "bg-violet-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                V2V Motion Transfer (/api/v2v/generate)
              </button>
              <button
                type="button"
                onClick={() => setApiTab("motion_search")}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  apiTab === "motion_search"
                    ? "bg-violet-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Status Polling (/api/v2v/status)
              </button>
              <button
                type="button"
                onClick={() => setApiTab("story")}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  apiTab === "story"
                    ? "bg-violet-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Webhook (/api/v2v/webhook)
              </button>
            </div>

            <div className="relative">
              <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-[11px] font-mono text-zinc-300 overflow-x-auto leading-relaxed max-h-72">
{apiTab === "motion_swap"
? `// 1. Dispatch Video-to-Video Motion Transfer Job
curl -X POST http://localhost:3000/api/v2v/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "drivingVideoUrl": "${drivingVideoUrl}",
    "characterImageUrl": "${customCharacterImageUrl || aiCharacter.avatarUrl}",
    "characterPrompt": "${directorPrompt}",
    "model": "${v2vModel}",
    "aspectRatio": "${aspectRatio}",
    "motionFidelity": ${motionFidelity},
    "enableAudioSync": true
  }'

// Response (202 Accepted):
// { "success": true, "job_id": "v2v_172935...", "status": "queued", "poll_url": "/api/v2v/status/v2v_172935..." }`
: apiTab === "motion_search"
? `// 2. Poll V2V Motion Transfer Job Status
curl -X GET http://localhost:3000/api/v2v/status/${jobId || "v2v_1729358..."}

// Response:
// {
//   "job_id": "v2v_...",
//   "status": "processing", // "queued" | "processing" | "completed" | "failed"
//   "progress": 65,
//   "stage": "Isolating subject foreground dynamics via SAM 2...",
//   "output_video_url": "https://.../swapped_master.mp4"
// }`
: `// 3. Receive Async Completion Webhook
curl -X POST http://localhost:3000/api/v2v/webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_id": "v2v_172935...",
    "status": "COMPLETED",
    "output_video_url": "https://fal.media/files/.../output.mp4"
  }'`}
              </pre>

              <button
                type="button"
                onClick={() => {
                  const textToCopy = `curl -X POST http://localhost:3000/api/v2v/generate -H "Content-Type: application/json" -d '{"drivingVideoUrl":"${drivingVideoUrl}","characterImageUrl":"${customCharacterImageUrl || aiCharacter.avatarUrl}","characterPrompt":"${directorPrompt}","model":"${v2vModel}","aspectRatio":"${aspectRatio}"}'`;
                  navigator.clipboard.writeText(textToCopy);
                  setCopiedSnippet(true);
                  setTimeout(() => setCopiedSnippet(false), 2000);
                }}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 text-[11px] flex items-center gap-1 transition"
              >
                {copiedSnippet ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy cURL
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
              <span className="text-zinc-400 text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Zero API keys required • Self-hosted & unlimited
              </span>
              <Button
                variant="gradient"
                size="sm"
                onClick={() => setIsApiModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
