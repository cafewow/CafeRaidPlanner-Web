import { useMemo, useState } from "react";
import { usePreset } from "../store/preset";
import { useRaid, selectPacksForRaid } from "../store/raid";
import { exportShare, importShare } from "../lib/share";

type Props = { onClose: () => void };

export function ShareDialog({ onClose }: Props) {
  const preset = usePreset((s) => s.preset);
  const raidId = usePreset((s) => s.raidId);
  const doImportPreset = usePreset((s) => s.importPreset);
  const packs = useRaid(selectPacksForRaid(raidId));
  const setAllPacks = useRaid((s) => s.setAllPacks);
  const [mode, setMode] = useState<"export" | "import">("export");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const exportStr = useMemo(() => exportShare(preset, packs), [preset, packs]);

  const onImport = () => {
    try {
      const env = importShare(importText);
      setAllPacks(env.preset.raidId, env.packs);
      doImportPreset(env.preset);
      onClose();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-neutral-900 rounded-lg p-4 w-[560px] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <button
            className={`px-3 py-1 rounded text-sm ${mode === "export" ? "bg-neutral-700" : "bg-neutral-800"}`}
            onClick={() => setMode("export")}
          >
            Export
          </button>
          <button
            className={`px-3 py-1 rounded text-sm ${mode === "import" ? "bg-neutral-700" : "bg-neutral-800"}`}
            onClick={() => setMode("import")}
          >
            Import
          </button>
          <div className="flex-1" />
          <button className="text-sm px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700" onClick={onClose}>
            Close
          </button>
        </div>

        {mode === "export" ? (
          <>
            <p className="text-xs text-neutral-400 mb-2">
              Self-contained: includes the preset and the {packs.length} pack{packs.length === 1 ? "" : "s"} it references.
            </p>
            <textarea
              className="w-full h-40 bg-neutral-800 rounded p-2 text-xs font-mono outline-none"
              readOnly
              value={exportStr}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                className="text-sm px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600"
                onClick={() => navigator.clipboard.writeText(exportStr)}
              >
                Copy
              </button>
              <span className="text-xs text-neutral-500">{exportStr.length} chars</span>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-neutral-400 mb-2">
              Paste a <code>crp1.…</code> string. Your current preset <em>and</em> pack set for that raid will be replaced.
            </p>
            <textarea
              className="w-full h-40 bg-neutral-800 rounded p-2 text-xs font-mono outline-none"
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportError(null); }}
            />
            {importError && <div className="mt-1 text-xs text-red-400">{importError}</div>}
            <div className="mt-2">
              <button
                className="text-sm px-3 py-1 rounded bg-green-700 hover:bg-green-600 disabled:opacity-40"
                disabled={!importText.trim()}
                onClick={onImport}
              >
                Import
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
