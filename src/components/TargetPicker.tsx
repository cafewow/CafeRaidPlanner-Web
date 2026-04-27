import { useEffect, useRef, useState } from "react";
import { NPC_BY_ID } from "../data/npcs";
import { MARKERS, MARKER_BY_ID, type MarkerId } from "../data/markers";
import type { MobCount } from "./MobList";

type Props = {
  pullMobs: MobCount[];
  targetNpcId: number | null | undefined;
  targetMarker: MarkerId | null | undefined;
  onPick: (next: { targetNpcId: number | null; targetMarker: MarkerId | null }) => void;
};

const BASE = import.meta.env.BASE_URL;

// Kick target: either an NPC currently in the pull or one of the 8 raid markers.
// Picking either side clears the other so they're mutually exclusive.
export function TargetPicker({ pullMobs, targetNpcId, targetMarker, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selectedNpc = targetNpcId != null ? NPC_BY_ID.get(targetNpcId) : null;
  const selectedMarker = targetMarker != null ? MARKER_BY_ID[targetMarker] : null;

  const pickNpc = (id: number) => {
    onPick({ targetNpcId: id, targetMarker: null });
    setOpen(false);
  };
  const pickMarker = (id: MarkerId) => {
    onPick({ targetNpcId: null, targetMarker: id });
    setOpen(false);
  };
  const clear = () => {
    onPick({ targetNpcId: null, targetMarker: null });
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative flex-1 min-w-0">
      <button
        className="w-full bg-neutral-800 rounded px-2 py-1 text-xs text-left truncate hover:bg-neutral-700 flex items-center gap-1"
        onClick={() => setOpen((v) => !v)}
        title={
          selectedMarker ? `Marker: ${selectedMarker.name}`
          : selectedNpc ? selectedNpc.name
          : "Pick target"
        }
      >
        {selectedMarker ? (
          <>
            <img src={`${BASE}${selectedMarker.icon}`} alt="" className="w-4 h-4 shrink-0" />
            <span className="truncate">{selectedMarker.name}</span>
          </>
        ) : selectedNpc ? (
          <span className="truncate">{selectedNpc.name}</span>
        ) : targetNpcId != null ? (
          <span className="truncate text-neutral-400">npc #{targetNpcId}</span>
        ) : (
          <span className="text-neutral-500 italic">Pick target…</span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-[260px] bg-neutral-900 border border-neutral-700 rounded shadow-lg z-20">
          <div className="px-2 py-1 text-[10px] uppercase text-neutral-500">Markers</div>
          <div className="px-2 pb-2 grid grid-cols-4 gap-1">
            {MARKERS.map((m) => (
              <button
                key={m.id}
                className={`flex flex-col items-center gap-0.5 p-1 rounded hover:bg-neutral-800 ${
                  targetMarker === m.id ? "ring-1 ring-amber-400" : ""
                }`}
                onClick={() => pickMarker(m.id)}
                title={m.name}
              >
                <img src={`${BASE}${m.icon}`} alt={m.name} className="w-6 h-6" />
                <span className="text-[10px] text-neutral-400">{m.name}</span>
              </button>
            ))}
          </div>
          <div className="px-2 py-1 text-[10px] uppercase text-neutral-500 border-t border-neutral-800">
            Mobs in this pull
          </div>
          <ul className="max-h-48 overflow-auto py-1">
            {pullMobs.length === 0 && (
              <li className="px-3 py-2 text-xs text-neutral-500 italic">
                No mobs — add packs to this pull first.
              </li>
            )}
            {pullMobs.map((m) => {
              const npc = NPC_BY_ID.get(m.npcId);
              const isSel = targetNpcId === m.npcId;
              return (
                <li
                  key={m.npcId}
                  className={`px-3 py-1 hover:bg-neutral-800 cursor-pointer flex items-center gap-2 text-xs ${
                    isSel ? "bg-neutral-800" : ""
                  }`}
                  onClick={() => pickNpc(m.npcId)}
                >
                  <span className="text-neutral-500 tabular-nums w-8 text-right">{m.count}×</span>
                  <span className="flex-1 truncate">{npc?.name ?? `npc ${m.npcId}`}</span>
                  {npc?.tag && (
                    <span className="text-[10px] text-neutral-500 truncate">{"<"}{npc.tag}{">"}</span>
                  )}
                </li>
              );
            })}
          </ul>
          {(targetNpcId != null || targetMarker != null) && (
            <div className="border-t border-neutral-800 p-1">
              <button
                className="w-full text-xs px-2 py-1 rounded hover:bg-neutral-800 text-neutral-400"
                onClick={clear}
              >
                Clear target
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
