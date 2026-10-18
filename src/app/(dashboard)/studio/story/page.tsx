"use client";

import React, { useState } from "react";
import {
  Film,
  Sparkles,
  Layers,
  Wand2,
  Play,
  Scissors,
  CheckCircle2,
  RefreshCw,
  Download,
  Clock,
  Video,
  Plus,
  BookOpen,
} from "lucide-react";
import { CharacterVaultSelector } from "@/components/studio/CharacterVaultSelector";
import { StoryboardShotCard } from "@/components/studio/StoryboardShotCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CharacterModel, ShotItem } from "@/types";

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
];

const INITIAL_SHOTS: ShotItem[] = [
  {
    id: "shot-1",
    projectId: "proj-1",
    sequenceOrder: 1,
    prompt:
      "Cinematic wide establishing shot of Elena Vance standing on a rain-slicked neon rooftop in Neo-Shinjuku. Volumetric mist, chromatic reflections, 35mm anamorphic.",
    cameraMovement: "Wide Dutch Angle",
    durationSeconds: 4.0,
    characterState: "Alert, trenchcoat blowing in wind",
    status: "COMPLETED",
    outputVideoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  },
  {
    id: "shot-2",
    projectId: "proj-1",
    sequenceOrder: 2,
    prompt:
      "Dramatic close-up push in on Elena Vance's determined gaze as holographic advertisements reflect across her irises. 8k, shallow depth of field.",
    cameraMovement: "Push In Close-Up",
    durationSeconds: 3.5,
    characterState: "Subtle eye flicker, confident smirk",
    status: "COMPLETED",
    outputVideoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
  },
  {
    id: "shot-3",
    projectId: "proj-1",
    sequenceOrder: 3,
    prompt:
      "Dynamic tracking camera following Elena sprinting across skybridge catwalks while surveillance drone searchlights cut through purple steam.",
    cameraMovement: "Tracking Shot Following Subject",
    durationSeconds: 4.5,
    characterState: "Full sprint, acrobatic leap",
    status: "PENDING",
  },
];

const STORY_PRESETS = [
  {
    label: "Cyberpunk Infiltration",
    text: "Elena Vance infiltrates the Arasaka high-orbit data spire. Dodging laser tripwires and airborne search drones, she hacks the central mainframe and parachutes into the neon metropolis below.",
  },
  {
    label: "Blade Runner Detective",
    text: "Elena Vance navigates a rain-drenched dark alleyway in futuristic Los Angeles. Inspecting a broken synthetic neural implant under flickering neon signage, she notices an approaching shadowed figure.",
  },
  {
    label: "Anime Fantasy Climax",
    text: "Elena Vance summons ancient luminescent energy atop a crumbling floating citadel. Surrounded by tempestuous celestial storm clouds, she unleashes her power toward the rift to restore balance.",
  },
];

