import type { Pack, RaidDef } from "../types";
// Canonical SSC pack layout. User-edited via Edit-mode "Export packs" → drop
// into ssc-packs.json. Boss entries (those with a slug) are identified and
// separated from the user packs at load time so their positions live here too.
import sscPacks from "./ssc-packs.json";
// Boss positions fallback ({ slug: {x,y} }) — used when a boss slug isn't
// present in ssc-packs.json (e.g. after a full reset before reseeding).
import sscBossPos from "./ssc-bosses.json";

const BASE = import.meta.env.BASE_URL;

// Boss ids reserved at 1001–1099 so they can't collide with user-created packs
// (which start at 1). Each raid owns its own 100-id range (SSC=1001–1099,
// TK=1101–1199, …).
export const SSC_BOSS_SLUG_TO_ID: Record<string, number> = {
  Hydross:   1001,
  Lurker:    1002,
  Leotheras: 1003,
  FLK:       1004,
  Morogrim:  1005,
  Vashj:     1006,
};

// Boss metadata (everything except position). Merged with ssc-bosses.json (or
// inline position from ssc-packs.json) at load time to produce Pack entries.
type BossMeta = { slug: string; name: string; encounterId: number; npcId: number; icon: string };
const BOSSES_META: BossMeta[] = [
  { slug: "Hydross",   name: "Hydross the Unstable",   encounterId: 623, npcId: 21216, icon: `${BASE}icons/bosses/ssc_hydross.png` },
  { slug: "Lurker",    name: "The Lurker Below",       encounterId: 624, npcId: 21217, icon: `${BASE}icons/bosses/ssc_lurker.png` },
  { slug: "Leotheras", name: "Leotheras the Blind",    encounterId: 625, npcId: 21215, icon: `${BASE}icons/bosses/ssc_leotheras.png` },
  { slug: "FLK",       name: "Fathom-Lord Karathress", encounterId: 626, npcId: 21214, icon: `${BASE}icons/bosses/ssc_karathress.png` },
  { slug: "Morogrim",  name: "Morogrim Tidewalker",    encounterId: 627, npcId: 21213, icon: `${BASE}icons/bosses/ssc_morogrim.png` },
  { slug: "Vashj",     name: "Lady Vashj",             encounterId: 628, npcId: 21212, icon: `${BASE}icons/bosses/ssc_vashj.png` },
];

const fallbackBossPos = sscBossPos as Record<string, { x: number; y: number }>;

const allSscPacks = sscPacks as Pack[];
const userSscPacks = allSscPacks.filter((p) => !p.slug);
const bossPosFromPacks = new Map<string, { x: number; y: number }>();
for (const p of allSscPacks) {
  if (p.slug) bossPosFromPacks.set(p.slug, { x: p.x, y: p.y });
}

const BOSS_PACKS: Pack[] = BOSSES_META.map((b) => {
  const pos = bossPosFromPacks.get(b.slug) ?? fallbackBossPos[b.slug] ?? { x: 0, y: 0 };
  return {
    id: SSC_BOSS_SLUG_TO_ID[b.slug],
    slug: b.slug,
    name: b.name,
    x: pos.x,
    y: pos.y,
    members: [{ npcId: b.npcId, count: 1 }],
    icon: b.icon,
    encounterId: b.encounterId,
  };
});

export const SSC: RaidDef = {
  id: "SSC",
  name: "Serpentshrine Cavern",
  mapImage: `${BASE}maps/ssc.webp`,
  mapWidth: 1000,
  mapHeight: 667,
  packs: [...userSscPacks, ...BOSS_PACKS],
};
