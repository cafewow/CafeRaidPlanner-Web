import { useRef } from "react";
import { useRaid, selectPacksForRaid } from "../store/raid";
import { usePreset } from "../store/preset";
import type { Pack } from "../data/types";

export function PackIO() {
  const raidId = usePreset((s) => s.raidId);
  const packs = useRaid(selectPacksForRaid(raidId));
  const setAllPacks = useRaid((s) => s.setAllPacks);
  const fileRef = useRef<HTMLInputElement>(null);

  const onExport = () => {
    const json = JSON.stringify(packs, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${raidId.toLowerCase()}-packs.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onImportClick = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Expected an array");
      // Spot-check shape.
      for (const p of parsed as Pack[]) {
        if (typeof p.id !== "number" || typeof p.x !== "number" || typeof p.y !== "number" || !Array.isArray(p.members)) {
          throw new Error("Malformed pack entry");
        }
      }
      if (!confirm(`Replace current ${packs.length} pack${packs.length === 1 ? "" : "s"} with ${parsed.length} from file?`)) {
        e.target.value = "";
        return;
      }
      setAllPacks(raidId, parsed);
    } catch (err) {
      alert("Import failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      e.target.value = "";
    }
  };

  return (
    <>
      <button
        className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
        onClick={onExport}
        title={`Download ${packs.length} pack${packs.length === 1 ? "" : "s"} as JSON`}
      >
        Export JSON
      </button>
      <button
        className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
        onClick={onImportClick}
        title="Replace all packs from a JSON file"
      >
        Import JSON
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
    </>
  );
}
