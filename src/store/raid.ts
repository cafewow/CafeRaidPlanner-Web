import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RAIDS, BOSS_SLUG_TO_ID } from "../data/raids";
import type { Pack, NpcCount } from "../data/types";
import { usePreset } from "./preset";

// User edits to a raid's pack list, stored as a delta against the in-code seed
// so that ship-side seed changes reach existing users without a cache clear.
//  - added:    user-created packs (typically id < 1000)
//  - patches:  per-field overrides to seed packs (keyed by seed pack id)
//  - deleted:  seed pack ids the user removed
type RaidOverrides = {
  added: Pack[];
  patches: Record<number, Partial<Pack>>;
  deleted: number[];
};

const emptyOverrides = (): RaidOverrides => ({ added: [], patches: {}, deleted: [] });

type State = {
  editMode: boolean;
  selectedPackId: number | null;
  patrolEditingPackId: number | null;

  // Derived view: seed + overrides per raid. Never mutated directly — rebuilt
  // from `overrides` after every action so consumers can keep reading `packs`
  // as before.
  packs: Record<string, Pack[]>;
  overrides: Record<string, RaidOverrides>;

  setEditMode: (v: boolean) => void;
  selectPack: (id: number | null) => void;
  setPatrolEditingPackId: (id: number | null) => void;

  addPack: (raidId: string, x: number, y: number) => number;
  updatePack: (raidId: string, packId: number, patch: Partial<Omit<Pack, "id">>) => void;
  duplicatePack: (raidId: string, packId: number) => number | null;
  deletePack: (raidId: string, packId: number) => void;
  resetPacks: (raidId: string) => void;
  setAllPacks: (raidId: string, packs: Pack[]) => void;

  addPatrolPoint: (raidId: string, packId: number, x: number, y: number) => void;
  removePatrolPoint: (raidId: string, packId: number, idx: number) => void;
  clearPatrolPath: (raidId: string, packId: number) => void;
};

const seedPacks = (raidId: string): Pack[] => {
  const raid = RAIDS[raidId];
  if (!raid) return [];
  return JSON.parse(JSON.stringify(raid.packs));
};

const seedById = (raidId: string): Map<number, Pack> => {
  const m = new Map<number, Pack>();
  for (const p of seedPacks(raidId)) m.set(p.id, p);
  return m;
};

// Compose the visible pack list for a raid from its seed + overrides. Patch
// keys override seed fields; `deleted` ids are dropped; `added` are appended.
const composePacks = (raidId: string, ov: RaidOverrides): Pack[] => {
  const seed = seedPacks(raidId);
  const deleted = new Set(ov.deleted);
  const out: Pack[] = [];
  for (const sp of seed) {
    if (deleted.has(sp.id)) continue;
    const patch = ov.patches[sp.id];
    out.push(patch ? { ...sp, ...patch } : sp);
  }
  out.push(...ov.added);
  return out;
};

const composeAll = (
  overrides: Record<string, RaidOverrides>,
): Record<string, Pack[]> => {
  const out: Record<string, Pack[]> = {};
  for (const id of Object.keys(RAIDS)) {
    out[id] = composePacks(id, overrides[id] ?? emptyOverrides());
  }
  return out;
};

// Deep-equal good enough for Pack field comparison — same JSON shape both sides.
const eq = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

// Build a minimal patch capturing only fields where `pack` differs from `seed`.
const diffPack = (seed: Pack, pack: Pack): Partial<Pack> => {
  const patch: Partial<Pack> = {};
  const keys: (keyof Pack)[] = [
    "name", "x", "y", "members", "icon", "encounterId", "slug", "patrolPath", "variable",
  ];
  for (const k of keys) {
    if (!eq(seed[k], pack[k])) (patch as Record<string, unknown>)[k] = pack[k];
  }
  return patch;
};

// Convert a full pack list back into overrides against the current seed. Used
// by setAllPacks (bulk import) and by the v3→v4 persisted-state migration.
const overridesFromPacks = (raidId: string, packs: Pack[]): RaidOverrides => {
  const seed = seedById(raidId);
  const added: Pack[] = [];
  const patches: Record<number, Partial<Pack>> = {};
  const present = new Set<number>();
  for (const p of packs) {
    const sp = seed.get(p.id);
    if (!sp) {
      added.push(p);
    } else {
      present.add(p.id);
      const patch = diffPack(sp, p);
      if (Object.keys(patch).length > 0) patches[p.id] = patch;
    }
  }
  const deleted = [...seed.keys()].filter((id) => !present.has(id));
  return { added, patches, deleted };
};

