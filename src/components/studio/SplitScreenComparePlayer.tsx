"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Columns,
  SplitSquareVertical,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Gauge,
} from "lucide-react";
import { formatTimecode } from "@/lib/utils";

interface SplitScreenComparePlayerProps {
  originalVideoUrl: string;
  generatedVideoUrl: string;
  originalLabel?: string;
  generatedLabel?: string;
  className?: string;
}

export function SplitScreenComparePlayer({
  originalVideoUrl,
  generatedVideoUrl,
  originalLabel = "Source Driving Video (Input)",
  generatedLabel = "Retargeted Motion (PersonaMotion AI)",
  className = "",
}: SplitScreenComparePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const generatedVideoRef = useRef<HTMLVideoElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Comparison Display Modes: "split" (slider divider) or "side-by-side"
  const [displayMode, setDisplayMode] = useState<"split" | "side-by-side">("split");
  // Slider position in percent (0 to 100)
  const [splitPos, setSplitPos] = useState<number>(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);

  // Synchronize play / pause between both HTML5 video elements
  const togglePlay = useCallback(() => {
    const v1 = originalVideoRef.current;
    const v2 = generatedVideoRef.current;
    if (!v1 || !v2) return;

    if (isPlaying) {
      v1.pause();
      v2.pause();
      setIsPlaying(false);
    } else {
      // Sync time before playback start to eliminate drift
      v2.currentTime = v1.currentTime;
      Promise.all([v1.play(), v2.play()])
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn("Video playback prevented:", err));
    }
  }, [isPlaying]);

  // Master timeline synchronization on original video update
  const handleTimeUpdate = () => {
    const v1 = originalVideoRef.current;
    const v2 = generatedVideoRef.current;
    if (!v1) return;

    setCurrentTime(v1.currentTime);

    // Keep slave video tightly locked within 40ms threshold
    if (v2 && Math.abs(v1.currentTime - v2.currentTime) > 0.04) {
      v2.currentTime = v1.currentTime;
    }
  };

  const handleLoadedMetadata = () => {
    const v1 = originalVideoRef.current;
    const v2 = generatedVideoRef.current;
    if (v1 && v1.duration && !isNaN(v1.duration)) {
      setDuration(v1.duration);
    } else if (v2 && v2.duration && !isNaN(v2.duration)) {
      setDuration(v2.duration);
    }
  };

  // Seek timeline manually via scrubber
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (originalVideoRef.current) originalVideoRef.current.currentTime = targetTime;
    if (generatedVideoRef.current) generatedVideoRef.current.currentTime = targetTime;
  };

  // Step frame by frame (approx 1/30th second)
  const stepFrame = (forward = true) => {
    const step = (1 / 30) * (forward ? 1 : -1);
    const newTime = Math.max(0, Math.min(duration, currentTime + step));
    setCurrentTime(newTime);
    if (originalVideoRef.current) originalVideoRef.current.currentTime = newTime;
    if (generatedVideoRef.current) generatedVideoRef.current.currentTime = newTime;
  };

  // Playback rate adjustment
  const handleSpeedChange = (rate: number) => {
    setPlaybackSpeed(rate);
    if (originalVideoRef.current) originalVideoRef.current.playbackRate = rate;
    if (generatedVideoRef.current) generatedVideoRef.current.playbackRate = rate;
  };

  // Mute toggle
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (originalVideoRef.current) originalVideoRef.current.muted = !isMuted;
    if (generatedVideoRef.current) generatedVideoRef.current.muted = !isMuted;
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // Dragging split comparison handle
  const handleMouseDownSplit = () => setIsDraggingSplit(true);
  const handleMouseUpSplit = () => setIsDraggingSplit(false);

  const handleMouseMoveContainer = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSplit || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
    setSplitPos(pct);
  };

  const handleTouchMoveContainer = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingSplit || !containerRef.current || !e.touches[0]) return;
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = e.touches[0].clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
    setSplitPos(pct);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDraggingSplit(false);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMoveContainer}
      onTouchMove={handleTouchMoveContainer}
      className={`relative flex flex-col rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl select-none ${className}`}
    >
      {/* Top Header Status Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800/80 backdrop-blur z-20">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold tracking-wide text-zinc-200">
            SYNCHRONIZED MOTION DUAL-VIEW
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
            {displayMode === "split" ? "Split Curtain (Slider)" : "Side-by-Side"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDisplayMode("split")}
            className={`px-2.5 py-1 text-xs rounded-md transition flex items-center gap-1.5 ${
              displayMode === "split"
                ? "bg-violet-600 text-white font-medium"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
            title="Split Curtain comparison view"
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            Split
          </button>
          <button
            onClick={() => setDisplayMode("side-by-side")}
            className={`px-2.5 py-1 text-xs rounded-md transition flex items-center gap-1.5 ${
              displayMode === "side-by-side"
                ? "bg-violet-600 text-white font-medium"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
            title="Side by Side comparison view"
          >
            <Columns className="w-3.5 h-3.5" />
            Dual
          </button>
        </div>
      </div>

      {/* Main Video Presentation Stage */}
      <div className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center">
        {displayMode === "split" ? (
          /* Split Screen Curtain Slider Mode */
          <div className="relative w-full h-full">
            {/* Generated / Retargeted Video (Bottom Layer) */}
            <video
              ref={generatedVideoRef}
              src={generatedVideoUrl}
              loop={isLooping}
              muted={isMuted}
              playsInline
              className="absolute inset-0 w-full h-full object-contain"
            />

            {/* Original Video (Top Layer, clipped by split position) */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ width: `${splitPos}%` }}
            >
              <video
                ref={originalVideoRef}
                src={originalVideoUrl}
                loop={isLooping}
                muted={isMuted}
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ width: containerRef.current?.clientWidth || "100%" }}
              />
            </div>

            {/* Split Slider Line & Drag Handle */}
            <div
              className="absolute top-0 bottom-0 z-30 flex items-center justify-center cursor-ew-resize"
              style={{ left: `calc(${splitPos}% - 14px)` }}
              onMouseDown={handleMouseDownSplit}
              onTouchStart={handleMouseDownSplit}
            >
              <div className="w-[2px] h-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
              <div className="absolute w-7 h-7 rounded-full bg-zinc-900 border-2 border-violet-400 flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform">
                <div className="flex gap-0.5 text-violet-300">
                  <div className="w-0.5 h-2.5 bg-violet-300 rounded-full" />
                  <div className="w-0.5 h-2.5 bg-violet-300 rounded-full" />
                </div>
              </div>
            </div>

            {/* Floating Source & Result Badges */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none">
              <span className="px-2.5 py-1 rounded bg-black/70 backdrop-blur border border-zinc-700/60 text-[11px] font-medium text-zinc-300">
                {originalLabel}
              </span>
            </div>
            <div className="absolute top-4 right-4 z-20 pointer-events-none">
              <span className="px-2.5 py-1 rounded bg-violet-950/80 backdrop-blur border border-violet-500/50 text-[11px] font-semibold text-violet-200">
                {generatedLabel}
              </span>
            </div>
          </div>
        ) : (
          /* Side-by-Side Dual View Mode */
          <div className="grid grid-cols-2 w-full h-full gap-1 bg-zinc-950">
            {/* Left: Original Driving Video */}
            <div className="relative w-full h-full bg-zinc-900/50 flex flex-col justify-center items-center overflow-hidden border-r border-zinc-800">
              <span className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] text-zinc-300">
                {originalLabel}
              </span>
              <video
                ref={originalVideoRef}
                src={originalVideoUrl}
                loop={isLooping}
                muted={isMuted}
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Right: Retargeted Motion Result */}
            <div className="relative w-full h-full bg-zinc-900/50 flex flex-col justify-center items-center overflow-hidden">
              <span className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded bg-violet-950/80 backdrop-blur border border-violet-500/40 text-[10px] text-violet-200 font-semibold">
                {generatedLabel}
              </span>
              <video
                ref={generatedVideoRef}
                src={generatedVideoUrl}
                loop={isLooping}
                muted={isMuted}
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {/* Scrub Bar Timeline */}
      <div className="px-4 pt-3 pb-1 bg-zinc-900 border-t border-zinc-800">
        <div className="relative flex items-center group">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-500 group-hover:h-2 transition-all"
          />
        </div>
      </div>

      {/* Bottom Transport Controls Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-zinc-900 text-zinc-300">
        {/* Playback & Frame Stepping */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="p-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition shadow-sm"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            onClick={() => stepFrame(false)}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition"
            title="Step 1 frame backward"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => stepFrame(true)}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition"
            title="Step 1 frame forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (originalVideoRef.current) originalVideoRef.current.currentTime = 0;
              if (generatedVideoRef.current) generatedVideoRef.current.currentTime = 0;
              setCurrentTime(0);
            }}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition"
            title="Restart from beginning"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Timecode display */}
          <div className="ml-2 font-mono text-xs text-zinc-400">
            <span className="text-zinc-100 font-semibold">{formatTimecode(currentTime)}</span>
            <span className="mx-1">/</span>
            <span>{formatTimecode(duration)}</span>
          </div>
        </div>

        {/* Speed, Loop, Volume, Fullscreen */}
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          {/* Speed Selector */}
          <div className="flex items-center bg-zinc-800/80 rounded-lg p-0.5 border border-zinc-700/60">
            <Gauge className="w-3.5 h-3.5 text-zinc-400 ml-1.5 mr-1" />
            {[0.25, 0.5, 1.0, 1.5].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-1.5 py-0.5 text-[11px] font-mono rounded transition ${
                  playbackSpeed === speed
                    ? "bg-violet-600 text-white font-medium"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Loop toggle */}
          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-1.5 rounded-md transition ${
              isLooping
                ? "bg-violet-950/80 text-violet-300 border border-violet-500/30"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            title={isLooping ? "Loop Enabled" : "Loop Disabled"}
          >
            <Repeat className="w-4 h-4" />
          </button>

          {/* Audio toggle */}
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
