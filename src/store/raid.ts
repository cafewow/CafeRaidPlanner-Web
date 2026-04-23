import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RAIDS, BOSS_SLUG_TO_ID } from "../data/ssc";
import type { Pack } from "../data/types";
import { usePreset } from "./preset";

type State = {
  editMode: boolean;
  selectedPackId: number | null;

  // Single source of truth. Bosses are just packs with an icon/slug set.
  packs: Record<string, Pack[]>;

  setEditMode: (v: boolean) => void;
  selectPack: (id: number | null) => void;

  addPack: (raidId: string, x: number, y: number) => number;
  updatePack: (raidId: string, packId: number, patch: Partial<Omit<Pack, "id">>) => void;
  duplicatePack: (raidId: string, packId: number) => number | null;
  deletePack: (raidId: string, packId: number) => void;
  resetPacks: (raidId: string) => void;
  setAllPacks: (raidId: string, packs: Pack[]) => void;
};

const seedPacks = (raidId: string): Pack[] => {
  const raid = RAIDS[raidId];
  if (!raid) return [];
  return JSON.parse(JSON.stringify(raid.packs));
};

export const useRaid = create<State>()(
  persist(
    (set) => ({
      editMode: false,
      selectedPackId: null,
      packs: { SSC: seedPacks("SSC") },

      setEditMode: (v) => set({ editMode: v, selectedPackId: null }),
      selectPack: (id) => set({ selectedPackId: id }),

      addPack: (raidId, x, y) => {
        let newId = 0;
        set((s) => {
          const list = s.packs[raidId] ?? [];
          // User packs live in ids 1..999; bosses in 1001+. Make sure new packs
          // don't step into the boss range, which could clobber a seed lookup.
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
              p.id === packId ? { ...p, ...patch } : p
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
        }));
        usePreset.getState().removePackFromAllPulls(packId);
      },

      resetPacks: (raidId) =>
        set((s) => ({
          packs: { ...s.packs, [raidId]: seedPacks(raidId) },
          selectedPackId: null,
        })),

      setAllPacks: (raidId, packs) =>
        set((s) => ({
          packs: { ...s.packs, [raidId]: packs },
          selectedPackId: null,
        })),
    }),
    {
      name: "caferaidplanner.raid.v1",
      version: 3,
      // v1 → v2: Boss gained npcId.
      // v2 → v3: Bosses merged into packs. Drop the separate `bosses` array;
      // for each stored boss we try to preserve its x/y by matching slug
      // against the canonical boss pack from ssc.ts and taking its id.
      migrate: (persisted, fromVersion) => {
        const p = persisted as {
          packs?: Record<string, Pack[]>;
          bosses?: Record<string, Array<{ id: string; x: number; y: number }>>;
        };
        if (fromVersion < 3 && p?.bosses) {
          for (const raidId of Object.keys(p.bosses)) {
            const userBosses = p.bosses[raidId] ?? [];
            const seedAll = seedPacks(raidId);          // already includes boss packs
            // Build a slug→seed lookup for the target raid's boss packs.
            const bossSeedBySlug = new Map<string, Pack>();
            for (const sp of seedAll) {
              if (sp.slug) bossSeedBySlug.set(sp.slug, sp);
            }
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
        return persisted as State;
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
