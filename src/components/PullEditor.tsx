import { useMemo } from "react";
import { usePreset, type Pull } from "../store/preset";
import { useRaid, selectPacksForRaid, selectBossesForRaid } from "../store/raid";
import { AssignmentRow } from "./AssignmentRow";
import { MobList, type MobCount } from "./MobList";

type Props = { pull: Pull };

export function PullEditor({ pull }: Props) {
  const raidId = usePreset((s) => s.raidId);
  const packs = useRaid(selectPacksForRaid(raidId));
  const bosses = useRaid(selectBossesForRaid(raidId));
  const renamePull = usePreset((s) => s.renamePull);
  const setPullNote = usePreset((s) => s.setPullNote);
  const setPullBoss = usePreset((s) => s.setPullBoss);
  const deletePull = usePreset((s) => s.deletePull);
  const addAssignment = usePreset((s) => s.addAssignment);

  const pulls = usePreset((s) => s.preset.pulls);

  // Aggregate mobs across all packs + the boss (if any) in this pull.
  const aggregatedMobs = useMemo<MobCount[]>(() => {
    const byNpc = new globalThis.Map<number, number>();
    for (const packId of pull.packIds) {
      const pack = packs.find((p) => p.id === packId);
      if (!pack) continue;
      for (const m of pack.members) {
        byNpc.set(m.npcId, (byNpc.get(m.npcId) ?? 0) + m.count);
      }
    }
    if (pull.bossId) {
      const boss = bosses.find((b) => b.id === pull.bossId);
      if (boss) byNpc.set(boss.npcId, (byNpc.get(boss.npcId) ?? 0) + 1);
    }
    return Array.from(byNpc.entries())
      .map(([npcId, count]) => ({ npcId, count }))
      .sort((a, b) => b.count - a.count);
  }, [pull.packIds, pull.bossId, packs, bosses]);

  return (
    <div className="h-full overflow-auto p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          className="flex-1 bg-neutral-800 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-neutral-500"
          value={pull.name}
          onChange={(e) => renamePull(pull.id, e.target.value)}
        />
        <button
          className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-red-800 text-red-300 disabled:opacity-40"
          disabled={pulls.length <= 1}
          onClick={() => {
            if (confirm(`Delete "${pull.name}"?`)) deletePull(pull.id);
          }}
        >
          Delete
        </button>
      </div>

      <div>
        <label className="text-xs uppercase text-neutral-400">Boss</label>
        <select
          className="w-full mt-1 bg-neutral-800 rounded px-2 py-1 text-sm outline-none"
          value={pull.bossId ?? ""}
          onChange={(e) => setPullBoss(pull.id, e.target.value || null)}
        >
          <option value="">— (trash)</option>
          {bosses.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs uppercase text-neutral-400">Note</label>
        <textarea
          className="w-full mt-1 bg-neutral-800 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-neutral-500 min-h-[60px]"
          value={pull.note}
          onChange={(e) => setPullNote(pull.id, e.target.value)}
          placeholder="Free-text note shown to assigned players..."
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs uppercase text-neutral-400">Assignments</label>
          <div className="flex items-center gap-1">
            <button
              className="text-xs px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700"
              onClick={() => addAssignment(pull.id, "spell")}
              title="Cooldown or consumable"
            >
              + CD
            </button>
            <button
              className="text-xs px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700"
              onClick={() => addAssignment(pull.id, "equip")}
              title="Equip an item (e.g. Rocket Boots, parachute cloak)"
            >
              + Equip
            </button>
            <button
              className="text-xs px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700"
              onClick={() => addAssignment(pull.id, "reminder")}
              title="Free-text reminder (gear swap, spec swap, etc.)"
            >
              + Reminder
            </button>
          </div>
        </div>
        <ul className="mt-2 flex flex-col gap-2">
          {pull.assignments.map((a, idx) => (
            <AssignmentRow key={idx} pullId={pull.id} idx={idx} assignment={a} />
          ))}
          {pull.assignments.length === 0 && (
            <li className="text-xs text-neutral-500 italic">No assignments yet.</li>
          )}
        </ul>
      </div>

      <div>
        <label className="text-xs uppercase text-neutral-400">Packs in this pull</label>
        <div className="mt-1 text-sm text-neutral-300">
          {pull.packIds.length === 0 ? (
            <span className="text-neutral-500 italic">Click a blip on the map to add.</span>
          ) : (
            pull.packIds
              .map((id) => packs.find((p) => p.id === id)?.name ?? `#${id}`)
              .join(", ")
          )}
        </div>
      </div>

      <div>
        <label className="text-xs uppercase text-neutral-400">Pull contents</label>
        <div className="mt-1">
          <MobList mobs={aggregatedMobs} emptyMessage="No packs assigned yet." />
        </div>
      </div>
    </div>
  );
}
