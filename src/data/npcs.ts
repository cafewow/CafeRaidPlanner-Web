import npcsJson from "./ssc-npcs.json";

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

// Stable casted type — ssc-npcs.json shape matches Npc[].
export const NPCS: Npc[] = npcsJson as Npc[];
export const NPC_BY_ID: globalThis.Map<number, Npc> = new globalThis.Map(NPCS.map((n) => [n.id, n]));

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
