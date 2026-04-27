export type NpcCount = { npcId: number; count: number };

export type Pack = {
  id: number;
  name: string;
  x: number;           // pixel coords in the map image's natural space
  y: number;
  members: NpcCount[];
  // Optional — when present, MapView renders an icon-style blip (boss portrait)
  // instead of the default circle. Everything else (click, drag, assignments)
  // is identical to a regular pack.
  icon?: string;
  // Optional — ENCOUNTER_START / ENCOUNTER_END hook id (for future boss
  // auto-advance on the addon side).
  encounterId?: number;
  // Optional — stable short name ("Hydross"). Used as a slug for the repo
  // seed's ssc-bosses.json position map.
  slug?: string;
  // Optional — extra waypoints for patrolling packs. The pack's own (x,y) is
  // the anchor; the path is rendered as a polyline anchor → wp[0] → wp[1]…
  // Empty/undefined = stationary. Hovering the pack reveals the line; while
  // patrol-edit mode is active for the pack, clicks on the map append here.
  patrolPath?: { x: number; y: number }[];
};

export type RaidDef = {
  id: string;
  name: string;
  mapImage: string;    // URL/path to the map image
  mapWidth: number;    // natural pixel dimensions
  mapHeight: number;
  packs: Pack[];
};
