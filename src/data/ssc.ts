import type { Boss, Pack, RaidDef } from "./types";
// Canonical SSC pack layout. Sourced from the Edit-mode "Export JSON" button —
// drop a newer export into ssc-packs.json to reseed the app for everyone.
import sscPacks from "./ssc-packs.json";
// Boss positions only (id → {x,y}). Metadata (name, npcId, icon) stays in code
// so it isn't duplicated. Update this file via Export bosses in edit mode.
import sscBossPos from "./ssc-bosses.json";

const BASE = import.meta.env.BASE_URL;

// npcIds pulled from ssc-npcs.json (WoWhead zone=3607).
const BOSSES_META: Array<Omit<Boss, "x" | "y">> = [
  { id: "Hydross",   name: "Hydross the Unstable",   encounterId: 623, npcId: 21216, icon: `${BASE}icons/bosses/ssc_hydross.png` },
  { id: "Lurker",    name: "The Lurker Below",       encounterId: 624, npcId: 21217, icon: `${BASE}icons/bosses/ssc_lurker.png` },
  { id: "Leotheras", name: "Leotheras the Blind",    encounterId: 625, npcId: 21215, icon: `${BASE}icons/bosses/ssc_leotheras.png` },
  { id: "FLK",       name: "Fathom-Lord Karathress", encounterId: 626, npcId: 21214, icon: `${BASE}icons/bosses/ssc_karathress.png` },
  { id: "Morogrim",  name: "Morogrim Tidewalker",    encounterId: 627, npcId: 21213, icon: `${BASE}icons/bosses/ssc_morogrim.png` },
  { id: "Vashj",     name: "Lady Vashj",             encounterId: 628, npcId: 21212, icon: `${BASE}icons/bosses/ssc_vashj.png` },
];

const bossPos = sscBossPos as Record<string, { x: number; y: number }>;

export const SSC: RaidDef = {
  id: "SSC",
  name: "Serpentshrine Cavern",
  mapImage: `${BASE}maps/ssc.webp`,
  mapWidth: 1000,
  mapHeight: 667,
  packs: sscPacks as Pack[],
  bosses: BOSSES_META.map((b) => ({
    ...b,
    x: bossPos[b.id]?.x ?? 0,
    y: bossPos[b.id]?.y ?? 0,
  })),
};

export const RAIDS: Record<string, RaidDef> = { SSC };
