import { useEffect, useRef } from "react";
import type { Ability } from "../data/npcs";
import { schoolsToColors } from "../data/npcs";

declare global {
  interface Window {
    $WowheadPower?: { refreshLinks?: () => void };
  }
}

type Props = { abilities: Ability[] };

export function AbilityList({ abilities }: Props) {
  const containerRef = useRef<HTMLUListElement>(null);

  // Wowhead's power.js iconizes/renames <a href="...wowhead.com/spell=ID"> links on
  // DOMContentLoaded. React-rendered links after that need a manual refresh.
  useEffect(() => {
    window.$WowheadPower?.refreshLinks?.();
  }, [abilities]);

  if (abilities.length === 0) {
    return <div className="text-xs text-neutral-500 italic ml-6">No abilities cataloged.</div>;
  }

  return (
    <ul ref={containerRef} className="ml-6 flex flex-wrap gap-x-3 gap-y-1 items-center">
      {abilities.map((a) => {
        const colors = schoolsToColors(a.schools);
        return (
          <li key={a.id} className="flex items-center gap-1 text-xs whitespace-nowrap">
            <a
              href={`https://www.wowhead.com/tbc/spell=${a.id}`}
              target="_blank"
              rel="noreferrer"
              data-wowhead={`spell=${a.id}&domain=tbc`}
            >
              {a.name}
            </a>
            {colors.length > 0 && (
              <span className="flex gap-[2px] ml-1">
                {colors.map((c, i) => (
                  <span key={i} className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                ))}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
