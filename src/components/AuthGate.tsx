import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { LogOut, RefreshCw, Cloud, ShieldCheck } from "lucide-react";
import { supabase, createCloudPersistence } from "../core/cloud";
import { initialize, clearAccount, flush, storageStatus } from "../core/store";
import { Logo } from "./ui";
import { AuthPage } from "../pages/Auth";

type Account = { user: User | null; signOut: () => Promise<void> };
const AccountContext = createContext<Account>({
  user: null,
  signOut: async () => {},
});
export const useAccount = () => useContext(AccountContext);
export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(Boolean(supabase));
  const [loadedUser, setLoadedUser] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [problem, setProblem] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "SIGNED_OUT") location.hash = "/login";
      setUser(session?.user ?? null);
      setChecking(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let current = true;
    setLoadedUser(null);
    setProblem("");
    // This work is outside the auth event callback so token refresh cannot deadlock.
    async function open() {
      await clearAccount();
      if (!user || recovering || !current) return;
      await initialize(
        createCloudPersistence(
          user.id,
          String(
            user.user_metadata?.display_name ||
              user.email?.split("@")[0] ||
              "Student",
          ),
        ),
      );
      if (!current) return;
      if (!storageStatus().loaded)
        setProblem(
          storageStatus().error || "Could not open your cloud library.",
        );
      else setLoadedUser(user.id);
    }
    void open();
    return () => {
      current = false;
    };
  }, [user?.id, recovering, attempt]);
  async function signOut() {
    window.dispatchEvent(new Event("studyflow-save-draft"));
    await flush();
    const { error } = await supabase!.auth.signOut({ scope: "local" });
    if (error) throw error;
  }
  if (checking)
    return (
      <div className="boot-screen">
        <Logo />
        <p>Checking your account…</p>
      </div>
    );
  if (!user || recovering)
    return (
      <AuthPage recovering={recovering} onRecoveryChange={setRecovering} />
    );
  if (loadedUser !== user.id)
    return (
      <div className="auth-loading">
        <Logo />
        <Cloud size={34} />
        <h1>
          {problem
            ? "Let’s reconnect your library"
            : "Opening your cloud library…"}
        </h1>
        <p role={problem ? "alert" : undefined}>
          {problem || "Your sets and study progress are coming with you."}
        </p>
        {problem && (
          <div className="row gap">
            <button
              className="button primary"
              onClick={() => setAttempt((n) => n + 1)}
            >
              <RefreshCw size={18} />
              Try again
            </button>
            <button
              className="button secondary"
              onClick={async () => {
                const { error } = await supabase!.auth.signOut({
                  scope: "local",
                });
                if (error) setProblem(error.message);
              }}
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        )}
        <small>
          <ShieldCheck size={15} /> Only your account can access your library.
        </small>
      </div>
    );
  return (
    <AccountContext.Provider value={{ user, signOut }}>
      {children}
    </AccountContext.Provider>
  );
}
