import { useRef } from "react";
import { useRaid, selectPacksForRaid, selectBossesForRaid } from "../store/raid";
import { usePreset } from "../store/preset";
import type { Boss, Pack } from "../data/types";

// Save/load helpers for the edit-mode header buttons. Pack JSON is a flat
// Pack[]. Boss JSON is { [bossId]: {x, y} } since icon/metadata lives in
// ssc.ts and shouldn't round-trip through user files.

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function PackIO() {
  const raidId = usePreset((s) => s.raidId);
  const packs = useRaid(selectPacksForRaid(raidId));
  const bosses = useRaid(selectBossesForRaid(raidId));
  const setAllPacks = useRaid((s) => s.setAllPacks);
  const setAllBosses = useRaid((s) => s.setAllBosses);
  const packsFileRef = useRef<HTMLInputElement>(null);
  const bossesFileRef = useRef<HTMLInputElement>(null);

  const onExportPacks = () => {
    download(`${raidId.toLowerCase()}-packs.json`, JSON.stringify(packs, null, 2));
  };

  const onExportBosses = () => {
    // Export only positions keyed by id — metadata is in-code.
    const positions: Record<string, { x: number; y: number }> = {};
    for (const b of bosses) positions[b.id] = { x: b.x, y: b.y };
    download(`${raidId.toLowerCase()}-bosses.json`, JSON.stringify(positions, null, 2));
  };

  const onFilePacks = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error("Expected an array");
      for (const p of parsed as Pack[]) {
        if (typeof p.id !== "number" || typeof p.x !== "number" || typeof p.y !== "number" || !Array.isArray(p.members)) {
          throw new Error("Malformed pack entry");
        }
      }
      if (!confirm(`Replace current ${packs.length} pack${packs.length === 1 ? "" : "s"} with ${parsed.length} from file?`)) {
        e.target.value = ""; return;
      }
      setAllPacks(raidId, parsed);
    } catch (err) {
      alert("Pack import failed: " + (err instanceof Error ? err.message : String(err)));
    } finally { e.target.value = ""; }
  };

  const onFileBosses = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Expected a { bossId: {x, y} } object");
      }
      // Merge incoming positions with existing boss metadata.
      const merged: Boss[] = bosses.map((b) => {
        const pos = (parsed as Record<string, { x: number; y: number }>)[b.id];
        return pos ? { ...b, x: pos.x, y: pos.y } : b;
      });
      const matched = Object.keys(parsed).filter((k) => bosses.some((b) => b.id === k)).length;
      if (!confirm(`Apply boss positions for ${matched} boss${matched === 1 ? "" : "es"} from file?`)) {
        e.target.value = ""; return;
      }
      setAllBosses(raidId, merged);
    } catch (err) {
      alert("Boss import failed: " + (err instanceof Error ? err.message : String(err)));
    } finally { e.target.value = ""; }
  };

  return (
    <>
      <button
        className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
        onClick={onExportPacks}
        title={`Download ${packs.length} pack${packs.length === 1 ? "" : "s"} as JSON`}
      >
        Export packs
      </button>
      <button
        className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
        onClick={() => packsFileRef.current?.click()}
        title="Replace packs from a JSON file"
      >
        Import packs
      </button>
      <button
        className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
        onClick={onExportBosses}
        title="Download boss positions as JSON"
      >
        Export bosses
      </button>
      <button
        className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
        onClick={() => bossesFileRef.current?.click()}
        title="Apply boss positions from a JSON file"
      >
        Import bosses
      </button>
      <input ref={packsFileRef} type="file" accept="application/json,.json" hidden onChange={onFilePacks} />
      <input ref={bossesFileRef} type="file" accept="application/json,.json" hidden onChange={onFileBosses} />
    </>
  );
}
