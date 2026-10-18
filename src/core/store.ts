import { openDB } from "idb";
import { useSyncExternalStore } from "react";
import { seed } from "./seed";
import { schedule } from "./study";
import { uid, type State, type StudySet, type Card } from "./types";
import { validateState } from "./import";
export type Persistence = {
  key: string;
  token?: () => number;
  load: () => Promise<State>;
  save: (state: State) => Promise<void>;
};
let persistence: Persistence | undefined;
let state: State;
let pendingState: State;
let loaded = false;
let error: string | null = null;
let stalePending = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const db = openDB("studyflow-desktop", 1, {
  upgrade(db) {
    db.createObjectStore("app");
  },
});
let queue = Promise.resolve();
export async function initialize(online?: Persistence) {
  persistence = online;
  stalePending = false;
  error = null;
  loaded = false;
  try {
    const saved = online
      ? await online.load()
      : await (await db).get("app", "state");
    if (saved && !validateState(saved))
      throw new Error(
        "Saved library has an unsupported format. Your data has been preserved.",
      );
    state = saved ?? seed();
    pendingState = state;
    if (online) {
      await (await db).put("app", state, online.key);
      const pending = await (await db).get("app", online.key + ":pending");
      if (pending && validateState(pending.state)) {
        pendingState = pending.state;
        stalePending = online.token ? pending.token !== online.token() : false;
        error =
          "This device has changes that were not saved online. Export them before loading the cloud copy, or retry saving them.";
      }
    } else if (!saved) await (await db).put("app", state, "state");
    loaded = true;
    emit();
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not open your library";
    emit();
  }
}
export const storageStatus = () => ({ loaded, error });
export function useStore() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => state,
  );
}
export function getState() {
  return pendingState ?? state;
}
export function update(fn: (s: State) => State) {
  const snapshot = fn(pendingState ?? state);
  pendingState = snapshot;
  queue = queue
    .catch(() => {})
    .then(async () => {
      try {
        if (persistence) {
          if (stalePending)
            throw new Error(
              "The cloud library has changed. Export pending changes, then load the cloud copy to avoid overwriting newer work.",
            );
          await (
            await db
          ).put(
            "app",
            { state: snapshot, token: persistence.token?.() },
            persistence.key + ":pending",
          );
          await persistence.save(snapshot);
          await (await db).put("app", snapshot, persistence.key);
          await (await db).delete("app", persistence.key + ":pending");
        } else await (await db).put("app", snapshot, "state");
        state = snapshot;
        error = null;
        emit();
      } catch (cause) {
        error =
          cause instanceof Error
            ? cause.message
            : "Your latest changes could not be saved. Export a backup before closing.";
        if (state) state = { ...state };
        emit();
        throw new Error(error);
      }
    });
  queue.catch(() => {});
  return queue;
}
export async function flush() {
  await queue;
  if (error) throw new Error(error);
}
export async function retrySave() {
  return update(() => pendingState);
}
export async function reloadCloud() {
  await queue.catch(() => {});
  if (!persistence) return;
  const latest = await persistence.load();
  await (await db).put("app", latest, persistence.key);
  await (await db).delete("app", persistence.key + ":pending");
  state = latest;
  pendingState = latest;
  queue = Promise.resolve();
  error = null;
  stalePending = false;
  emit();
}
export async function clearAccount() {
  await queue.catch(() => {});
  state = undefined!;
  pendingState = undefined!;
  persistence = undefined;
  queue = Promise.resolve();
  loaded = false;
  error = null;
  stalePending = false;
  emit();
}
export function saveSet(set: StudySet) {
  update((s) => ({
    ...s,
    sets: s.sets.some((x) => x.id === set.id)
      ? s.sets.map((x) =>
          x.id === set.id ? { ...set, updated: Date.now(), sample: false } : x,
        )
      : [{ ...set, updated: Date.now(), sample: false }, ...s.sets],
    draft: null,
  }));
}
export function duplicateSet(set: StudySet) {
  saveSet({
    ...set,
    id: uid(),
    title: set.title + " (copy)",
    created: Date.now(),
    lastStudied: undefined,
    cards: set.cards.map((c) => ({ ...c, id: uid() })),
  });
}
export function deleteSet(id: string) {
  update((s) => ({
    ...s,
    sets: s.sets.filter((x) => x.id !== id),
    folders: s.folders.map((f) => ({
      ...f,
      setIds: f.setIds.filter((i) => i !== id),
    })),
    reviews: Object.fromEntries(
      Object.entries(s.reviews).filter(([, v]) => v.setId !== id),
    ),
    best: Object.fromEntries(
      Object.entries(s.best).filter(([key]) => key !== id),
    ),
    draft: s.draft?.id === id ? null : s.draft,
  }));
}
export function toggleStar(setId: string, id: string) {
  update((s) => ({
    ...s,
    sets: s.sets.map((x) =>
      x.id === setId
        ? {
            ...x,
            cards: x.cards.map((c) =>
              c.id === id ? { ...c, starred: !c.starred } : c,
            ),
          }
        : x,
    ),
  }));
}
export function record(
  setId: string,
  card: Card,
  correct: boolean | null,
  mode: string,
  seconds = 0,
  quality?: number,
) {
  const at = Date.now();
  update((s) => ({
    ...s,
    activity: [
      ...s.activity,
      {
        id: uid(),
        cardId: card.id,
        setId,
        correct,
        mode,
        seconds: Math.max(0, Math.min(seconds, 3600)),
        at,
      },
    ],
    sets: s.sets.map((x) => (x.id === setId ? { ...x, lastStudied: at } : x)),
    reviews:
      correct === null
        ? s.reviews
        : {
            ...s.reviews,
            [card.id]: schedule(
              s.reviews[card.id],
              card.id,
              setId,
              quality ?? (correct ? 4 : 1),
              at,
            ),
          },
  }));
}

export async function getLegacyLibrary(): Promise<State | null> {
  const previous = await (await db).get("app", "state");
  return validateState(previous) ? previous : null;
}
