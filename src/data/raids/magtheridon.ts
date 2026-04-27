import type { Pack, NpcCount, RaidDef } from "../types";
import magPacks from "./magtheridon-packs.json";
import magBossPos from "./magtheridon-bosses.json";

const BASE = import.meta.env.BASE_URL;

// Magtheridon boss ids reserved at 1301–1399.
export const MAG_BOSS_SLUG_TO_ID: Record<string, number> = {
  Magtheridon: 1301,
};

type BossMeta = {
  slug: string;
  name: string;
  encounterId: number;
  members: NpcCount[];
  icon: string;
};
const BOSSES_META: BossMeta[] = [
  {
    slug: "Magtheridon",
    name: "Magtheridon",
    encounterId: 651,
    members: [
      { npcId: 17257, count: 1 }, // Magtheridon
      { npcId: 17256, count: 5 }, // Hellfire Channelers (the cubes)
    ],
    icon: `${BASE}icons/bosses/mag_magtheridon.png`,
  },
];

const fallbackBossPos = magBossPos as Record<string, { x: number; y: number }>;

const allMagPacks = magPacks as Pack[];
const userMagPacks = allMagPacks.filter((p) => !p.slug);
const bossPosFromPacks = new Map<string, { x: number; y: number }>();
for (const p of allMagPacks) {
  if (p.slug) bossPosFromPacks.set(p.slug, { x: p.x, y: p.y });
}

const BOSS_PACKS: Pack[] = BOSSES_META.map((b) => {
  const pos = bossPosFromPacks.get(b.slug) ?? fallbackBossPos[b.slug] ?? { x: 0, y: 0 };
  return {
    id: MAG_BOSS_SLUG_TO_ID[b.slug],
    slug: b.slug,
    name: b.name,
    x: pos.x,
    y: pos.y,
    members: b.members,
    icon: b.icon,
    encounterId: b.encounterId,
  };
});

export const MAGTHERIDON: RaidDef = {
  id: "Magtheridon",
  name: "Magtheridon's Lair",
  mapImage: `${BASE}maps/magtheridon.webp`,
  mapWidth: 1000,
  mapHeight: 667,
  packs: [...userMagPacks, ...BOSS_PACKS],
};
