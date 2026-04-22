import { useRef } from "react";
import { useRaid, selectPacksForRaid } from "../store/raid";
import { usePreset } from "../store/preset";
import type { Pack } from "../data/types";

// Save/load the committed seed. Packs (user-authored ones) and boss positions
// live in separate files in the repo, so the buttons are split here too:
//   - Export / Import packs     →  ssc-packs.json      (user-authored packs)
//   - Export / Import bosses    →  ssc-bosses.json     ({slug: {x,y}} map)

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
  const updatePack = useRaid((s) => s.updatePack);
  const packsFileRef = useRef<HTMLInputElement>(null);
  const bossesFileRef = useRef<HTMLInputElement>(null);

  const userPacks = packs.filter((p) => !p.slug);
  const bossPacks = packs.filter((p) => p.slug);

  const onExportPacks = () => {
    // Only user-authored packs (those without a slug). Boss packs are ssc.ts
    // built-ins and shouldn't round-trip into the user packs file.
    const payload = userPacks.map(({ icon: _i, encounterId: _e, slug: _s, ...rest }) => rest);
    download(`${raidId.toLowerCase()}-packs.json`, JSON.stringify(payload, null, 2));
  };

  const onExportBosses = () => {
    const positions: Record<string, { x: number; y: number }> = {};
    for (const b of bossPacks) if (b.slug) positions[b.slug] = { x: b.x, y: b.y };
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
      if (!confirm(`Replace current ${userPacks.length} user pack${userPacks.length === 1 ? "" : "s"} with ${parsed.length} from file?`)) {
        e.target.value = ""; return;
      }
      // Preserve boss packs; replace only the non-boss slice.
      setAllPacks(raidId, [...(parsed as Pack[]), ...bossPacks]);
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
        throw new Error("Expected a { slug: {x, y} } object");
      }
      const byslug = parsed as Record<string, { x: number; y: number }>;
      let matched = 0;
      for (const b of bossPacks) {
        if (!b.slug) continue;
        const pos = byslug[b.slug];
        if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
          updatePack(raidId, b.id, { x: pos.x, y: pos.y });
          matched++;
        }
      }
      alert(`Applied positions for ${matched} boss${matched === 1 ? "" : "es"}.`);
    } catch (err) {
      alert("Boss import failed: " + (err instanceof Error ? err.message : String(err)));
    } finally { e.target.value = ""; }
  };

  return (
    <>
      <button
        className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
        onClick={onExportPacks}
        title={`Download ${userPacks.length} user pack${userPacks.length === 1 ? "" : "s"} as JSON`}
      >
        Export packs
      </button>
      <button
        className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
        onClick={() => packsFileRef.current?.click()}
        title="Replace user packs from a JSON file"
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
