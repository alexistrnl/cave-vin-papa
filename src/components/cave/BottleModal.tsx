"use client";

import { useEffect, useRef } from "react";

export interface Bottle {
  id: string;
  name: string;
  vintage?: number;
  price?: number;
  garde?: string;
  domaine?: string | null;
  millesime?: number | null;
  region?: string | null;
}

interface BottleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bottle: Omit<Bottle, "id">) => void;
  onDelete?: () => void;
  initialBottle?: Bottle | null;
}

export default function BottleModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialBottle,
}: BottleModalProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = !!initialBottle;

  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalizeGarde = (input: string): string => {
    if (!input || !input.trim()) return "";
    
    const trimmed = input.trim();
    
    // Extraire toutes les années (4 chiffres consécutifs)
    const yearPattern = /\b(\d{4})\b/g;
    const years: string[] = [];
    let match;
    
    while ((match = yearPattern.exec(trimmed)) !== null) {
      years.push(match[1]);
    }
    
    // Si on a trouvé des années, les formater
    if (years.length === 1) {
      return `G${years[0]}`;
    } else if (years.length >= 2) {
      return `G${years[0]}/${years[1]}`;
    }
    
    // Si aucune année détectée, retourner la valeur brute
    return trimmed;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const gardeInput = (formData.get("garde") as string) || "";
    const normalizedGarde = gardeInput ? normalizeGarde(gardeInput) : undefined;
    
    // Gérer les nouveaux champs : null si vide, sinon valeur
    const domaineInput = (formData.get("domaine") as string) || "";
    const domaineValue = domaineInput.trim() ? domaineInput.trim() : null;
    
    const regionInput = (formData.get("region") as string) || "";
    const regionValue = regionInput.trim() ? regionInput.trim() : null;
    
    const millesimeInput = (formData.get("millesime") as string) || "";
    let millesimeValue: number | null = null;
    if (millesimeInput.trim()) {
      const parsed = parseInt(millesimeInput.trim(), 10);
      millesimeValue = isNaN(parsed) ? null : parsed;
    }
    
    const bottle: Omit<Bottle, "id"> = {
      name: formData.get("name") as string,
      vintage: formData.get("vintage")
        ? parseInt(formData.get("vintage") as string, 10)
        : undefined,
      price: formData.get("price")
        ? parseFloat(formData.get("price") as string)
        : undefined,
      garde: normalizedGarde,
      domaine: domaineValue,
      millesime: millesimeValue,
      region: regionValue,
    };

    if (!bottle.name.trim()) return;

    onSave(bottle);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-[#fbf7f0] border-2 border-[#d4af37] rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4 text-[#2a2a2a] tracking-wide">
          {isEditMode ? "Modifier la bouteille" : "Ajouter une bouteille"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium mb-1 text-[#2a2a2a]"
            >
              Nom <span className="text-red-600">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              id="name"
              name="name"
              required
              defaultValue={initialBottle?.name || ""}
              className="w-full px-3 py-2 border border-[#d4af37]/40 rounded-md bg-white text-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37]"
            />
          </div>

          <div>
            <label
              htmlFor="vintage"
              className="block text-sm font-medium mb-1 text-[#2a2a2a]"
            >
              Millésime
            </label>
            <input
              type="number"
              id="vintage"
              name="vintage"
              min="1900"
              max="2100"
              defaultValue={initialBottle?.vintage || ""}
              className="w-full px-3 py-2 border border-[#d4af37]/40 rounded-md bg-white text-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37]"
            />
          </div>

          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium mb-1 text-[#2a2a2a]"
            >
              Prix
            </label>
            <input
              type="number"
              id="price"
              name="price"
              step="0.01"
              min="0"
              placeholder="ex: 30"
              defaultValue={initialBottle?.price || ""}
              className="w-full px-3 py-2 border border-[#d4af37]/40 rounded-md bg-white text-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] placeholder:text-[#8b7355]"
            />
          </div>

          <div>
            <label
              htmlFor="garde"
              className="block text-sm font-medium mb-1 text-[#2a2a2a]"
            >
              Garde
            </label>
            <input
              type="text"
              id="garde"
              name="garde"
              placeholder="ex: G2027 ou G2027/2029"
              defaultValue={initialBottle?.garde || ""}
              className="w-full px-3 py-2 border border-[#d4af37]/40 rounded-md bg-white text-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] placeholder:text-[#8b7355]"
            />
            <p className="mt-1 text-xs text-[#8b7355]">
              Formats acceptés: 2027, 2027/2029, 2027-2029
            </p>
          </div>

          <div>
            <label
              htmlFor="domaine"
              className="block text-sm font-medium mb-1 text-[#2a2a2a]"
            >
              Domaine
            </label>
            <input
              type="text"
              id="domaine"
              name="domaine"
              placeholder="ex: Château Margaux"
              defaultValue={initialBottle?.domaine || ""}
              className="w-full px-3 py-2 border border-[#d4af37]/40 rounded-md bg-white text-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] placeholder:text-[#8b7355]"
            />
          </div>

          <div>
            <label
              htmlFor="millesime"
              className="block text-sm font-medium mb-1 text-[#2a2a2a]"
            >
              Millésime
            </label>
            <input
              type="number"
              id="millesime"
              name="millesime"
              step="1"
              min="1900"
              max={new Date().getFullYear() + 1}
              placeholder="ex: 2015"
              defaultValue={initialBottle?.millesime || ""}
              className="w-full px-3 py-2 border border-[#d4af37]/40 rounded-md bg-white text-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] placeholder:text-[#8b7355]"
            />
          </div>

          <div>
            <label
              htmlFor="region"
              className="block text-sm font-medium mb-1 text-[#2a2a2a]"
            >
              Région
            </label>
            <input
              type="text"
              id="region"
              name="region"
              placeholder="ex: Bordeaux, Bourgogne"
              defaultValue={initialBottle?.region || ""}
              className="w-full px-3 py-2 border border-[#d4af37]/40 rounded-md bg-white text-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] placeholder:text-[#8b7355]"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#6b5b47] hover:text-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-[#d4af37] rounded-md transition-colors"
            >
              Annuler
            </button>
            {isEditMode && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md transition-colors"
              >
                Supprimer
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-[#fbf7f0] bg-[#8B2635] hover:bg-[#7a1f2d] focus:outline-none focus:ring-2 focus:ring-[#d4af37] rounded-md transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

