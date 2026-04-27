import { usePreset, type Assignment } from "../store/preset";
import { CooldownPicker } from "./CooldownPicker";
import { TargetPicker } from "./TargetPicker";
import type { MobCount } from "./MobList";

type Props = {
  pullId: string;
  idx: number;
  assignment: Assignment;
  pullMobs: MobCount[];
};

export function AssignmentRow({ pullId, idx, assignment, pullMobs }: Props) {
  const update = usePreset((s) => s.updateAssignment);
  const del = usePreset((s) => s.deleteAssignment);

  const isReminder = assignment.kind === "reminder";
  const isEquip = assignment.kind === "equip";
  const isKick = assignment.kind === "kick";

  return (
    <li className="flex items-center gap-2 bg-neutral-800/50 rounded px-2 py-1">
      {isReminder ? (
        <>
          <span className="text-xs text-amber-400 shrink-0" title="Reminder">📝</span>
          <input
            className="flex-1 min-w-0 bg-neutral-800 rounded px-2 py-0.5 text-xs outline-none"
            placeholder="e.g. put on fire res"
            value={assignment.text ?? ""}
            onChange={(e) => update(pullId, idx, { text: e.target.value })}
          />
        </>
      ) : isEquip ? (
        <>
          <span className="text-xs text-sky-400 shrink-0" title="Equip">🛡</span>
          {/* CooldownPicker in equip scope only shows Equip-category items
              + raw-ID fallback; onPick preserves kind="equip". */}
          <CooldownPicker
            scope="equip"
            kind="item"
            id={assignment.id}
            onPick={(_kind, id) => update(pullId, idx, { kind: "equip", id })}
            placeholder="Pick item to equip…"
          />
        </>
      ) : isKick ? (
        <>
          <span className="text-xs text-rose-400 shrink-0" title="Kick / interrupt">🦶</span>
          {/* CooldownPicker in kick scope shows Interrupt-category spells.
              Kind stays "kick" — the picker's onPick passes "spell"/"item",
              we override back to "kick" so the row stays a kick row. */}
          <CooldownPicker
            scope="kick"
            kind="spell"
            id={assignment.id}
            onPick={(_kind, id) => update(pullId, idx, { kind: "kick", id })}
            placeholder="Pick interrupt…"
          />
          <TargetPicker
            pullMobs={pullMobs}
            targetNpcId={assignment.targetNpcId}
            targetMarker={assignment.targetMarker}
            onPick={(patch) => update(pullId, idx, patch)}
          />
        </>
      ) : (
        // Fallback: kind is narrowed to "spell" | "item" here.
        <CooldownPicker
          kind={assignment.kind as "spell" | "item"}
          id={assignment.id}
          onPick={(kind, id) => update(pullId, idx, { kind, id })}
        />
      )}
      <input
        className="w-24 bg-neutral-800 rounded px-2 py-0.5 text-xs outline-none"
        placeholder="player (opt)"
        value={assignment.player ?? ""}
        onChange={(e) => update(pullId, idx, { player: e.target.value })}
      />
      {!isReminder && !isEquip && !isKick && (
        <input
          className="flex-1 min-w-0 bg-neutral-800 rounded px-2 py-0.5 text-xs outline-none"
          placeholder="note"
          value={assignment.note}
          onChange={(e) => update(pullId, idx, { note: e.target.value })}
        />
      )}
      <button
        className="text-xs text-neutral-400 hover:text-red-300 px-1"
        onClick={() => del(pullId, idx)}
        title="Delete"
      >
        ×
      </button>
    </li>
  );
}
