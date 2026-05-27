import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RAIDS, BOSS_SLUG_TO_ID, SEED_VERSION } from "../data/raids";
import type { Pack } from "../data/types";
import { usePreset } from "./preset";

type State = {
  editMode: boolean;
  selectedPackId: number | null;
  // Pack id whose patrol path is being authored. While set, map clicks append
  // a waypoint to that pack instead of creating a new pack. Independent from
  // selectedPackId so the inspector stays open while authoring.
  patrolEditingPackId: number | null;

  // Single source of truth. Bosses are just packs with an icon/slug set.
  packs: Record<string, Pack[]>;

  // SEED_VERSION at the time packs were last persisted. When code ships a new
  // SEED_VERSION, the UI compares this to the current and offers a banner to
  // reset pack data. The user keeps their edits until they explicitly opt in.
  // Acknowledging without resetting bumps this to current and dismisses the
  // banner — the user lives with potentially-out-of-date local edits.
  seedVersion: number;
  // Derived (not persisted) — true between rehydrate and the user's choice.
  seedOutdated: boolean;

  setEditMode: (v: boolean) => void;
  selectPack: (id: number | null) => void;
  setPatrolEditingPackId: (id: number | null) => void;

  addPack: (raidId: string, x: number, y: number) => number;
  updatePack: (raidId: string, packId: number, patch: Partial<Omit<Pack, "id">>) => void;
  duplicatePack: (raidId: string, packId: number) => number | null;
  deletePack: (raidId: string, packId: number) => void;
  resetPacks: (raidId: string) => void;
  resetAllPacks: () => void;
  setAllPacks: (raidId: string, packs: Pack[]) => void;
  acknowledgeSeedVersion: () => void;

  addPatrolPoint: (raidId: string, packId: number, x: number, y: number) => void;
  removePatrolPoint: (raidId: string, packId: number, idx: number) => void;
  clearPatrolPath: (raidId: string, packId: number) => void;
};

const seedPacks = (raidId: string): Pack[] => {
  const raid = RAIDS[raidId];
  if (!raid) return [];
  return JSON.parse(JSON.stringify(raid.packs));
};

const allSeedPacks = (): Record<string, Pack[]> =>
  Object.fromEntries(Object.keys(RAIDS).map((id) => [id, seedPacks(id)]));

