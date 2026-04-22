# CafeRaidPlanner (web)

MDT-style raid cooldown / route planner for TBC. Browser app: drop pack
blips on the map, assign cooldowns / consumables / equip swaps /
reminders per pull, export a `crp1.…` paste-string for the
[companion addon](https://github.com/cafewow/CafeRaidPlanner).

Live at **https://cafewow.github.io/CafeRaidPlanner-Web/**.

## Development

```
npm install
npm run dev
```

Opens at `http://localhost:5173/` (dev uses `base: "/"` so there's no repo
path prefix to worry about locally).

## Build

```
npm run build
```

Outputs to `dist/`. The `base` path matches the GitHub Pages repo URL
(`/CafeRaidPlanner-Web/`) — to deploy at a different path set `BASE_URL`
when running build.

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` builds on every push to `main` and deploys
via the first-party `actions/deploy-pages` flow. One-time setup: **repo
Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Data model

- Seed data (`src/data/ssc.ts`, `src/data/ssc-npcs.json`, boss icons in
  `public/icons/bosses/`) is bundled into the build. Every visitor starts
  from the same canonical layout.
- User edits (pack moves, new packs, pulls, assignments) persist to
  `localStorage` under `caferaidplanner.*` keys — private to the browser,
  no server.
- **Reset packs** / **Reset bosses** in edit-mode header restores the
  seed. When the seed shape changes (e.g. adding a field to Boss), bump
  the matching zustand `persist` version in `src/store/*.ts` and add a
  `migrate` clause so visitors don't end up with stale state. The pattern
  is set up — see the v1→v2 boss `npcId` migration for an example.

## Sharing format

`crp1.<base64url(deflate(JSON))>`. JSON shape is `{ v, preset, packs,
bosses?, npcNames? }` defined in `src/lib/share.ts`. The addon decodes the
same string (rxi `json.lua` + `LibDeflate` + a base64url decoder).

## Layout

```
CafeRaidPlanner-Web/
├── index.html                        power.js tooltip widget loaded here
├── vite.config.ts                    base path for Pages
├── src/
│   ├── App.tsx                       header + split panes
│   ├── components/
│   │   ├── MapView.tsx               tile map, pan/zoom, pack/boss rendering
│   │   ├── PackBlip.tsx  BossIcon.tsx
│   │   ├── PackInspector.tsx         edit-mode right pane for packs
│   │   ├── PullList.tsx PullEditor.tsx AssignmentRow.tsx
│   │   ├── CooldownPicker.tsx        typeahead (cooldown | equip scope)
│   │   ├── NpcSearch.tsx             mob typeahead for pack inspector
│   │   ├── AbilityList.tsx MobList.tsx
│   │   ├── ShareDialog.tsx PackIO.tsx
│   │   └── Sidebar.tsx
│   ├── data/
│   │   ├── ssc.ts                    raid + boss + seed packs
│   │   ├── ssc-npcs.json             scraped WoWhead: npcId → name + abilities
│   │   ├── cooldowns.ts              curated TBC cooldowns + consumables + equips
│   │   └── npcs.ts types.ts
│   ├── store/
│   │   ├── preset.ts                 pulls + assignments + current pull
│   │   └── raid.ts                   packs + bosses + edit mode
│   └── lib/share.ts                  crp1.… encode/decode
└── public/
    ├── maps/ssc.webp                 1000x667 world-map crop
    └── icons/bosses/*.png            38px boss portraits
```
