// Per-raid modules plug in here. To add a raid:
//   1. Drop <raid>-npcs.json, <raid>-packs.json, <raid>-bosses.json in this dir
//      (scripts/scrape-zone.mjs can generate the npcs file).
//   2. Write <raid>.ts with a BOSS_SLUG_TO_ID map in its reserved 100-id slice
//      and an exported RaidDef.
//   3. Import it below and add it to the RAIDS and BOSS_SLUG_TO_ID merges.
import type { RaidDef } from "../types";
import { SSC, SSC_BOSS_SLUG_TO_ID } from "./ssc";
import { TK,  TK_BOSS_SLUG_TO_ID  } from "./tk";

export const RAIDS: Record<string, RaidDef> = { SSC, TK };

// Global slug→id map across raids. Slugs are still unique per raid (they're
// combined with raid metadata in the boss packs themselves), but consumers
// like the share v2 migration just need a flat lookup by slug.
export const BOSS_SLUG_TO_ID: Record<string, number> = {
  ...SSC_BOSS_SLUG_TO_ID,
  ...TK_BOSS_SLUG_TO_ID,
};
