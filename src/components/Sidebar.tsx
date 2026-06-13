import { useCallback, useEffect, useRef, useState } from "react";
import { usePreset, selectCurrentPull } from "../store/preset";
import { useRaid, selectPacksForRaid } from "../store/raid";
import { PullList } from "./PullList";
import { PullEditor } from "./PullEditor";
import { PackInspector } from "./PackInspector";
import { ShareDialog } from "./ShareDialog";

// Resizable-width bookkeeping. The sidebar carries pulls + the assignment
// editor (player / role / note columns), which got wider — so it defaults
// roomier than before and the user can drag the left edge to taste. Width is
// clamped and persisted to localStorage so it survives reloads.
const WIDTH_KEY = "crp.sidebarWidth";
const MIN_W = 360;
const MAX_W = 900;
const DEFAULT_W = 520;

const clampWidth = (w: number) =>
  Math.max(MIN_W, Math.min(MAX_W, w));

function loadWidth(): number {
  const raw = Number(localStorage.getItem(WIDTH_KEY));
  return Number.isFinite(raw) && raw > 0 ? clampWidth(raw) : DEFAULT_W;
}

export function Sidebar() {
  const presetName = usePreset((s) => s.presets[s.currentPresetId]?.name ?? "");
  const raidId = usePreset((s) => s.raidId);
  const setPresetName = usePreset((s) => s.setPresetName);
  const resetPreset = usePreset((s) => s.resetPreset);
  const currentPull = usePreset(selectCurrentPull);
  const editMode = useRaid((s) => s.editMode);
  const selectedPackId = useRaid((s) => s.selectedPackId);
  const packs = useRaid(selectPacksForRaid(raidId));
  const selectedPack = packs.find((p) => p.id === selectedPackId);
  const [shareOpen, setShareOpen] = useState(false);
  const [width, setWidth] = useState(loadWidth);

  // Drag the left edge to resize. The sidebar is docked right, so the width is
  // measured from the pointer to the viewport's right edge. Listeners live on
  // window so the drag keeps tracking even when the pointer outruns the handle.
  const dragging = useRef(false);
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setWidth(clampWidth(window.innerWidth - e.clientX));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Read back from state on the next tick via the functional setter.
      setWidth((w) => {
        localStorage.setItem(WIDTH_KEY, String(w));
        return w;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <aside
      className="shrink-0 h-full flex flex-col bg-neutral-900 border-l border-neutral-800 relative"
      style={{ width }}
    >
      {/* Resize handle: a thin strip straddling the left border. */}
      <div
        className="absolute left-0 top-0 h-full w-1.5 -translate-x-1/2 cursor-col-resize z-10 hover:bg-sky-500/40"
        onMouseDown={onResizeStart}
        title="Drag to resize"
      />
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
