import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RAIDS } from "../data/ssc";
import type { Boss, Pack } from "../data/types";
import { usePreset } from "./preset";

type State = {
  editMode: boolean;
  selectedPackId: number | null;

  // Packs per raid. Seeded from static RAIDS data; user edits override it.
  packs: Record<string, Pack[]>;
  // Bosses per raid. Same pattern — seeded from ssc.ts, positions editable.
  bosses: Record<string, Boss[]>;

  setEditMode: (v: boolean) => void;
  selectPack: (id: number | null) => void;

  addPack: (raidId: string, x: number, y: number) => number;
  updatePack: (raidId: string, packId: number, patch: Partial<Omit<Pack, "id">>) => void;
  duplicatePack: (raidId: string, packId: number) => number | null;
  deletePack: (raidId: string, packId: number) => void;
  resetPacks: (raidId: string) => void;
  setAllPacks: (raidId: string, packs: Pack[]) => void;

  updateBoss: (raidId: string, bossId: string, patch: Partial<Omit<Boss, "id">>) => void;
  resetBosses: (raidId: string) => void;
  setAllBosses: (raidId: string, bosses: Boss[]) => void;
};

const seedPacks = (raidId: string): Pack[] => {
  const raid = RAIDS[raidId];
  if (!raid) return [];
  return JSON.parse(JSON.stringify(raid.packs));
};

const seedBosses = (raidId: string): Boss[] => {
  const raid = RAIDS[raidId];
  if (!raid) return [];
  return JSON.parse(JSON.stringify(raid.bosses));
};

export const useRaid = create<State>()(
  persist(
    (set) => ({
      editMode: false,
      selectedPackId: null,
      packs: { SSC: seedPacks("SSC") },
      bosses: { SSC: seedBosses("SSC") },

      setEditMode: (v) => set({ editMode: v, selectedPackId: null }),
      selectPack: (id) => set({ selectedPackId: id }),

      addPack: (raidId, x, y) => {
        let newId = 0;
        set((s) => {
          const list = s.packs[raidId] ?? [];
          newId = list.length === 0 ? 1 : Math.max(...list.map((p) => p.id)) + 1;
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
          newId = Math.max(...list.map((p) => p.id), 0) + 1;
          // Append a (N) suffix so duplicates don't share a display name.
          const base = src.name.replace(/ \(\d+\)$/, "");
          let n = 2;
          while (list.some((p) => p.name === `${base} (${n})`)) n++;
          const copy: Pack = {
            ...src,
            id: newId,
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
        // Cascade: strip this pack from any pull that referenced it.
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

      updateBoss: (raidId, bossId, patch) =>
        set((s) => ({
          bosses: {
            ...s.bosses,
            [raidId]: (s.bosses[raidId] ?? []).map((b) =>
              b.id === bossId ? { ...b, ...patch } : b
            ),
          },
        })),

      resetBosses: (raidId) =>
        set((s) => ({
          bosses: { ...s.bosses, [raidId]: seedBosses(raidId) },
        })),

      setAllBosses: (raidId, bosses) =>
        set((s) => ({
          bosses: { ...s.bosses, [raidId]: bosses },
        })),
    }),
    {
      name: "caferaidplanner.raid.v1",
      version: 2,
      // v1 → v2: Boss type gained npcId. Old persisted entries lack it,
      // which shows up as "npc undefined" in pull contents. Merge seed
      // definitions over what's stored, preserving x/y edits.
      migrate: (persisted, fromVersion) => {
        const p = persisted as { bosses?: Record<string, Boss[]> };
        if (fromVersion < 2 && p?.bosses) {
          for (const raidId of Object.keys(p.bosses)) {
            const seed = seedBosses(raidId);
            const existing = p.bosses[raidId] ?? [];
            p.bosses[raidId] = seed.map((s) => {
              const e = existing.find((b) => b.id === s.id);
              return e ? { ...s, x: e.x, y: e.y } : s;
            });
          }
        }
        return persisted as State;
      },
    }
  )
);

export const selectPacksForRaid = (raidId: string) => (s: State) => s.packs[raidId] ?? [];
export const selectBossesForRaid = (raidId: string) => (s: State) => s.bosses[raidId] ?? [];
