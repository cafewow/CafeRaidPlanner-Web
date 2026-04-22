import pako from "pako";
import type { Preset } from "../store/preset";
import type { Boss, Pack } from "../data/types";
import { NPC_BY_ID } from "../data/npcs";

// base64url helpers (URL-safe, no padding).
const toB64url = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};
const fromB64url = (str: string) => {
  const s = str.replaceAll("-", "+").replaceAll("_", "/");
  const padded = s + "===".slice((s.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

const VERSION = 2;

export type ShareEnvelope = {
  v: number;
  preset: Preset;
  packs: Pack[];
  bosses?: Boss[];      // included so the addon can show boss names for pull.bossId
  // name lookup for npcIds referenced by packs — lets the addon show real
  // mob names in its kill-progress display. Optional; missing on legacy strings.
  npcNames?: Record<string, string>;
};

function collectNpcNames(packs: Pack[], bosses?: Boss[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pack of packs) {
    for (const m of pack.members) {
      const npc = NPC_BY_ID.get(m.npcId);
      if (npc?.name && !out[String(m.npcId)]) {
        out[String(m.npcId)] = npc.name;
      }
    }
  }
  // Bosses have their names inline on the definition — use those directly.
  for (const boss of bosses ?? []) {
    if (!out[String(boss.npcId)]) out[String(boss.npcId)] = boss.name;
  }
  return out;
}

export function exportShare(preset: Preset, packs: Pack[], bosses?: Boss[]): string {
  const payload: ShareEnvelope = {
    v: VERSION,
    preset,
    packs,
    bosses,
    npcNames: collectNpcNames(packs, bosses),
  };
  const json = JSON.stringify(payload);
  const deflated = pako.deflate(new TextEncoder().encode(json));
  return `crp1.${toB64url(deflated)}`;
}

export function importShare(str: string): ShareEnvelope {
  const trimmed = str.trim();
  if (!trimmed.startsWith("crp1.")) throw new Error("Not a CafeRaidPlanner string (missing crp1. prefix)");
  const bytes = fromB64url(trimmed.slice("crp1.".length));
  const json = new TextDecoder().decode(pako.inflate(bytes));
  const parsed = JSON.parse(json);
  if (!parsed.preset || !Array.isArray(parsed.packs)) throw new Error("Malformed payload");
  if (parsed.v === 1) {
    // v1 had { player, spellId, note } assignments — drop them.
    (parsed.preset.pulls as { assignments: unknown[] }[]).forEach((p) => { p.assignments = []; });
    parsed.v = VERSION;
  }
  if (parsed.v !== VERSION) throw new Error(`Unsupported version ${parsed.v}`);
  return parsed as ShareEnvelope;
}
