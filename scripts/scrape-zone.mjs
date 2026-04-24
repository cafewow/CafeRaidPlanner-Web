#!/usr/bin/env node
// Scrape a WoWhead TBC zone page into the npcs JSON shape consumed by
// src/data/<raid>-npcs.json.
//
// Usage:
//   node scripts/scrape-zone.mjs --zone 3607 --out src/data/ssc-npcs.json
//   node scripts/scrape-zone.mjs --zone 3715 --out src/data/tk-npcs.json --game tbc
//
// Strategy:
//   1. Fetch /tbc/zone=<id>. The page embeds a Listview with template "npc" —
//      its `data:[...]` array is valid JSON carrying id/name/classification/
//      type/boss for every mob in the zone.
//   2. For each npc, fetch /tbc/npc=<id>. Its ability tab embeds a Listview
//      with template "spell" whose `data:` gives {id, name, schools}.
//
// Fragile on WoWhead redesigns by design — we only re-run when adding new
// content, and the output is a committed JSON, so breakage is a one-time fix.

import fs from "node:fs/promises";
import path from "node:path";

const ABILITY_SCHOOLS = { physical: 1, holy: 2, fire: 4, nature: 8, frost: 16, shadow: 32, arcane: 64 };

function parseArgs(argv) {
  const args = { game: "tbc", delayMs: 120 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--zone") args.zone = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--game") args.game = argv[++i];
    else if (a === "--delay") args.delayMs = Number(argv[++i]);
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--help" || a === "-h") {
      console.log(
        "scrape-zone.mjs --zone <id> --out <path> [--game tbc|era|wotlk] [--delay ms] [--limit n]",
      );
      process.exit(0);
    }
  }
  if (!args.zone || !args.out) {
    console.error("error: --zone and --out are required");
    process.exit(1);
  }
  return args;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "CafeRaidPlanner/0.1 (scrape-zone.mjs)" },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

// Pull every `new Listview({...})` call out of a wowhead page. Returns an
// array of parsed objects with fields like { template, id, data, ... }.
function extractListviews(html) {
  const views = [];
  // Match `new Listview({` ... up to matching `});`. Balance braces because
  // the payload contains nested objects/strings with `}`.
  const re = /new\s+Listview\s*\(\s*(\{)/g;
  let m;
  while ((m = re.exec(html))) {
    const start = m.index + m[0].length - 1; // position of opening `{`
    let depth = 0;
    let inStr = false;
    let strQuote = null;
    let escape = false;
    let end = -1;
    for (let i = start; i < html.length; i++) {
      const c = html[i];
      if (inStr) {
        if (escape) { escape = false; continue; }
        if (c === "\\") { escape = true; continue; }
        if (c === strQuote) { inStr = false; strQuote = null; }
        continue;
      }
      if (c === '"' || c === "'") { inStr = true; strQuote = c; continue; }
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end < 0) continue;
    const body = html.slice(start, end + 1);
    // The body is JS, not JSON — keys are unquoted, strings may use single
    // quotes, and there can be trailing commas. Normalize enough to JSON.parse.
    const jsonish = body
      // quote unquoted object keys: {foo: -> {"foo":
      .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
      // single-quoted strings → double-quoted (handling escaped quotes)
      .replace(/'((?:\\.|[^'\\])*)'/g, (_, inner) => `"${inner.replace(/"/g, '\\"')}"`)
      // trailing commas
      .replace(/,(\s*[}\]])/g, "$1");
    try {
      views.push(JSON.parse(jsonish));
    } catch {
      // Some listviews embed function refs or other JS we can't parse. Skip
      // them — we only care about npc/spell templates which are pure data.
    }
  }
  return views;
}

function findListview(views, template, idHint) {
  return views.find((v) => v && v.template === template && (!idHint || v.id === idHint));
}

function normalizeNpc(entry) {
  return {
    id: entry.id,
    name: entry.name ?? null,
    tag: entry.tag ?? null,
    classification: entry.classification ?? 0,
    boss: Boolean(entry.classification === 3 || entry.boss || entry.israidboss),
    type: entry.type ?? 0,
  };
}

function normalizeAbility(entry) {
  // Wowhead listview spell entries carry `schools` as a bitmask on TBC pages.
  // Older/other pages sometimes use `school` string; map if present.
  let schools = typeof entry.schools === "number" ? entry.schools : null;
  if (schools == null && typeof entry.school === "string") {
    schools = 0;
    for (const s of entry.school.toLowerCase().split(/[\s,]+/)) {
      if (ABILITY_SCHOOLS[s]) schools |= ABILITY_SCHOOLS[s];
    }
  }
  return { id: entry.id, name: entry.name ?? null, schools: schools ?? null };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = parseArgs(process.argv);
  const base = `https://www.wowhead.com/${args.game}`;

  console.error(`fetching zone ${args.zone} from ${base} …`);
  const zoneHtml = await fetchText(`${base}/zone=${args.zone}`);
  const zoneViews = extractListviews(zoneHtml);
  const npcView = findListview(zoneViews, "npc");
  if (!npcView || !Array.isArray(npcView.data)) {
    throw new Error("no npc listview found on zone page (wowhead layout changed?)");
  }
  let npcs = npcView.data.map(normalizeNpc).filter((n) => typeof n.id === "number");
  console.error(`found ${npcs.length} npcs`);
  if (args.limit) npcs = npcs.slice(0, args.limit);

  const out = [];
  for (let i = 0; i < npcs.length; i++) {
    const npc = npcs[i];
    process.stderr.write(`  [${i + 1}/${npcs.length}] npc=${npc.id} ${npc.name ?? ""}\r`);
    try {
      const npcHtml = await fetchText(`${base}/npc=${npc.id}`);
      const views = extractListviews(npcHtml);
      const spellView = findListview(views, "spell");
      const abilities = (spellView?.data ?? [])
        .map(normalizeAbility)
        .filter((a) => typeof a.id === "number");
      out.push({ ...npc, abilities });
    } catch (e) {
      console.error(`\n  warn: npc=${npc.id}: ${e.message}`);
      out.push({ ...npc, abilities: [] });
    }
    await sleep(args.delayMs);
  }
  process.stderr.write("\n");

  await fs.mkdir(path.dirname(args.out), { recursive: true });
  await fs.writeFile(args.out, JSON.stringify(out, null, 2) + "\n");
  console.error(`wrote ${out.length} npcs → ${args.out}`);
}

main().catch((e) => {
  console.error(e.stack || e.message || String(e));
  process.exit(1);
});
