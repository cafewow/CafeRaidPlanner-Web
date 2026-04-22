import type { Pack, RaidDef } from "./types";
// Canonical SSC pack layout. Sourced from the Edit-mode "Export JSON" button —
// drop a newer export into ssc-packs.json to reseed the app for everyone.
import sscPacks from "./ssc-packs.json";

export const SSC: RaidDef = {
  id: "SSC",
  name: "Serpentshrine Cavern",
  mapImage: `${import.meta.env.BASE_URL}maps/ssc.webp`,
  mapWidth: 1000,
  mapHeight: 667,
  packs: sscPacks as Pack[],
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
