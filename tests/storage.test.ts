import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  initialize,
  getState,
  saveSet,
  record,
  flush,
  deleteSet,
  update,
} from "../src/core/store";
import { openDB } from "idb";
describe("IndexedDB persistence", () => {
  it("persists sets, progress and folders and keeps sets when folders are removed", async () => {
    await initialize();
    const set = structuredClone(getState().sets[0]);
    set.title = "A persisted library";
    saveSet(set);
    record(set.id, set.cards[0], true, "learn", 12);
    update((s) => ({
      ...s,
      folders: [{ id: "f", name: "Biology", setIds: [set.id] }],
    }));
    await flush();
    const db = await openDB("studyflow-desktop", 1);
    const stored = await db.get("app", "state");
    expect(stored.sets.find((x: { id: string }) => x.id === set.id).title).toBe(
      "A persisted library",
    );
    expect(stored.reviews[set.cards[0].id].repetitions).toBe(1);
    expect(stored.activity.at(-1).seconds).toBe(12);
    await update((s) => ({ ...s, folders: [] }));
    expect(getState().sets.some((s) => s.id === set.id)).toBe(true);
    deleteSet(set.id);
    await flush();
    expect(getState().reviews[set.cards[0].id]).toBeUndefined();
    expect(getState().sets.some((s) => s.id === set.id)).toBe(false);
    db.close();
  });
});
