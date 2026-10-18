import "fake-indexeddb/auto";
import { describe, it, expect, afterEach } from "vitest";
import { openDB } from "idb";
import {
  initialize,
  update,
  getState,
  flush,
  clearAccount,
  reloadCloud,
  retrySave,
  storageStatus,
  getLegacyLibrary,
  type Persistence,
} from "../src/core/store";
import { seed } from "../src/core/seed";
const backend = (key: string) => {
  let remote = seed(),
    revision = 1,
    loadedRevision = 1;
  let offline = false;
  const persistence: Persistence = {
    key,
    token: () => loadedRevision,
    load: async () => {
      loadedRevision = revision;
      return structuredClone(remote);
    },
    save: async (state) => {
      if (offline) throw new Error("Connection unavailable");
      if (revision !== loadedRevision)
        throw new Error("Another device changed your library");
      remote = structuredClone(state);
      loadedRevision = ++revision;
    },
  };
  return {
    persistence,
    get remote() {
      return remote;
    },
    set offline(value: boolean) {
      offline = value;
    },
    otherDevice: () => {
      remote.settings.name = "Newer device";
      revision++;
    },
  };
};
afterEach(clearAccount);
describe("cloud save durability", () => {
  it("preserves an earlier device library without assigning it to a cloud account", async () => {
    const db = await openDB("studyflow-desktop", 1);
    const local = seed();
    local.settings.name = "Earlier local student";
    await db.put("app", local, "state");
    const cloud = backend("account:migration");
    await initialize(cloud.persistence);
    expect(getState().settings.name).not.toBe("Earlier local student");
    expect(cloud.remote.settings.name).not.toBe("Earlier local student");
    expect((await getLegacyLibrary())?.settings.name).toBe(
      "Earlier local student",
    );
    await clearAccount();
    expect((await db.get("app", "state")).settings.name).toBe(
      "Earlier local student",
    );
    db.close();
  });

  it("commits changes online and scopes local recovery by account", async () => {
    const first = backend("account:first");
    await initialize(first.persistence);
    await update((s) => ({
      ...s,
      settings: { ...s.settings, name: "First account" },
    }));
    await flush();
    expect(first.remote.settings.name).toBe("First account");
    const db = await openDB("studyflow-desktop", 1);
    expect((await db.get("app", "account:first")).settings.name).toBe(
      "First account",
    );
    await clearAccount();
    const second = backend("account:second");
    await initialize(second.persistence);
    expect(getState().settings.name).not.toBe("First account");
    expect(await db.get("app", "account:second:pending")).toBeUndefined();
    db.close();
  });
  it("keeps failed changes durably and can retry after reconnecting", async () => {
    const cloud = backend("account:retry");
    await initialize(cloud.persistence);
    cloud.offline = true;
    await expect(
      update((s) => ({
        ...s,
        settings: { ...s.settings, name: "Pending work" },
      })),
    ).rejects.toThrow("Connection unavailable");
    await expect(flush()).rejects.toThrow();
    await clearAccount();
    await initialize(cloud.persistence);
    expect(storageStatus().error).toContain("changes");
    expect(getState().settings.name).toBe("Pending work");
    cloud.offline = false;
    await retrySave();
    expect(cloud.remote.settings.name).toBe("Pending work");
    expect(storageStatus().error).toBeNull();
  });
  it("does not overwrite another device when recovering an old failed save", async () => {
    const cloud = backend("account:conflict");
    await initialize(cloud.persistence);
    cloud.offline = true;
    await expect(
      update((s) => ({
        ...s,
        settings: { ...s.settings, name: "Old pending work" },
      })),
    ).rejects.toThrow();
    await clearAccount();
    cloud.otherDevice();
    cloud.offline = false;
    await initialize(cloud.persistence);
    expect(getState().settings.name).toBe("Old pending work");
    await expect(retrySave()).rejects.toThrow("avoid overwriting");
    expect(cloud.remote.settings.name).toBe("Newer device");
    await reloadCloud();
    expect(getState().settings.name).toBe("Newer device");
    expect(storageStatus().error).toBeNull();
  });
});