// Apply a partial patch to a single pack inside `overrides`. If the pack is in
// the seed, accumulate the change into `patches[id]` (collapsing back to no
// entry when the result matches the seed). If user-added, mutate `added`.
const applyPackPatch = (
  raidId: string,
  ov: RaidOverrides,
  packId: number,
  patch: Partial<Omit<Pack, "id">>,
): RaidOverrides => {
  const seed = seedById(raidId);
  const sp = seed.get(packId);
  if (sp) {
    const merged = { ...sp, ...ov.patches[packId], ...patch };
    const next = diffPack(sp, merged);
    const patches = { ...ov.patches };
    if (Object.keys(next).length === 0) delete patches[packId];
    else patches[packId] = next;
    return { ...ov, patches };
  }
  const added = ov.added.map((p) => (p.id === packId ? { ...p, ...patch } : p));
  return { ...ov, added };
};

const initialOverrides = (): Record<string, RaidOverrides> =>
  Object.fromEntries(Object.keys(RAIDS).map((id) => [id, emptyOverrides()]));

// Wrap a mutation that returns the next overrides for one raid, and refresh
// the derived `packs[raidId]` in the same set. Keeps actions short and
// guarantees the two never drift.
const withRaid = (
  raidId: string,
  fn: (ov: RaidOverrides) => RaidOverrides,
) => (s: State): Partial<State> => {
  const ov = s.overrides[raidId] ?? emptyOverrides();
  const next = fn(ov);
  return {
    overrides: { ...s.overrides, [raidId]: next },
    packs: { ...s.packs, [raidId]: composePacks(raidId, next) },
  };
};

