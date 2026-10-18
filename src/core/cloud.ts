import { createClient } from "@supabase/supabase-js";
import { seed } from "./seed";
import { validateState } from "./import";
import type { State } from "./types";
import type { Persistence } from "./store";

import { readCloudConfig } from "./cloud-config";
const config = readCloudConfig(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
export const cloudConfigured = Boolean(config);
export const cloudProjectUrl = config?.url;
export const supabase = cloudConfigured
  ? createClient(config!.url, config!.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: init?.signal ?? AbortSignal.timeout(15000),
          }),
      },
    })
  : null;

export class CloudConflict extends Error {
  constructor() {
    super(
      "Your library changed on another device. Export your pending changes, then load the latest cloud copy before continuing.",
    );
    this.name = "CloudConflict";
  }
}
export function createCloudPersistence(
  userId: string,
  displayName: string,
): Persistence {
  let revision = 0;
  return {
    key: `account:${userId}`,
    token: () => revision,
    async load() {
      const { data, error } = await supabase!
        .from("studyflow_libraries")
        .select("state, revision")
        .eq("user_id", userId)
        .maybeSingle();
      if (error)
        throw new Error(
          "Could not open your cloud library. Check your connection and try again.",
        );
      if (data) {
        if (!validateState(data.state))
          throw new Error(
            "Your cloud library has an unsupported format. It has not been changed.",
          );
        revision = Number(data.revision);
        return data.state;
      }
      const initial = seed();
      initial.settings.name = displayName || "Student";
      const { data: created, error: createError } = await supabase!.rpc(
        "save_studyflow_library",
        {
          p_state: initial,
          p_expected_revision: 0,
        },
      );
      if (createError)
        throw new Error(
          "Could not create your cloud library. Check the backend setup and try again.",
        );
      revision = Number(created);
      return initial;
    },
    async save(snapshot: State) {
      const { data, error } = await supabase!.rpc("save_studyflow_library", {
        p_state: snapshot,
        p_expected_revision: revision,
      });
      if (error?.code === "40001") throw new CloudConflict();
      if (error)
        throw new Error(
          "Cloud save failed. Your changes are kept on this device. Reconnect and retry before signing out.",
        );
      revision = Number(data);
    },
  };
}
