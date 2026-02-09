"use client";

import { useState, useEffect, useCallback } from "react";
import BottleModal, { Bottle } from "@/components/cave/BottleModal";
import BottleDetailsModal from "@/components/cave/BottleDetailsModal";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

interface RegionViticole {
  nom: string;
  description: string;
  appellations: string[];
}

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

  return slotId;
};

const clayettes: Clayette[] = [
  { id: "shelf-1", name: "Mas Julien", rows: 6, cols: 6 },
  { id: "shelf-2", name: "Les Rouges du Domaine Montcalmes & Bourgogne Givry", rows: 6, cols: 6 },
  { id: "shelf-3", name: "Les Rouges", rows: 6, cols: 6 },
  { id: "shelf-4", name: "Les Blancs", rows: 6, cols: 6 },
  { id: "shelf-5", name: "Clayette 5 : Domaine Mirabel", rows: 6, cols: 6 },
];

const BAS_DE_CAVE_ID = "bas-de-cave";

// Mapping des régions vers leurs départements
const REGION_DEPARTEMENTS: Record<string, string> = {
  "Bordeaux": "33",
  "Champagne": "51 · 10 · 52",
  "Bourgogne": "21 · 58 · 71 · 89",
  "Alsace": "67 · 68",
  "Rhône": "07 · 26 · 30 · 69 · 84",
  "Loire": "44 · 49 · 37 · 41 · 45 · 58",
  "Provence": "13 · 83 · 84 · 04",
  "Languedoc-Roussillon": "11 · 30 · 34 · 66",
  "Sud-Ouest": "31 · 32 · 40 · 46 · 47 · 81 · 82",
  "Beaujolais": "69",
  "Savoie": "73 · 74",
  "Jura": "39"
};

const REGIONS_VITICOLES: RegionViticole[] = [
  {
    nom: "Bordeaux",
    description: "Région viticole la plus prestigieuse de France, réputée pour ses grands crus.",
    appellations: ["Médoc", "Saint-Émilion", "Pomerol", "Graves", "Sauternes", "Margaux", "Pauillac"]
  },
  {
    nom: "Bourgogne",
    description: "Terre d'excellence des vins de pinot noir et chardonnay.",
    appellations: ["Chablis", "Côte de Nuits", "Côte de Beaune", "Côte Chalonnaise", "Mâconnais", "Beaujolais"]
  },
  {
    nom: "Champagne",
    description: "Région unique au monde pour les vins effervescents de prestige.",
    appellations: ["Champagne", "Côte des Blancs", "Montagne de Reims", "Vallée de la Marne"]
  },
  {
    nom: "Rhône",
    description: "Vallée du Rhône, berceau de vins puissants et généreux.",
    appellations: ["Côte-Rôtie", "Hermitage", "Châteauneuf-du-Pape", "Gigondas", "Vacqueyras", "Tavel"]
  },
  {
    nom: "Loire",
    description: "Vallée de la Loire, royaume des vins blancs secs et des vins rosés.",
    appellations: ["Sancerre", "Pouilly-Fumé", "Muscadet", "Vouvray", "Chinon", "Saumur"]
  },
  {
    nom: "Alsace",
    description: "Région frontalière aux vins aromatiques et fruités.",
    appellations: ["Alsace", "Alsace Grand Cru", "Crémant d'Alsace", "Riesling", "Gewurztraminer"]
  },
  {
    nom: "Provence",
    description: "Terre du rosé et des vins méditerranéens ensoleillés.",
    appellations: ["Côtes de Provence", "Bandol", "Cassis", "Bellet", "Palette"]
  },
  {
    nom: "Languedoc-Roussillon",
    description: "Plus vaste région viticole de France, terroirs variés et généreux.",
    appellations: ["Corbières", "Minervois", "Fitou", "Côtes du Roussillon", "Banyuls"]
  },
  {
    nom: "Sud-Ouest",
    description: "Région aux cépages autochtones et vins de caractère.",
    appellations: ["Cahors", "Madiran", "Jurançon", "Gaillac", "Monbazillac"]
  },
  {
    nom: "Beaujolais",
    description: "Région du gamay, vins fruités et gouleyants.",
    appellations: ["Beaujolais", "Beaujolais-Villages", "Morgon", "Fleurie", "Brouilly"]
  },
  {
    nom: "Savoie",
    description: "Vins de montagne aux arômes minéraux et frais.",
    appellations: ["Savoie", "Apremont", "Chignin", "Roussette de Savoie"]
  },
  {
    nom: "Jura",
    description: "Petite région aux vins uniques et typés.",
    appellations: ["Arbois", "Château-Chalon", "Côtes du Jura", "L'Étoile"]
  }
];

