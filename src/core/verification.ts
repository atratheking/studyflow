import type { VerifyOtpParams } from "@supabase/supabase-js";
/** Accept a code or the original link from Supabase's default email template. */
export function verificationParams(
  input: string,
  email: string,
  recovery: boolean,
  projectUrl: string,
): VerifyOtpParams {
  const value = input.trim();
  if (/^[0-9]{6,10}$/.test(value))
    return {
      email: email.trim(),
      token: value,
      type: recovery ? "recovery" : "email",
    };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "Enter the email code or paste the confirmation link from your email.",
    );
  }
  if (
    url.origin !== new URL(projectUrl).origin ||
    url.pathname !== "/auth/v1/verify"
  )
    throw new Error("Use the confirmation link from your StudyFlow email.");
  const type = url.searchParams.get("type"),
    token = url.searchParams.get("token");
  if (
    !token ||
    token.length > 1024 ||
    (recovery ? type !== "recovery" : type !== "signup" && type !== "email")
  )
    throw new Error(
      "This link doesn’t match this verification step. Request a new email and try again.",
    );
  return {
    token_hash: token,
    type: recovery ? "recovery" : type === "signup" ? "signup" : "email",
  };
}
