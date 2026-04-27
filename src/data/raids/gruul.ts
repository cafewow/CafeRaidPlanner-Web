import type { Pack, NpcCount, RaidDef } from "../types";
import gruulPacks from "./gruul-packs.json";
import gruulBossPos from "./gruul-bosses.json";

const BASE = import.meta.env.BASE_URL;

// Gruul boss ids reserved at 1201–1299.
export const GRUUL_BOSS_SLUG_TO_ID: Record<string, number> = {
  Maulgar: 1201,
  Gruul:   1202,
};

type BossMeta = {
  slug: string;
  name: string;
  encounterId: number;
  members: NpcCount[];
  icon: string;
};
const BOSSES_META: BossMeta[] = [
  // Maulgar fight is Maulgar + his four lieutenants — modeled as a single pack
  // since they're pulled together. Edit member counts in-app if you want.
  {
    slug: "Maulgar",
    name: "High King Maulgar",
    encounterId: 649,
    members: [
      { npcId: 18831, count: 1 }, // High King Maulgar
      { npcId: 18832, count: 1 }, // Krosh Firehand
      { npcId: 18834, count: 1 }, // Olm the Summoner
      { npcId: 18835, count: 1 }, // Kiggler the Crazed
      { npcId: 18836, count: 1 }, // Blindeye the Seer
    ],
    icon: `${BASE}icons/bosses/gruul_maulgar.png`,
  },
  {
    slug: "Gruul",
    name: "Gruul the Dragonkiller",
    encounterId: 650,
    members: [{ npcId: 19044, count: 1 }],
    icon: `${BASE}icons/bosses/gruul_gruul.png`,
  },
];

const fallbackBossPos = gruulBossPos as Record<string, { x: number; y: number }>;

const allGruulPacks = gruulPacks as Pack[];
const userGruulPacks = allGruulPacks.filter((p) => !p.slug);
const bossPosFromPacks = new Map<string, { x: number; y: number }>();
for (const p of allGruulPacks) {
  if (p.slug) bossPosFromPacks.set(p.slug, { x: p.x, y: p.y });
}

const BOSS_PACKS: Pack[] = BOSSES_META.map((b) => {
  const pos = bossPosFromPacks.get(b.slug) ?? fallbackBossPos[b.slug] ?? { x: 0, y: 0 };
  return {
    id: GRUUL_BOSS_SLUG_TO_ID[b.slug],
    slug: b.slug,
    name: b.name,
    x: pos.x,
    y: pos.y,
    members: b.members,
    icon: b.icon,
    encounterId: b.encounterId,
  };
});

export const GRUUL: RaidDef = {
  id: "Gruul",
  name: "Gruul's Lair",
  mapImage: `${BASE}maps/gruul.webp`,
  mapWidth: 1000,
  mapHeight: 667,
  packs: [...userGruulPacks, ...BOSS_PACKS],
};
