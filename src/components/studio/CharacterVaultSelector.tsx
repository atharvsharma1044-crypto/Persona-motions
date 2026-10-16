"use client";

import React, { useState } from "react";
import {
  User,
  Plus,
  Check,
  Sparkles,
  Layers,
  Upload,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CharacterModel, CharacterReferenceImage } from "@/types";

interface CharacterVaultSelectorProps {
  characters: CharacterModel[];
  selectedCharacterId?: string | null;
  onSelectCharacter: (character: CharacterModel) => void;
  onCharacterCreated?: (newCharacter: CharacterModel) => void;
}

export function CharacterVaultSelector({
  characters,
  selectedCharacterId,
  onSelectCharacter,
  onCharacterCreated,
}: CharacterVaultSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCharName, setNewCharName] = useState("");
  const [referenceImages, setReferenceImages] = useState<CharacterReferenceImage[]>([
    {
      id: "ref-1",
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      angle: "front",
      label: "Frontal Portrait (Neutral)",
      isDefault: true,
    },
    {
      id: "ref-2",
      url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
      angle: "45_degree",
      label: "Three-Quarter Turn",
    },
  ]);

  const handleCreateMockCharacter = () => {
    if (!newCharName.trim()) return;
    const newChar: CharacterModel = {
      id: `char-${Date.now()}`,
      userId: "user-1",
      name: newCharName,
      avatarUrl: referenceImages[0]?.url,
      referenceImages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onCharacterCreated) {
      onCharacterCreated(newChar);
    }
    onSelectCharacter(newChar);
    setIsModalOpen(false);
    setNewCharName("");
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-violet-400" />
          <h3 className="font-semibold text-zinc-100 text-sm tracking-wide">
            TARGET CHARACTER VAULT
          </h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="text-xs border-violet-800/60 hover:bg-violet-950/40 text-violet-300"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add New Persona
        </Button>
      </div>

      {/* Grid of Characters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {characters.map((char) => {
          const isSelected = selectedCharacterId === char.id;
          return (
            <div
              key={char.id}
              onClick={() => onSelectCharacter(char)}
              className={`relative group p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "bg-violet-950/40 border-violet-500 shadow-md shadow-violet-900/30 ring-1 ring-violet-500/50"
                  : "bg-zinc-950/70 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40"
              }`}
            >
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center shadow">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}

              <div className="flex items-center gap-3">
                <img
                  src={char.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"}
                  alt={char.name}
                  className="w-12 h-12 rounded-lg object-cover border border-zinc-700/60 shadow-sm"
                />
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-violet-300 transition-colors">
                    {char.name}
                  </h4>
                  <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    {char.referenceImages?.length || 1} Reference Angles
                  </p>
                </div>
              </div>

              {/* Multi-angle preview thumbnails */}
              <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-zinc-800/80">
                {char.referenceImages?.slice(0, 3).map((ref, idx) => (
                  <div
                    key={idx}
                    className="relative w-8 h-8 rounded border border-zinc-700/60 overflow-hidden bg-black"
                  >
                    <img src={ref.url} alt={ref.angle} className="w-full h-full object-cover" />
                  </div>
                ))}
                {char.referenceImages && char.referenceImages.length > 3 && (
                  <span className="text-[10px] text-zinc-500 pl-1 font-mono">
                    +{char.referenceImages.length - 3}
                  </span>
                )}
                <Badge variant="outline" className="ml-auto text-[10px] py-0 px-1.5 text-zinc-400">
                  InstantID Ready
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for adding character */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-semibold text-zinc-100 text-base">
                Create New Character Persona
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Persona Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Elena Vance / Cyberpunk Detective"
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Multi-Angle Conditioning References
                </label>
                <p className="text-[11px] text-zinc-400 mb-2">
                  Upload 1 to 5 front, profile, or expressive angles for InstantID / IP-Adapter weight conditioning.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {referenceImages.map((ref, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg border border-zinc-700 overflow-hidden group">
                      <img src={ref.url} alt={ref.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-zinc-200 text-center p-1">
                        {ref.angle}
                      </div>
                    </div>
                  ))}
                  <div className="aspect-square border border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center text-zinc-500 hover:text-violet-400 hover:border-violet-500 cursor-pointer transition">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-[10px]">Add Angle</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-start gap-2 text-xs text-zinc-400">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  High-contrast portraits with neutral expressions yield the highest motion retargeting fidelity with LivePortrait and MimicMotion.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="gradient"
                size="sm"
                onClick={handleCreateMockCharacter}
                disabled={!newCharName.trim()}
              >
                Save Persona to Vault
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
