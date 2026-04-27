import type { Pack, RaidDef } from "../types";
import tkPacks from "./tk-packs.json";
import tkBossPos from "./tk-bosses.json";

const BASE = import.meta.env.BASE_URL;

// TK boss ids reserved at 1101–1199.
export const TK_BOSS_SLUG_TO_ID: Record<string, number> = {
  VoidReaver: 1101,
  Solarian:   1102,
  Alar:       1103,
  Kaelthas:   1104,
};

type BossMeta = { slug: string; name: string; encounterId: number; npcId: number; icon: string };
const BOSSES_META: BossMeta[] = [
  { slug: "VoidReaver", name: "Void Reaver",              encounterId: 730, npcId: 19516, icon: `${BASE}icons/bosses/tk_voidreaver.png` },
  { slug: "Solarian",   name: "High Astromancer Solarian",encounterId: 731, npcId: 18805, icon: `${BASE}icons/bosses/tk_solarian.png` },
  { slug: "Alar",       name: "Al'ar",                    encounterId: 732, npcId: 19514, icon: `${BASE}icons/bosses/tk_alar.png` },
  { slug: "Kaelthas",   name: "Kael'thas Sunstrider",     encounterId: 733, npcId: 19622, icon: `${BASE}icons/bosses/tk_kaelthas.png` },
];

const fallbackBossPos = tkBossPos as Record<string, { x: number; y: number }>;

const allTkPacks = tkPacks as Pack[];
const userTkPacks = allTkPacks.filter((p) => !p.slug);
const bossPosFromPacks = new Map<string, { x: number; y: number }>();
for (const p of allTkPacks) {
  if (p.slug) bossPosFromPacks.set(p.slug, { x: p.x, y: p.y });
}

const BOSS_PACKS: Pack[] = BOSSES_META.map((b) => {
  const pos = bossPosFromPacks.get(b.slug) ?? fallbackBossPos[b.slug] ?? { x: 0, y: 0 };
  return {
    id: TK_BOSS_SLUG_TO_ID[b.slug],
    slug: b.slug,
    name: b.name,
    x: pos.x,
    y: pos.y,
    members: [{ npcId: b.npcId, count: 1 }],
    icon: b.icon,
    encounterId: b.encounterId,
  };
});

// Map dimensions are placeholders until tk.webp lands in public/maps/. Update
// to the image's natural pixel size when committing the map file.
export const TK: RaidDef = {
  id: "TK",
  name: "The Eye",
  mapImage: `${BASE}maps/tk.webp`,
  mapWidth: 1000,
  mapHeight: 667,
  packs: [...userTkPacks, ...BOSS_PACKS],
};
