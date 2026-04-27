import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CooldownKind } from "../data/cooldowns";
import type { MarkerId } from "../data/markers";
import { BOSS_SLUG_TO_ID } from "../data/raids";

export type AssignmentKind = CooldownKind | "reminder" | "equip" | "kick";

export type Assignment = {
  kind: AssignmentKind;
  // id: spellId for "spell"/"kick"; itemId for "item"/"equip"; null for "reminder".
  id: number | null;
  // text is the reminder body for kind "reminder"; ignored otherwise.
  text?: string;
  player: string;     // optional free-text player name; "" = unassigned
  note: string;
  // Kick targets — exactly one of these is set on a "kick" assignment, or
  // both null while the user is still picking. Ignored on other kinds.
  targetNpcId?: number | null;
  targetMarker?: MarkerId | null;
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
// pulls never get adjacent colors.
const PALETTE: string[] = Array.from({ length: 20 }, (_, i) => {
  const hue = (i * 137.507764050037) % 360;
  return `hsl(${Math.round(hue)}, 72%, 58%)`;
});

const pickColor = (taken: string[]): string =>
  PALETTE.find((c) => !taken.includes(c)) ?? PALETTE[taken.length % PALETTE.length];

const rid = () => Math.random().toString(36).slice(2, 10);

const emptyPull = (name: string, taken: string[] = []): Pull => ({
  id: rid(),
  name,
  packIds: [],
  note: "",
  color: pickColor(taken),
  assignments: [],
});

const seedPreset = (raidId: string, name = "Default"): Preset => {
  const firstPull = emptyPull("Pull 1");
  return {
    id: rid(),
    name,
    raidId,
    pulls: [firstPull],
    currentPullId: firstPull.id,
  };
};

type State = {
  raidId: string;
  presets: Record<string, Preset>;       // every saved preset, keyed by id
  currentPresetId: string;               // active preset; preset.raidId === raidId

  setRaid: (raidId: string) => void;
  createPreset: (raidId: string, name?: string) => string;  // returns new id
  switchPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  renamePreset: (presetId: string, name: string) => void;
  setPresetName: (name: string) => void; // rename current

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

// Helper: produce a partial state with the current preset replaced via `fn`.
// Centralizes the verbose `presets: { ...s.presets, [id]: { ...current, ... } }`
// pattern that every per-pull/per-assignment action would otherwise repeat.
const replaceCurrent = (
  s: State,
  fn: (p: Preset) => Preset,
): Partial<State> => {
  const cur = s.presets[s.currentPresetId];
  if (!cur) return {};
  return { presets: { ...s.presets, [cur.id]: fn(cur) } };
};

export const usePreset = create<State>()(
  persist(
    (set) => ({
      raidId: "SSC",
      presets: { [seeded.id]: seeded },
      currentPresetId: seeded.id,

      setRaid: (raidId) =>
        set((s) => {
          // Reuse an existing preset for this raid if any; else create one.
          const existing = Object.values(s.presets).find((p) => p.raidId === raidId);
          if (existing) return { raidId, currentPresetId: existing.id };
          const fresh = seedPreset(raidId);
          return {
            raidId,
            presets: { ...s.presets, [fresh.id]: fresh },
            currentPresetId: fresh.id,
          };
        }),

      createPreset: (raidId, name) => {
        const p = seedPreset(raidId, name ?? "New plan");
        set((s) => ({
          presets: { ...s.presets, [p.id]: p },
          raidId,
          currentPresetId: p.id,
        }));
        return p.id;
      },

      switchPreset: (presetId) =>
        set((s) => {
          const p = s.presets[presetId];
          if (!p) return s;
          return { raidId: p.raidId, currentPresetId: presetId };
        }),

      deletePreset: (presetId) =>
        set((s) => {
          const ids = Object.keys(s.presets);
          if (ids.length <= 1) return s; // never delete the last preset
          const next: Record<string, Preset> = {};
          for (const k of ids) if (k !== presetId) next[k] = s.presets[k];
          let { currentPresetId, raidId } = s;
          if (currentPresetId === presetId) {
            // Prefer a preset for the same raid; fall back to any.
            const fallback = Object.values(next).find((p) => p.raidId === raidId)
              ?? Object.values(next)[0];
            currentPresetId = fallback.id;
            raidId = fallback.raidId;
          }
          return { presets: next, currentPresetId, raidId };
        }),

      renamePreset: (presetId, name) =>
        set((s) => {
          const p = s.presets[presetId];
          if (!p) return s;
          return { presets: { ...s.presets, [presetId]: { ...p, name } } };
        }),

      setPresetName: (name) =>
        set((s) => replaceCurrent(s, (p) => ({ ...p, name }))),

      addPull: () =>
        set((s) =>
          replaceCurrent(s, (p) => {
            const taken = p.pulls.map((x) => x.color);
            const np = emptyPull(`Pull ${p.pulls.length + 1}`, taken);
            return { ...p, pulls: [...p.pulls, np], currentPullId: np.id };
          }),
        ),

      deletePull: (pullId) =>
        set((s) =>
          replaceCurrent(s, (p) => {
            if (p.pulls.length <= 1) return p;
            const pulls = p.pulls.filter((x) => x.id !== pullId);
            const currentPullId = p.currentPullId === pullId ? pulls[0].id : p.currentPullId;
            return { ...p, pulls, currentPullId };
          }),
        ),

      selectPull: (pullId) =>
        set((s) => replaceCurrent(s, (p) => ({ ...p, currentPullId: pullId }))),

      renamePull: (pullId, name) =>
        set((s) =>
          replaceCurrent(s, (p) => ({
            ...p,
            pulls: p.pulls.map((x) => (x.id === pullId ? { ...x, name } : x)),
          })),
        ),

      setPullNote: (pullId, note) =>
        set((s) =>
          replaceCurrent(s, (p) => ({
            ...p,
            pulls: p.pulls.map((x) => (x.id === pullId ? { ...x, note } : x)),
          })),
        ),

      togglePackInCurrentPull: (packId) =>
        set((s) =>
          replaceCurrent(s, (p) => {
            const pulls = p.pulls.map((x) => {
              if (x.id !== p.currentPullId) {
                // Packs are exclusive to one pull at a time — strip from others.
                return { ...x, packIds: x.packIds.filter((id) => id !== packId) };
              }
              const has = x.packIds.includes(packId);
              return { ...x, packIds: has ? x.packIds.filter((id) => id !== packId) : [...x.packIds, packId] };
            });
            return { ...p, pulls };
          }),
        ),

      movePull: (pullId, dir) =>
        set((s) =>
          replaceCurrent(s, (p) => {
            const idx = p.pulls.findIndex((x) => x.id === pullId);
            const newIdx = idx + dir;
            if (idx < 0 || newIdx < 0 || newIdx >= p.pulls.length) return p;
            const pulls = p.pulls.slice();
            [pulls[idx], pulls[newIdx]] = [pulls[newIdx], pulls[idx]];
            return { ...p, pulls };
          }),
        ),

      addAssignment: (pullId, kind = "spell") =>
        set((s) =>
          replaceCurrent(s, (p) => ({
            ...p,
            pulls: p.pulls.map((x) => {
              if (x.id !== pullId) return x;
              const blank: Assignment = kind === "reminder"
                ? { kind: "reminder", id: null, text: "", player: "", note: "" }
                : kind === "equip"
                  ? { kind: "equip", id: null, player: "", note: "" }
                  : kind === "kick"
                    ? { kind: "kick", id: null, player: "", note: "", targetNpcId: null, targetMarker: null }
                    : { kind, id: null, player: "", note: "" };
              return { ...x, assignments: [...x.assignments, blank] };
            }),
          })),
        ),

      updateAssignment: (pullId, idx, patch) =>
        set((s) =>
          replaceCurrent(s, (p) => ({
            ...p,
            pulls: p.pulls.map((x) => {
              if (x.id !== pullId) return x;
              const assignments = x.assignments.slice();
              assignments[idx] = { ...assignments[idx], ...patch };
              return { ...x, assignments };
            }),
          })),
        ),

      deleteAssignment: (pullId, idx) =>
        set((s) =>
          replaceCurrent(s, (p) => ({
            ...p,
            pulls: p.pulls.map((x) =>
              x.id === pullId ? { ...x, assignments: x.assignments.filter((_, i) => i !== idx) } : x,
            ),
          })),
        ),

      resetPreset: () =>
        set((s) => {
          const cur = s.presets[s.currentPresetId];
          if (!cur) return s;
          // Preserve identity (id + name) so receivers/sharers don't see a new plan;
          // just clear the contents.
          const fresh = { ...seedPreset(cur.raidId), id: cur.id, name: cur.name };
          return { presets: { ...s.presets, [cur.id]: fresh } };
        }),

      importPreset: (p) =>
        set((s) => ({
          presets: { ...s.presets, [p.id]: p },
          raidId: p.raidId,
          currentPresetId: p.id,
        })),

      removePackFromAllPulls: (packId) =>
        set((s) =>
          replaceCurrent(s, (p) => ({
            ...p,
            pulls: p.pulls.map((x) => ({
              ...x,
              packIds: x.packIds.filter((id) => id !== packId),
            })),
          })),
        ),
    }),
    {
      name: "caferaidplanner.preset.v1",
      version: 4,
      migrate: (persisted: unknown, fromVersion: number) => {
        if (!persisted || typeof persisted !== "object") return persisted as State;
        const p = persisted as {
          raidId?: string;
          preset?: Preset & { pulls?: Array<Pull & { bossId?: string | null }> };
          presets?: Record<string, Preset>;
          currentPresetId?: string;
        };
        // v1 → v2: per-player assignments shape change; drop them.
        if (fromVersion < 2 && p.preset?.pulls) {
          for (const pull of p.preset.pulls) (pull as Pull).assignments = [];
        }
        // v2 → v3: pull.bossId → packIds via slug→id map.
        if (fromVersion < 3 && p.preset?.pulls) {
          for (const pull of p.preset.pulls) {
            if (pull.bossId) {
              const packId = BOSS_SLUG_TO_ID[pull.bossId];
              if (packId && !pull.packIds.includes(packId)) pull.packIds.push(packId);
            }
            delete pull.bossId;
          }
        }
        // v3 → v4: single preset → multi-preset map. Promote the lone preset
        // into the new shape.
        if (fromVersion < 4 && p.preset && !p.presets) {
          p.presets = { [p.preset.id]: p.preset };
          p.currentPresetId = p.preset.id;
          delete p.preset;
        }
        return persisted as State;
      },
    },
  ),
);

// Selectors — used by Zustand subscribers and by external callers (share, etc.).
export const selectCurrentPreset = (s: State): Preset => s.presets[s.currentPresetId];

export const selectCurrentPull = (s: State): Pull | undefined => {
  const p = s.presets[s.currentPresetId];
  if (!p) return undefined;
  return p.pulls.find((x) => x.id === p.currentPullId) ?? p.pulls[0];
};

