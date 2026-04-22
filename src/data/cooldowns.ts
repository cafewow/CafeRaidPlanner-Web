export type CooldownKind = "spell" | "item";

export type Cooldown = {
  kind: CooldownKind;
  id: number;
  name: string;
  category: string; // used for grouping in the picker
};

// Hand-curated list of raid-relevant TBC cooldowns and consumables.
// IDs are the highest rank TBC typically runs with, so Wowhead tooltips resolve cleanly.
// If you need something not in this list, the picker lets you paste a raw ID or wowhead URL.
export const COOLDOWNS: Cooldown[] = [
  // -------- Class CDs --------
  { kind: "spell", id: 12292, name: "Death Wish", category: "Warrior" },
  { kind: "spell", id: 1719, name: "Recklessness", category: "Warrior" },
  { kind: "spell", id: 871, name: "Shield Wall", category: "Warrior" },
  { kind: "spell", id: 12975, name: "Last Stand", category: "Warrior" },

  { kind: "spell", id: 642, name: "Divine Shield", category: "Paladin" },
  { kind: "spell", id: 498, name: "Divine Protection", category: "Paladin" },
  { kind: "spell", id: 633, name: "Lay on Hands", category: "Paladin" },
  { kind: "spell", id: 31884, name: "Avenging Wrath", category: "Paladin" },

  { kind: "spell", id: 19574, name: "Bestial Wrath", category: "Hunter" },
  { kind: "spell", id: 23989, name: "Readiness", category: "Hunter" },
  { kind: "spell", id: 34477, name: "Misdirection", category: "Hunter" },
  { kind: "spell", id: 3045, name: "Rapid Fire", category: "Hunter" },

  { kind: "spell", id: 13877, name: "Blade Flurry", category: "Rogue" },
  { kind: "spell", id: 13750, name: "Adrenaline Rush", category: "Rogue" },
  { kind: "spell", id: 26669, name: "Evasion", category: "Rogue" },
  { kind: "spell", id: 1856, name: "Vanish", category: "Rogue" },

  { kind: "spell", id: 10060, name: "Power Infusion", category: "Priest" },
  { kind: "spell", id: 33206, name: "Pain Suppression", category: "Priest" },
  { kind: "spell", id: 6346, name: "Fear Ward", category: "Priest" },
  { kind: "spell", id: 34433, name: "Shadowfiend", category: "Priest" },

  { kind: "spell", id: 2825, name: "Bloodlust", category: "Shaman" },
  { kind: "spell", id: 32182, name: "Heroism", category: "Shaman" },
  { kind: "spell", id: 16188, name: "Nature's Swiftness", category: "Shaman" },
  { kind: "spell", id: 8177, name: "Grounding Totem", category: "Shaman" },

  { kind: "spell", id: 12472, name: "Icy Veins", category: "Mage" },
  { kind: "spell", id: 12042, name: "Arcane Power", category: "Mage" },
  { kind: "spell", id: 45438, name: "Ice Block", category: "Mage" },
  { kind: "spell", id: 12051, name: "Evocation", category: "Mage" },

  { kind: "spell", id: 18708, name: "Fel Domination", category: "Warlock" },
  { kind: "spell", id: 29858, name: "Soulshatter", category: "Warlock" },
  { kind: "spell", id: 17928, name: "Howl of Terror", category: "Warlock" },

  { kind: "spell", id: 29166, name: "Innervate", category: "Druid" },
  { kind: "spell", id: 740, name: "Tranquility", category: "Druid" },
  {
    kind: "spell",
    id: 22842,
    name: "Frenzied Regeneration",
    category: "Druid",
  },
  { kind: "spell", id: 22812, name: "Barkskin", category: "Druid" },
  { kind: "spell", id: 17116, name: "Nature's Swiftness", category: "Druid" },

  // -------- Consumables --------
  { kind: "item", id: 22838, name: "Haste Potion", category: "Potion" },
  { kind: "item", id: 22839, name: "Destruction Potion", category: "Potion" },
  { kind: "item", id: 22849, name: "Ironshield Potion", category: "Potion" },
  {
    kind: "item",
    id: 22828,
    name: "Insane Strength Potion",
    category: "Potion",
  },
  { kind: "item", id: 12217, name: "Dragonbreath Chili", category: "Potion" },
  { kind: "item", id: 22829, name: "Super Healing Potion", category: "Potion" },
  { kind: "item", id: 22832, name: "Super Mana Potion", category: "Potion" },
  { kind: "item", id: 31677, name: "Fel Mana Potion", category: "Potion" },
  { kind: "item", id: 5634, name: "Free Action Potion", category: "Potion" },
  { kind: "item", id: 20008, name: "Living Action Potion", category: "Potion" },

  // -------- Engineering --------
  {
    kind: "item",
    id: 23827,
    name: "Super Sapper Charge",
    category: "Engineering",
  },
  {
    kind: "item",
    id: 10646,
    name: "Goblin Sapper Charge",
    category: "Engineering",
  },
  {
    kind: "item",
    id: 23737,
    name: "Adamantite Grenade",
    category: "Engineering",
  },

  // -------- Equip (gear swaps — Rocket Boots, parachute, swap trinkets, etc) --------
  { kind: "item", id: 23824, name: "Rocket Boots Xtreme",       category: "Equip" },
  { kind: "item", id: 35581, name: "Rocket Boots Xtreme Lite",  category: "Equip" },
  { kind: "item", id: 7189,  name: "Goblin Rocket Boots",       category: "Equip" },
  { kind: "item", id: 10724, name: "Gnomish Rocket Boots",      category: "Equip" },
  { kind: "item", id: 2820,  name: "Nifty Stopwatch",           category: "Equip" },
  { kind: "item", id: 4984,  name: "Skull of Impending Doom",   category: "Equip" },
  { kind: "item", id: 10577, name: "Goblin Mortar",             category: "Equip" },
  { kind: "item", id: 10725, name: "Gnomish Battle Chicken",    category: "Equip" },
  { kind: "item", id: 4397,  name: "Gnomish Cloaking Device",   category: "Equip" },

  // -------- Drums (LW) --------
  { kind: "item", id: 29529, name: "Drums of Battle", category: "Drums" },
  { kind: "item", id: 29531, name: "Drums of Restoration", category: "Drums" },
  { kind: "item", id: 29528, name: "Drums of War", category: "Drums" },
  { kind: "item", id: 29530, name: "Drums of Speed", category: "Drums" },
  { kind: "item", id: 29532, name: "Drums of Panic", category: "Drums" },
];

export const COOLDOWN_BY_KEY: globalThis.Map<string, Cooldown> =
  new globalThis.Map(COOLDOWNS.map((c) => [`${c.kind}:${c.id}`, c]));

export function lookupCooldown(
  kind: CooldownKind,
  id: number,
): Cooldown | undefined {
  return COOLDOWN_BY_KEY.get(`${kind}:${id}`);
}

// Parse a pasted wowhead URL or raw ID string into a provisional {kind,id}.
// When the input is just a number, the `defaultKind` disambiguates between
// spell/item (an equip-scope picker passes "item", a CD picker passes "spell").
// Returns null if the input isn't recognizable.
export function parseCooldownRef(
  input: string,
  defaultKind: CooldownKind = "spell",
): { kind: CooldownKind; id: number } | null {
  const s = input.trim();
  if (!s) return null;
  const pureNum = /^\d+$/.test(s) ? Number(s) : null;
  if (pureNum !== null && pureNum > 0) return { kind: defaultKind, id: pureNum };
  const m = s.match(/wowhead\.com(?:\/[\w-]+)?\/(spell|item)=(\d+)/i);
  if (m) return { kind: m[1].toLowerCase() as CooldownKind, id: Number(m[2]) };
  return null;
}
