"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Film,
  Sparkles,
  Layers,
  Wand2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Scissors,
  CheckCircle2,
  RefreshCw,
  Download,
  Clock,
  Video,
  Plus,
  BookOpen,
  Trash2,
  FileText,
  Camera,
  Flame,
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
    icon: "🐱",
    label: "Biker Cat & Mecha Dragon",
    text: "SCENE 1: An empty asphalt highway during a golden hour sunset. A hyper-realistic anthropomorphic British Shorthair cat in a black motorcycle leather jacket stands firmly, holding a red Uno card clearly facing the camera.\nSCENE 2: A massive glowing white and chrome mechanical dragon robot idles in the background behind the cat, its wings casting long metallic shadows.\nSCENE 3: The cat taps the red Uno card with a confident smirk, unleashing a radiant crystalline shockwave that synchronizes the dragon's power core.",
  },
  {
    icon: "🦾",
    label: "Cyberpunk Infiltration",
    text: "SCENE 1: Elena Vance infiltrates the Arasaka high-orbit data spire under cover of heavy rain.\nSCENE 2: Dodging laser tripwires and airborne search drones, she hacks the central mainframe with her cyberdeck.\nSCENE 3: Elena parachutes off the spire balcony, descending into the neon metropolis below as alarms flare.",
  },
  {
    icon: "🗡️",
    label: "Cyber Samurai Duel",
    text: "SCENE 1: Ren the Cyber Samurai stands motionless on a rain-slicked neon rooftop in Neo-Kyoto.\nSCENE 2: Three stealth assassin drones emerge from the steam with humming plasma blades.\nSCENE 3: Ren draws his illuminated cyan katana, executing an instantaneous deflective slash in a shower of sparks.",
  },
  {
    icon: "⚡",
    label: "Superhero Airborne Leap",
    text: "SCENE 1: Marcus Cole sprints up the exterior catwalk of the broadcasting tower as thunder rolls.\nSCENE 2: Reaching the summit, he charges kinetic energy into his arm gauntlet, eyes glowing blue.\nSCENE 3: He leaps into the stormy sky toward the descending flagship to avert disaster.",
  },
];

