import { useState } from "react";
import { usePreset, selectCurrentPull } from "../store/preset";
import { useRaid, selectPacksForRaid } from "../store/raid";
import { PullList } from "./PullList";
import { PullEditor } from "./PullEditor";
import { PackInspector } from "./PackInspector";
import { ShareDialog } from "./ShareDialog";

export function Sidebar() {
  const presetName = usePreset((s) => s.preset.name);
  const raidId = usePreset((s) => s.raidId);
  const setPresetName = usePreset((s) => s.setPresetName);
  const resetPreset = usePreset((s) => s.resetPreset);
  const currentPull = usePreset(selectCurrentPull);
  const editMode = useRaid((s) => s.editMode);
  const selectedPackId = useRaid((s) => s.selectedPackId);
  const packs = useRaid(selectPacksForRaid(raidId));
  const selectedPack = packs.find((p) => p.id === selectedPackId);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <aside className="w-96 shrink-0 h-full flex flex-col bg-neutral-900 border-l border-neutral-800">
      <div className="p-3 border-b border-neutral-800 flex items-center gap-2">
        <input
          className="flex-1 bg-neutral-800 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-neutral-500"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          disabled={editMode}
        />
        <button
          className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
          onClick={() => setShareOpen(true)}
        >
          Share
        </button>
        <button
          className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-red-300"
          onClick={() => {
            if (confirm("Reset this preset? All pulls and assignments will be cleared.")) resetPreset();
          }}
          title="Reset preset"
        >
          ⟲
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {editMode ? (
          selectedPack ? (
            <PackInspector pack={selectedPack} />
          ) : (
            <div className="p-4 text-sm text-neutral-400">
              Click a pack on the map to edit it, or click empty map to create one.
              <div className="mt-3 text-xs text-neutral-500">
                {packs.length} pack{packs.length === 1 ? "" : "s"} in this raid.
              </div>
            </div>
          )
        ) : (
          <>
            <PullList />
            <div className="border-t border-neutral-800 flex-1 overflow-hidden">
              {currentPull && <PullEditor pull={currentPull} />}
            </div>
          </>
        )}
      </div>

      {shareOpen && <ShareDialog onClose={() => setShareOpen(false)} />}
    </aside>
  );
}
