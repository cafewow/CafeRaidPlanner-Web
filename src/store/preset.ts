import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CooldownKind } from "../data/cooldowns";
import { BOSS_SLUG_TO_ID } from "../data/ssc";

export type AssignmentKind = CooldownKind | "reminder" | "equip";

export type Assignment = {
  kind: AssignmentKind;
  // id: spellId for "spell"; itemId for "item" or "equip"; null for "reminder".
  id: number | null;
  // text is the reminder body for kind "reminder"; ignored otherwise.
  text?: string;
  player: string;     // optional free-text player name; "" = unassigned
  note: string;
};

export type Pull = {
  id: string;
  name: string;
  // Ids of every pack referenced by this pull. Boss packs are ordinary packs
  // with reserved ids (see BOSS_SLUG_TO_ID); there's no separate bossId field.
  packIds: number[];
  note: string;
  color: string;
  assignments: Assignment[];
};

export type Preset = {
  id: string;
  name: string;
  raidId: string;
  pulls: Pull[];
  currentPullId: string;
};

// Pull palette — 20 hues spread by the golden angle (~137.5°) so consecutive
// pulls never get adjacent colors. Saturation/lightness tuned for legibility
// on a dark neutral-950 background. 20 entries is more than most raids have,
// which effectively removes collisions in practical use.
const PALETTE: string[] = Array.from({ length: 20 }, (_, i) => {
  const hue = (i * 137.507764050037) % 360;
  return `hsl(${Math.round(hue)}, 72%, 58%)`;
});

let colorIdx = 0;
const nextColor = () => PALETTE[colorIdx++ % PALETTE.length];

const rid = () => Math.random().toString(36).slice(2, 10);

const emptyPull = (name: string): Pull => ({
  id: rid(),
  name,
  packIds: [],
  note: "",
  color: nextColor(),
  assignments: [],
});

const seedPreset = (raidId: string): Preset => {
  const firstPull = emptyPull("Pull 1");
  return {
    id: rid(),
    name: "Default",
    raidId,
    pulls: [firstPull],
    currentPullId: firstPull.id,
  };
};

type State = {
  raidId: string;
  preset: Preset;

  setRaid: (raidId: string) => void;
  setPresetName: (name: string) => void;

  addPull: () => void;
  deletePull: (pullId: string) => void;
  selectPull: (pullId: string) => void;
  renamePull: (pullId: string, name: string) => void;
  setPullNote: (pullId: string, note: string) => void;
  togglePackInCurrentPull: (packId: number) => void;
  movePull: (pullId: string, dir: -1 | 1) => void;

  addAssignment: (pullId: string, kind?: AssignmentKind) => void;
  updateAssignment: (pullId: string, idx: number, patch: Partial<Assignment>) => void;
  deleteAssignment: (pullId: string, idx: number) => void;

  resetPreset: () => void;
  importPreset: (p: Preset) => void;
  removePackFromAllPulls: (packId: number) => void;
};

const seeded = seedPreset("SSC");

