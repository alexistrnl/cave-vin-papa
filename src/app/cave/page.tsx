"use client";

import { useState, useEffect } from "react";
import BottleModal, { Bottle } from "@/components/cave/BottleModal";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

interface Clayette {
  id: string;
  name: string;
  rows: number;
  cols: number;
}

type CellKey = string;

const SHELF_LAYOUT = [
  { rowId: "r1", count: 5 },
  { rowId: "r2", count: 6 },
  { rowId: "r3", count: 6 },
  { rowId: "r4", count: 5 },
  { rowId: "r5", count: 5 },
  { rowId: "r6", count: 6 },
];

// Calculer NB_COLONNES depuis SHELF_LAYOUT (max count par ligne)
const NB_COLONNES = Math.max(...SHELF_LAYOUT.map(row => row.count));

// Taille fixe uniforme pour toutes les cases
const CELL_HEIGHT = "h-[56px]";

const generateSlotId = (rowId: string, slotIndex: number): string => {
  return `${rowId}c${slotIndex + 1}`;
};

/**
 * Convertit un slotId (string "r1c3") ou position (number) en position INTEGER pour Supabase.
 * Formule: position = (row-1) * NB_COLONNES + col
 * 
 * @param slotIdOrPosition - String "r1c3" ou number déjà converti
 * @returns Position INTEGER pour Supabase
 * @throws Si la conversion échoue
 */
