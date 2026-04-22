import { useState } from "react";
import { NPC_BY_ID } from "../data/npcs";
import { AbilityList } from "./AbilityList";

export type MobCount = { npcId: number; count: number };

type Props = {
  mobs: MobCount[];
  emptyMessage?: string;
};

// Presentational list of mobs with expandable ability rows. Used for read-only pull
// contents display; pack editing happens in PackInspector with its own controls.
export function MobList({ mobs, emptyMessage }: Props) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  if (mobs.length === 0) {
    return <div className="text-xs text-neutral-500 italic">{emptyMessage ?? "No mobs."}</div>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {mobs.map((m) => {
        const npc = NPC_BY_ID.get(m.npcId);
        const abilities = npc?.abilities ?? [];
        const open = !!expanded[m.npcId];
        return (
          <li key={m.npcId} className="text-sm">
            <button
              className="w-full flex items-center gap-2 hover:bg-neutral-800/60 rounded px-1 py-0.5 text-left"
              onClick={() => setExpanded((e) => ({ ...e, [m.npcId]: !open }))}
              disabled={abilities.length === 0}
              title={abilities.length === 0 ? "No cataloged abilities" : open ? "Collapse" : "Expand abilities"}
            >
              <span className={`text-xs text-neutral-500 w-3 ${abilities.length === 0 ? "opacity-30" : ""}`}>
                {open ? "▾" : "▸"}
              </span>
              <span className="text-neutral-300 tabular-nums w-8 text-right">{m.count}×</span>
              <span className="flex-1 truncate">{npc?.name ?? `npc ${m.npcId}`}</span>
              {npc?.tag && <span className="text-xs text-neutral-500 truncate">{"<"}{npc.tag}{">"}</span>}
              {abilities.length > 0 && (
                <span className="text-xs text-neutral-500">{abilities.length} abil.</span>
              )}
            </button>
            {open && <AbilityList abilities={abilities} />}
          </li>
        );
      })}
    </ul>
  );
}
