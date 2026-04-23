import { useRef } from "react";
import { useRaid, selectPacksForRaid } from "../store/raid";
import { usePreset } from "../store/preset";
import { remapBossPacksFromSeed } from "../lib/share";
import type { Pack } from "../data/types";

// One Export / one Import. The JSON is a flat Pack[] — boss packs (those with
// a slug + icon) are ordinary pack entries, so the same file covers everything.
// On import, boss packs' icon paths are re-derived from the current env's seed
// (so a file exported from localhost with base="/" works on Pages with
// base="/CafeRaidPlanner-Web/" and vice versa).

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
  const setAllPacks = useRaid((s) => s.setAllPacks);
  const fileRef = useRef<HTMLInputElement>(null);

  const onExport = () => {
    download(`${raidId.toLowerCase()}-packs.json`, JSON.stringify(packs, null, 2));
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error("Expected an array");
      for (const p of parsed as Pack[]) {
        if (typeof p.id !== "number" || typeof p.x !== "number" || typeof p.y !== "number" || !Array.isArray(p.members)) {
          throw new Error(`Malformed pack entry (id=${p.id})`);
        }
      }
      const cleaned = remapBossPacksFromSeed(parsed as Pack[], raidId);
      if (!confirm(`Replace current ${packs.length} pack${packs.length === 1 ? "" : "s"} with ${cleaned.length} from file?`)) {
        e.target.value = ""; return;
      }
      setAllPacks(raidId, cleaned);
    } catch (err) {
      alert("Import failed: " + (err instanceof Error ? err.message : String(err)));
    } finally { e.target.value = ""; }
  };

  return (
    <>
      <button
        className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
        onClick={onExport}
        title={`Download all ${packs.length} pack${packs.length === 1 ? "" : "s"} as JSON`}
      >
        Export JSON
      </button>
      <button
        className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
        onClick={() => fileRef.current?.click()}
        title="Replace all packs from a JSON file"
      >
        Import JSON
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
    </>
  );
}