export default function CavePage() {
  const [selectedClayetteId, setSelectedClayetteId] = useState<string>(
    clayettes[0].id
  );
  const [cells, setCells] = useState<Record<CellKey, Bottle>>({});
  const [basDeCaveCells, setBasDeCaveCells] = useState<Record<CellKey, Bottle>>({});
  const [selectedCellKey, setSelectedCellKey] = useState<CellKey | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [movingFromKey, setMovingFromKey] = useState<CellKey | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [openRegion, setOpenRegion] = useState<string | null>(null);

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

  // Fonction pour charger les bouteilles depuis Supabase (source de vérité unique)
  const loadBottles = useCallback(async () => {
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
            couleur: bottle.couleur || null,
            to_drink: bottle.to_drink ?? false, // Fallback avec ??
            comment: bottle.comment || null,
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
  }, []);

  // Charger depuis Supabase au montage (seulement quand l'auth est prête)
  useEffect(() => {
    if (!isReady) {
      return; // Attendre que l'authentification soit prête
    }

    loadBottles();
  }, [isReady, loadBottles]); // Recharger quand l'auth devient prête


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

    // Comportement normal : ouvrir la modale appropriée
    setSelectedCellKey(cellKey);
    
    if (currentCells[cellKey]) {
      // Case occupée : ouvrir la modale détails
      setIsDetailsModalOpen(true);
    } else {
      // Case vide : ouvrir directement le formulaire d'ajout
      setIsEditModalOpen(true);
    }
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
          couleur: bottleData.couleur || null,
          comment: bottleData.comment || null,
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

        // Refetch depuis Supabase pour garantir la synchronisation entre appareils
        await loadBottles();

        // Fermer la modale après sauvegarde réussie
        setIsEditModalOpen(false);
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
          couleur: bottleData.couleur || null,
          comment: bottleData.comment || null,
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

        // Refetch depuis Supabase pour garantir la synchronisation entre appareils
        await loadBottles();

        // Fermer la modale après sauvegarde réussie
        setIsEditModalOpen(false);
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

    setIsDeleteLoading(true);
    const currentCells = isBasDeCaveView ? basDeCaveCells : cells;
    const setCurrentCells = isBasDeCaveView ? setBasDeCaveCells : setCells;
    const bottle = currentCells[selectedCellKey];

    if (!bottle) {
      setIsDeleteLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("bottles")
        .delete()
        .eq("id", bottle.id);

      if (error) throw error;

      // Refetch depuis Supabase pour garantir la synchronisation entre appareils
      await loadBottles();

      // Fermer la modale détails
      setIsDetailsModalOpen(false);
      setSelectedCellKey(null);
    } catch (error) {
      console.error("Erreur lors de la suppression dans Supabase:", error);
      alert("Erreur lors de la suppression de la bouteille");
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleDetailsModalClose = () => {
    setIsDetailsModalOpen(false);
    setSelectedCellKey(null);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setSelectedCellKey(null);
  };

  const handleEditClick = () => {
    // Fermer la modale détails et ouvrir le formulaire d'édition
    setIsDetailsModalOpen(false);
    setIsEditModalOpen(true);
  };

  const markBottleToDrink = async (bottleId: string, toDrink: boolean) => {
    if (!isReady) {
      console.warn("Tentative de marquer 'À boire' avant que l'auth soit prête");
      return;
    }

    // Trouver la bouteille dans l'état actuel pour optimistic UI
    const currentCells = isBasDeCaveView ? basDeCaveCells : cells;
    const setCurrentCells = isBasDeCaveView ? setBasDeCaveCells : setCells;
    
    // Trouver la bouteille et sa clé
    let foundCellKey: CellKey | null = null;
    let previousBottle: Bottle | null = null;
    
    for (const [key, bottle] of Object.entries(currentCells)) {
      if (bottle.id === bottleId) {
        foundCellKey = key;
        previousBottle = { ...bottle };
        break;
      }
    }

    if (!foundCellKey || !previousBottle) {
      console.warn("Bouteille non trouvée pour optimistic UI");
      return;
    }

    // Optimistic UI : mettre à jour l'état local immédiatement
    setCurrentCells((prev) => {
      const next = { ...prev };
      if (next[foundCellKey!]) {
        next[foundCellKey!] = { ...next[foundCellKey!], to_drink: toDrink };
      }
      return next;
    });

    try {
      const { error } = await supabase
        .from("bottles")
        .update({ to_drink: toDrink })
        .eq("id", bottleId);

      if (error) {
        // Rollback : restaurer l'état précédent en cas d'erreur
        setCurrentCells((prev) => {
          const next = { ...prev };
          if (next[foundCellKey!] && previousBottle) {
            next[foundCellKey!] = previousBottle;
          }
          return next;
        });
        const errorMessage = error.message || error.hint || String(error);
        console.error("Erreur lors de la mise à jour 'À boire':", errorMessage, error);
        alert(`Erreur lors de la mise à jour: ${errorMessage}`);
        return;
      }

      // Recharger depuis Supabase pour garantir la synchronisation
      await loadBottles();
    } catch (error) {
      // Rollback : restaurer l'état précédent en cas d'erreur
      setCurrentCells((prev) => {
        const next = { ...prev };
        if (next[foundCellKey!] && previousBottle) {
          next[foundCellKey!] = previousBottle;
        }
        return next;
      });
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Erreur lors de la mise à jour 'À boire':", errorMessage, error);
      alert(`Une erreur inattendue s'est produite: ${errorMessage}`);
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
          <span className="text-xl font-light text-[#8b7355]">+</span>
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

    // Styles selon la couleur - différenciation visuelle uniquement par le fond (aucun texte)
    // Si to_drink est true, appliquer un fond vert sauge premium très léger
    const getCouleurStyles = () => {
      // Si "À boire" est coché, appliquer un fond vert sauge premium (très pâle, pas fluo)
      if (bottle.to_drink === true) {
        return {
          bg: "bg-[#f0f7f0]",
          border: "border-[#a5d6a7]/40",
          hoverBg: "hover:bg-[#e8f5e9]",
          hoverBorder: "hover:border-[#a5d6a7]/60",
        };
      }

      if (!bottle.couleur) {
        return {
          bg: "bg-[#fbf7f0]",
          border: "border-[#d4af37]/30",
          hoverBg: "hover:bg-[#f5efe0]",
          hoverBorder: "hover:border-[#d4af37]/70",
        };
      }
      switch (bottle.couleur) {
        case 'rouge':
          // Fond légèrement rosé / bordeaux très clair
          return {
            bg: "bg-[#f5e8e8]",
            border: "border-[#d4af37]/40",
            hoverBg: "hover:bg-[#f0e0e0]",
            hoverBorder: "hover:border-[#d4af37]/60",
          };
        case 'blanc':
          // Fond ivoire / jaune très pâle
          return {
            bg: "bg-[#fefcf5]",
            border: "border-[#d4af37]/50",
            hoverBg: "hover:bg-[#fdf9f0]",
            hoverBorder: "hover:border-[#d4af37]/70",
          };
        case 'rose':
          // Fond rosé très clair
          return {
            bg: "bg-[#fef5f8]",
            border: "border-[#f4a5b3]/40",
            hoverBg: "hover:bg-[#fef0f4]",
            hoverBorder: "hover:border-[#f4a5b3]/60",
          };
        default:
          return {
            bg: "bg-[#fbf7f0]",
            border: "border-[#d4af37]/30",
            hoverBg: "hover:bg-[#f5efe0]",
            hoverBorder: "hover:border-[#d4af37]/70",
          };
      }
    };

    const couleurStyles = getCouleurStyles();

    return (
      <button
        key={cellKey}
        onClick={(e) => handleCellClick(e, slotId)}
        onContextMenu={(e) => handleStartMove(e, slotId)}
        onTouchStart={() => handleLongPressStart(slotId)}
        onTouchEnd={handleLongPressEnd}
        onTouchMove={handleLongPressEnd}
        className={`${CELL_HEIGHT} border rounded-md flex flex-col items-center justify-center ${couleurStyles.bg} ${couleurStyles.hoverBg} focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-colors px-2 py-1 relative flex-1 basis-0 min-w-0 group cursor-pointer overflow-hidden ${
          isMovingSource
            ? "border-[#8B2635] border-2 shadow-[0_0_8px_rgba(139,38,53,0.3)]"
            : isMovingMode
            ? `${couleurStyles.border} hover:border-[#d4af37] hover:ring-2 hover:ring-[#d4af37]/30`
            : `${couleurStyles.border} ${couleurStyles.hoverBorder}`
        }`}
      >
        <span className="absolute top-1 left-1 text-[10px] text-[#8b7355] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10">
          {displayLabel}
        </span>
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
        {bottle.comment && (
          <span className="text-[8px] text-[#8b7355]/60 mt-1 italic truncate w-full text-center whitespace-nowrap overflow-hidden text-ellipsis">
            {bottle.comment}
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

  // Calculer le nombre total de bouteilles dans la cave
  const totalBottles = Object.keys(cells).length + Object.keys(basDeCaveCells).length;

  return (
    <main className="flex flex-col w-full">
      {/* Section Cave - Card séparée */}
      <div className="rounded-xl border-2 border-[#d4af37]/50 bg-[#fbf7f0] p-5 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h2 
              className="text-lg font-semibold mb-1"
              style={{
                fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif',
                fontWeight: 600,
                letterSpacing: '0.05em',
                color: '#b8860b',
                textShadow: '0 1px 2px rgba(0,0,0,0.08)',
              }}
            >
              Votre cave
            </h2>
            <span className="text-sm font-medium text-[#8b7355] bg-[#d4af37]/20 px-3 py-1 rounded-full border border-[#d4af37]/30">
              {totalBottles} {totalBottles === 1 ? 'bouteille' : 'bouteilles'}
            </span>
          </div>
        </div>
        <div className="w-full mb-6">
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 
                className="text-3xl font-semibold tracking-wide mb-0.5"
                style={{
                  fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  color: '#b8860b',
                  textShadow: '0 1px 2px rgba(0,0,0,0.08)',
                }}
              >
                {selectedClayette.name}
              </h1>
            </div>
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full">
          <h2 
            className="text-xl font-semibold whitespace-nowrap"
            style={{
              fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif',
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: '#b8860b',
              textShadow: '0 1px 2px rgba(0,0,0,0.08)',
            }}
          >
            Clayette
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {clayettes.map((clayette, index) => (
              <button
                key={clayette.id}
                onClick={() => {
                  setSelectedClayetteId(clayette.id);
                  setMovingFromKey(null);
                }}
                title={clayette.name}
                className={`px-4 py-2.5 text-sm sm:text-base font-semibold rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-[#d4af37] min-w-[44px] ${
                  selectedClayetteId === clayette.id
                    ? "border-[#d4af37] text-[#fbf7f0] bg-[#8B2635] shadow-[0_2px_4px_rgba(139,38,53,0.3)]"
                    : "border-[#d4af37]/40 text-[#2a2a2a] bg-[#fefcf5] hover:border-[#d4af37]/60 hover:bg-[#faf8f0]"
                }`}
                style={{
                  letterSpacing: '0.02em',
                }}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <div className="flex items-center ml-auto sm:ml-4">
            <button
              onClick={() => {
                setSelectedClayetteId(BAS_DE_CAVE_ID);
                setMovingFromKey(null);
              }}
              title="Bas de cave"
              className={`px-4 py-2.5 text-sm sm:text-base font-semibold rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-[#d4af37] ${
                selectedClayetteId === BAS_DE_CAVE_ID
                  ? "border-[#d4af37] text-[#fbf7f0] bg-[#8B2635] shadow-[0_2px_4px_rgba(139,38,53,0.3)]"
                  : "border-[#d4af37]/40 text-[#2a2a2a] bg-[#fefcf5] hover:border-[#d4af37]/60 hover:bg-[#faf8f0]"
              }`}
              style={{
                letterSpacing: '0.02em',
              }}
            >
              Bas de cave
            </button>
          </div>
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
      </div>

      {/* Section break - Séparation nette avec fond bordeaux visible */}
      <div className="relative my-12 sm:my-16 md:my-20 lg:my-24 flex items-center justify-center" style={{ backgroundColor: 'transparent' }}>
        <div className="h-px w-full max-w-[120px] bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent" style={{ boxShadow: '0 0 2px rgba(212, 175, 55, 0.2)' }}></div>
      </div>

      {/* Section Guide des régions viticoles - Premium */}
      <div className="rounded-xl border-2 border-[#d4af37]/50 bg-[#fbf7f0] p-5 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        {/* Header élégant */}
        <div className="mb-6">
          <h2 
            className="text-lg font-semibold mb-1"
            style={{
              fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif',
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: '#b8860b',
              textShadow: '0 1px 2px rgba(0,0,0,0.08)',
            }}
          >
            Guide des régions viticoles
          </h2>
          <p className="text-xs text-[#8b7355] mt-1">
            Régions, sous-régions et appellations françaises
          </p>
        </div>

        {/* Cartes de régions premium */}
        <div className="space-y-3">
          {REGIONS_VITICOLES.map((region) => {
            const isOpen = openRegion === region.nom;
            return (
              <div
                key={region.nom}
                className="group relative rounded-xl border border-[#d4af37]/30 bg-gradient-to-br from-[#fefcf5] to-[#faf8f0] overflow-hidden transition-all duration-500 ease-in-out hover:border-[#d4af37]/50 hover:shadow-[0_8px_24px_rgba(212,175,55,0.15)]"
                style={{
                  transform: isOpen ? 'translateY(0)' : 'translateY(0)',
                }}
              >
                <button
                  onClick={() => setOpenRegion(isOpen ? null : region.nom)}
                  className="w-full px-6 py-5 flex items-center gap-4 text-left focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:ring-inset transition-all duration-300"
                >
                  {/* Badge avec première lettre */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#fefcf5] border border-[#d4af37]/30 flex items-center justify-center group-hover:border-[#d4af37]/50 transition-all duration-300 shadow-sm">
                    <span className="text-base font-semibold text-[#b8860b] tracking-wide">
                      {region.nom.charAt(0)}
                    </span>
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="text-lg sm:text-xl font-semibold text-[#2a2a2a] mb-1"
                      style={{
                        fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {region.nom}
                    </h3>
                    {isOpen && (
                      <p className="text-sm text-[#8b7355]/90 mt-2 leading-relaxed font-light">
                        {region.description}
                      </p>
                    )}
                  </div>

                  {/* Icône de déploiement minimaliste */}
                  <div className="flex-shrink-0">
                    <svg
                      className={`w-5 h-5 text-[#b8860b] transition-all duration-500 ease-in-out ${
                        isOpen ? "rotate-180 opacity-60" : "opacity-40 group-hover:opacity-60"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Contenu déplié avec animation */}
                {isOpen && (
                  <div 
                    className="px-6 pb-6 pt-2 border-t border-[#d4af37]/15 animate-in slide-down duration-500"
                    style={{
                      animation: 'slideDown 0.5s ease-in-out',
                    }}
                  >
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap gap-2.5">
                        {region.appellations.map((appellation, idx) => (
                          <span
                            key={appellation}
                            className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium text-[#8b7355] bg-[#fbf7f0]/80 border border-[#d4af37]/15 rounded-full backdrop-blur-sm hover:bg-[#f8f4ea] hover:border-[#d4af37]/25 transition-all duration-300"
                            style={{
                              animationDelay: `${idx * 30}ms`,
                            }}
                          >
                            {appellation}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modale Détails */}
      <BottleDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleDetailsModalClose}
        onEdit={handleEditClick}
        onDelete={handleDelete}
        onMarkToDrink={markBottleToDrink}
        bottle={
          selectedCellKey
            ? (isBasDeCaveView ? basDeCaveCells[selectedCellKey] : cells[selectedCellKey]) || null
            : null
        }
        isDeleteLoading={isDeleteLoading}
      />

      {/* Modale Formulaire (édition ou création) */}
      <BottleModal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        onSave={handleSave}
        onDelete={
          selectedCellKey && (isBasDeCaveView ? basDeCaveCells[selectedCellKey] : cells[selectedCellKey])
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