export default function StoryToVideoPage() {
  const [characters, setCharacters] = useState<CharacterModel[]>(INITIAL_CHARACTERS);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterModel>(INITIAL_CHARACTERS[0]);

  // AI Storyboard breakdown state
  const [storyPrompt, setStoryPrompt] = useState<string>(
    "Elena Vance races against time across the vertical megacity of Neo-Shinjuku. Evading airborne surveillance drones, she executes an acrobatic vault across high-altitude skybridges to deliver an encrypted neural core before dawn."
  );
  const [targetShotCount, setTargetShotCount] = useState<number>(3);
  const [stylePreset, setStylePreset] = useState<"cinematic" | "anime" | "photorealistic" | "noir">("cinematic");
  const [isDecomposing, setIsDecomposing] = useState<boolean>(false);

  // Shots state
  const [shots, setShots] = useState<ShotItem[]>(INITIAL_SHOTS);

  // Batch rendering & auto-stitching
  const [isBatchRendering, setIsBatchRendering] = useState<boolean>(false);
  const [isStitching, setIsStitching] = useState<boolean>(false);
  const [stitchedVideoUrl, setStitchedVideoUrl] = useState<string | null>(null);

  // Trigger AI Storyboard Decomposition
  const handleDecomposeStory = async () => {
    try {
      setIsDecomposing(true);
      const res = await fetch("/api/story/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyPrompt,
          characterContext: {
            name: selectedCharacter.name,
            description: "Cyberpunk operative with sleek futuristic aesthetic",
          },
          targetShotCount,
          stylePreset,
        }),
      });

      if (!res.ok) throw new Error("Failed to decompose story prompt");
      const data = await res.json();

      const newShots: ShotItem[] = data.shots.map(
        (shot: any, idx: number) => ({
          id: `shot-${Date.now()}-${idx}`,
          projectId: "proj-1",
          sequenceOrder: shot.sequenceOrder,
          prompt: shot.prompt,
          negativePrompt: shot.negativePrompt,
          cameraMovement: shot.cameraMovement,
          durationSeconds: shot.durationSeconds,
          characterState: shot.characterState,
          status: "PENDING",
        })
      );

      setShots(newShots);
      setStitchedVideoUrl(null);
    } catch (err) {
      console.error(err);
      alert("Error breaking down story: " + (err as Error).message);
    } finally {
      setIsDecomposing(false);
    }
  };

  // Render individual shot with live progress
  const handleRenderShot = async (shotId: string) => {
    setShots((prev) =>
      prev.map((s) => (s.id === shotId ? { ...s, status: "GENERATING", progressPercent: 10, currentStage: "Submitting to GPU cluster..." } : s))
    );

    try {
      const targetShot = shots.find((s) => s.id === shotId);
      if (!targetShot) return;

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SHOT_SYNTHESIS",
          characterId: selectedCharacter.id,
          prompt: targetShot.prompt,
          referenceImages: selectedCharacter.referenceImages.map((r) => r.url),
          options: {
            cameraMovement: targetShot.cameraMovement,
            durationSeconds: targetShot.durationSeconds,
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to initiate shot generation job");
      }

      const data = await res.json();
      const eventSource = new EventSource(`/api/jobs/${data.jobId}/stream`);

      eventSource.addEventListener("progress", (evt) => {
        const payload = JSON.parse(evt.data);
        setShots((prev) =>
          prev.map((s) =>
            s.id === shotId
              ? {
                  ...s,
                  status: "GENERATING",
                  progressPercent: payload.progressPercent || 15,
                  currentStage: payload.currentStage || "Synthesizing shot diffusion...",
                }
              : s
          )
        );
      });

      eventSource.addEventListener("done", (evt) => {
        const payload = JSON.parse(evt.data);
        setShots((prev) =>
          prev.map((s) =>
            s.id === shotId
              ? {
                  ...s,
                  status: payload.status === "FAILED" ? "FAILED" : "COMPLETED",
                  outputVideoUrl:
                    payload.resultUrl ||
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                  progressPercent: 100,
                  currentStage: payload.currentStage || "Completed",
                }
              : s
          )
        );
        eventSource.close();
      });

      eventSource.onerror = () => {
        eventSource.close();
      };
    } catch (err) {
      console.error(err);
      setShots((prev) =>
        prev.map((s) => (s.id === shotId ? { ...s, status: "FAILED", currentStage: (err as Error).message } : s))
      );
    }
  };

  // Batch render all pending shots sequentially
  const handleBatchRenderAll = async () => {
    const pendingShots = shots.filter((s) => s.status !== "COMPLETED");
    if (pendingShots.length === 0) return;

    setIsBatchRendering(true);
    for (const shot of pendingShots) {
      await handleRenderShot(shot.id);
    }
    setIsBatchRendering(false);
  };

  // Add new shot card
  const handleAddShot = () => {
    const newSeq = shots.length + 1;
    const newShot: ShotItem = {
      id: `shot-${Date.now()}`,
      projectId: "proj-1",
      sequenceOrder: newSeq,
      prompt: `Cinematic shot #${newSeq} of ${selectedCharacter.name} advancing through the narrative. Dramatic rim lighting, 35mm anamorphic.`,
      cameraMovement: "Tracking Shot Following Subject",
      durationSeconds: 4.0,
      characterState: "Dramatic focus and action",
      status: "PENDING",
    };
    setShots([...shots, newShot]);
  };

  // Delete shot card
  const handleDeleteShot = (shotId: string) => {
    const filtered = shots.filter((s) => s.id !== shotId);
    const reordered = filtered.map((s, idx) => ({ ...s, sequenceOrder: idx + 1 }));
    setShots(reordered);
  };

  // Duplicate shot card
  const handleDuplicateShot = (shotId: string) => {
    const target = shots.find((s) => s.id === shotId);
    if (!target) return;
    const duplicated: ShotItem = {
      ...target,
      id: `shot-${Date.now()}`,
      sequenceOrder: shots.length + 1,
      status: "PENDING",
      outputVideoUrl: null,
    };
    setShots([...shots, duplicated]);
  };

  // Cloud Auto-Stitch worker
  const handleAutoStitch = async () => {
    try {
      setIsStitching(true);
      const completedUrls = shots
        .filter((s) => s.status === "COMPLETED" && s.outputVideoUrl)
        .map((s) => s.outputVideoUrl!);

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "STORY_STITCH",
          shotVideoUrls: completedUrls,
          options: {
            audioTrackUrl: "https://actions.google.com/sounds/v1/science_fiction/ambient_hum.ogg",
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to dispatch stitch worker");
      const data = await res.json();

      const eventSource = new EventSource(`/api/jobs/${data.jobId}/stream`);
      eventSource.addEventListener("done", (evt) => {
        const payload = JSON.parse(evt.data);
        setStitchedVideoUrl(
          payload.resultUrl ||
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        );
        setIsStitching(false);
        eventSource.close();
      });

      eventSource.onerror = () => {
        setIsStitching(false);
        eventSource.close();
      };
    } catch (err) {
      console.error(err);
      setIsStitching(false);
      alert("Error stitching sequence: " + (err as Error).message);
    }
  };

  const totalStoryDuration = shots.reduce((sum, s) => sum + s.durationSeconds, 0);
  const completedShotsCount = shots.filter((s) => s.status === "COMPLETED").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="purple" className="text-xs uppercase tracking-wider font-mono">
              Mode A • Story-to-Video
            </Badge>
            <Badge variant="outline" className="text-xs text-zinc-400">
              IP-Adapter + InstantID + Wan 2.1 Video Diffusion
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
            AI Storyboard & Video Sequence Synthesizer
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Input a screenplay or narrative prompt. The AI director generates a structured sequence
            of visual shots, conditioning character consistency across every frame with IP-Adapter.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="lg"
            onClick={handleBatchRenderAll}
            disabled={isBatchRendering || completedShotsCount === shots.length}
            className="text-xs border-violet-800/60 hover:bg-violet-950/40 text-violet-300"
          >
            {isBatchRendering ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Batch Rendering...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2 fill-current" /> Batch Render Pending ({shots.length - completedShotsCount})
              </>
            )}
          </Button>

          <Button
            variant="gradient"
            size="lg"
            onClick={handleAutoStitch}
            disabled={isStitching || completedShotsCount === 0}
            className="font-semibold shadow-xl shadow-violet-600/25"
          >
            {isStitching ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Auto-Stitching...
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" /> Auto-Stitch ({completedShotsCount}/{shots.length})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Cloud Character Vault Selection */}
      <CharacterVaultSelector
        characters={characters}
        selectedCharacterId={selectedCharacter?.id}
        onSelectCharacter={(char) => setSelectedCharacter(char)}
        onCharacterCreated={(newChar) => setCharacters([newChar, ...characters])}
      />

      {/* Storyboard Decomposition Command Center */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-violet-400" />
            <h3 className="font-semibold text-zinc-100 text-sm tracking-wide">
              AI STORYBOARD BREAKDOWN DIRECTOR
            </h3>
          </div>
          <Badge variant="purple" className="text-xs font-mono">
            Consistency Anchor: {selectedCharacter.name}
          </Badge>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-300 block">
                Story Script / Narrative Arc
              </label>
              {/* Quick Story Presets */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-500">Presets:</span>
                {STORY_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setStoryPrompt(p.text)}
                    className="text-[10px] bg-zinc-950 hover:bg-violet-950/60 border border-zinc-800 hover:border-violet-700/60 px-2 py-0.5 rounded text-zinc-300 hover:text-violet-200 transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={storyPrompt}
              onChange={(e) => setStoryPrompt(e.target.value)}
              rows={3}
              placeholder="Describe your scene sequence, character goals, and visual actions..."
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg p-3 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1">
                Target Shot Count
              </label>
              <select
                value={targetShotCount}
                onChange={(e) => setTargetShotCount(parseInt(e.target.value, 10))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200"
              >
                <option value={2}>2 Shots (Short Teaser)</option>
                <option value={3}>3 Shots (Triptych Beat)</option>
                <option value={4}>4 Shots (Full Scene Arc)</option>
                <option value={6}>6 Shots (Action Sequence)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1">
                Visual Style Preset
              </label>
              <select
                value={stylePreset}
                onChange={(e) => setStylePreset(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200"
              >
                <option value="cinematic">Cinematic 35mm Anamorphic</option>
                <option value="photorealistic">Hyper-Realistic 8k</option>
                <option value="noir">High-Contrast Cyber Noir</option>
                <option value="anime">Makoto Shinkai Anime Aesthetic</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="default"
                size="default"
                onClick={handleDecomposeStory}
                disabled={isDecomposing}
                className="w-full text-xs"
              >
                {isDecomposing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Decomposing Script...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-cyan-400" /> Generate AI Shot Cards
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Stitched Video Presentation (when available) */}
      {stitchedVideoUrl && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-zinc-100 text-sm">
                FINAL STITCHED CINEMATIC SEQUENCE (MP4)
              </h3>
            </div>
            <a
              href={stitchedVideoUrl}
              download="stitched_storyboard_final.mp4"
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" size="sm" className="text-xs border-emerald-700/60 text-emerald-300">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download Full Video
              </Button>
            </a>
          </div>

          <div className="aspect-video w-full max-h-96 bg-black rounded-lg overflow-hidden border border-zinc-800">
            <video
              src={stitchedVideoUrl}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Shot Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-violet-400" />
            <h3 className="font-bold text-zinc-100 text-sm">
              SHOT TIMELINE & STORYBOARD ({shots.length} SHOTS • {totalStoryDuration.toFixed(1)}s TOTAL)
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddShot}
              className="text-xs border-zinc-700 hover:border-violet-500"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Shot
            </Button>
            <span className="text-xs font-mono text-zinc-400">
              Rendered: {completedShotsCount} of {shots.length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shots.map((shot) => (
            <StoryboardShotCard
              key={shot.id}
              shot={shot}
              onUpdateShot={(updated) =>
                setShots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
              }
              onRenderShot={handleRenderShot}
              onDeleteShot={handleDeleteShot}
              onDuplicateShot={handleDuplicateShot}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
