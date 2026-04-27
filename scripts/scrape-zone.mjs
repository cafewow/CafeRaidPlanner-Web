#!/usr/bin/env node
// Scrape a WoWhead zone page into the npcs JSON shape consumed by
// src/data/<raid>-npcs.json.
//
// Usage:
//   node scripts/scrape-zone.mjs --zone 3607 --out src/data/ssc-npcs.json
//   node scripts/scrape-zone.mjs --zone 3845 --out src/data/tk-npcs.json --game tbc
//
// What's scraped:
//   1. Zone roster: the zone page (on the chosen --game site, default tbc) embeds
//      a Listview with template "npc"; its `data:[...]` array carries
//      id/name/tag/classification/type/boss for every mob in the zone.
//   2. Abilities: by default we then fetch each NPC's RETAIL wowhead page
//      (wowhead.com/npc=<id>) and extract the `id:'abilities'` Listview's
//      data array. Retail pages embed this server-side; the TBC site does not.
//      Pass --no-abilities to skip and emit empty `abilities: []` like before.
//
// Why retail for abilities:
//   The TBC NPC pages don't ship the abilities tab in their static HTML — it
//   loads via XHR we'd have to reverse. The retail (live) site does ship it
//   inline. For TBC raid bosses the spell IDs are the same, so the data is
//   directly usable. For NPCs reused in later expansions you may see extra
//   spells; spot-check important entries.
//
// Re-run safety:
//   When --out points at an existing file, NPCs that already have a non-empty
//   `abilities` array are preserved as-is (your hand-curation wins). Pass
//   --force to overwrite all entries with freshly scraped data.
//
// CloudFront in front of WoWhead blocks scripty UAs outright (403). A normal
// Chrome UA + Sec-Fetch-* headers passes. Initial zone URL 301s to the slug
// form, but fetch() follows.

import fs from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const args = { game: "tbc", abilities: true, force: false, delayMs: 250 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--zone") args.zone = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--game") args.game = argv[++i];
    else if (a === "--no-abilities") args.abilities = false;
    else if (a === "--force") args.force = true;
    else if (a === "--delay") args.delayMs = Number(argv[++i]);
    else if (a === "--help" || a === "-h") {
      console.log(
        "scrape-zone.mjs --zone <id> --out <path> [--game tbc|era|wotlk] [--no-abilities] [--force] [--delay ms]",
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

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Upgrade-Insecure-Requests": "1",
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Find the start of `data:` for a Listview matching `predicate(headerText)`,
// then bracket-balance the array literal. Returns the raw slice or null.
function findListviewDataSlice(html, predicate) {
  const re = /Listview\(\{([^}]{0,400})/g;
  let m;
  while ((m = re.exec(html))) {
    if (!predicate(m[1])) continue;
    const dataIdx = html.indexOf("data:", m.index);
    if (dataIdx < 0) continue;
    const lbracket = html.indexOf("[", dataIdx);
    if (lbracket < 0) continue;
    let depth = 0,
      inStr = false,
      strQuote = null,
      escape = false,
      end = -1;
    for (let i = lbracket; i < html.length; i++) {
      const c = html[i];
      if (inStr) {
        if (escape) {
          escape = false;
          continue;
        }
        if (c === "\\") {
          escape = true;
          continue;
        }
        if (c === strQuote) {
          inStr = false;
          strQuote = null;
        }
        continue;
      }
      if (c === '"' || c === "'") {
        inStr = true;
        strQuote = c;
        continue;
      }
      if (c === "[" || c === "{") depth++;
      else if (c === "]" || c === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end >= 0) return html.slice(lbracket, end + 1);
  }
  return null;
}

// JS-literal eval. Wowhead's listview data is a superset of JSON (bare-key
// object literals like `modes:{mode:[4]}`), so JSON.parse won't work. The
// payload comes from a build-time scrape we already trust to run.
function evalJsLiteral(slice) {
  return Function(`"use strict"; return (${slice});`)();
}

function extractZoneNpcs(html) {
  const slice = findListviewDataSlice(
    html,
    (header) => /template:\s*['"]npc['"]/.test(header),
  );
  if (!slice) {
    throw new Error("no npc listview found on zone page (wowhead layout changed?)");
  }
  return evalJsLiteral(slice);
}

function extractAbilities(html) {
  const slice = findListviewDataSlice(
    html,
    (header) =>
      /template:\s*['"]spell['"]/.test(header) &&
      /id:\s*['"]abilities['"]/.test(header),
  );
  if (!slice) return [];
  const arr = evalJsLiteral(slice);
  return arr
    .map((s) => ({
      id: s.id,
      name: s.name ?? s.displayName ?? null,
      schools: s.schools ?? 0,
    }))
    .filter((s) => typeof s.id === "number");
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

async function readExisting(outPath) {
  try {
    const raw = await fs.readFile(outPath, "utf8");
    const arr = JSON.parse(raw);
    const map = new Map();
    for (const n of arr) if (typeof n.id === "number") map.set(n.id, n);
    return map;
  } catch {
    return new Map();
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const zoneBase = `https://www.wowhead.com/${args.game}`;

  console.error(`fetching zone ${args.zone} from ${zoneBase} …`);
  const zoneHtml = await fetchText(`${zoneBase}/zone=${args.zone}`);
  const npcData = extractZoneNpcs(zoneHtml);
  const roster = npcData
    .map(normalizeNpc)
    .filter((n) => typeof n.id === "number");

  const existing = args.force ? new Map() : await readExisting(args.out);

  const out = [];
  for (let i = 0; i < roster.length; i++) {
    const n = roster[i];
    const prior = existing.get(n.id);
    const keepPrior =
      !args.force && prior && Array.isArray(prior.abilities) && prior.abilities.length > 0;

    let abilities = [];
    if (keepPrior) {
      abilities = prior.abilities;
    } else if (args.abilities) {
      try {
        const npcHtml = await fetchText(`https://www.wowhead.com/npc=${n.id}`);
        abilities = extractAbilities(npcHtml);
        console.error(
          `  [${i + 1}/${roster.length}] ${n.id} ${n.name} → ${abilities.length} abilities`,
        );
      } catch (e) {
        console.error(`  [${i + 1}/${roster.length}] ${n.id} ${n.name} → fetch failed: ${e.message}`);
      }
      if (args.delayMs > 0) await sleep(args.delayMs);
    }

    out.push({ ...n, abilities });
  }

  await fs.mkdir(path.dirname(args.out), { recursive: true });
  await fs.writeFile(args.out, JSON.stringify(out, null, 2) + "\n");

  const withAbilities = out.filter((n) => n.abilities.length > 0).length;
  console.error(
    `wrote ${out.length} npcs (${withAbilities} with abilities) → ${args.out}`,
  );
  if (!args.abilities) {
    console.error("note: --no-abilities used; ability lists are empty.");
  }
}

main().catch((e) => {
  console.error(e.stack || e.message || String(e));
  process.exit(1);
});
