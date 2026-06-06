import { usePreset, selectCurrentPreset } from "../store/preset";
import type { DrawTool } from "./MapDrawLayer";

// Annotation palette. White last so it reads on the dark map.
export const DRAW_COLORS = ["#ff5555", "#ffd54a", "#7fd9ff", "#7fff7f", "#ff7fe0", "#ffffff"];
export const DRAW_WIDTH = 3;

const TOOLS: { key: Exclude<DrawTool, null>; label: string; title: string }[] = [
  { key: "select", label: "⬚", title: "Select / move — drag to move, Del deletes, Esc deselects" },
  { key: "arrow", label: "↗", title: "Arrow" },
  { key: "rect", label: "▭", title: "Rectangle" },
  { key: "ellipse", label: "◯", title: "Circle / oval" },
  { key: "freehand", label: "✎", title: "Freehand pen" },
];

type Props = {
  tool: DrawTool;
  setTool: (t: DrawTool) => void;
  color: string;
  setColor: (c: string) => void;
};

export function DrawToolbar({ tool, setTool, color, setColor }: Props) {
  const clearDrawings = usePreset((s) => s.clearDrawings);
  const count = (usePreset(selectCurrentPreset).drawings ?? []).length;

  return (
    <div className="absolute top-3 right-3 flex items-center gap-2 bg-neutral-900/90 border border-neutral-700 rounded px-2 py-1">
      {TOOLS.map((t) => (
        <button
          key={t.key}
          title={t.title}
          onClick={() => setTool(tool === t.key ? null : t.key)}
          className={`w-6 h-6 rounded flex items-center justify-center text-sm leading-none ${
            tool === t.key ? "bg-sky-600 text-white" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
          }`}
        >
          {t.label}
        </button>
      ))}
      <div className="w-px h-5 bg-neutral-700" />
      {DRAW_COLORS.map((c) => (
        <button
          key={c}
          title={c}
          onClick={() => setColor(c)}
          className={`w-4 h-4 rounded-full border ${color === c ? "border-white scale-110" : "border-neutral-600"}`}
          style={{ backgroundColor: c }}
        />
      ))}
      <div className="w-px h-5 bg-neutral-700" />
      <button
        className="text-xs px-2 py-0.5 rounded bg-neutral-800 hover:bg-red-800 text-red-300 disabled:opacity-40"
        disabled={count === 0}
        onClick={() => {
          if (confirm(`Clear all ${count} drawing${count === 1 ? "" : "s"} on this route?`)) clearDrawings();
        }}
      >
        Clear
      </button>
    </div>
  );
}
