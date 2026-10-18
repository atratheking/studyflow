import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  Cloud,
  Layers,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { supabase, cloudConfigured, cloudProjectUrl } from "../core/cloud";
import { verificationParams } from "../core/verification";
import { Logo } from "../components/ui";

type Mode =
  | "login"
  | "signup"
  | "forgot"
  | "verify-signup"
  | "verify-recovery"
  | "new-password";
export function AuthPage({
  recovering,
  onRecoveryChange,
}: {
  recovering: boolean;
  onRecoveryChange: (value: boolean) => void;
}) {
  const [mode, setMode] = useState<Mode>(
    recovering
      ? "new-password"
      : location.hash.includes("signup")
        ? "signup"
        : "login",
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  function change(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
    setConfirm("");
    setToken("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    const address = email.trim();
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: address,
          password,
        });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: address,
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          change("verify-signup");
          setNotice(
            "Check your inbox for your confirmation code. If you already have an account, use Log in.",
          );
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(address);
        if (error) throw error;
        onRecoveryChange(true);
        change("verify-recovery");
        setNotice(
          "If an account matches that email, a recovery code is on its way.",
        );
      } else if (mode === "verify-signup" || mode === "verify-recovery") {
        const { error } = await supabase.auth.verifyOtp(
          verificationParams(
            token,
            address,
            mode === "verify-recovery",
            cloudProjectUrl!,
          ),
        );
        if (error) throw error;
        if (mode === "verify-recovery") change("new-password");
      } else {
        if (password !== confirm)
          throw new Error("Your passwords don’t match.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        onRecoveryChange(false);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We couldn’t connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    if (!supabase || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result =
        mode === "verify-signup"
          ? await supabase.auth.resend({ type: "signup", email: email.trim() })
          : await supabase.auth.resetPasswordForEmail(email.trim());
      if (result.error) throw result.error;
      setNotice(
        "A new code has been requested. Check your inbox and spam folder.",
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const verify = mode.startsWith("verify");
  const heading =
    mode === "login"
      ? "Welcome back."
      : mode === "signup"
        ? "Start your study flow."
        : mode === "forgot"
          ? "Forgot your password?"
          : verify
            ? "Check your email."
            : "Choose a new password.";
  const description =
    mode === "login"
      ? "Log in to pick up where you left off."
      : mode === "signup"
        ? "One account. All your study tools. Anywhere you learn."
        : mode === "forgot"
          ? "We’ll send a recovery code to your email."
          : verify
            ? `Enter the code sent to ${email}.`
            : "Make it a strong one. Use at least 12 characters.";
  return (
    <div className="auth-shell">
      <div className="auth-titlebar">
        <span>StudyFlow</span>
      </div>
      <aside className="auth-story" aria-label="About StudyFlow">
        <Logo />
        <div className="auth-story-copy">
          <span className="auth-eyebrow">
            A LITTLE PRACTICE. A LOT OF POSSIBILITY.
          </span>
          <h1>
            Everything you learn,
            <br />a little closer.
          </h1>
          <p>
            Your flashcards, your progress, your next breakthrough. Together in
            one place.
          </p>
        </div>
        <div className="auth-art" aria-hidden="true">
          <div className="auth-art-back">
            <Layers size={24} />
            <span>Make it stick.</span>
          </div>
          <div className="auth-art-card">
            <span>BIOLOGY · FLASHCARDS</span>
            <h2>
              Small steps.
              <br />
              Stronger memories.
            </h2>
            <div>
              <span>
                <Check size={17} /> Got it
              </span>
              <span>12 / 12</span>
            </div>
          </div>
          <div className="auth-art-chip">
            <Cloud size={19} /> Your progress, in sync
          </div>
        </div>
        <div className="auth-story-footer">
          <ShieldCheck size={17} />
          <span>All study tools included. No ads.</span>
        </div>
      </aside>
      <main className="auth-main" id="main-content">
        <div className="auth-form-panel">
          <div className="auth-mobile-logo">
            <Logo />
          </div>
          {mode === "login" || mode === "signup" ? (
            <nav className="auth-tabs" aria-label="Account access">
              <button
                className={mode === "login" ? "active" : ""}
                onClick={() => change("login")}
                disabled={busy}
              >
                Log in
              </button>
              <button
                className={mode === "signup" ? "active" : ""}
                onClick={() => change("signup")}
                disabled={busy}
              >
                Sign up
              </button>
            </nav>
          ) : (
            mode !== "new-password" && (
              <button
                className="text-button auth-back"
                disabled={busy}
                onClick={() => {
                  onRecoveryChange(false);
                  change("login");
                }}
              >
                <ArrowLeft size={17} />
                Back to log in
              </button>
            )
          )}
          <h1>{heading}</h1>
          <p className="auth-description">{description}</p>
          {!cloudConfigured && (
            <div className="auth-setup" role="status">
              <Cloud size={21} />
              <div>
                <b>Online accounts are being set up</b>
                <p>
                  This build needs to be connected to StudyFlow’s account
                  service before you can sign in.
                </p>
              </div>
            </div>
          )}
          <form onSubmit={submit}>
            {mode === "signup" && (
              <label className="field">
                Username
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="nickname"
                  required
                  maxLength={60}
                  placeholder="How should we call you?"
                  disabled={busy}
                />
              </label>
            )}
            {!verify && mode !== "new-password" && (
              <label className="field">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  maxLength={254}
                  placeholder="you@example.com"
                  disabled={busy}
                />
              </label>
            )}
            {verify && (
              <label className="field">
                Email code
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  autoComplete="one-time-code"
                  required
                  maxLength={2048}
                  placeholder="Code or confirmation link"
                  disabled={busy}
                  autoFocus
                />
              </label>
            )}
            {(mode === "login" ||
              mode === "signup" ||
              mode === "new-password") && (
              <label className="field">
                Password
                <div className="auth-password">
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    required
                    minLength={mode === "login" ? 1 : 12}
                    maxLength={128}
                    placeholder={
                      mode === "login"
                        ? "Enter your password"
                        : "At least 12 characters"
                    }
                    disabled={busy}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={show ? "Hide password" : "Show password"}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </label>
            )}
            {mode === "new-password" && (
              <label className="field">
                Confirm password
                <input
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  disabled={busy}
                />
              </label>
            )}
            {mode === "login" && (
              <button
                type="button"
                className="text-button auth-forgot"
                onClick={() => change("forgot")}
                disabled={busy}
              >
                Forgot password?
              </button>
            )}
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="auth-notice" role="status">
                <Mail size={18} />
                {notice}
              </p>
            )}
            <button
              className="button primary auth-submit"
              disabled={busy || !cloudConfigured}
            >
              {busy
                ? "Please wait…"
                : mode === "login"
                  ? "Log in"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "forgot"
                      ? "Send recovery code"
                      : verify
                        ? "Verify code"
                        : "Save new password"}
              <ArrowRight size={19} />
            </button>
          </form>
          {verify && (
            <p className="auth-verification-help">
              If the email has a button instead of a code, copy the button’s
              link and paste it above.
              {mode === "verify-signup" &&
                " If you already clicked it and confirmed your email, return to Log in."}
            </p>
          )}
          {verify && (
            <button
              className="text-button auth-resend"
              onClick={resend}
              disabled={busy || !cloudConfigured}
            >
              Didn’t get a code? Resend email
            </button>
          )}
          <p className="auth-switch">
            {mode === "login" ? (
              <>
                New to StudyFlow?{" "}
                <button
                  className="text-button"
                  onClick={() => change("signup")}
                  disabled={busy}
                >
                  Create an account
                </button>
              </>
            ) : mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button
                  className="text-button"
                  onClick={() => change("login")}
                  disabled={busy}
                >
                  Log in
                </button>
              </>
            ) : null}
          </p>
          <div className="auth-trust">
            <LockKeyhole size={15} /> A private account. A place to make
            progress.
          </div>
        </div>
      </main>
    </div>
  );
}
