"use client";

import React, { useState } from "react";
import {
  Layers,
  Plus,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Eye,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CharacterModel } from "@/types";

const INITIAL_VAULT_CHARACTERS: CharacterModel[] = [
  {
    id: "char-aurora",
    userId: "user-1",
    name: "Elena Vance (Neo-Tokyo Operative)",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    referenceImages: [
      {
        id: "r1",
        url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        angle: "front",
        label: "Frontal Neutral",
        isDefault: true,
      },
      {
        id: "r2",
        url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
        angle: "45_degree",
        label: "Three-Quarter Turn",
      },
      {
        id: "r3",
        url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
        angle: "expression",
        label: "Intense Expression",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "char-marcus",
    userId: "user-1",
    name: "Marcus Cole (Urban Pilot)",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    referenceImages: [
      {
        id: "r4",
        url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        angle: "front",
        label: "Direct Portrait",
        isDefault: true,
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
        id: "r5",
        url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
        angle: "front",
        label: "Frontal Shot",
        isDefault: true,
      },
      {
        id: "r6",
        url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80",
        angle: "side",
        label: "Side Profile",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function CharacterVaultPage() {
  const [characters, setCharacters] = useState<CharacterModel[]>(INITIAL_VAULT_CHARACTERS);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterModel>(
    INITIAL_VAULT_CHARACTERS[0]
  );

  return (
    <div className="space-y-8">
      {/* Page Title & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="purple" className="text-xs uppercase tracking-wider font-mono">
              Cloud Character Vault
            </Badge>
            <Badge variant="outline" className="text-xs text-zinc-400">
              Cloudflare R2 / AWS S3
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
            Persona & Facial Identity Library
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Manage multi-angle reference portraits and InstantID / IP-Adapter visual embeddings to
            guarantee strict character consistency across video diffusion generations and motion swaps.
          </p>
        </div>

        <Button variant="gradient" size="lg" className="font-semibold shadow-lg shadow-violet-600/20">
          <Plus className="w-4 h-4 mr-2" /> Upload New Persona
        </Button>
      </div>

      {/* Main Vault Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Character Cards List */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Registered Personas ({characters.length})
          </h3>

          {characters.map((char) => {
            const isSelected = selectedCharacter?.id === char.id;
            return (
              <div
                key={char.id}
                onClick={() => setSelectedCharacter(char)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? "bg-violet-950/40 border-violet-500 shadow-lg shadow-violet-900/20"
                    : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={char.avatarUrl || ""}
                    alt={char.name}
                    className="w-12 h-12 rounded-lg object-cover border border-zinc-700"
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-100">{char.name}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {char.referenceImages.length} Reference Angles
                    </p>
                  </div>
                </div>

                <Badge variant={isSelected ? "purple" : "outline"} className="text-[10px]">
                  {isSelected ? "Active" : "Inspect"}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Right: Detailed Multi-Angle Inspector & Cloudflare R2 Details */}
        {selectedCharacter && (
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedCharacter.avatarUrl || ""}
                  alt={selectedCharacter.name}
                  className="w-14 h-14 rounded-xl object-cover border-2 border-violet-500/80 shadow-md"
                />
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">{selectedCharacter.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="success" className="text-[10px]">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" /> VRAM Cached
                    </Badge>
                    <span className="text-xs font-mono text-zinc-500">ID: {selectedCharacter.id}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Add Angle
                </Button>
                <Button variant="ghost" size="sm" className="text-xs text-red-400 hover:bg-red-950/40">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Multi-angle Conditioning Gallery */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide flex items-center gap-2">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  Multi-Angle Conditioning Photos (Cloudflare R2 Bucket)
                </h4>
                <span className="text-xs text-zinc-400">
                  {selectedCharacter.referenceImages.length} images
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {selectedCharacter.referenceImages.map((ref) => (
                  <div
                    key={ref.id}
                    className="relative group rounded-xl border border-zinc-800 overflow-hidden bg-black"
                  >
                    <img
                      src={ref.url}
                      alt={ref.label || ref.angle}
                      className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Overlay info */}
                    <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-zinc-200 capitalize">{ref.angle}</span>
                        {ref.isDefault && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-600 text-white font-mono">
                            Primary
                          </span>
                        )}
                      </div>
                      {ref.label && <p className="text-[10px] text-zinc-400 mt-0.5">{ref.label}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Neural Conditioning Telemetry */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <ShieldCheck className="w-4 h-4 text-violet-400" />
                <span>InstantID & IP-Adapter Embedding Metadata</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Facial keypoints and semantic CLIP embeddings are precomputed and cached in the
                Modal persistent volume (`personamotion-weights-cache`). This guarantees that both
                video diffusion (Wan 2.1) and motion retargeting (LivePortrait) retain consistent
                bone structure, eye shape, and skin tones across shots.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
