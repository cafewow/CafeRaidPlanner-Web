export type NpcCount = { npcId: number; count: number };

export type Pack = {
  id: number;
  name: string;
  x: number;           // pixel coords in the map image's natural space
  y: number;
  members: NpcCount[];
};

export type Boss = {
  id: string;
  name: string;
  encounterId: number;
  npcId: number;       // creature id — used by the addon's kill tracker
  x: number;
  y: number;
  icon?: string;       // URL to the boss portrait, relative to BASE_URL
};

export type RaidDef = {
  id: string;
  name: string;
  mapImage: string;    // URL/path to the map image
  mapWidth: number;    // natural pixel dimensions
  mapHeight: number;
  packs: Pack[];
  bosses: Boss[];
};
