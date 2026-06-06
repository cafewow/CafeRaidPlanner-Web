import type { RevealTrigger } from "../store/preset";

type Props = {
  value: RevealTrigger | undefined;
  onChange: (v: RevealTrigger | undefined) => void;
};

// Compact per-assignment reveal-trigger control. "Always" clears the trigger;
// the other modes show a single number input (seconds / percent). Defaults are
// chosen so a freshly-picked mode is immediately valid.
const DEFAULTS: Record<RevealTrigger["type"], RevealTrigger> = {
  time: { type: "time", afterSec: 30 },
  bossPct: { type: "bossPct", below: 30 },
};

export function RevealPicker({ value, onChange }: Props) {
  const mode = value?.type ?? "always";

  return (
    <span className="flex items-center gap-1 shrink-0" title="When this shows up in the HUD">
      <select
        className="bg-neutral-800 rounded px-1 py-0.5 text-[11px] outline-none text-neutral-300"
        value={mode}
        onChange={(e) => {
          const m = e.target.value;
          onChange(m === "always" ? undefined : DEFAULTS[m as RevealTrigger["type"]]);
        }}
      >
        <option value="always">⏱ Always</option>
        <option value="time">After…</option>
        <option value="bossPct">Boss ≤…</option>
      </select>

      {value?.type === "time" && (
        <span className="flex items-center gap-0.5">
          <input
            type="number"
            min={0}
            className="w-12 bg-neutral-800 rounded px-1 py-0.5 text-[11px] outline-none tabular-nums"
            value={value.afterSec}
            onChange={(e) =>
              onChange({ type: "time", afterSec: Math.max(0, Number(e.target.value) || 0) })
            }
          />
          <span className="text-[10px] text-neutral-500">s</span>
        </span>
      )}

      {value?.type === "bossPct" && (
        <span className="flex items-center gap-0.5">
          <input
            type="number"
            min={1}
            max={100}
            className="w-12 bg-neutral-800 rounded px-1 py-0.5 text-[11px] outline-none tabular-nums"
            value={value.below}
            onChange={(e) => {
              const n = Number(e.target.value) || 0;
              onChange({ type: "bossPct", below: Math.min(100, Math.max(1, n)) });
            }}
          />
          <span className="text-[10px] text-neutral-500">%</span>
        </span>
      )}
    </span>
  );
}
