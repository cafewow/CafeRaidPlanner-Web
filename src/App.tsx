import { useMemo } from "react";
import { MapView } from "./components/MapView";
import { Sidebar } from "./components/Sidebar";
import { PackIO } from "./components/PackIO";
import { usePreset } from "./store/preset";
import { useRaid, selectPacksForRaid } from "./store/raid";
import { RAIDS } from "./data/raids";

export default function App() {
  const raidId = usePreset((s) => s.raidId);
  const setRaid = usePreset((s) => s.setRaid);
  const currentPresetId = usePreset((s) => s.currentPresetId);
  // Subscribe to the stable presets map and derive the per-raid list with
  // useMemo. Filtering inside the Zustand selector would return a fresh array
  // every call → store change detection sees "different" → re-render loop.
  const presets = usePreset((s) => s.presets);
  const presetsForRaid = useMemo(
    () => Object.values(presets).filter((p) => p.raidId === raidId),
    [presets, raidId],
  );
  const switchPreset = usePreset((s) => s.switchPreset);
  const createPreset = usePreset((s) => s.createPreset);
  const deletePreset = usePreset((s) => s.deletePreset);
  const editMode = useRaid((s) => s.editMode);
  const setEditMode = useRaid((s) => s.setEditMode);
  const resetPacks = useRaid((s) => s.resetPacks);
  const packs = useRaid(selectPacksForRaid(raidId));
  const raid = RAIDS[raidId];

  const onNewPreset = () => {
    const name = prompt(`Name for new plan in ${raid.name}:`, "New plan");
    if (name == null) return;
    createPreset(raidId, name.trim() || "New plan");
  };

  const onDeletePreset = () => {
    const cur = presetsForRaid.find((p) => p.id === currentPresetId);
    if (!cur) return;
    if (presetsForRaid.length <= 1) {
      alert("Can't delete the last plan for this raid. Create another first.");
      return;
    }
    if (confirm(`Delete plan "${cur.name}"? This cannot be undone.`)) {
      deletePreset(currentPresetId);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <header className="h-12 shrink-0 flex items-center px-4 bg-neutral-950 border-b border-neutral-800 gap-3">
        <h1 className="font-semibold">CafeRaidPlanner</h1>
        <select
          className="bg-neutral-800 rounded px-2 py-1 text-sm outline-none"
          value={raidId}
          onChange={(e) => setRaid(e.target.value)}
          title="Switch raid"
        >
          {Object.values(RAIDS).map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select
          className="bg-neutral-800 rounded px-2 py-1 text-sm outline-none max-w-[180px]"
          value={currentPresetId}
          onChange={(e) => switchPreset(e.target.value)}
          title="Switch plan"
        >
          {presetsForRaid.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
          onClick={onNewPreset}
          title="Create a new plan for this raid"
        >
          + New
        </button>
        <button
          className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-red-800 text-red-300 disabled:opacity-40"
          onClick={onDeletePreset}
          disabled={presetsForRaid.length <= 1}
          title={presetsForRaid.length <= 1 ? "Last plan for this raid; create another first" : "Delete this plan"}
        >
          ×
        </button>
        <span className="text-xs text-neutral-500">
          {packs.length} pack{packs.length === 1 ? "" : "s"}
        </span>
        <div className="flex-1" />
        <button
          className={`text-xs px-3 py-1 rounded ${
            editMode ? "bg-amber-700 hover:bg-amber-600 text-amber-100" : "bg-neutral-800 hover:bg-neutral-700"
          }`}
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? "Done editing" : "Edit packs"}
        </button>
        {editMode && (
          <>
            <PackIO />
            <button
              className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-red-800 text-red-300"
              onClick={() => {
                if (confirm(`Reset all pack data for ${raid.name} to defaults? This cannot be undone.`)) resetPacks(raidId);
              }}
              title="Reset pack data to seed defaults (including boss positions)"
            >
              Reset packs
            </button>
          </>
        )}
        <span className="text-xs text-neutral-500">v0.1.0-dev</span>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <MapView />
        </div>
        <Sidebar />
      </div>
    </div>
  );
}
