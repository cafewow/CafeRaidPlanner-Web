import { useMemo, useState } from "react";
import { NPCS, type Npc } from "../data/npcs";

type Props = {
  onPick: (npc: Npc) => void;
  placeholder?: string;
};

export function NpcSearch({ onPick, placeholder }: Props) {
  const [q, setQ] = useState("");

  const { matches, rawIdFallback } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return { matches: [] as Npc[], rawIdFallback: null as number | null };
    const scored = NPCS.map((n) => {
      const name = n.name.toLowerCase();
      const tag = (n.tag ?? "").toLowerCase();
      const idStr = String(n.id);
      let score = 0;
      if (name === needle) score = 100;
      else if (name.startsWith(needle)) score = 80;
      else if (name.includes(needle)) score = 60;
      else if (tag.includes(needle)) score = 40;
      else if (idStr.includes(needle)) score = 30;
      return { n, score };
    }).filter((x) => x.score > 0);
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 8).map((x) => x.n);

    // If the needle is a pure number and no exact-ID match found, offer a raw-ID
    // fallback so any mob (e.g. outside SSC) can still be added for testing.
    const asInt = /^\d+$/.test(needle) ? Number(needle) : NaN;
    const rawFallback = Number.isFinite(asInt) && asInt > 0 && !top.some((n) => n.id === asInt)
      ? asInt
      : null;
    return { matches: top, rawIdFallback: rawFallback };
  }, [q]);

  const pickRaw = (id: number) => {
    onPick({ id, name: `npc #${id}`, tag: null, classification: 0, boss: false, type: 0 });
    setQ("");
  };

  const showDropdown = matches.length > 0 || rawIdFallback !== null;

  return (
    <div className="relative">
      <input
        autoFocus
        className="w-full bg-neutral-800 rounded px-2 py-1 text-xs outline-none"
        placeholder={placeholder ?? "Search mob name or id..."}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {showDropdown && (
        <ul className="absolute left-0 right-0 top-full mt-1 bg-neutral-800 rounded shadow-lg border border-neutral-700 z-10 max-h-56 overflow-auto">
          {matches.map((n) => (
            <li
              key={n.id}
              className="px-2 py-1 text-xs hover:bg-neutral-700 cursor-pointer flex items-center gap-2"
              onClick={() => { onPick(n); setQ(""); }}
            >
              <span className="text-neutral-500 tabular-nums w-12">{n.id}</span>
              <span className="flex-1 truncate">{n.name}</span>
              {n.tag && <span className="text-neutral-500 truncate">{"<"}{n.tag}{">"}</span>}
              {n.boss && <span className="text-amber-400 text-[10px]">BOSS</span>}
            </li>
          ))}
          {rawIdFallback !== null && (
            <li
              className="px-2 py-1 text-xs hover:bg-neutral-700 cursor-pointer flex items-center gap-2 border-t border-neutral-700 text-neutral-300"
              onClick={() => pickRaw(rawIdFallback)}
            >
              <span className="text-neutral-500 tabular-nums w-12">{rawIdFallback}</span>
              <span className="flex-1 italic">Use npc #{rawIdFallback} (not in SSC db)</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
