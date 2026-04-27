// Merged NPC database across all raids. Each raid contributes its own
// <raid>-npcs.json file under ./raids/; we union them here so NpcSearch,
// PackInspector, etc. can look up any mob by id regardless of raid.
import sscNpcs from "./raids/ssc-npcs.json";
import tkNpcs from "./raids/tk-npcs.json";

export type Ability = {
  id: number;
  name: string;
  schools: number | null;   // bitmask: 1 phys, 2 holy, 4 fire, 8 nature, 16 frost, 32 shadow, 64 arcane
};

export type Npc = {
  id: number;
  name: string;
  tag: string | null;
  classification: number;
  boss: boolean;
  type: number;
  abilities?: Ability[];
};

const SOURCES: Npc[][] = [sscNpcs as Npc[], tkNpcs as Npc[]];

// First-seen wins on duplicate ids (shared adds like "Furious Mr. Pinchy"
// appear in multiple zones). Order of SOURCES above decides priority.
const byId = new Map<number, Npc>();
for (const src of SOURCES) {
  for (const npc of src) {
    if (!byId.has(npc.id)) byId.set(npc.id, npc);
  }
}

export const NPCS: Npc[] = Array.from(byId.values());
export const NPC_BY_ID: globalThis.Map<number, Npc> = byId;

export const SCHOOL_COLOR: Record<number, string> = {
  1: "#d4a97a",   // physical
  2: "#fef080",   // holy
  4: "#ff7f3a",   // fire
  8: "#5fe679",   // nature
  16: "#7fd9ff",  // frost
  32: "#b784ea",  // shadow
  64: "#59c3d0",  // arcane
};

export function schoolsToColors(mask: number | null): string[] {
  if (!mask) return [];
  const out: string[] = [];
  for (let bit = 1; bit <= 64; bit <<= 1) {
    if (mask & bit) out.push(SCHOOL_COLOR[bit] ?? "#9ca3af");
  }
  return out;
}
