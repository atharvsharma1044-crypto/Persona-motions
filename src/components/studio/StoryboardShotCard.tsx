"use client";

import React, { useState } from "react";
import {
  Camera,
  Clock,
  Sparkles,
  RefreshCw,
  Play,
  Film,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShotItem, ShotStatus } from "@/types";

interface StoryboardShotCardProps {
  shot: ShotItem;
  onUpdateShot: (updatedShot: ShotItem) => void;
  onRenderShot: (shotId: string) => void;
  isRendering?: boolean;
}

export function StoryboardShotCard({
  shot,
  onUpdateShot,
  onRenderShot,
  isRendering = false,
}: StoryboardShotCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [prompt, setPrompt] = useState(shot.prompt);
  const [camera, setCamera] = useState(shot.cameraMovement);
  const [duration, setDuration] = useState(shot.durationSeconds);
  const [characterState, setCharacterState] = useState(shot.characterState || "");

  const handleSave = () => {
    onUpdateShot({
      ...shot,
      prompt,
      cameraMovement: camera,
      durationSeconds: duration,
      characterState,
    });
    setIsEditing(false);
  };

  const getStatusBadge = (status: ShotStatus) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="success" className="text-[10px]">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" /> Rendered
          </Badge>
        );
      case "GENERATING":
        return (
          <Badge variant="purple" className="text-[10px] animate-pulse">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin text-violet-400" /> Synthesizing
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="text-[10px]">
            <AlertCircle className="w-3 h-3 mr-1" /> Error
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-[10px]">
            Ready to Render
          </Badge>
        );
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-xl overflow-hidden shadow-lg transition-all flex flex-col justify-between">
      {/* Top Header */}
      <div className="p-3.5 bg-zinc-950/80 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-violet-950 border border-violet-700/60 text-violet-300 font-mono text-xs font-bold flex items-center justify-center">
            #{shot.sequenceOrder}
          </span>
          <span className="text-xs font-semibold text-zinc-200">
            Shot {shot.sequenceOrder}
          </span>
        </div>
        {getStatusBadge(shot.status)}
      </div>

      {/* Video Preview or Placeholder Stage */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-zinc-800/80">
        {shot.outputVideoUrl ? (
          <video
            src={shot.outputVideoUrl}
            controls
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-500 p-4 text-center">
            <Film className="w-8 h-8 mb-2 text-zinc-700" />
            <span className="text-xs font-medium">Shot latent waiting for GPU dispatch</span>
            <span className="text-[10px] text-zinc-600 mt-0.5">Wan 2.1 / CogVideoX ready</span>
          </div>
        )}

        {/* Camera movement pill badge */}
        <div className="absolute top-2 left-2 bg-black/75 backdrop-blur border border-zinc-800 rounded px-2 py-0.5 text-[10px] text-zinc-300 flex items-center gap-1 font-mono">
          <Camera className="w-3 h-3 text-cyan-400" />
          {shot.cameraMovement}
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/75 backdrop-blur border border-zinc-800 rounded px-2 py-0.5 text-[10px] text-zinc-300 flex items-center gap-1 font-mono">
          <Clock className="w-3 h-3 text-violet-400" />
          {shot.durationSeconds.toFixed(1)}s
        </div>
      </div>

      {/* Shot Details & Prompt Area */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        {isEditing ? (
          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Visual Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Camera Motion</label>
                <select
                  value={camera}
                  onChange={(e) => setCamera(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-1.5 text-xs text-zinc-200"
                >
                  <option>Static Medium Shot</option>
                  <option>Push In Close-Up</option>
                  <option>Orbit Left</option>
                  <option>Orbit Right</option>
                  <option>Crane Down</option>
                  <option>Tracking Shot Following Subject</option>
                  <option>Wide Dutch Angle</option>
                  <option>Slow Zoom Out</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Duration (sec)</label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  step={0.5}
                  value={duration}
                  onChange={(e) => setDuration(parseFloat(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-1.5 text-xs text-zinc-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-1.5 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button variant="secondary" size="sm" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 flex-1">
            <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3">
              {shot.prompt}
            </p>

            {shot.characterState && (
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 bg-zinc-950/60 p-1.5 rounded border border-zinc-800/60">
                <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span className="truncate">{shot.characterState}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => onRenderShot(shot.id)}
            disabled={isRendering || shot.status === "GENERATING"}
            className="text-xs"
          >
            {shot.status === "GENERATING" ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Rendering...
              </>
            ) : shot.outputVideoUrl ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Re-Render
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Render Shot
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
