import { useMemo, useState } from "react";
import { RAIDS } from "../data/raids";
import { usePreset, selectCurrentPreset } from "../store/preset";
import { useRaid, selectPacksForRaid } from "../store/raid";
import { NPC_BY_ID } from "../data/npcs";
import { computeRequirementProgress } from "../lib/requirements";

// Glanceable WCL trash-requirement checklist, overlaid on the map. Tallies the
// current preset's route against the active raid's requirements so the planner
// can see at a glance whether every quota is covered. Renders nothing for raids
// without requirements defined.
export function RequirementsPanel() {
  const raidId = usePreset((s) => s.raidId);
  const preset = usePreset(selectCurrentPreset);
  const packs = useRaid(selectPacksForRaid(raidId));
  const [open, setOpen] = useState(true);

  const requirements = RAIDS[raidId]?.requirements;
  const progress = useMemo(
    () => (requirements ? computeRequirementProgress(requirements, preset.pulls, packs) : []),
    [requirements, preset.pulls, packs],
  );

  if (!requirements || requirements.length === 0) return null;

  const metCount = progress.filter((p) => p.met).length;
  const allMet = metCount === progress.length;

  // Tooltip listing the mob variants a requirement covers — handy for the
  // multi-id Tidewalker add bucket.
  const tip = (npcIds: number[]) =>
    npcIds.map((id) => NPC_BY_ID.get(id)?.name ?? `#${id}`).join(", ");

  return (
    <div
      className="absolute top-3 left-3 w-60 bg-black/80 rounded text-xs text-neutral-200 shadow-lg overflow-hidden"
      // Keep panel clicks/drags from reaching the map (pan, add-pack, deselect).
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5"
        onClick={() => setOpen((o) => !o)}
        title={allMet ? "All trash requirements met" : "Some trash requirements not yet met"}
      >
        <span className={`inline-block w-2 h-2 rounded-full ${allMet ? "bg-green-400" : "bg-amber-400"}`} />
        <span className="font-semibold uppercase tracking-wide text-[11px]">Trash requirements</span>
        <span className="flex-1" />
        <span className="text-neutral-400 tabular-nums">{metCount}/{progress.length}</span>
        <span className="text-neutral-500">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <ul className="px-2 pb-2">
          {progress.map((req) => (
            <li
              key={req.label}
              className="flex items-center gap-2 px-1 py-0.5 rounded"
              title={tip(req.npcIds)}
            >
              <span className={req.met ? "text-green-400" : "text-amber-400"}>
                {req.met ? "✓" : "•"}
              </span>
              <span className="flex-1 truncate">{req.label}</span>
              <span className={`tabular-nums ${req.met ? "text-green-400" : "text-amber-300"}`}>
                {req.planned}/{req.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
