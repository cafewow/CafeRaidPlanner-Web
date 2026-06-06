import { useEffect, useRef, useState } from "react";
import { usePreset, selectCurrentPreset, type Drawing, type DrawingType } from "../store/preset";

export type DrawTool = DrawingType | "select" | null;

const ARROW_HEAD = 16; // arrowhead length, map px
const rid = () => Math.random().toString(36).slice(2, 10);

type Pt = { x: number; y: number };

type Props = {
  mapWidth: number;
  mapHeight: number;
  tool: DrawTool;
  color: string;
  strokeWidth: number;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  // Reuses MapView's transform-aware conversion so drawings line up with packs.
  screenToMap: (clientX: number, clientY: number) => Pt;
};

// Update the in-progress draft as the cursor moves. Rect/ellipse keep their
// anchor (x,y) and grow w/h (which may go negative mid-drag; normalized on
// commit). Freehand appends points; arrow moves its head.
function updateDraftEnd(d: Drawing, p: Pt): Drawing {
  switch (d.type) {
    case "arrow":
      return { ...d, x2: p.x, y2: p.y };
    case "rect":
    case "ellipse":
      return { ...d, w: p.x - d.x, h: p.y - d.y };
    case "freehand":
      return { ...d, points: [...d.points, p] };
  }
}

// Drop accidental click-without-drag drawings.
function isMeaningful(d: Drawing): boolean {
  switch (d.type) {
    case "arrow":
      return Math.hypot(d.x2 - d.x1, d.y2 - d.y1) > 6;
    case "rect":
    case "ellipse":
      return Math.abs(d.w) > 4 && Math.abs(d.h) > 4;
    case "freehand":
      return d.points.length > 2;
  }
}

// Normalize a box so x,y is the top-left and w,h are positive (stored clean).
function normalize(d: Drawing): Drawing {
  if (d.type === "rect" || d.type === "ellipse") {
    return {
      ...d,
      x: d.w < 0 ? d.x + d.w : d.x,
      y: d.h < 0 ? d.y + d.h : d.y,
      w: Math.abs(d.w),
      h: Math.abs(d.h),
    };
  }
  return d;
}

function Shape({ d, selected, onMouseDown }: { d: Drawing; selected: boolean; onMouseDown?: (e: React.MouseEvent) => void }) {
  const stroke = d.color;
  const sw = d.width;
  const common = {
    onMouseDown,
    style: onMouseDown ? { cursor: "move" as const } : undefined,
    // A selected shape gets a translucent halo via a second wider stroke below.
  };

  const halo = selected ? (
    <ShapeStroke d={d} stroke="#ffffff" width={sw + 6} opacity={0.5} />
  ) : null;

  return (
    <g {...common}>
      {halo}
      <ShapeStroke d={d} stroke={stroke} width={sw} opacity={1} />
    </g>
  );
}

// The actual geometry for a drawing at a given stroke. Split out so the
// selection halo can re-render the same path one size larger.
function ShapeStroke({ d, stroke, width, opacity }: { d: Drawing; stroke: string; width: number; opacity: number }) {
  if (d.type === "arrow") {
    const a = Math.atan2(d.y2 - d.y1, d.x2 - d.x1);
    const left = { x: d.x2 - ARROW_HEAD * Math.cos(a - Math.PI / 6), y: d.y2 - ARROW_HEAD * Math.sin(a - Math.PI / 6) };
    const right = { x: d.x2 - ARROW_HEAD * Math.cos(a + Math.PI / 6), y: d.y2 - ARROW_HEAD * Math.sin(a + Math.PI / 6) };
    return (
      <>
        <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={stroke} strokeWidth={width} strokeLinecap="round" opacity={opacity} />
        <polygon points={`${d.x2},${d.y2} ${left.x},${left.y} ${right.x},${right.y}`} fill={stroke} opacity={opacity} />
      </>
    );
  }
  if (d.type === "rect") {
    const x = d.w < 0 ? d.x + d.w : d.x;
    const y = d.h < 0 ? d.y + d.h : d.y;
    return <rect x={x} y={y} width={Math.abs(d.w)} height={Math.abs(d.h)} fill="none" stroke={stroke} strokeWidth={width} opacity={opacity} />;
  }
  if (d.type === "ellipse") {
    return (
      <ellipse
        cx={d.x + d.w / 2}
        cy={d.y + d.h / 2}
        rx={Math.abs(d.w) / 2}
        ry={Math.abs(d.h) / 2}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        opacity={opacity}
      />
    );
  }
  // freehand
  return (
    <polyline
      points={d.points.map((p) => `${p.x},${p.y}`).join(" ")}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
    />
  );
}

