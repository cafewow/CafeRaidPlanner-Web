import type { Pack, RaidDef } from "./types";
// Canonical SSC pack layout. User-edited via Edit-mode "Export packs" → drop
// into ssc-packs.json. Boss packs are NOT in this file (their metadata stays
// in code because icon paths depend on BASE_URL).
import sscPacks from "./ssc-packs.json";
// Boss positions only ({ slug: {x,y} }). Keeps position data editable via the
// Edit-mode "Export bosses" button without duplicating name/npcId/icon metadata.
import sscBossPos from "./ssc-bosses.json";

const BASE = import.meta.env.BASE_URL;

// Boss ids reserved at 1000+ so they can't collide with user-created packs
// (which start at 1 and increment). The pattern keeps bosses as ordinary Packs
// but gives them a stable well-known numeric id across sessions and migrations.
export const BOSS_SLUG_TO_ID: Record<string, number> = {
  Hydross:   1001,
  Lurker:    1002,
  Leotheras: 1003,
  FLK:       1004,
  Morogrim:  1005,
  Vashj:     1006,
};

// Boss metadata (everything except position). Merged with ssc-bosses.json at
// load time to produce the final Pack entries. npcIds from ssc-npcs.json
// (WoWhead zone=3607).
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

// ssc-packs.json is exported via Edit-mode "Export JSON" and now contains
// boss entries (identified by slug) as well. Those entries are the source
// of truth for boss x/y. We strip them from the user-packs list and rebuild
// boss packs from BOSSES_META so icon/encounterId/npcId come from code
// (icon paths depend on BASE_URL; can't live in the JSON). ssc-bosses.json
// is kept only as a last-resort fallback for bosses missing from the export.
const allSscPacks = sscPacks as Pack[];
const userSscPacks = allSscPacks.filter((p) => !p.slug);
const bossPosFromPacks = new Map<string, { x: number; y: number }>();
for (const p of allSscPacks) {
  if (p.slug) bossPosFromPacks.set(p.slug, { x: p.x, y: p.y });
}

const BOSS_PACKS: Pack[] = BOSSES_META.map((b) => {
  const pos = bossPosFromPacks.get(b.slug) ?? fallbackBossPos[b.slug] ?? { x: 0, y: 0 };
  return {
    id: BOSS_SLUG_TO_ID[b.slug],
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

export const RAIDS: Record<string, RaidDef> = { SSC };
