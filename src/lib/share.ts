import pako from "pako";
import type { Preset } from "../store/preset";
import type { Pack } from "../data/types";
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

const VERSION = 3;

export type ShareEnvelope = {
  v: number;
  preset: Preset;
  packs: Pack[];
  // name lookup for npcIds referenced by packs — lets the addon show real
  // mob names in its kill-progress display. Optional; missing on legacy strings.
  npcNames?: Record<string, string>;
};

function collectNpcNames(packs: Pack[]): Record<string, string> {
  const out: Record<string, string> = {};
  // Packs now include bosses — a boss is just a pack whose members list is
  // [{npcId: <boss>, count: 1}], so this loop picks up both.
  for (const pack of packs) {
    for (const m of pack.members) {
      const npc = NPC_BY_ID.get(m.npcId);
      if (npc?.name && !out[String(m.npcId)]) {
        out[String(m.npcId)] = npc.name;
      }
    }
    // Boss packs have an authoritative name on the pack itself (e.g. "Hydross
    // the Unstable") even when the npc isn't in the scraped db for some reason.
    if (pack.slug) {
      const npcId = pack.members[0]?.npcId;
      if (npcId && !out[String(npcId)]) out[String(npcId)] = pack.name;
    }
  }
  return out;
}

export function exportShare(preset: Preset, packs: Pack[]): string {
  const payload: ShareEnvelope = {
    v: VERSION,
    preset,
    packs,
    npcNames: collectNpcNames(packs),
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
  // v1 had per-player assignment shape; drop them silently.
  if (parsed.v === 1) {
    (parsed.preset.pulls as { assignments: unknown[] }[]).forEach((p) => { p.assignments = []; });
    parsed.v = 2;
  }
  // v2 had a separate bosses array + pull.bossId. v3 bakes bosses into packs.
  // Map the old bossId into the pull's packIds using the reserved slug→id map
  // (see ssc.ts BOSS_SLUG_TO_ID), then strip the bosses array.
  if (parsed.v === 2) {
    const BOSS_SLUG_TO_ID: Record<string, number> = {
      Hydross: 1001, Lurker: 1002, Leotheras: 1003, FLK: 1004, Morogrim: 1005, Vashj: 1006,
    };
    for (const pull of parsed.preset.pulls as Array<{ packIds: number[]; bossId?: string | null }>) {
      if (pull.bossId) {
        const id = BOSS_SLUG_TO_ID[pull.bossId];
        if (id && !pull.packIds.includes(id)) pull.packIds.push(id);
      }
      delete pull.bossId;
    }
    delete parsed.bosses;
    parsed.v = VERSION;
  }
  if (parsed.v !== VERSION) throw new Error(`Unsupported version ${parsed.v}`);
  return parsed as ShareEnvelope;
}