export const usePreset = create<State>()(
  persist(
    (set) => ({
      raidId: "SSC",
      preset: seeded,

      setRaid: (raidId) =>
        set({ raidId, preset: seedPreset(raidId) }),

      setPresetName: (name) =>
        set((s) => ({ preset: { ...s.preset, name } })),

      addPull: () =>
        set((s) => {
          const p = emptyPull(`Pull ${s.preset.pulls.length + 1}`);
          return { preset: { ...s.preset, pulls: [...s.preset.pulls, p], currentPullId: p.id } };
        }),

      deletePull: (pullId) =>
        set((s) => {
          if (s.preset.pulls.length <= 1) return s;
          const pulls = s.preset.pulls.filter((x) => x.id !== pullId);
          const currentPullId =
            s.preset.currentPullId === pullId ? pulls[0].id : s.preset.currentPullId;
          return { preset: { ...s.preset, pulls, currentPullId } };
        }),

      selectPull: (pullId) =>
        set((s) => ({ preset: { ...s.preset, currentPullId: pullId } })),

      renamePull: (pullId, name) =>
        set((s) => ({
          preset: { ...s.preset, pulls: s.preset.pulls.map((p) => (p.id === pullId ? { ...p, name } : p)) },
        })),

      setPullNote: (pullId, note) =>
        set((s) => ({
          preset: { ...s.preset, pulls: s.preset.pulls.map((p) => (p.id === pullId ? { ...p, note } : p)) },
        })),

      togglePackInCurrentPull: (packId) =>
        set((s) => {
          const { currentPullId } = s.preset;
          const pulls = s.preset.pulls.map((p) => {
            if (p.id !== currentPullId) {
              // Packs are exclusive to one pull at a time — strip from others.
              return { ...p, packIds: p.packIds.filter((id) => id !== packId) };
            }
            const has = p.packIds.includes(packId);
            return { ...p, packIds: has ? p.packIds.filter((id) => id !== packId) : [...p.packIds, packId] };
          });
          return { preset: { ...s.preset, pulls } };
        }),

      movePull: (pullId, dir) =>
        set((s) => {
          const idx = s.preset.pulls.findIndex((p) => p.id === pullId);
          const newIdx = idx + dir;
          if (idx < 0 || newIdx < 0 || newIdx >= s.preset.pulls.length) return s;
          const pulls = s.preset.pulls.slice();
          [pulls[idx], pulls[newIdx]] = [pulls[newIdx], pulls[idx]];
          return { preset: { ...s.preset, pulls } };
        }),

      addAssignment: (pullId, kind = "spell") =>
        set((s) => ({
          preset: {
            ...s.preset,
            pulls: s.preset.pulls.map((p) => {
              if (p.id !== pullId) return p;
              const blank: Assignment = kind === "reminder"
                ? { kind: "reminder", id: null, text: "", player: "", note: "" }
                : kind === "equip"
                  ? { kind: "equip", id: null, player: "", note: "" }
                  : { kind, id: null, player: "", note: "" };
              return { ...p, assignments: [...p.assignments, blank] };
            }),
          },
        })),

      updateAssignment: (pullId, idx, patch) =>
        set((s) => ({
          preset: {
            ...s.preset,
            pulls: s.preset.pulls.map((p) => {
              if (p.id !== pullId) return p;
              const assignments = p.assignments.slice();
              assignments[idx] = { ...assignments[idx], ...patch };
              return { ...p, assignments };
            }),
          },
        })),

      deleteAssignment: (pullId, idx) =>
        set((s) => ({
          preset: {
            ...s.preset,
            pulls: s.preset.pulls.map((p) =>
              p.id === pullId ? { ...p, assignments: p.assignments.filter((_, i) => i !== idx) } : p
            ),
          },
        })),

      resetPreset: () => set((s) => ({ preset: seedPreset(s.raidId) })),

      importPreset: (p) => set({ raidId: p.raidId, preset: p }),

      removePackFromAllPulls: (packId) =>
        set((s) => ({
          preset: {
            ...s.preset,
            pulls: s.preset.pulls.map((p) => ({
              ...p,
              packIds: p.packIds.filter((id) => id !== packId),
            })),
          },
        })),
    }),
    {
      name: "caferaidplanner.preset.v1",
      version: 3,
      migrate: (persisted: unknown, fromVersion: number) => {
        if (!persisted || typeof persisted !== "object") return persisted as State;
        const p = persisted as { preset?: { pulls?: Array<Pull & { bossId?: string | null }> } };
        // v1 → v2: old { player, spellId, note } assignments replaced with
        // { kind, id, note }. Drop them; not worth a piecewise migration.
        if (fromVersion < 2) {
          p.preset?.pulls?.forEach((pull) => { pull.assignments = []; });
        }
        // v2 → v3: pull.bossId removed; bosses are packs now. Convert each
        // pull's bossId into a pack reference by looking up the well-known
        // slug→id map, then strip the field.
        if (fromVersion < 3) {
          p.preset?.pulls?.forEach((pull) => {
            if (pull.bossId) {
              const packId = BOSS_SLUG_TO_ID[pull.bossId];
              if (packId && !pull.packIds.includes(packId)) {
                pull.packIds.push(packId);
              }
            }
            delete pull.bossId;
          });
        }
        return persisted as State;
      },
    }
  )
);

export const selectCurrentPull = (s: { preset: Preset }) =>
  s.preset.pulls.find((p) => p.id === s.preset.currentPullId) ?? s.preset.pulls[0];
