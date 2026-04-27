import { useEffect, useMemo, useRef, useState } from "react";
import { COOLDOWNS, lookupCooldown, parseCooldownRef, type Cooldown, type CooldownKind } from "../data/cooldowns";

export type PickerScope = "cooldown" | "equip" | "kick";

type Props = {
  kind: CooldownKind;
  id: number | null;
  onPick: (kind: CooldownKind, id: number) => void;
  // "cooldown": hides Equip-category entries (default).
  // "equip":    shows only Equip-category entries; raw-ID fallback defaults to item.
  scope?: PickerScope;
  placeholder?: string;
};

// Tiny dropdown-picker. Shows the current selection as a wowhead-tooltipped link
// (power.js renders the icon and name); click to open a search panel.
export function CooldownPicker({ kind, id, onPick, scope = "cooldown", placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Power.js refresh when selection changes so a freshly-picked link gets the icon.
  useEffect(() => {
    (window as unknown as { $WowheadPower?: { refreshLinks?: () => void } })
      .$WowheadPower?.refreshLinks?.();
  }, [kind, id]);

  const selected: Cooldown | null = id != null ? (lookupCooldown(kind, id) ?? { kind, id, name: `#${id}`, category: "Custom" }) : null;

  // Filter COOLDOWNS to the scope the picker is running in.
  const scoped = useMemo(() => {
    if (scope === "equip") return COOLDOWNS.filter((c) => c.category === "Equip");
    if (scope === "kick") return COOLDOWNS.filter((c) => c.category === "Interrupt");
    return COOLDOWNS.filter((c) => c.category !== "Equip");
  }, [scope]);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return scoped.slice(0, 50);
    // Raw-ID fallback defaults to item when we're in the equip scope.
    const ref = parseCooldownRef(q, scope === "equip" ? "item" : "spell");
    const scored = scoped.map((c) => {
      const n = c.name.toLowerCase();
      let score = 0;
      if (n === needle) score = 100;
      else if (n.startsWith(needle)) score = 80;
      else if (n.includes(needle)) score = 60;
      else if (c.category.toLowerCase().includes(needle)) score = 30;
      else if (String(c.id).includes(needle)) score = 20;
      return { c, score };
    }).filter((x) => x.score > 0);
    scored.sort((a, b) => b.score - a.score);
    const list = scored.slice(0, 20).map((x) => x.c);
    if (ref && !list.some((c) => c.kind === ref.kind && c.id === ref.id)) {
      list.unshift({ kind: ref.kind, id: ref.id, name: `Use ${ref.kind} #${ref.id}`, category: "Custom" });
    }
    return list;
  }, [q, scoped, scope]);

  const pick = (c: Cooldown) => {
    onPick(c.kind, c.id);
    setOpen(false);
    setQ("");
  };

  return (
    <div ref={rootRef} className="relative flex-1 min-w-0">
      <button
        className="w-full bg-neutral-800 rounded px-2 py-1 text-xs text-left truncate hover:bg-neutral-700"
        onClick={() => setOpen((v) => !v)}
        title={selected ? `${selected.name} (${selected.kind} #${selected.id})` : "Click to pick"}
      >
        {selected ? (
          <a
            href={`https://www.wowhead.com/tbc/${selected.kind}=${selected.id}`}
            data-wowhead={`${selected.kind}=${selected.id}&domain=tbc`}
            onClick={(e) => e.preventDefault()}
          >
            {selected.name}
          </a>
        ) : (
          <span className="text-neutral-500 italic">{placeholder ?? "Pick cooldown…"}</span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-[300px] bg-neutral-900 border border-neutral-700 rounded shadow-lg z-20">
          <div className="p-2 border-b border-neutral-800">
            <input
              autoFocus
              className="w-full bg-neutral-800 rounded px-2 py-1 text-xs outline-none"
              placeholder={scope === "equip" ? "Item id or wowhead URL…" : "Name, id, or wowhead URL…"}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <ul className="max-h-72 overflow-auto py-1">
            {matches.length === 0 && (
              <li className="px-3 py-2 text-xs text-neutral-500 italic">
                {scope === "equip"
                  ? "Paste an item id or wowhead URL."
                  : "No matches."}
              </li>
            )}
            {matches.map((c) => (
              <li
                key={`${c.kind}:${c.id}`}
                className="px-3 py-1 hover:bg-neutral-800 cursor-pointer flex items-center gap-2 text-xs"
                onClick={() => pick(c)}
              >
                <span className="text-neutral-500 tabular-nums w-10 text-right">{c.id}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-[10px] text-neutral-500 uppercase">{c.kind}</span>
                <span className="text-[10px] text-neutral-400">{c.category}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
