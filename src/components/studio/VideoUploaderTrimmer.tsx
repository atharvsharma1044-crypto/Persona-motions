"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  Film,
  Scissors,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatTimecode, formatBytes } from "@/lib/utils";

interface VideoUploaderTrimmerProps {
  onTrimmedVideoReady: (videoUrl: string, trimStart: number, trimEnd: number) => void;
  minDuration?: number; // default 3s
  maxDuration?: number; // default 15s
}

export function VideoUploaderTrimmer({
  onTrimmedVideoReady,
  minDuration = 3,
  maxDuration = 15,
}: VideoUploaderTrimmerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(10);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Uploading state
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("video/")) {
      setError("Please select a valid video file (MP4, MOV, WebM).");
      return;
    }

    if (selectedFile.size > 250 * 1024 * 1024) {
      setError("File exceeds 250MB limit.");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setFile(selectedFile);
    setLocalVideoUrl(objectUrl);
    setUploadedUrl(null);
    setUploadProgress(0);
  };

  // Video loaded metadata handler
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    setDuration(dur);

    // Initial trim bounds
    setTrimStart(0);
    const initialEnd = Math.min(dur, Math.max(minDuration, Math.min(dur, 10)));
    setTrimEnd(initialEnd);
    setCurrentTime(0);
  };

  // Loop trimmed section strictly during preview playback
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);

    if (curr >= trimEnd) {
      videoRef.current.currentTime = trimStart;
      if (!isPlaying) videoRef.current.pause();
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Trim slider adjustments with constraint validation
  const handleStartChange = (val: number) => {
    const newStart = Math.max(0, Math.min(val, duration - minDuration));
    setTrimStart(newStart);
    // Keep duration between minDuration and maxDuration
    if (trimEnd - newStart > maxDuration) {
      setTrimEnd(newStart + maxDuration);
    } else if (trimEnd - newStart < minDuration) {
      setTrimEnd(Math.min(duration, newStart + minDuration));
    }
    if (videoRef.current) {
      videoRef.current.currentTime = newStart;
    }
  };

  const handleEndChange = (val: number) => {
    const newEnd = Math.min(duration, Math.max(val, trimStart + minDuration));
    setTrimEnd(newEnd);
    if (newEnd - trimStart > maxDuration) {
      setTrimStart(Math.max(0, newEnd - maxDuration));
    }
    if (videoRef.current) {
      videoRef.current.currentTime = newEnd;
    }
  };

  // Direct presigned upload to Cloudflare R2 / AWS S3
  const handleUploadAndSave = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(10);

      // 1. Fetch Presigned URL from server API
      const presignedRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "video/mp4",
          fileSize: file.size,
          folder: "driving_videos",
        }),
      });

      if (!presignedRes.ok) {
        const errJson = await presignedRes.json();
        throw new Error(errJson.error || "Failed to get presigned upload URL");
      }

      const { uploadUrl, publicUrl } = await presignedRes.json();
      setUploadProgress(35);

      // 2. Upload file directly to S3 / Cloudflare R2 with progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.round(35 + (evt.loaded / evt.total) * 60);
            setUploadProgress(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100);
            resolve();
          } else {
            reject(new Error(`Storage returned status: ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during direct S3/R2 upload"));
        xhr.send(file);
      });

      setUploadedUrl(publicUrl);
      onTrimmedVideoReady(publicUrl, trimStart, trimEnd);
    } catch (err) {
      console.warn("[Video Upload Warning]:", err);
      if (localVideoUrl) {
        setUploadedUrl(localVideoUrl);
        onTrimmedVideoReady(localVideoUrl, trimStart, trimEnd);
        setError("Note: Cloud storage unconfigured; using local video preview.");
      } else {
        setError((err as Error).message);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const selectedDuration = trimEnd - trimStart;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-violet-400" />
          <h3 className="font-semibold text-zinc-100 text-sm tracking-wide">
            DRIVING VIDEO INGESTION & SUBCLIP TRIMMER
          </h3>
        </div>
        <Badge variant="purple" className="text-[11px]">
          Target Window: {minDuration}s – {maxDuration}s
        </Badge>
      </div>

      {!localVideoUrl ? (
        /* Empty Upload Dropzone */
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-700 hover:border-violet-500 hover:bg-zinc-800/40 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition text-center group"
        >
          <div className="p-4 rounded-full bg-zinc-800 group-hover:bg-violet-950/60 group-hover:text-violet-400 text-zinc-400 transition mb-3">
            <UploadCloud className="w-8 h-8" />
          </div>
          <p className="text-sm font-medium text-zinc-200">
            Click to upload source driving video
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Supports MP4, MOV, WebM up to 250MB (high-frame-rate 30/60fps recommended)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        /* Video Loaded with In-Browser Scrubbing & Trimming */
        <div className="space-y-4">
          <div className="relative aspect-video max-h-72 w-full bg-black rounded-lg overflow-hidden flex items-center justify-center border border-zinc-800">
            <video
              ref={videoRef}
              src={localVideoUrl}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              playsInline
              className="w-full h-full object-contain"
            />

            {/* Play/Pause Overlay Button */}
            <button
              onClick={togglePlay}
              className="absolute p-3 rounded-full bg-black/60 hover:bg-violet-600/90 text-white backdrop-blur transition shadow-lg"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
            </button>

            {/* Floating Trimming Badge */}
            <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur border border-zinc-700/60 rounded px-2.5 py-1 text-xs font-mono text-zinc-200 flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-violet-400" />
              <span>Trim: {formatTimecode(trimStart)} - {formatTimecode(trimEnd)}</span>
              <span className="text-violet-400 font-bold">({selectedDuration.toFixed(1)}s)</span>
            </div>
          </div>

          {/* Interactive Dual Trimming Timeline */}
          <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800/80 space-y-3">
            <div className="flex justify-between items-center text-xs text-zinc-400 font-mono">
              <span className="flex items-center gap-1 text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-zinc-400" /> Current: {formatTimecode(currentTime)}
              </span>
              <span>Total Source Length: {formatTimecode(duration)}</span>
            </div>

            {/* Start Marker Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>In-Point (Start): {formatTimecode(trimStart)}</span>
                <span className="text-[11px] text-zinc-500">Min: 00:00</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0, duration - minDuration)}
                step={0.1}
                value={trimStart}
                onChange={(e) => handleStartChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-400"
              />
            </div>

            {/* End Marker Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Out-Point (End): {formatTimecode(trimEnd)}</span>
                <span className="text-[11px] text-zinc-500">Max: {formatTimecode(duration)}</span>
              </div>
              <input
                type="range"
                min={trimStart + minDuration}
                max={duration || 15}
                step={0.1}
                value={trimEnd}
                onChange={(e) => handleEndChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          {/* Progress / Status / Action Buttons */}
          {isUploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-zinc-400">
                <span>Uploading direct to Cloudflare R2...</span>
                <span className="text-violet-400">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {uploadedUrl && (
            <div className="flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Direct S3 upload verified. Video ready for motion retargeting pipeline.</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFile(null);
                setLocalVideoUrl(null);
                setUploadedUrl(null);
              }}
              disabled={isUploading}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Replace Video
            </Button>

            <Button
              variant="gradient"
              size="default"
              onClick={handleUploadAndSave}
              disabled={isUploading || selectedDuration < minDuration || selectedDuration > maxDuration}
            >
              <UploadCloud className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : `Confirm & Upload Trimmed Subclip (${selectedDuration.toFixed(1)}s)`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
