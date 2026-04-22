import type { Boss } from "../data/types";

type Props = {
  boss: Boss;
  assigned: boolean;        // boss is set on the current pull
  assignedColor?: string;   // color of the pull that has this boss assigned
  editSelected: boolean;    // highlighted in edit mode
  onClick: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
};

export function BossIcon({ boss, assigned, assignedColor, editSelected, onClick, onMouseDown }: Props) {
  const borderColor =
    editSelected ? "#fff"
    : assigned    ? (assignedColor ?? "#fff")
    : "rgba(0,0,0,0.7)";
  return (
    <button
      data-boss
      onMouseDown={onMouseDown}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      title={boss.name}
      className="absolute rounded-full overflow-hidden border-2 shadow-md cursor-pointer hover:brightness-110"
      style={{
        left: boss.x,
        top: boss.y,
        width: 28,
        height: 28,
        transform: "translate(-50%, -50%)",
        borderColor,
        boxShadow: editSelected ? "0 0 0 3px rgba(255,215,74,0.9)" : undefined,
        backgroundColor: "#000",
      }}
    >
      {boss.icon ? (
        <img
          src={boss.icon}
          alt={boss.name}
          width={28}
          height={28}
          draggable={false}
          className="block w-full h-full object-cover"
        />
      ) : (
        <span className="text-[10px] text-white">{boss.id}</span>
      )}
    </button>
  );
}
