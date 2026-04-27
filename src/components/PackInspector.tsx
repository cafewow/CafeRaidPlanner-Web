import { useState } from "react";
import { useRaid } from "../store/raid";
import { usePreset } from "../store/preset";
import { NpcSearch } from "./NpcSearch";
import { AbilityList } from "./AbilityList";
import { NPC_BY_ID } from "../data/npcs";
import type { Pack } from "../data/types";

type Props = { pack: Pack };

export function PackInspector({ pack }: Props) {
  const raidId = usePreset((s) => s.raidId);
  const updatePack = useRaid((s) => s.updatePack);
  const deletePack = useRaid((s) => s.deletePack);
  const duplicatePack = useRaid((s) => s.duplicatePack);
  const selectPack = useRaid((s) => s.selectPack);
  const patrolEditingPackId = useRaid((s) => s.patrolEditingPackId);
  const setPatrolEditingPackId = useRaid((s) => s.setPatrolEditingPackId);
  const clearPatrolPath = useRaid((s) => s.clearPatrolPath);
  const [adding, setAdding] = useState(false);

  const isEditingPatrol = patrolEditingPackId === pack.id;
  const waypointCount = pack.patrolPath?.length ?? 0;

  const setName = (name: string) => updatePack(raidId, pack.id, { name });
  const setPos = (x: number, y: number) =>
    updatePack(raidId, pack.id, { x, y });
  const setMembers = (members: Pack["members"]) =>
    updatePack(raidId, pack.id, { members });

  return (
    <div className="h-full overflow-auto p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          className="flex-1 bg-neutral-800 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-neutral-500"
          value={pack.name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Pack name"
        />
        <button
          className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
          onClick={() => duplicatePack(raidId, pack.id)}
          title="Duplicate this pack (appears offset, drag to position)"
        >
          Duplicate
        </button>
        <button
          className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-red-800 text-red-300"
          onClick={() => {
            if (confirm(`Delete "${pack.name}"?`)) deletePack(raidId, pack.id);
          }}
        >
          Delete
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs uppercase text-neutral-400 w-6">x</label>
        <input
          type="number"
          className="w-20 bg-neutral-800 rounded px-2 py-1 text-xs outline-none"
          value={pack.x}
          onChange={(e) => setPos(Number(e.target.value) || 0, pack.y)}
        />
        <label className="text-xs uppercase text-neutral-400 w-6">y</label>
        <input
          type="number"
          className="w-20 bg-neutral-800 rounded px-2 py-1 text-xs outline-none"
          value={pack.y}
          onChange={(e) => setPos(pack.x, Number(e.target.value) || 0)}
        />
        <span className="text-xs text-neutral-500">(drag blip to move)</span>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs uppercase text-neutral-400">Patrol path</label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-500">{waypointCount} waypoint{waypointCount === 1 ? "" : "s"}</span>
            {waypointCount > 0 && (
              <button
                className="text-xs px-2 py-0.5 rounded bg-neutral-800 hover:bg-red-800 text-red-300"
                onClick={() => {
                  if (confirm("Clear all waypoints?")) clearPatrolPath(raidId, pack.id);
                }}
              >
                Clear
              </button>
            )}
            <button
              className={`text-xs px-2 py-0.5 rounded ${
                isEditingPatrol
                  ? "bg-amber-700 text-amber-100 hover:bg-amber-600"
                  : "bg-neutral-800 hover:bg-neutral-700"
              }`}
              onClick={() => setPatrolEditingPackId(isEditingPatrol ? null : pack.id)}
              title="Click on the map to add waypoints; click a waypoint dot to remove it."
            >
              {isEditingPatrol ? "Done" : "Edit patrol"}
            </button>
          </div>
        </div>
        {isEditingPatrol && (
          <div className="mt-1 text-xs text-amber-300">
            Click the map to drop waypoints. Path runs from the pack blip through each.
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs uppercase text-neutral-400">Mobs</label>
          <button
            className="text-xs px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700"
            onClick={() => setAdding((v) => !v)}
          >
            {adding ? "×" : "+ Add"}
          </button>
        </div>
        {adding && (
          <div className="mt-2">
            <NpcSearch
              onPick={(npc) => {
                const existing = pack.members.find((m) => m.npcId === npc.id);
                const next = existing
                  ? pack.members.map((m) => (m.npcId === npc.id ? { ...m, count: m.count + 1 } : m))
                  : [...pack.members, { npcId: npc.id, count: 1 }];
                setMembers(next);
              }}
            />
          </div>
        )}
        <ul className="mt-2 flex flex-col gap-2">
          {pack.members.map((m) => {
            const npc = NPC_BY_ID.get(m.npcId);
            const abilities = npc?.abilities ?? [];
            return (
              <li key={m.npcId} className="bg-neutral-800/50 rounded px-2 py-1">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    className="w-12 bg-neutral-800 rounded px-1 py-0.5 text-xs outline-none"
                    value={m.count}
                    onChange={(e) => {
                      const n = Math.max(1, Number(e.target.value) || 1);
                      setMembers(pack.members.map((x) => (x.npcId === m.npcId ? { ...x, count: n } : x)));
                    }}
                  />
                  <span className="text-xs text-neutral-400 tabular-nums w-12">{m.npcId}</span>
                  <span className="text-sm flex-1 truncate">{npc?.name ?? "(unknown)"}</span>
                  {npc?.tag && <span className="text-xs text-neutral-500 truncate">{"<"}{npc.tag}{">"}</span>}
                  <button
                    className="text-xs text-neutral-400 hover:text-red-300 px-1"
                    onClick={() => setMembers(pack.members.filter((x) => x.npcId !== m.npcId))}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
                {abilities.length > 0 && (
                  <div className="mt-1">
                    <AbilityList abilities={abilities} />
                  </div>
                )}
              </li>
            );
          })}
          {pack.members.length === 0 && (
            <li className="text-xs text-neutral-500 italic">No mobs yet. Click + Add and search.</li>
          )}
        </ul>
      </div>

      <button
        className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 self-start"
        onClick={() => selectPack(null)}
      >
        ← Back
      </button>
    </div>
  );
}
