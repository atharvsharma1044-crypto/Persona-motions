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

  // Render individual shot
  const handleRenderShot = async (shotId: string) => {
    setShots((prev) =>
      prev.map((s) => (s.id === shotId ? { ...s, status: "GENERATING" } : s))
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

      const data = await res.json();
      const eventSource = new EventSource(`/api/jobs/${data.jobId}/stream`);

      eventSource.addEventListener("done", (evt) => {
        const payload = JSON.parse(evt.data);
        setShots((prev) =>
          prev.map((s) =>
            s.id === shotId
              ? {
                  ...s,
                  status: "COMPLETED",
                  outputVideoUrl:
                    payload.resultUrl ||
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                }
              : s
          )
        );
        eventSource.close();
      });
    } catch (err) {
      console.error(err);
      setShots((prev) =>
        prev.map((s) => (s.id === shotId ? { ...s, status: "FAILED" } : s))
      );
    }
  };

  // Cloud Auto-Stitch worker
  const handleAutoStitch = async () => {
    setIsStitching(true);
    setTimeout(() => {
      setStitchedVideoUrl(
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      );
      setIsStitching(false);
    }, 3000);
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

        <div className="flex items-center gap-3">
          <Button
            variant="gradient"
            size="lg"
            onClick={handleAutoStitch}
            disabled={isStitching || completedShotsCount === 0}
            className="w-full md:w-auto font-semibold shadow-xl shadow-violet-600/25"
          >
            {isStitching ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Auto-Stitching Shots...
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" />
                Cloud Auto-Stitch Sequence ({completedShotsCount}/{shots.length})
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
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              Story Script / Narrative Arc
            </label>
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
              <Button variant="outline" size="sm" className="text-xs">
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
          <span className="text-xs font-mono text-zinc-400">
            Rendered: {completedShotsCount} of {shots.length}
          </span>
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
            />
          ))}
        </div>
      </div>
    </div>
  );
}
