import { useEffect, useRef, useState } from "react";
import { RAIDS } from "../data/ssc";
import { usePreset, selectCurrentPull } from "../store/preset";
import { useRaid, selectPacksForRaid } from "../store/raid";
import { PackBlip } from "./PackBlip";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

export function MapView() {
  const raidId = usePreset((s) => s.raidId);
  const preset = usePreset((s) => s.preset);
  const currentPull = selectCurrentPull({ preset });
  const togglePackInPull = usePreset((s) => s.togglePackInCurrentPull);
  const addPull = usePreset((s) => s.addPull);

  const packs = useRaid(selectPacksForRaid(raidId));
  const editMode = useRaid((s) => s.editMode);
  const selectedPackId = useRaid((s) => s.selectedPackId);
  const selectPack = useRaid((s) => s.selectPack);
  const addPack = useRaid((s) => s.addPack);
  const updatePack = useRaid((s) => s.updatePack);

  const raid = RAIDS[raidId];
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const panDrag = useRef<{ active: boolean; startX: number; startY: number; panX: number; panY: number; moved: boolean }>({
    active: false, startX: 0, startY: 0, panX: 0, panY: 0, moved: false,
  });
  const blipDrag = useRef<{ active: boolean; packId: number; downX: number; downY: number; moved: boolean }>({
    active: false, packId: 0, downX: 0, downY: 0, moved: false,
  });

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const fit = Math.min(vp.clientWidth / raid.mapWidth, vp.clientHeight / raid.mapHeight);
    setZoom(fit);
    setPan({
      x: (vp.clientWidth - raid.mapWidth * fit) / 2,
      y: (vp.clientHeight - raid.mapHeight * fit) / 2,
    });
  }, [raidId, raid.mapWidth, raid.mapHeight]);

  const screenToMap = (clientX: number, clientY: number) => {
    const vp = viewportRef.current;
    if (!vp) return { x: 0, y: 0 };
    const rect = vp.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    const actualFactor = newZoom / zoom;
    setZoom(newZoom);
    setPan((p) => ({
      x: cx - (cx - p.x) * actualFactor,
      y: cy - (cy - p.y) * actualFactor,
    }));
  };

  const onViewportMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-blip]")) return;
    panDrag.current = { active: true, startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y, moved: false };
  };

  const onViewportClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-blip]")) return;
    if (panDrag.current.moved) return;
    if (!editMode) {
      selectPack(null);
      return;
    }
    const { x, y } = screenToMap(e.clientX, e.clientY);
    if (x < 0 || y < 0 || x > raid.mapWidth || y > raid.mapHeight) return;
    addPack(raidId, Math.round(x), Math.round(y));
  };

  const onBlipMouseDown = (e: React.MouseEvent, packId: number) => {
    if (e.button !== 0) return;
    if (!editMode) return;
    e.stopPropagation();
    blipDrag.current = { active: true, packId, downX: e.clientX, downY: e.clientY, moved: false };
  };

  const onBlipClick = (packId: number, e: React.MouseEvent) => {
    if (editMode) {
      if (blipDrag.current.moved) return;
      selectPack(packId);
    } else {
      if (e.ctrlKey || e.metaKey) addPull();
      togglePackInPull(packId);
    }
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (panDrag.current.active) {
        const dx = e.clientX - panDrag.current.startX;
        const dy = e.clientY - panDrag.current.startY;
        if (!panDrag.current.moved && dx * dx + dy * dy > 9) panDrag.current.moved = true;
        setPan({ x: panDrag.current.panX + dx, y: panDrag.current.panY + dy });
      }
      if (blipDrag.current.active) {
        const dx = e.clientX - blipDrag.current.downX;
        const dy = e.clientY - blipDrag.current.downY;
        if (!blipDrag.current.moved && dx * dx + dy * dy > 9) {
          blipDrag.current.moved = true;
        }
        if (blipDrag.current.moved) {
          const { x, y } = screenToMap(e.clientX, e.clientY);
          updatePack(raidId, blipDrag.current.packId, { x: Math.round(x), y: Math.round(y) });
        }
      }
    };
    const onUp = () => {
      panDrag.current.active = false;
      blipDrag.current.active = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [raidId, updatePack, pan.x, pan.y, zoom]);

  const packToPull = new globalThis.Map<number, { color: string; index: number; pullId: string }>();
  preset.pulls.forEach((pull, i) => {
    pull.packIds.forEach((pid) => packToPull.set(pid, { color: pull.color, index: i + 1, pullId: pull.id }));
  });

  // Render icon-packs (bosses) before regular blips so trash overlaps boss
  // portraits visually — clicks still hit whichever pixel is topmost.
  const iconPacks = packs.filter((p) => p.icon);
  const plainPacks = packs.filter((p) => !p.icon);

  const renderBlip = (pack: (typeof packs)[number]) => {
    const own = packToPull.get(pack.id);
    const inCurrentPull = currentPull && own?.pullId === currentPull.id;
    const selected = editMode && selectedPackId === pack.id;
    return (
      <PackBlip
        key={pack.id}
        pack={pack}
        color={editMode ? (selected ? "#ffd54a" : "#9ca3af") : own?.color}
        pullIndex={editMode || pack.icon ? undefined : own?.index}
        selected={editMode ? selected : !!inCurrentPull}
        onMouseDown={(e) => onBlipMouseDown(e, pack.id)}
        onClick={(e) => onBlipClick(pack.id, e)}
      />
    );
  };

  return (
    <div
      ref={viewportRef}
      className={`relative w-full h-full overflow-hidden select-none bg-neutral-950 ${
        editMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
      }`}
      onWheel={onWheel}
      onMouseDown={onViewportMouseDown}
      onClick={onViewportClick}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width: raid.mapWidth,
          height: raid.mapHeight,
        }}
      >
        <img
          src={raid.mapImage}
          alt={raid.name}
          width={raid.mapWidth}
          height={raid.mapHeight}
          draggable={false}
          className="block absolute inset-0"
        />
        {iconPacks.map(renderBlip)}
        {plainPacks.map(renderBlip)}
      </div>

      <div className="absolute bottom-3 right-3 text-xs bg-black/70 px-2 py-1 rounded pointer-events-none">
        {Math.round(zoom * 100)}%
      </div>

      {editMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-900/80 text-amber-100 text-xs px-3 py-1 rounded pointer-events-none">
          Edit mode — click empty map to add a pack, drag to move, click to select
        </div>
      )}
    </div>
  );
}
