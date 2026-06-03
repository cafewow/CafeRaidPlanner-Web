import type { Pack, TrashRequirement } from "../data/types";
import type { Pull } from "../store/preset";

export type RequirementProgress = TrashRequirement & {
  // How many of the requirement's mobs the current route actually kills.
  planned: number;
  met: boolean;
};

// Tally each requirement against the planned route. The route is every pack
// referenced by a pull in the active preset — a pack sitting on the map but not
// assigned to any pull isn't being killed, so it doesn't count. Variable packs
// contribute their authored member counts (the planner's best estimate of the
// pull's makeup).
export function computeRequirementProgress(
  requirements: TrashRequirement[],
  pulls: Pull[],
  packs: Pack[],
): RequirementProgress[] {
  const packById = new Map<number, Pack>();
  for (const p of packs) packById.set(p.id, p);

  // Packs are exclusive to one pull, but dedupe by id defensively so a stray
  // double-reference can't inflate the tally.
  const seenPacks = new Set<number>();
  const killCount = new Map<number, number>();
  for (const pull of pulls) {
    for (const pid of pull.packIds) {
      if (seenPacks.has(pid)) continue;
      seenPacks.add(pid);
      const pack = packById.get(pid);
      if (!pack) continue;
      for (const m of pack.members) {
        killCount.set(m.npcId, (killCount.get(m.npcId) ?? 0) + m.count);
      }
    }
  }

  return requirements.map((req) => {
    const planned = req.npcIds.reduce((a, id) => a + (killCount.get(id) ?? 0), 0);
    return { ...req, planned, met: planned >= req.count };
  });
}