const convertSlotIdToPosition = (slotIdOrPosition: string | number): number => {
  // Si c'est déjà un number, le garder tel quel
  if (typeof slotIdOrPosition === "number") {
    return slotIdOrPosition;
  }

  // Parser le format "r1c3" ou "r12c4"
  const match = slotIdOrPosition.match(/^r(\d+)c(\d+)$/);
  if (!match) {
    const errorMsg = `Impossible de convertir slotId en position: "${slotIdOrPosition}". Format attendu: "r1c3"`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const row = parseInt(match[1], 10);
  const col = parseInt(match[2], 10);

  if (isNaN(row) || isNaN(col) || row < 1 || col < 1) {
    const errorMsg = `Valeurs invalides dans slotId "${slotIdOrPosition}": row=${row}, col=${col}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Calculer la position: (row-1) * NB_COLONNES + col
  const computedPosition = (row - 1) * NB_COLONNES + col;

  // Log temporaire pour debug
  console.log(`[convertSlotIdToPosition] oldPosition="${slotIdOrPosition}", parsedRow=${row}, parsedCol=${col}, computedPosition=${computedPosition}, NB_COLONNES=${NB_COLONNES}`);

  return computedPosition;
};

/**
 * Convertit une position INTEGER (depuis Supabase) en slotId string ("r1c3").
 * Formule inverse: row = Math.floor((position - 1) / NB_COLONNES) + 1, col = ((position - 1) % NB_COLONNES) + 1
 * 
 * @param position - Position INTEGER depuis Supabase
 * @returns slotId string au format "r1c3"
 * @throws Si la conversion échoue
 */
const convertPositionToSlotId = (position: number): string => {
  if (typeof position !== "number" || isNaN(position) || position < 1) {
    const errorMsg = `Impossible de convertir position en slotId: position=${position} (doit être un entier >= 1)`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Calculer row et col depuis la position
  // position = (row-1) * NB_COLONNES + col
  // row = Math.floor((position - 1) / NB_COLONNES) + 1
  // col = ((position - 1) % NB_COLONNES) + 1
  const row = Math.floor((position - 1) / NB_COLONNES) + 1;
  const col = ((position - 1) % NB_COLONNES) + 1;

  const slotId = `r${row}c${col}`;
  
  // Log temporaire pour debug
  console.log(`[convertPositionToSlotId] position=${position}, computedRow=${row}, computedCol=${col}, slotId="${slotId}", NB_COLONNES=${NB_COLONNES}`);

  return slotId;
};

const clayettes: Clayette[] = [
  { id: "shelf-1", name: "Mas Julien", rows: 6, cols: 6 },
  { id: "shelf-2", name: "Les Rouges du Domaine Montcalmes & Bourgogne Givry", rows: 6, cols: 6 },
  { id: "shelf-3", name: "Les Rouges", rows: 6, cols: 6 },
  { id: "shelf-4", name: "Les Blancs", rows: 6, cols: 6 },
  { id: "shelf-5", name: "Domaine Mirabel & Montcalmes Blanc", rows: 6, cols: 6 },
];

const BAS_DE_CAVE_ID = "bas-de-cave";

export default function CavePage() {
  const [selectedClayetteId, setSelectedClayetteId] = useState<string>(
    clayettes[0].id
  );
  const [cells, setCells] = useState<Record<CellKey, Bottle>>({});
  const [basDeCaveCells, setBasDeCaveCells] = useState<Record<CellKey, Bottle>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCellKey, setSelectedCellKey] = useState<CellKey | null>(null);
  const [movingFromKey, setMovingFromKey] = useState<CellKey | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const isBasDeCaveView = selectedClayetteId === BAS_DE_CAVE_ID;
  const selectedClayette = isBasDeCaveView
    ? { id: BAS_DE_CAVE_ID, name: "Bas de cave", rows: 0, cols: 0 }
    : clayettes.find((c) => c.id === selectedClayetteId) || clayettes[0];

  const getCellKey = (clayetteId: string, slotId: string): CellKey => {
    return `${clayetteId}:${slotId}`;
  };

  const parseCellKey = (cellKey: CellKey): { clayetteId: string; slotId: string } => {
    const [clayetteId, ...slotIdParts] = cellKey.split(":");
    return {
      clayetteId,
      slotId: slotIdParts.join(":"),
    };
  };

  // Utiliser le contexte d'authentification
  const { isReady } = useAuth();

  // Charger depuis Supabase au montage (seulement quand l'auth est prête)
  useEffect(() => {
    if (!isReady) {
      return; // Attendre que l'authentification soit prête
    }

    const loadBottles = async () => {
      try {
        // Charger les bouteilles pour toutes les clayettes
        const { data: bottlesData, error } = await supabase
          .from("bottles")
          .select("*")
          .in("clayette", [...clayettes.map(c => c.id), BAS_DE_CAVE_ID]);

        if (error) {
          console.error("Erreur lors du chargement depuis Supabase:", error);
          return;
        }

        if (bottlesData) {
          // Mapper les bouteilles vers Record<CellKey, Bottle>
          const mappedCells: Record<CellKey, Bottle> = {};
          const mappedBasDeCaveCells: Record<CellKey, Bottle> = {};

          bottlesData.forEach((bottle: any) => {
            // Convertir position (integer) depuis Supabase en slotId (string "r1c3")
            const slotId = convertPositionToSlotId(bottle.position);
            const cellKey = getCellKey(bottle.clayette, slotId);
            const mappedBottle: Bottle = {
              id: bottle.id, // ID Supabase
              name: bottle.nom, // Mapping nom (Supabase) -> name (React)
              price: bottle.prix || undefined, // Mapping prix (Supabase) -> price (React)
              garde: bottle.garde || undefined,
              domaine: bottle.domaine || null,
              millesime: bottle.millesime || null,
              region: bottle.region || null,
            };

            if (bottle.clayette === BAS_DE_CAVE_ID) {
              mappedBasDeCaveCells[cellKey] = mappedBottle;
            } else {
              mappedCells[cellKey] = mappedBottle;
            }
          });

          setCells(mappedCells);
          setBasDeCaveCells(mappedBasDeCaveCells);
        }
      } catch (error) {
        console.error("Erreur lors du chargement depuis Supabase:", error);
      }
    };

        loadBottles();
      }, [isReady]); // Recharger quand l'auth devient prête


  // Gérer Escape pour annuler le déplacement
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && movingFromKey) {
        setMovingFromKey(null);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [movingFromKey]);

  // Nettoyer le timer de long press
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  // Annuler le déplacement si la source devient vide
  useEffect(() => {
    if (movingFromKey) {
      const currentCells = isBasDeCaveView ? basDeCaveCells : cells;
      if (!currentCells[movingFromKey]) {
        setMovingFromKey(null);
      }
    }
  }, [movingFromKey, cells, basDeCaveCells, isBasDeCaveView]);

  // A) Démarrer déplacement (source)
  const handleStartMove = (e: React.MouseEvent, slotId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const cellKey = getCellKey(selectedClayetteId, slotId);
    const currentCells = isBasDeCaveView ? basDeCaveCells : cells;
    if (currentCells[cellKey]) {
      setMovingFromKey(cellKey);
      console.log("[MOVE] start", cellKey);
    }
  };

  const handleLongPressStart = (slotId: string) => {
    const timer = setTimeout(() => {
      const cellKey = getCellKey(selectedClayetteId, slotId);
      const currentCells = isBasDeCaveView ? basDeCaveCells : cells;
      if (currentCells[cellKey]) {
        setMovingFromKey(cellKey);
        console.log("[MOVE] start (long press)", cellKey);
      }
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // B) Clic sur destination quand movingFromKey est actif
  const handleMoveTarget = async (cellKey: CellKey) => {
    if (!isReady) {
      console.warn("Tentative de déplacement avant que l'auth soit prête");
      return;
    }
    console.log("[MOVE] target click", movingFromKey, "->", cellKey);
    
    if (cellKey === movingFromKey) {
      // Annuler si même case
      setMovingFromKey(null);
      return;
    }

    const currentCells = isBasDeCaveView ? basDeCaveCells : cells;
    const setCurrentCells = isBasDeCaveView ? setBasDeCaveCells : setCells;
    
    const a = currentCells[movingFromKey!];
    const b = currentCells[cellKey];

    if (!a) {
      setMovingFromKey(null);
      return;
    }

    const fromKeyParts = parseCellKey(movingFromKey!);
    const toKeyParts = parseCellKey(cellKey);

    try {
      if (b) {
        // Swap : mettre à jour les deux bouteilles
        const toPosition = convertSlotIdToPosition(toKeyParts.slotId);
        const fromPosition = convertSlotIdToPosition(fromKeyParts.slotId);
        
        const updates = [
          supabase
            .from("bottles")
            .update({
              clayette: toKeyParts.clayetteId,
              position: toPosition,
            })
            .eq("id", a.id),
          supabase
            .from("bottles")
            .update({
              clayette: fromKeyParts.clayetteId,
              position: fromPosition,
            })
            .eq("id", b.id),
        ];

        const results = await Promise.all(updates);
        
        // Vérifier que toutes les mises à jour ont réussi
        const hasError = results.some(result => result.error);
        if (hasError) {
          throw new Error("Erreur lors du swap dans Supabase");
        }

        // Mettre à jour le state local
        setCurrentCells((prev) => {
          const next = { ...prev };
          next[movingFromKey!] = { ...b, id: b.id };
          next[cellKey] = { ...a, id: a.id };
          return next;
        });
      } else {
        // Move : mettre à jour uniquement la bouteille déplacée
        const toPosition = convertSlotIdToPosition(toKeyParts.slotId);
        
        const { error } = await supabase
          .from("bottles")
          .update({
            clayette: toKeyParts.clayetteId,
            position: toPosition,
          })
          .eq("id", a.id);

        if (error) throw error;

        // Mettre à jour le state local
        setCurrentCells((prev) => {
          const next = { ...prev };
          next[cellKey] = { ...a, id: a.id };
          delete next[movingFromKey!];
          return next;
        });
      }
    } catch (error) {
      console.error("Erreur lors du déplacement dans Supabase:", error);
      // On ne met pas à jour le state local en cas d'erreur
    }

    setMovingFromKey(null);
    console.log("[MOVE] done");
  };

  const handleCellClick = (e: React.MouseEvent, slotId: string) => {
    const cellKey = getCellKey(selectedClayetteId, slotId);
    const currentCells = isBasDeCaveView ? basDeCaveCells : cells;
    
    // C) Si en mode déplacement, gérer le déplacement/swap (ne pas ouvrir modal)
    if (movingFromKey) {
      handleMoveTarget(cellKey);
      return;
    }
    
    // A) Shift+clic sur une case occupée : activer le mode déplacement
    if (e.shiftKey && currentCells[cellKey]) {
      setMovingFromKey(cellKey);
      console.log("[MOVE] start (shift+click)", cellKey);
      return;
    }

    // Comportement normal : ouvrir la modal
    setSelectedCellKey(cellKey);
    setIsModalOpen(true);
  };

  const handleSave = async (bottleData: Omit<Bottle, "id">) => {
    if (!selectedCellKey) return;
    if (!isReady) {
      console.warn("Tentative de sauvegarde avant que l'auth soit prête");
      alert("Veuillez patienter, l'authentification est en cours...");
      return;
    }

    const keyParts = parseCellKey(selectedCellKey);
    const currentCells = isBasDeCaveView ? basDeCaveCells : cells;
    const setCurrentCells = isBasDeCaveView ? setBasDeCaveCells : setCells;
    const existingBottle = currentCells[selectedCellKey];

    try {
      if (existingBottle) {
        // Mise à jour d'une bouteille existante
        const payload = {
          nom: bottleData.name, // Mapping name (React) -> nom (Supabase)
          prix: bottleData.price || null, // Mapping price (React) -> prix (Supabase)
          garde: bottleData.garde || null,
          domaine: bottleData.domaine || null,
          millesime: bottleData.millesime || null,
          region: bottleData.region || null,
        };
        
        console.log("UPDATE payload:", payload);
        
        const { data, error } = await supabase
          .from("bottles")
          .update(payload)
          .eq("id", existingBottle.id)
          .select()
          .single();

        if (error) {
          console.error("SUPABASE ERROR:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          alert(`Erreur lors de la mise à jour: ${error.message}`);
          return;
        }

        console.log("SUPABASE OK:", data);

        // Mettre à jour le state local
        setCurrentCells((prev) => ({
          ...prev,
          [selectedCellKey]: { ...bottleData, id: existingBottle.id },
        }));
      } else {
        // Création d'une nouvelle bouteille
        const position = convertSlotIdToPosition(keyParts.slotId);
        
        const payload = {
          clayette: keyParts.clayetteId,
          position: position, // Conversion slotId (string "r1c3") -> position (integer)
          nom: bottleData.name, // Mapping name (React) -> nom (Supabase)
          prix: bottleData.price || null, // Mapping price (React) -> prix (Supabase)
          garde: bottleData.garde || null,
          domaine: bottleData.domaine || null,
          millesime: bottleData.millesime || null,
          region: bottleData.region || null,
        };

        console.log("INSERT payload:", payload);

        const { data, error } = await supabase
          .from("bottles")
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.error("SUPABASE ERROR:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          alert(`Erreur lors de la création: ${error.message}`);
          return;
        }

        console.log("SUPABASE OK:", data);

        // Mettre à jour le state local avec l'ID retourné par Supabase
        if (data) {
          setCurrentCells((prev) => ({
            ...prev,
            [selectedCellKey]: { ...bottleData, id: data.id },
          }));
        }
      }
    } catch (err) {
      // Erreur JS inattendue (pas une erreur Supabase)
      console.error("Erreur JS inattendue:", err instanceof Error ? err.message : String(err));
      if (err instanceof Error && err.stack) {
        console.error("Stack:", err.stack);
      }
      alert("Une erreur inattendue s'est produite");
    }
  };

  const handleDelete = async () => {
    if (!selectedCellKey) return;
    if (!isReady) {
      console.warn("Tentative de suppression avant que l'auth soit prête");
      return;
    }

    const currentCells = isBasDeCaveView ? basDeCaveCells : cells;
    const setCurrentCells = isBasDeCaveView ? setBasDeCaveCells : setCells;
    const bottle = currentCells[selectedCellKey];

    if (!bottle) return;

    try {
      const { error } = await supabase
        .from("bottles")
        .delete()
        .eq("id", bottle.id);

      if (error) throw error;

      // Mettre à jour le state local
      setCurrentCells((prev) => {
        const updated = { ...prev };
        delete updated[selectedCellKey];
        return updated;
      });
    } catch (error) {
      console.error("Erreur lors de la suppression dans Supabase:", error);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCellKey(null);
  };

  const parseGarde = (garde?: string): { start?: number; end?: number } => {
    if (!garde) return {};
    
    // Extraire toutes les années (4 chiffres consécutifs)
    const yearPattern = /\b(\d{4})\b/g;
    const years: number[] = [];
    let match;
    
    while ((match = yearPattern.exec(garde)) !== null) {
      const year = parseInt(match[1], 10);
      if (year >= 1900 && year <= 2100) {
        years.push(year);
      }
    }
    
    if (years.length === 0) return {};
    if (years.length === 1) {
      return { start: years[0], end: years[0] };
    }
    
    const sortedYears = [...years].sort((a, b) => a - b);
    return { start: sortedYears[0], end: sortedYears[sortedYears.length - 1] };
  };

  const getGardeStatus = (garde?: string): "drink" | "soon" | "wait" | "unknown" => {
    const parsed = parseGarde(garde);
    if (!parsed.start || !parsed.end) return "unknown";
    
    const currentYear = new Date().getFullYear();
    
    if (currentYear < parsed.start) {
      return "wait";
    } else if (currentYear === parsed.start - 1) {
      return "soon";
    } else {
      return "drink";
    }
  };

  const getStatusInfo = (status: "drink" | "soon" | "wait" | "unknown") => {
    switch (status) {
      case "drink":
        return { bg: "bg-emerald-900/70", title: "À boire", border: "border-[#d4af37]/50" };
      case "soon":
        return { bg: "bg-amber-700/70", title: "Bientôt", border: "border-[#d4af37]/50" };
      case "wait":
        return { bg: "bg-red-900/70", title: "À attendre", border: "border-[#d4af37]/50" };
      default:
        return null;
    }
  };

  const getDisplayLabel = (rowId: string, slotIndex: number): string => {
    const rowIndex = SHELF_LAYOUT.findIndex((r) => r.rowId === rowId);
    if (rowIndex === -1) return "";
    
    let blockIndex = 0;
    let offsetInBlock = 0;
    
    if (rowIndex < 2) {
      // Bloc 1 (A)
      blockIndex = 0;
      offsetInBlock = rowIndex === 0 ? 0 : SHELF_LAYOUT[0].count;
    } else if (rowIndex < 4) {
      // Bloc 2 (B)
      blockIndex = 1;
      offsetInBlock = rowIndex === 2 ? 0 : SHELF_LAYOUT[2].count;
    } else {
      // Bloc 3 (C)
      blockIndex = 2;
      offsetInBlock = rowIndex === 4 ? 0 : SHELF_LAYOUT[4].count;
    }
    
    const labelLetter = ["A", "B", "C"][blockIndex];
    const displayIndex = offsetInBlock + slotIndex + 1;
    return `${labelLetter}${displayIndex}`;
  };

  const renderCell = (slotId: string, rowId: string, slotIndex: number) => {
    const cellKey = getCellKey(selectedClayetteId, slotId);
    const currentCells = isBasDeCaveView ? basDeCaveCells : cells;
    const bottle = currentCells[cellKey];
    const displayLabel = getDisplayLabel(rowId, slotIndex);
    const isMovingSource = movingFromKey === cellKey;
    const isMovingMode = movingFromKey !== null;
    
    if (!bottle) {
      return (
        <button
          key={cellKey}
          onClick={(e) => handleCellClick(e, slotId)}
          className={`${CELL_HEIGHT} border border-[#d4af37]/30 rounded-md flex items-center justify-center gap-1.5 bg-[#fbf7f0] text-xs text-[#8b7355] hover:bg-[#f5efe0] hover:border-[#d4af37]/70 focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-colors flex-1 basis-0 min-w-0 group relative cursor-pointer overflow-hidden ${
            isMovingMode ? "hover:border-[#d4af37] hover:ring-2 hover:ring-[#d4af37]/30" : ""
          }`}
        >
          <span className="absolute top-1 left-1 text-[10px] text-[#8b7355] opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {displayLabel}
          </span>
          <span className="text-sm">+</span>
          <span className="whitespace-nowrap">Ajouter</span>
        </button>
      );
    }

    const parts: (string | React.ReactElement)[] = [];
    if (bottle.price !== undefined && bottle.price !== null) {
      parts.push(`${bottle.price}€`);
    }
    if (bottle.garde) {
      parts.push(bottle.garde);
    }
    
    // Affichage discret des nouveaux champs si présents
    const extraInfo: string[] = [];
    if (bottle.domaine) {
      extraInfo.push(bottle.domaine);
    }
    if (bottle.millesime) {
      extraInfo.push(String(bottle.millesime));
    }
    if (bottle.region) {
      extraInfo.push(bottle.region);
    }

    const status = getGardeStatus(bottle.garde);
    const statusInfo = getStatusInfo(status);

    return (
      <button
        key={cellKey}
        onClick={(e) => handleCellClick(e, slotId)}
        onContextMenu={(e) => handleStartMove(e, slotId)}
        onTouchStart={() => handleLongPressStart(slotId)}
        onTouchEnd={handleLongPressEnd}
        onTouchMove={handleLongPressEnd}
        className={`${CELL_HEIGHT} border rounded-md flex flex-col items-center justify-center bg-[#fbf7f0] hover:bg-[#f5efe0] focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-colors px-2 py-1 relative flex-1 basis-0 min-w-0 group cursor-pointer overflow-hidden ${
          isMovingSource
            ? "border-[#8B2635] border-2 shadow-[0_0_8px_rgba(139,38,53,0.3)]"
            : isMovingMode
            ? "border-[#d4af37]/30 hover:border-[#d4af37] hover:ring-2 hover:ring-[#d4af37]/30"
            : "border-[#d4af37]/30 hover:border-[#d4af37]/70"
        }`}
      >
        <span className="absolute top-1 left-1 text-[10px] text-[#8b7355] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10">
          {displayLabel}
        </span>
        {statusInfo && (
          <div
            className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border ${statusInfo.bg} ${statusInfo.border} z-10`}
            title={statusInfo.title}
          />
        )}
        <span className="font-semibold text-[#2a2a2a] text-xs text-center w-full truncate whitespace-nowrap overflow-hidden text-ellipsis">
          {bottle.name}
        </span>
        {parts.length > 0 && (
          <span className="text-[10px] text-[#8b7355] mt-0.5 truncate w-full text-center whitespace-nowrap overflow-hidden text-ellipsis">
            {parts.map((part, index) => {
              const isGarde = typeof part === "string" && part.startsWith("G");
              const isLast = index === parts.length - 1;
              
              return (
                <span key={index}>
                  {isGarde ? (
                    <span className="text-[#8B2635] font-medium">{part}</span>
                  ) : (
                    part
                  )}
                  {!isLast && <span className="mx-1">•</span>}
                </span>
              );
            })}
          </span>
        )}
        {extraInfo.length > 0 && (
          <span className="text-[9px] text-[#8b7355]/70 mt-0.5 truncate w-full text-center whitespace-nowrap overflow-hidden text-ellipsis">
            {extraInfo.join(" • ")}
          </span>
        )}
      </button>
    );
  };

  // Attendre que l'authentification soit prête avant d'afficher l'interface
  if (!isReady) {
    return (
      <main className="flex flex-col w-full items-center justify-center py-12">
        <div className="text-[#2a2a2a] text-sm">Chargement...</div>
      </main>
    );
  }

  return (
    <main className="flex flex-col w-full">
      <div className="w-full mb-6">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-3xl font-semibold text-[#2a2a2a] tracking-wide">
              {selectedClayette.name}
            </h1>
            {movingFromKey && (
              <button
                onClick={() => setMovingFromKey(null)}
                className="px-3 py-1 text-xs font-medium border border-[#d4af37]/50 rounded-md bg-[#fbf7f0] text-[#2a2a2a] hover:bg-[#f8f4ea] hover:border-[#d4af37] focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-colors"
              >
                Annuler déplacement
              </button>
            )}
          </div>
          {movingFromKey && (
            <p className="text-sm text-[#8B2635] font-medium mb-2">
              Mode déplacement: clique sur une case destination
            </p>
          )}
        </div>
        <div className="h-px bg-gradient-to-r from-[#d4af37] via-[#d4af37]/50 to-transparent mb-4"></div>
        <div className="grid grid-cols-6 gap-2 w-full">
          {clayettes.map((clayette, index) => (
            <button
              key={clayette.id}
              onClick={() => {
                setSelectedClayetteId(clayette.id);
                setMovingFromKey(null);
              }}
              title={clayette.name}
              className={`px-2 py-2 text-xs sm:text-sm font-medium rounded-full border transition-colors truncate focus:outline-none focus:ring-2 focus:ring-[#d4af37] ${
                selectedClayetteId === clayette.id
                  ? "border-[#d4af37] text-[#fbf7f0] bg-[#8B2635] shadow-sm"
                  : "border-[#d4af37]/40 text-[#2a2a2a] hover:border-[#d4af37]/50 hover:bg-[#f8f4ea]"
              }`}
            >
              Clayette {index + 1}
            </button>
          ))}
          <button
            onClick={() => {
              setSelectedClayetteId(BAS_DE_CAVE_ID);
              setMovingFromKey(null);
            }}
            title="Bas de cave"
            className={`px-2 py-2 text-xs sm:text-sm font-medium rounded-full border transition-colors truncate focus:outline-none focus:ring-2 focus:ring-[#d4af37] ${
              selectedClayetteId === BAS_DE_CAVE_ID
                ? "border-[#d4af37] text-[#fbf7f0] bg-[#8B2635] shadow-sm"
                : "border-[#d4af37]/40 text-[#2a2a2a] hover:border-[#d4af37]/50 hover:bg-[#f8f4ea]"
            }`}
          >
            Bas de cave
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5 w-full">
          {/* Bloc 1 : r1 et r2 */}
          <div className="rounded-xl border-2 border-[#d4af37]/50 bg-[#fbf7f0] p-3">
            <div className="flex flex-col gap-2">
              {SHELF_LAYOUT.slice(0, 2).map((row, index) => (
                <div key={row.rowId}>
                  {index > 0 && (
                    <div className="h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent mb-2 mt-1"></div>
                  )}
                  <div className="flex flex-nowrap gap-3 w-full">
                    {Array.from({ length: row.count }, (_, i) => {
                      const slotId = generateSlotId(row.rowId, i);
                      return renderCell(slotId, row.rowId, i);
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bloc 2 : r3 et r4 */}
          <div className="rounded-xl border-2 border-[#d4af37]/50 bg-[#f8f2e8] p-3">
            <div className="flex flex-col gap-2">
              {SHELF_LAYOUT.slice(2, 4).map((row, index) => (
                <div key={row.rowId}>
                  {index > 0 && (
                    <div className="h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent mb-2 mt-1"></div>
                  )}
                  <div className="flex flex-nowrap gap-3 w-full">
                    {Array.from({ length: row.count }, (_, i) => {
                      const slotId = generateSlotId(row.rowId, i);
                      return renderCell(slotId, row.rowId, i);
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bloc 3 : r5 et r6 */}
          <div className="rounded-xl border-2 border-[#d4af37]/50 bg-[#fbf7f0] p-3">
            <div className="flex flex-col gap-2">
              {SHELF_LAYOUT.slice(4, 6).map((row, index) => (
                <div key={row.rowId}>
                  {index > 0 && (
                    <div className="h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent mb-2 mt-1"></div>
                  )}
                  <div className="flex flex-nowrap gap-3 w-full">
                    {Array.from({ length: row.count }, (_, i) => {
                      const slotId = generateSlotId(row.rowId, i);
                      return renderCell(slotId, row.rowId, i);
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>

      <BottleModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSave}
        onDelete={
          selectedCellKey
            ? handleDelete
            : undefined
        }
        initialBottle={
          selectedCellKey
            ? (isBasDeCaveView ? basDeCaveCells[selectedCellKey] : cells[selectedCellKey]) || null
            : null
        }
      />
    </main>
  );
}
