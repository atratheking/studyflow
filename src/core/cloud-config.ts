/** Validate public build settings before a key can enter a distributable. */
export function readCloudConfig(rawUrl?: string, rawKey?: string) {
  const url = rawUrl?.trim(),
    key = rawKey?.trim();
  if (!url && !key) return null;
  if (!url || !key)
    throw new Error(
      "Set both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      "VITE_SUPABASE_URL must be a valid Supabase HTTPS project URL.",
    );
  }
  if (
    parsed.protocol !== "https:" ||
    !/^[a-z0-9-]+\.supabase\.co$/.test(parsed.hostname) ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    (parsed.pathname !== "/" && parsed.pathname !== "") ||
    parsed.search ||
    parsed.hash
  )
    throw new Error(
      "Use the project's https://PROJECT.supabase.co URL, without a path or credentials.",
    );
  if (key.startsWith("sb_secret_"))
    throw new Error(
      "A secret key cannot be bundled in the app. Use a publishable key.",
    );
  if (!key.startsWith("sb_publishable_")) {
    try {
      const claim = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (claim.role !== "anon") throw new Error();
    } catch {
      throw new Error(
        "Use a publishable key or the legacy anon key; never a service-role key.",
      );
    }
  }
  return { url: parsed.origin, key };
}
