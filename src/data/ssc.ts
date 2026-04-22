import type { RaidDef } from "./types";

export const SSC: RaidDef = {
  id: "SSC",
  name: "Serpentshrine Cavern",
  mapImage: `${import.meta.env.BASE_URL}maps/ssc.webp`,
  mapWidth: 1000,
  mapHeight: 667,
  packs: [
    { id: 1, name: "First patrol",        x: 200, y: 560, members: [{ npcId: 21965, count: 2 }] },
    { id: 2, name: "Hydross trash 1",     x: 320, y: 480, members: [{ npcId: 21213, count: 3 }] },
    { id: 3, name: "Hydross trash 2",     x: 380, y: 420, members: [{ npcId: 21213, count: 2 }, { npcId: 21214, count: 1 }] },
    { id: 4, name: "Lurker approach",     x: 560, y: 360, members: [{ npcId: 21301, count: 4 }] },
    { id: 5, name: "Bridge fish",         x: 640, y: 300, members: [{ npcId: 21301, count: 2 }, { npcId: 21302, count: 2 }] },
  ],
  // npcIds pulled from ssc-npcs.json (WoWhead zone=3607).
  bosses: [
    { id: "Hydross",   name: "Hydross the Unstable",    encounterId: 623, npcId: 21216, x: 380, y: 390, icon: `${import.meta.env.BASE_URL}icons/bosses/ssc_hydross.png` },
    { id: "Lurker",    name: "The Lurker Below",        encounterId: 624, npcId: 21217, x: 560, y: 390, icon: `${import.meta.env.BASE_URL}icons/bosses/ssc_lurker.png` },
    { id: "Leotheras", name: "Leotheras the Blind",     encounterId: 625, npcId: 21215, x: 820, y: 340, icon: `${import.meta.env.BASE_URL}icons/bosses/ssc_leotheras.png` },
    { id: "FLK",       name: "Fathom-Lord Karathress",  encounterId: 626, npcId: 21214, x: 820, y: 520, icon: `${import.meta.env.BASE_URL}icons/bosses/ssc_karathress.png` },
    { id: "Morogrim",  name: "Morogrim Tidewalker",     encounterId: 627, npcId: 21213, x: 520, y: 180, icon: `${import.meta.env.BASE_URL}icons/bosses/ssc_morogrim.png` },
    { id: "Vashj",     name: "Lady Vashj",              encounterId: 628, npcId: 21212, x: 200, y: 180, icon: `${import.meta.env.BASE_URL}icons/bosses/ssc_vashj.png` },
  ],
};

export const RAIDS: Record<string, RaidDef> = { SSC };
