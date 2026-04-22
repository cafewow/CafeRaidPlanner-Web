import { MapView } from "./components/MapView";
import { Sidebar } from "./components/Sidebar";
import { PackIO } from "./components/PackIO";
import { usePreset } from "./store/preset";
import { useRaid, selectPacksForRaid } from "./store/raid";
import { RAIDS } from "./data/ssc";

export default function App() {
  const raidId = usePreset((s) => s.raidId);
  const setRaid = usePreset((s) => s.setRaid);
  const editMode = useRaid((s) => s.editMode);
  const setEditMode = useRaid((s) => s.setEditMode);
  const resetPacks = useRaid((s) => s.resetPacks);
  const packs = useRaid(selectPacksForRaid(raidId));
  const raid = RAIDS[raidId];

  return (
    <div className="h-full flex flex-col">
      <header className="h-12 shrink-0 flex items-center px-4 bg-neutral-950 border-b border-neutral-800 gap-3">
        <h1 className="font-semibold">CafeRaidPlanner</h1>
        <select
          className="bg-neutral-800 rounded px-2 py-1 text-sm outline-none"
          value={raidId}
          onChange={(e) => setRaid(e.target.value)}
        >
          {Object.values(RAIDS).map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <span className="text-xs text-neutral-500">
          {packs.length} pack{packs.length === 1 ? "" : "s"} · {raid.bosses.length} bosses
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
              title="Reset pack data to seed defaults"
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