export default function StoryToVideoPage() {
  const [characters, setCharacters] = useState<CharacterModel[]>(INITIAL_CHARACTERS);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterModel>(INITIAL_CHARACTERS[0]);
  const [detectedCharacter, setDetectedCharacter] = useState<string | null>("Elena Vance");

  // AI Storyboard breakdown state
  const [storyPrompt, setStoryPrompt] = useState<string>(
    "SCENE 1: Elena Vance races against time across the vertical megacity of Neo-Shinjuku.\nSCENE 2: Evading airborne surveillance drones, she executes an acrobatic vault across high-altitude skybridges.\nSCENE 3: She reaches the extraction zone and delivers an encrypted neural core before dawn."
  );
  const [targetShotCount, setTargetShotCount] = useState<number>(3);
  const [stylePreset, setStylePreset] = useState<
    "cinematic" | "anime" | "photorealistic" | "noir" | "fantasy" | "scifi"
  >("cinematic");
  const [isDecomposing, setIsDecomposing] = useState<boolean>(false);
  const [decomposeMessage, setDecomposeMessage] = useState<string | null>(null);

  // Shots state
  const [shots, setShots] = useState<ShotItem[]>(INITIAL_SHOTS);

  // Batch rendering & auto-stitching
  const [isBatchRendering, setIsBatchRendering] = useState<boolean>(false);
  const [isStitching, setIsStitching] = useState<boolean>(false);
  const [stitchedVideoUrl, setStitchedVideoUrl] = useState<string | null>(null);

  // Interactive Cinema Player State (Continuous sequence playback)
  const [activePlayingIndex, setActivePlayingIndex] = useState<number>(0);
  const [isPlayingSequence, setIsPlayingSequence] = useState<boolean>(false);
  const sequenceVideoRef = useRef<HTMLVideoElement | null>(null);

  // Filter completed shots that have a valid playable video URL
  const completedShots = shots.filter((s) => s.status === "COMPLETED" && s.outputVideoUrl);

  // Auto-advance to next shot in cinema sequence player
  const handleSequenceVideoEnded = () => {
    if (completedShots.length === 0) return;
    if (activePlayingIndex < completedShots.length - 1) {
      setActivePlayingIndex(activePlayingIndex + 1);
    } else {
      // Loop back or stop
      setActivePlayingIndex(0);
      setIsPlayingSequence(false);
    }
  };

  // Sync video play/pause
  useEffect(() => {
    if (!sequenceVideoRef.current) return;
    if (isPlayingSequence) {
      sequenceVideoRef.current.play().catch(() => {});
    } else {
      sequenceVideoRef.current.pause();
    }
  }, [isPlayingSequence, activePlayingIndex]);

  // Trigger AI Storyboard Decomposition from user's script
  const handleDecomposeStory = async (customScript?: string) => {
    const scriptToBreak = (customScript || storyPrompt).trim();
    if (!scriptToBreak) return;

    try {
      setIsDecomposing(true);
      setDecomposeMessage(null);

      const res = await fetch("/api/story/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyPrompt: scriptToBreak,
          characterContext: {
            name: selectedCharacter?.name || "Protagonist",
            description: "Consistent character protagonist",
          },
          targetShotCount,
          stylePreset,
        }),
      });

      if (!res.ok) throw new Error("Failed to decompose story script");
      const data = await res.json();

      // If script mentions a character, auto-lock into Character Vault
      if (data.detectedCharacter) {
        setDetectedCharacter(data.detectedCharacter);
        const exists = characters.find(
          (c) => c.name.toLowerCase() === data.detectedCharacter.toLowerCase()
        );
        if (!exists) {
          const autoChar: CharacterModel = {
            id: `char-${Date.now()}`,
            userId: "user-1",
            name: data.detectedCharacter,
            avatarUrl:
              selectedCharacter?.avatarUrl ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
            referenceImages: selectedCharacter?.referenceImages || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setCharacters((prev) => [autoChar, ...prev]);
          setSelectedCharacter(autoChar);
        }
      }

      const newShots: ShotItem[] = data.shots.map((shot: any, idx: number) => ({
        id: `shot-${Date.now()}-${idx}`,
        projectId: "proj-1",
        sequenceOrder: shot.sequenceOrder,
        prompt: shot.prompt,
        negativePrompt: shot.negativePrompt,
        cameraMovement: shot.cameraMovement,
        durationSeconds: shot.durationSeconds,
        characterState: shot.characterState,
        status: "PENDING",
      }));

      setShots(newShots);
      setStitchedVideoUrl(null);
      setActivePlayingIndex(0);
      setIsPlayingSequence(false);
      setDecomposeMessage(
        `Successfully generated ${newShots.length} storyboard shots for character "${data.detectedCharacter || selectedCharacter?.name}". Ready for rendering!`
      );
    } catch (err) {
      console.error(err);
      alert("Error breaking down story script: " + (err as Error).message);
    } finally {
      setIsDecomposing(false);
    }
  };

  // Render individual shot with real Promise lifecycle
  const handleRenderShot = (shotId: string): Promise<void> => {
    return new Promise(async (resolve) => {
      setShots((prev) =>
        prev.map((s) =>
          s.id === shotId
            ? {
                ...s,
                status: "GENERATING",
                progressPercent: 10,
                currentStage: "Submitting to GPU cluster...",
              }
            : s
        )
      );

      try {
        const targetShot = shots.find((s) => s.id === shotId);
        if (!targetShot) {
          resolve();
          return;
        }

        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "SHOT_SYNTHESIS",
            characterId: selectedCharacter?.id || "char-aurora",
            prompt: targetShot.prompt,
            referenceImages: selectedCharacter?.referenceImages?.map((r) => r.url) || [],
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
          const isFailed = payload.status === "FAILED";
          setShots((prev) =>
            prev.map((s) =>
              s.id === shotId
                ? {
                    ...s,
                    status: isFailed ? "FAILED" : "COMPLETED",
                    outputVideoUrl:
                      payload.resultUrl ||
                      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                    progressPercent: 100,
                    currentStage:
                      payload.currentStage || (isFailed ? "Generation failed" : "Completed"),
                  }
                : s
            )
          );
          eventSource.close();
          resolve();
        });

        eventSource.onerror = () => {
          eventSource.close();
          resolve();
        };
      } catch (err) {
        console.error(err);
        setShots((prev) =>
          prev.map((s) =>
            s.id === shotId
              ? { ...s, status: "FAILED", currentStage: (err as Error).message }
              : s
          )
        );
        resolve();
      }
    });
  };

  // Batch render all pending shots sequentially with await
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
      prompt: `Cinematic shot #${newSeq} of ${selectedCharacter?.name || "Protagonist"} advancing through the narrative. Dramatic rim lighting, 35mm anamorphic.`,
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

      if (completedUrls.length === 0) {
        alert("Please render at least one shot before auto-stitching.");
        setIsStitching(false);
        return;
      }

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
            completedUrls[0] ||
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        );
        setIsStitching(false);
        eventSource.close();
      });

      eventSource.onerror = () => {
        setStitchedVideoUrl(completedUrls[0]);
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
  const completedShotsCount = completedShots.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="purple" className="text-xs uppercase tracking-wider font-mono">
              Mode A • Script-to-Video
            </Badge>
            <Badge variant="outline" className="text-xs text-zinc-400">
              Wan 2.1 Diffusion • Depth-Anything-V2 • Character Consistency
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
            Script-to-Video Storyboard Synthesizer
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Enter your screenplay, screenplay scenes, or story narrative. The AI director decomposes your
            script into character-consistent storyboard shots and synthesizes the full video sequence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="lg"
            onClick={handleBatchRenderAll}
            disabled={isBatchRendering || completedShotsCount === shots.length}
            className="text-xs border-violet-800/60 hover:bg-violet-950/40 text-violet-300 font-bold"
          >
            {isBatchRendering ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Batch Rendering...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2 fill-current" /> Batch Render ({shots.length - completedShotsCount} Pending)
              </>
            )}
          </Button>

          <Button
            variant="gradient"
            size="lg"
            onClick={handleAutoStitch}
            disabled={isStitching || completedShotsCount === 0}
            className="font-bold text-xs shadow-xl shadow-violet-600/25"
          >
            {isStitching ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Auto-Stitching...
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" /> Auto-Stitch Master ({completedShotsCount}/{shots.length})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Cloud Character Vault Selection */}
      <CharacterVaultSelector
        characters={characters}
        selectedCharacterId={selectedCharacter?.id}
        onSelectCharacter={(char) => {
          setSelectedCharacter(char);
          setDetectedCharacter(char.name);
        }}
        onCharacterCreated={(newChar) => {
          setCharacters([newChar, ...characters]);
          setSelectedCharacter(newChar);
          setDetectedCharacter(newChar.name);
        }}
      />

      {/* Storyboard Decomposition Command Center */}
      <div className="bg-gradient-to-br from-violet-950/30 via-zinc-900 to-zinc-900 border border-violet-800/50 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-violet-400" />
            <h3 className="font-bold text-zinc-100 text-sm tracking-wide uppercase">
              AI Script Breakdown & Storyboard Director
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-violet-950/80 border border-violet-500/50 text-violet-300 font-mono">
              Anchor: <strong className="text-zinc-100">{detectedCharacter || selectedCharacter?.name}</strong>
            </span>
          </div>
        </div>

        <div className="space-y-3.5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-violet-400" /> Enter Your Story Script / Screenplay:
              </label>

              {/* Quick Story Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-zinc-500 font-medium">Quick Presets:</span>
                {STORY_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setStoryPrompt(p.text);
                      handleDecomposeStory(p.text);
                    }}
                    className="text-[10px] bg-zinc-950 hover:bg-violet-950 border border-zinc-800 hover:border-violet-600 px-2.5 py-1 rounded-lg text-zinc-300 hover:text-violet-200 transition flex items-center gap-1 shadow-sm"
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={storyPrompt}
              onChange={(e) => setStoryPrompt(e.target.value)}
              rows={4}
              placeholder="Paste your story script, screenplay scenes, or narrative beats here (e.g. SCENE 1: ... SCENE 2: ...)..."
              className="w-full bg-zinc-950/90 border border-zinc-700/80 rounded-xl p-3.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 font-mono leading-relaxed shadow-inner resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">
                Target Shot Count
              </label>
              <select
                value={targetShotCount}
                onChange={(e) => setTargetShotCount(parseInt(e.target.value, 10))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-200 font-medium focus:border-violet-500"
              >
                <option value={2}>2 Shots (Short Teaser)</option>
                <option value={3}>3 Shots (Triptych Beat)</option>
                <option value={4}>4 Shots (Full Scene Arc)</option>
                <option value={5}>5 Shots (Extended Sequence)</option>
                <option value={6}>6 Shots (Action Climax)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">
                Visual Style Preset
              </label>
              <select
                value={stylePreset}
                onChange={(e) => setStylePreset(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-200 font-medium focus:border-violet-500"
              >
                <option value="cinematic">Cinematic 35mm Anamorphic</option>
                <option value="photorealistic">Hyper-Realistic 8k</option>
                <option value="anime">Makoto Shinkai Anime Aesthetic</option>
                <option value="noir">High-Contrast Cyber Noir</option>
                <option value="fantasy">Epic High-Fantasy 8k</option>
                <option value="scifi">Futuristic Sci-Fi Anamorphic</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="gradient"
                size="default"
                onClick={() => handleDecomposeStory()}
                disabled={isDecomposing || !storyPrompt.trim()}
                className="w-full text-xs font-bold shadow-lg shadow-violet-900/40 py-2.5 h-auto"
              >
                {isDecomposing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Analyzing Script...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-cyan-300" /> Decompose Script into Shot Cards
                  </>
                )}
              </Button>
            </div>
          </div>

          {decomposeMessage && (
            <div className="p-3 rounded-xl bg-violet-950/50 border border-violet-800/60 text-xs text-violet-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{decomposeMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Storyboard Cinema Player (Plays completed shots in sequence) */}
      {completedShots.length > 0 && (
        <div className="bg-zinc-900 border border-violet-900/60 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-violet-400" />
              <div>
                <h3 className="font-bold text-zinc-100 text-sm">
                  STORYBOARD CINEMA PLAYER (CONTINUOUS SEQUENCE)
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Plays rendered shots seamlessly in chronological sequence with narrative pacing.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="purple" className="text-xs font-mono">
                Playing Shot {activePlayingIndex + 1} of {completedShots.length}
              </Badge>
              {stitchedVideoUrl && (
                <a
                  href={stitchedVideoUrl}
                  download="stitched_storyboard_final.mp4"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" size="sm" className="text-xs border-emerald-700/60 text-emerald-300">
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Download Stitched MP4
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Active Cinema Video Player */}
          <div className="relative aspect-video w-full max-h-[460px] bg-black rounded-xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center">
            {completedShots[activePlayingIndex]?.outputVideoUrl && (
              <video
                ref={sequenceVideoRef}
                src={completedShots[activePlayingIndex].outputVideoUrl!}
                controls
                playsInline
                onEnded={handleSequenceVideoEnded}
                className="w-full h-full object-contain"
              />
            )}

            {/* Current Playing Shot Overlay */}
            <div className="absolute top-3 left-3 bg-black/80 backdrop-blur border border-zinc-800 rounded-lg px-3 py-1 text-xs text-zinc-200 flex items-center gap-2 font-mono">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Shot #{completedShots[activePlayingIndex]?.sequenceOrder}: {completedShots[activePlayingIndex]?.cameraMovement}</span>
            </div>
          </div>

          {/* Player Timeline Bar */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activePlayingIndex > 0) setActivePlayingIndex(activePlayingIndex - 1);
                }}
                disabled={activePlayingIndex === 0}
                className="text-xs"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="gradient"
                size="sm"
                onClick={() => setIsPlayingSequence(!isPlayingSequence)}
                className="text-xs font-bold"
              >
                {isPlayingSequence ? (
                  <>
                    <Pause className="w-3.5 h-3.5 mr-1" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1 fill-current" /> Play Story Sequence
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activePlayingIndex < completedShots.length - 1) {
                    setActivePlayingIndex(activePlayingIndex + 1);
                  }
                }}
                disabled={activePlayingIndex >= completedShots.length - 1}
                className="text-xs"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {completedShots.map((shot, idx) => (
                <button
                  key={shot.id}
                  onClick={() => {
                    setActivePlayingIndex(idx);
                    setIsPlayingSequence(true);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition border ${
                    activePlayingIndex === idx
                      ? "bg-violet-600 text-white border-violet-500 shadow"
                      : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  Shot #{shot.sequenceOrder}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Auto-Stitched Video Master (when available) */}
      {stitchedVideoUrl && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-zinc-100 text-sm">
                FINAL STITCHED MASTER CINEMATIC VIDEO (MP4)
              </h3>
            </div>
            <a
              href={stitchedVideoUrl}
              download="stitched_storyboard_final.mp4"
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" size="sm" className="text-xs border-emerald-700/60 text-emerald-300">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download Master Video
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
          {shots.map((shot, idx) => (
            <div
              key={shot.id}
              className={`rounded-xl transition ${
                completedShots[activePlayingIndex]?.id === shot.id
                  ? "ring-2 ring-violet-500 shadow-xl shadow-violet-950/40"
                  : ""
              }`}
            >
              <StoryboardShotCard
                shot={shot}
                onUpdateShot={(updated) =>
                  setShots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
                }
                onRenderShot={handleRenderShot}
                onDeleteShot={handleDeleteShot}
                onDuplicateShot={handleDuplicateShot}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
