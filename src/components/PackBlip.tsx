import type { Pack } from "../data/types";
import { NPC_BY_ID } from "../data/npcs";

type Props = {
  pack: Pack;
  color: string | undefined;
  pullIndex: number | undefined;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export function PackBlip({ pack, color, pullIndex, selected, onClick, onMouseDown, onMouseEnter, onMouseLeave }: Props) {
  const bg = color ?? "#525252";
  const label = pack.members.length === 0 ? "?" : pack.members.reduce((a, m) => a + m.count, 0);
  const memberLines = pack.members.length === 0
    ? "(no mobs assigned)"
    : pack.members
        .map((m) => {
          const name = NPC_BY_ID.get(m.npcId)?.name ?? `npc #${m.npcId}`;
          return `${m.count}x ${name}`;
        })
        .join("\n");
  if (pack.icon) {
    return (
      <button
        data-blip
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={(e) => { e.stopPropagation(); onClick(e); }}
        title={`${pack.name}\n${memberLines}`}
        className="absolute rounded-full overflow-hidden border-2 shadow-md cursor-pointer hover:brightness-110"
        style={{
          left: pack.x,
          top: pack.y,
          width: 28,
          height: 28,
          transform: "translate(-50%, -50%)",
          backgroundColor: bg,
          borderColor: selected ? "#fff" : color ?? "rgba(0,0,0,0.7)",
          boxShadow: selected ? "0 0 0 3px rgba(255,215,74,0.9)" : undefined,
        }}
      >
        <img src={pack.icon} alt={pack.name} className="w-full h-full object-cover pointer-events-none" draggable={false} />
      </button>
    );
  }
  return (
    <button
      data-blip
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      title={`${pack.name}\n${memberLines}`}
      className="absolute rounded-full border-2 flex items-center justify-center text-[9px] font-bold text-black shadow-md cursor-pointer hover:brightness-110"
      style={{
        left: pack.x,
        top: pack.y,
        width: 16,
        height: 16,
        transform: "translate(-50%, -50%)",
        backgroundColor: bg,
        borderColor: selected ? "#fff" : "rgba(0,0,0,0.7)",
        boxShadow: selected ? "0 0 0 3px rgba(255,215,74,0.9)" : undefined,
      }}
    >
      {pullIndex ?? label}
    </button>
  );
}
