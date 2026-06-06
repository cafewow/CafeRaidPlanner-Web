import type { Pack, NpcCount, RaidDef } from "../types";
import ragefirePacks from "./ragefire-packs.json";
import ragefireBossPos from "./ragefire-bosses.json";

const BASE = import.meta.env.BASE_URL;

// Ragefire Chasm boss ids reserved at 1401–1499.
export const RAGEFIRE_BOSS_SLUG_TO_ID: Record<string, number> = {
  Oggleflint: 1401,
  Taragaman:  1402,
  Jergosh:    1403,
  Bazzalan:   1404,
};

type BossMeta = {
  slug: string;
  name: string;
  members: NpcCount[];
};

// Classic dungeon: each boss is a single mob with no DungeonEncounter id (those
// are WotLK+, and ENCOUNTER_START is best-effort in BCC anyway), so encounterId
// and a portrait icon are omitted — the blips render as default circles until
// you drag them onto the map and (optionally) add portraits later.
const BOSSES_META: BossMeta[] = [
  { slug: "Oggleflint", name: "Oggleflint",              members: [{ npcId: 11517, count: 1 }] },
  { slug: "Taragaman",  name: "Taragaman the Hungerer",  members: [{ npcId: 11520, count: 1 }] },
  { slug: "Jergosh",    name: "Jergosh the Invoker",     members: [{ npcId: 11518, count: 1 }] },
  { slug: "Bazzalan",   name: "Bazzalan",                members: [{ npcId: 11519, count: 1 }] },
];

const fallbackBossPos = ragefireBossPos as Record<string, { x: number; y: number }>;

const allPacks = ragefirePacks as Pack[];
const userPacks = allPacks.filter((p) => !p.slug);
const bossPosFromPacks = new Map<string, { x: number; y: number }>();
for (const p of allPacks) {
  if (p.slug) bossPosFromPacks.set(p.slug, { x: p.x, y: p.y });
}

const BOSS_PACKS: Pack[] = BOSSES_META.map((b) => {
  const pos = bossPosFromPacks.get(b.slug) ?? fallbackBossPos[b.slug] ?? { x: 0, y: 0 };
  return {
    id: RAGEFIRE_BOSS_SLUG_TO_ID[b.slug],
    slug: b.slug,
    name: b.name,
    x: pos.x,
    y: pos.y,
    members: b.members,
  };
});

export const RAGEFIRE: RaidDef = {
  id: "Ragefire",
  name: "Ragefire Chasm",
  mapImage: `${BASE}maps/WorldMap-Ragefire.webp`,
  mapWidth: 1000,
  mapHeight: 667,
  packs: [...userPacks, ...BOSS_PACKS],
};