export const useRaid = create<State>()(
  persist(
    (set) => {
      const overrides = initialOverrides();
      return {
        editMode: false,
        selectedPackId: null,
        patrolEditingPackId: null,
        overrides,
        packs: composeAll(overrides),

        setEditMode: (v) =>
          set({ editMode: v, selectedPackId: null, patrolEditingPackId: null }),
        selectPack: (id) => set({ selectedPackId: id, patrolEditingPackId: null }),
        setPatrolEditingPackId: (id) => set({ patrolEditingPackId: id }),

        addPack: (raidId, x, y) => {
          let newId = 0;
          set((s) => {
            const list = s.packs[raidId] ?? [];
            // Keep user packs in 1..999 to avoid colliding with the boss range.
            const maxUser = list.reduce(
              (m, p) => (p.id < 1000 && p.id > m ? p.id : m),
              0,
            );
            newId = maxUser + 1;
            const newPack: Pack = { id: newId, name: `Pack ${newId}`, x, y, members: [] };
            const update = withRaid(raidId, (ov) => ({ ...ov, added: [...ov.added, newPack] }))(s);
            return { ...update, selectedPackId: newId };
          });
          return newId;
        },

        updatePack: (raidId, packId, patch) =>
          set(withRaid(raidId, (ov) => applyPackPatch(raidId, ov, packId, patch))),

        duplicatePack: (raidId, packId) => {
          let newId: number | null = null;
          set((s) => {
            const list = s.packs[raidId] ?? [];
            const src = list.find((p) => p.id === packId);
            if (!src) return s;
            const maxUser = list.reduce(
              (m, p) => (p.id < 1000 && p.id > m ? p.id : m),
              0,
            );
            newId = maxUser + 1;
            const base = src.name.replace(/ \(\d+\)$/, "");
            let n = 2;
            while (list.some((p) => p.name === `${base} (${n})`)) n++;
            const copy: Pack = {
              ...src,
              id: newId,
              // Duplicating a boss should yield a plain pack, not another boss entry.
              slug: undefined,
              icon: undefined,
              encounterId: undefined,
              name: `${base} (${n})`,
              x: src.x + 30,
              y: src.y + 30,
              members: src.members.map((m: NpcCount) => ({ ...m })),
            };
            const update = withRaid(raidId, (ov) => ({ ...ov, added: [...ov.added, copy] }))(s);
            return { ...update, selectedPackId: newId };
          });
          return newId;
        },

        deletePack: (raidId, packId) => {
          set((s) => {
            const update = withRaid(raidId, (ov) => {
              const seed = seedById(raidId);
              if (seed.has(packId)) {
                const patches = { ...ov.patches };
                delete patches[packId];
                return {
                  ...ov,
                  patches,
                  deleted: ov.deleted.includes(packId) ? ov.deleted : [...ov.deleted, packId],
                };
              }
              return { ...ov, added: ov.added.filter((p) => p.id !== packId) };
            })(s);
            return {
              ...update,
              selectedPackId: s.selectedPackId === packId ? null : s.selectedPackId,
              patrolEditingPackId:
                s.patrolEditingPackId === packId ? null : s.patrolEditingPackId,
            };
          });
          usePreset.getState().removePackFromAllPulls(packId);
        },

        resetPacks: (raidId) =>
          set((s) => ({ ...withRaid(raidId, () => emptyOverrides())(s), selectedPackId: null })),

        setAllPacks: (raidId, packs) =>
          set((s) => ({
            ...withRaid(raidId, () => overridesFromPacks(raidId, packs))(s),
            selectedPackId: null,
          })),

        addPatrolPoint: (raidId, packId, x, y) =>
          set((s) => {
            const cur = (s.packs[raidId] ?? []).find((p) => p.id === packId);
            if (!cur) return s;
            const patrolPath = [...(cur.patrolPath ?? []), { x: Math.round(x), y: Math.round(y) }];
            return withRaid(raidId, (ov) => applyPackPatch(raidId, ov, packId, { patrolPath }))(s);
          }),

        removePatrolPoint: (raidId, packId, idx) =>
          set((s) => {
            const cur = (s.packs[raidId] ?? []).find((p) => p.id === packId);
            if (!cur) return s;
            const patrolPath = (cur.patrolPath ?? []).filter((_, i) => i !== idx);
            return withRaid(raidId, (ov) => applyPackPatch(raidId, ov, packId, { patrolPath }))(s);
          }),

        clearPatrolPath: (raidId, packId) =>
          set(withRaid(raidId, (ov) => applyPackPatch(raidId, ov, packId, { patrolPath: [] }))),
      };
    },
    {
      name: "caferaidplanner.raid.v1",
      version: 4,
      // Persist only the deltas + UI flags. `packs` is derived and recomputed
      // from seed on rehydrate; persisting it would defeat the whole point.
      partialize: (s) => ({
        overrides: s.overrides,
        editMode: s.editMode,
        selectedPackId: s.selectedPackId,
        patrolEditingPackId: s.patrolEditingPackId,
      }) as unknown as State,
      migrate: (persisted, fromVersion) => {
        const p = persisted as {
          packs?: Record<string, Pack[]>;
          overrides?: Record<string, RaidOverrides>;
          bosses?: Record<string, Array<{ id: string; x: number; y: number }>>;
        };
        // v1 → v2: Boss gained npcId.
        // v2 → v3: Bosses merged into packs. Drop the separate `bosses` array;
        // for each stored boss try to preserve x/y by matching slug against the
        // canonical boss pack from the seed and taking its id.
        if (fromVersion < 3 && p?.bosses) {
          for (const raidId of Object.keys(p.bosses)) {
            const userBosses = p.bosses[raidId] ?? [];
            const seedAll = seedPacks(raidId);
            const bossSeedBySlug = new Map<string, Pack>();
            for (const sp of seedAll) if (sp.slug) bossSeedBySlug.set(sp.slug, sp);
            const bossPacks: Pack[] = [];
            for (const ub of userBosses) {
              const seed = bossSeedBySlug.get(ub.id);
              if (seed) bossPacks.push({ ...seed, x: ub.x, y: ub.y });
            }
            const userPacks = (p.packs?.[raidId] ?? []).filter(
              (pk) => typeof pk.id === "number" && pk.id < 1000,
            );
            if (!p.packs) p.packs = {};
            p.packs[raidId] = [...userPacks, ...bossPacks];
          }
          delete p.bosses;
        }
        // v3 → v4: stop persisting the full `packs` map; diff it against the
        // current seed to extract just the user's deltas. After this, code
        // changes to seed packs propagate to existing users automatically.
        if (fromVersion < 4) {
          const overrides: Record<string, RaidOverrides> = {};
          for (const raidId of Object.keys(RAIDS)) {
            overrides[raidId] = overridesFromPacks(raidId, p.packs?.[raidId] ?? []);
          }
          p.overrides = overrides;
          delete p.packs;
        }
        return persisted as State;
      },
      // partialize drops `packs`, so on rehydrate we rebuild it from overrides.
      // Also backfill any raid the user has never opened.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const overrides: Record<string, RaidOverrides> = { ...(state.overrides ?? {}) };
        for (const id of Object.keys(RAIDS)) {
          if (!overrides[id]) overrides[id] = emptyOverrides();
        }
        state.overrides = overrides;
        state.packs = composeAll(overrides);
      },
    }
  )
);

// Module-level stable empty sentinel — avoids `?? []` producing a fresh array
// every call, which would break Zustand's referential-equality short-circuit
// and trigger spurious re-renders for raids that aren't in state.
const EMPTY_PACKS: Pack[] = [];
export const selectPacksForRaid = (raidId: string) => (s: State) => s.packs[raidId] ?? EMPTY_PACKS;

// Re-export so call sites have a single source.
export { BOSS_SLUG_TO_ID };
