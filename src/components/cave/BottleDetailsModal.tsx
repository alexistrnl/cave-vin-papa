"use client";

import { Bottle } from "./BottleModal";

interface BottleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMarkToDrink: (bottleId: string, toDrink: boolean) => void;
  bottle: Bottle | null;
  isDeleteLoading?: boolean;
}

export default function BottleDetailsModal({
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onMarkToDrink,
  bottle,
  isDeleteLoading = false,
}: BottleDetailsModalProps) {
  if (!isOpen || !bottle) return null;

  const handleDeleteClick = () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette bouteille ?")) {
      onDelete();
    }
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
        <h2 className="text-xl font-semibold mb-6 text-[#2a2a2a] tracking-wide border-b border-[#d4af37]/30 pb-3">
          Détails de la bouteille
        </h2>

        <div className="space-y-4 mb-6">
          {/* Cuvée */}
          <div>
            <label className="block text-xs font-medium text-[#8b7355] uppercase tracking-wide mb-1">
              Cuvée
            </label>
            <p className="text-lg font-semibold text-[#2a2a2a]">{bottle.name}</p>
          </div>

          {/* Domaine */}
          {bottle.domaine && (
            <div>
              <label className="block text-xs font-medium text-[#8b7355] uppercase tracking-wide mb-2">
                Domaine
              </label>
              <span className="inline-block px-3 py-1.5 bg-[#d4af37]/20 border border-[#d4af37]/40 rounded-md text-sm text-[#2a2a2a]">
                {bottle.domaine}
              </span>
            </div>
          )}

          {/* Région */}
          {bottle.region && (
            <div>
              <label className="block text-xs font-medium text-[#8b7355] uppercase tracking-wide mb-2">
                Région
              </label>
              <span className="inline-block px-3 py-1.5 bg-[#d4af37]/20 border border-[#d4af37]/40 rounded-md text-sm text-[#2a2a2a]">
                {bottle.region}
              </span>
            </div>
          )}

          {/* Millésime */}
          {bottle.millesime && (
            <div>
              <label className="block text-xs font-medium text-[#8b7355] uppercase tracking-wide mb-2">
                Millésime
              </label>
              <span className="inline-block px-3 py-1.5 bg-[#d4af37]/20 border border-[#d4af37]/40 rounded-md text-sm text-[#2a2a2a]">
                {bottle.millesime}
              </span>
            </div>
          )}

          {/* Prix */}
          {bottle.price !== undefined && bottle.price !== null && (
            <div>
              <label className="block text-xs font-medium text-[#8b7355] uppercase tracking-wide mb-1">
                Prix
              </label>
              <p className="text-base text-[#2a2a2a]">{bottle.price}€</p>
            </div>
          )}

          {/* Garde */}
          {bottle.garde && (
            <div>
              <label className="block text-xs font-medium text-[#8b7355] uppercase tracking-wide mb-1">
                Garde
              </label>
              <p className="text-base text-[#8B2635] font-medium">{bottle.garde}</p>
            </div>
          )}

          {/* À boire */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={bottle.to_drink ?? false}
                onChange={() => {
                  if (bottle) {
                    // Toggle : inverser la valeur actuelle
                    onMarkToDrink(bottle.id, !(bottle.to_drink ?? false));
                  }
                }}
                className="w-5 h-5 rounded border-[#d4af37]/40 text-[#8B2635] focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm font-medium text-[#2a2a2a]">À boire</span>
            </label>
          </div>

          {/* Commentaire */}
          {bottle.comment && (
            <div>
              <label className="block text-xs font-medium text-[#8b7355] uppercase tracking-wide mb-2">
                Commentaire
              </label>
              <p className="text-sm text-[#2a2a2a] italic leading-relaxed whitespace-pre-wrap">
                {bottle.comment}
              </p>
            </div>
          )}
        </div>

        {/* Footer avec boutons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-[#d4af37]/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#6b5b47] hover:text-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-[#d4af37] rounded-md transition-colors"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={isDeleteLoading}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleteLoading ? "Suppression..." : "Supprimer"}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-2 text-sm font-medium text-[#fbf7f0] bg-[#8B2635] hover:bg-[#7a1f2d] focus:outline-none focus:ring-2 focus:ring-[#d4af37] rounded-md transition-colors"
          >
            Modifier
          </button>
        </div>
      </div>
    </div>
  );
}