export function MapDrawLayer({ mapWidth, mapHeight, tool, color, strokeWidth, selectedId, setSelectedId, screenToMap }: Props) {
  const preset = usePreset(selectCurrentPreset);
  const drawings = preset.drawings ?? [];
  const addDrawing = usePreset((s) => s.addDrawing);
  const moveDrawing = usePreset((s) => s.moveDrawing);
  const deleteDrawing = usePreset((s) => s.deleteDrawing);

  const [draft, setDraft] = useState<Drawing | null>(null);
  const drag = useRef<{ active: boolean; mode: "create" | "move"; id?: string; last: Pt } | null>(null);

  // Global listeners while dragging — so a draw/move continues even if the
  // cursor leaves the SVG. Created once; reads live state via refs/closures.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const dr = drag.current;
      if (!dr || !dr.active) return;
      const p = screenToMap(e.clientX, e.clientY);
      if (dr.mode === "create") {
        setDraft((cur) => (cur ? updateDraftEnd(cur, p) : cur));
      } else if (dr.id) {
        const dx = p.x - dr.last.x;
        const dy = p.y - dr.last.y;
        if (dx || dy) {
          moveDrawing(dr.id, dx, dy);
          dr.last = p;
        }
      }
    };
    const onUp = () => {
      const dr = drag.current;
      if (dr && dr.active && dr.mode === "create") {
        setDraft((cur) => {
          if (cur && isMeaningful(cur)) addDrawing(normalize(cur));
          return null;
        });
      }
      if (dr) dr.active = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [addDrawing, moveDrawing, screenToMap]);

  // Delete / Escape on the current selection.
  useEffect(() => {
    if (tool !== "select") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
      else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        deleteDrawing(selectedId);
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, selectedId, deleteDrawing, setSelectedId]);

  const startCreate = (e: React.MouseEvent) => {
    if (e.button !== 0 || !tool || tool === "select") return;
    e.stopPropagation();
    const p = screenToMap(e.clientX, e.clientY);
    const base = { id: rid(), color, width: strokeWidth };
    const d: Drawing =
      tool === "arrow" ? { ...base, type: "arrow", x1: p.x, y1: p.y, x2: p.x, y2: p.y }
      : tool === "rect" ? { ...base, type: "rect", x: p.x, y: p.y, w: 0, h: 0 }
      : tool === "ellipse" ? { ...base, type: "ellipse", x: p.x, y: p.y, w: 0, h: 0 }
      : { ...base, type: "freehand", points: [{ x: p.x, y: p.y }] };
    setDraft(d);
    drag.current = { active: true, mode: "create", last: p };
  };

  const startMove = (e: React.MouseEvent, id: string) => {
    if (e.button !== 0 || tool !== "select") return;
    e.stopPropagation();
    setSelectedId(id);
    drag.current = { active: true, mode: "move", id, last: screenToMap(e.clientX, e.clientY) };
  };

  // Capture surface only when a draw tool is active; in select mode the shapes
  // capture instead; with no tool the layer is purely visual (clicks fall
  // through to packs/pan).
  const capturing = !!tool && tool !== "select";

  return (
    <svg
      className="absolute inset-0"
      width={mapWidth}
      height={mapHeight}
      viewBox={`0 0 ${mapWidth} ${mapHeight}`}
      style={{ pointerEvents: capturing ? "auto" : "none", cursor: capturing ? "crosshair" : undefined }}
      onMouseDown={capturing ? startCreate : undefined}
    >
      {capturing && <rect x={0} y={0} width={mapWidth} height={mapHeight} fill="transparent" />}
      {drawings.map((d) => (
        <g key={d.id} style={{ pointerEvents: tool === "select" ? "auto" : "none" }}>
          <Shape d={d} selected={d.id === selectedId} onMouseDown={tool === "select" ? (e) => startMove(e, d.id) : undefined} />
        </g>
      ))}
      {draft && <Shape d={draft} selected={false} />}
    </svg>
  );
}