export const useRaid = create<State>()(
  persist(
    (set) => ({
      editMode: false,
      selectedPackId: null,
      patrolEditingPackId: null,
      packs: allSeedPacks(),
      seedVersion: SEED_VERSION,
      seedOutdated: false,

      setEditMode: (v) =>
        set({ editMode: v, selectedPackId: null, patrolEditingPackId: null }),
      selectPack: (id) => set({ selectedPackId: id, patrolEditingPackId: null }),
      setPatrolEditingPackId: (id) => set({ patrolEditingPackId: id }),

      addPack: (raidId, x, y) => {
        let newId = 0;
        set((s) => {
          const list = s.packs[raidId] ?? [];
          // User packs live in ids 1..999; bosses in 1001+. Make sure new
          // packs don't step into the boss range, which could clobber a seed.
          const maxUser = list.reduce(
            (m, p) => (p.id < 1000 && p.id > m ? p.id : m),
            0,
          );
          newId = maxUser + 1;
          const newPack: Pack = {
            id: newId,
            name: `Pack ${newId}`,
            x,
            y,
            members: [],
          };
          return {
            packs: { ...s.packs, [raidId]: [...list, newPack] },
            selectedPackId: newId,
          };
        });
        return newId;
      },

      updatePack: (raidId, packId, patch) =>
        set((s) => ({
          packs: {
            ...s.packs,
            [raidId]: (s.packs[raidId] ?? []).map((p) =>
              p.id === packId ? { ...p, ...patch } : p,
            ),
          },
        })),

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
            // Drop slug/icon/encounterId on duplicates — duplicating a boss
            // shouldn't produce a second "boss" entry, just a regular pack
            // with the same mob list. User can rename and re-assign.
            slug: undefined,
            icon: undefined,
            encounterId: undefined,
            name: `${base} (${n})`,
            x: src.x + 30,
            y: src.y + 30,
            members: src.members.map((m) => ({ ...m })),
          };
          return {
            packs: { ...s.packs, [raidId]: [...list, copy] },
            selectedPackId: newId,
          };
        });
        return newId;
      },

      deletePack: (raidId, packId) => {
        set((s) => ({
          packs: {
            ...s.packs,
            [raidId]: (s.packs[raidId] ?? []).filter((p) => p.id !== packId),
          },
          selectedPackId: s.selectedPackId === packId ? null : s.selectedPackId,
          patrolEditingPackId:
            s.patrolEditingPackId === packId ? null : s.patrolEditingPackId,
        }));
        usePreset.getState().removePackFromAllPulls(packId);
      },

      resetPacks: (raidId) =>
        set((s) => ({
          packs: { ...s.packs, [raidId]: seedPacks(raidId) },
          selectedPackId: null,
        })),

      // Full reset across every raid. Used by the seed-outdated banner.
      // Also bumps seedVersion and dismisses the banner.
      resetAllPacks: () =>
        set({
          packs: allSeedPacks(),
          selectedPackId: null,
          patrolEditingPackId: null,
          seedVersion: SEED_VERSION,
          seedOutdated: false,
        }),

      // User opted to keep their local edits despite an outdated seed.
      // Bumps seedVersion so the banner doesn't re-appear next session.
      acknowledgeSeedVersion: () =>
        set({ seedVersion: SEED_VERSION, seedOutdated: false }),

      setAllPacks: (raidId, packs) =>
        set((s) => ({
          packs: { ...s.packs, [raidId]: packs },
          selectedPackId: null,
        })),

      addPatrolPoint: (raidId, packId, x, y) =>
        set((s) => ({
          packs: {
            ...s.packs,
            [raidId]: (s.packs[raidId] ?? []).map((p) =>
              p.id === packId
                ? { ...p, patrolPath: [...(p.patrolPath ?? []), { x: Math.round(x), y: Math.round(y) }] }
                : p,
            ),
          },
        })),

      removePatrolPoint: (raidId, packId, idx) =>
        set((s) => ({
          packs: {
            ...s.packs,
            [raidId]: (s.packs[raidId] ?? []).map((p) =>
              p.id === packId
                ? { ...p, patrolPath: (p.patrolPath ?? []).filter((_, i) => i !== idx) }
                : p,
            ),
          },
        })),

      clearPatrolPath: (raidId, packId) =>
        set((s) => ({
          packs: {
            ...s.packs,
            [raidId]: (s.packs[raidId] ?? []).map((p) =>
              p.id === packId ? { ...p, patrolPath: [] } : p,
            ),
          },
        })),
    }),
    {
      name: "caferaidplanner.raid.v1",
      version: 5,
      partialize: (s) => ({
        // seedOutdated is derived on rehydrate; never persist.
        editMode: s.editMode,
        selectedPackId: s.selectedPackId,
        patrolEditingPackId: s.patrolEditingPackId,
        packs: s.packs,
        seedVersion: s.seedVersion,
      }) as unknown as State,
      // v1 → v2: Boss gained npcId.
      // v2 → v3: Bosses merged into packs. Drop the separate `bosses` array;
      // for each stored boss we try to preserve its x/y by matching slug
      // against the canonical boss pack from ssc.ts and taking its id.
      // v3 → v4: brief overrides-based experiment (reverted in v5).
      // v4 → v5: revert to packs map; introduce seedVersion. v4's overrides
      // get expanded back to a packs list using current seed + patches.
      migrate: (persisted, fromVersion) => {
        const p = persisted as {
          packs?: Record<string, Pack[]>;
          bosses?: Record<string, Array<{ id: string; x: number; y: number }>>;
          overrides?: Record<string, {
            added?: Pack[];
            patches?: Record<number, Partial<Pack>>;
            deleted?: number[];
          }>;
          seedVersion?: number;
        };
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
        // v4 had `overrides` (added/patches/deleted) instead of packs. Expand
        // it back: start from the current seed minus deleted, apply patches,
        // append added. This carries user edits forward but uses the *current*
        // seed as the base, so seed updates after v4 reach the user. The
        // seedVersion banner gives them a chance to wipe edits if they want.
        if (fromVersion < 5 && p.overrides) {
          const restored: Record<string, Pack[]> = {};
          for (const raidId of Object.keys(RAIDS)) {
            const ov = p.overrides[raidId] ?? { added: [], patches: {}, deleted: [] };
            const deleted = new Set(ov.deleted ?? []);
            const seed = seedPacks(raidId);
            const list: Pack[] = [];
            for (const sp of seed) {
              if (deleted.has(sp.id)) continue;
              const patch = ov.patches?.[sp.id];
              list.push(patch ? { ...sp, ...patch } : sp);
            }
            if (ov.added) list.push(...ov.added);
            restored[raidId] = list;
          }
          p.packs = restored;
          delete p.overrides;
        }
        return persisted as State;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Backfill raids the user has never opened (added to RAIDS after
        // their last session) and flag the banner if the stored seed version
        // is behind the current code.
        const next = { ...state.packs };
        let changed = false;
        for (const id of Object.keys(RAIDS)) {
          if (!next[id]) {
            next[id] = seedPacks(id);
            changed = true;
          }
        }
        if (changed) state.packs = next;
        const stored = typeof state.seedVersion === "number" ? state.seedVersion : 0;
        state.seedOutdated = stored < SEED_VERSION;
      },
    },
  ),
);

// Module-level stable empty sentinel — avoids `?? []` producing a fresh array
// every call, which would break Zustand's referential-equality short-circuit
// and trigger spurious re-renders for raids that aren't in state.
const EMPTY_PACKS: Pack[] = [];
export const selectPacksForRaid = (raidId: string) => (s: State) => s.packs[raidId] ?? EMPTY_PACKS;

// Re-export so call sites have a single source.
export { BOSS_SLUG_TO_ID };
