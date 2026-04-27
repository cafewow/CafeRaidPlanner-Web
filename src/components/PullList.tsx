import { usePreset, selectCurrentPreset } from "../store/preset";

export function PullList() {
  const preset = usePreset(selectCurrentPreset);
  const selectPull = usePreset((s) => s.selectPull);
  const addPull = usePreset((s) => s.addPull);
  const movePull = usePreset((s) => s.movePull);

  return (
    <div className="shrink-0 max-h-[40%] overflow-auto">
      <div className="px-3 py-2 text-xs uppercase tracking-wide text-neutral-400 flex items-center justify-between sticky top-0 bg-neutral-900">
        <span>Pulls</span>
        <button className="text-sm px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700" onClick={addPull}>
          +
        </button>
      </div>
      <ul>
        {preset.pulls.map((pull, i) => {
          const selected = preset.currentPullId === pull.id;
          return (
            <li
              key={pull.id}
              className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer border-l-2 ${
                selected ? "bg-neutral-800 border-l-white" : "border-l-transparent hover:bg-neutral-800/60"
              }`}
              style={{ borderLeftColor: selected ? pull.color : "transparent" }}
              onClick={() => selectPull(pull.id)}
            >
              <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: pull.color }} />
              <span className="flex-1 text-sm truncate">
                {i + 1}. {pull.name} <span className="text-neutral-500">({pull.packIds.length})</span>
              </span>
              <button
                className="text-xs text-neutral-400 hover:text-white px-1"
                onClick={(e) => { e.stopPropagation(); movePull(pull.id, -1); }}
                title="Move up"
              >
                ↑
              </button>
              <button
                className="text-xs text-neutral-400 hover:text-white px-1"
                onClick={(e) => { e.stopPropagation(); movePull(pull.id, 1); }}
                title="Move down"
              >
                ↓
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
