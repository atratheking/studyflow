import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Download,
  Upload,
  Cloud,
  LogOut,
  UserRound,
  ShieldCheck,
  Monitor,
  Sun,
  Moon,
  Check,
  Layers,
  Flame,
  Clock,
  Target,
  CalendarCheck,
  BookOpen,
} from "lucide-react";
import { useAccount } from "../components/AuthGate";
import { supabase } from "../core/cloud";
import { useStore, update, getLegacyLibrary, flush } from "../core/store";
import { localDate, streak } from "../core/study";
import { validateState, download } from "../core/import";
import type { State } from "../core/types";
import { PageTitle, Modal, useToast, Logo } from "../components/ui";
import { modes } from "./SetOverview";
export function Statistics() {
  const s = useStore();
  const cards = s.sets.flatMap((x) => x.cards);
  const graded = s.activity.filter((a) => a.correct !== null);
  const correct = graded.filter((a) => a.correct).length;
  const studied = new Set(s.activity.map((a) => a.cardId)).size;
  const mastered = cards.filter(
    (c) => (s.reviews[c.id]?.repetitions ?? 0) >= 3,
  ).length;
  const due = Object.values(s.reviews).filter(
    (r) => r.due <= Date.now(),
  ).length;
  const totalSeconds = s.activity.reduce((a, b) => a + b.seconds, 0);
  const metrics = [
    {
      icon: Layers,
      value: s.sets.length,
      label: "Study sets",
      sub: `${cards.length} flashcards in your library`,
    },
    {
      icon: BookOpen,
      value: studied,
      label: "Cards studied",
      sub: `${s.activity.length} recorded interactions`,
    },
    {
      icon: Target,
      value: graded.length
        ? Math.round((correct / graded.length) * 100) + "%"
        : "—",
      label: "Answer accuracy",
      sub: `${correct} correct of ${graded.length} answers`,
    },
    {
      icon: Flame,
      value: streak(s.activity.map((a) => a.at)),
      label: "Day streak",
      sub: "Consecutive days of studying",
    },
    {
      icon: Clock,
      value: Math.floor(totalSeconds / 60) + " min",
      label: "Time studied",
      sub: "Active time in study sessions",
    },
    {
      icon: CalendarCheck,
      value: mastered,
      label: "Mastered cards",
      sub: "Three successful spaced reviews",
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow="YOUR PROGRESS"
        title="Every session adds up."
        description="A clear picture of the work you’ve put in."
      />
      <div className="stats-grid">
        {metrics.map((m) => (
          <section className="stat-card" key={m.label}>
            <m.icon size={22} />
            <strong>{m.value}</strong>
            <h3>{m.label}</h3>
            <p>{m.sub}</p>
          </section>
        ))}
      </div>
      <section className="section">
        <div className="section-heading">
          <h2>Your last 14 days</h2>
          <span className="muted small">Study activity</span>
        </div>
        <div className="activity-days">
          {Array.from({ length: 14 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - 13 + i);
            const date = localDate(+d);
            const n = s.activity.filter((a) => localDate(a.at) === date).length;
            return (
              <div key={i} title={date + ": " + n + " interactions"}>
                <div
                  className={"activity-cell " + (n ? "has-activity" : "")}
                  style={n ? { opacity: Math.min(1, 0.35 + n / 30) } : {}}
                >
                  {n || "–"}
                </div>
                <small>{d.getDate()}</small>
              </div>
            );
          })}
        </div>
      </section>
      <section className="review-banner">
        <CalendarCheck size={29} />
        <div>
          <h2>{due} reviews due</h2>
          <p>
            {
              Object.values(s.reviews).filter(
                (r) => r.due <= Date.now() - 86400000,
              ).length
            }{" "}
            overdue · Your schedule uses SM-2 spaced repetition.
          </p>
        </div>
        <Link to="/reviews" className="button primary">
          Daily review
          <ArrowRight size={17} />
        </Link>
      </section>
      <section className="section">
        <h2>Recent activity</h2>
        <div className="list-panel">
          {s.activity.length ? (
            s.activity
              .slice(-12)
              .reverse()
              .map((a) => (
                <div className="activity-row" key={a.id}>
                  <span
                    className={
                      "activity-dot " +
                      (a.correct === false
                        ? "incorrect"
                        : a.correct
                          ? "correct"
                          : "neutral")
                    }
                  >
                    {a.correct === null ? (
                      <BookOpen size={15} />
                    ) : a.correct ? (
                      <Check size={15} />
                    ) : (
                      <Target size={15} />
                    )}
                  </span>
                  <div>
                    <b>
                      {s.sets.find((x) => x.id === a.setId)?.title ??
                        "Deleted study set"}
                    </b>
                    <p>
                      {a.mode} ·{" "}
                      {a.correct === null
                        ? "Card reviewed"
                        : a.correct
                          ? "Correct answer"
                          : "Learning in progress"}
                    </p>
                  </div>
                  <time>
                    {new Date(a.at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
              ))
          ) : (
            <p className="muted padded">
              Your first study session will appear here. A good time to start is
              now.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
export function Settings() {
  const s = useStore();
  const toast = useToast();
  const [backup, setBackup] = useState<State | null>(null);
  const [legacy, setLegacy] = useState<State | null>(null);
  useEffect(() => {
    void getLegacyLibrary().then(setLegacy);
  }, []);
  const [error, setError] = useState("");
  return (
    <>
      <PageTitle
        eyebrow="MAKE YOURSELF AT HOME"
        title="Settings"
        description="Your space. Your way of learning."
      />
      <div className="settings-layout">
        <section className="settings-section">
          <h2>Appearance</h2>
          <p className="muted">Find a comfortable place to focus.</p>
          <div className="theme-options">
            {(
              [
                { id: "light", label: "Light", icon: Sun },
                { id: "dark", label: "Dark", icon: Moon },
                { id: "system", label: "System", icon: Monitor },
              ] as const
            ).map((t) => (
              <button
                className={s.settings.theme === t.id ? "selected" : ""}
                key={t.id}
                onClick={() =>
                  update((s) => ({
                    ...s,
                    settings: { ...s.settings, theme: t.id },
                  }))
                }
              >
                <t.icon size={25} />
                {t.label}
                {s.settings.theme === t.id && <Check size={15} />}
              </button>
            ))}
          </div>
        </section>
        <section className="settings-section">
          <h2>Study preferences</h2>
          <label className="field">
            Daily card goal
            <input
              aria-label="Daily card goal"
              type="number"
              min={1}
              max={1000}
              value={s.settings.dailyGoal}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isInteger(n) && n >= 1 && n <= 1000)
                  update((s) => ({
                    ...s,
                    settings: { ...s.settings, dailyGoal: n },
                  }));
              }}
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={s.settings.strict}
              onChange={(e) =>
                update((s) => ({
                  ...s,
                  settings: { ...s.settings, strict: e.target.checked },
                }))
              }
            />
            Use strict grading by default
          </label>
          <p className="muted small">
            Forgiving grading ignores capitalization and extra whitespace.
            Strict grading is case-sensitive. Neither accepts partial or
            unrelated answers.
          </p>
        </section>
        <section className="settings-section">
          <h2>Your cloud library</h2>
          <div className="local-callout">
            <Cloud size={23} />
            <div>
              <b>Saved to your account</b>
              <p>
                Sets, folders, and learning progress are saved online to your
                private account. Sign in on another computer to load your
                library.
              </p>
            </div>
          </div>
          <p className="muted">
            You can also keep an independent backup of your library, folders,
            progress, and preferences.
          </p>
          <div className="row gap wrap">
            <button
              className="button secondary"
              onClick={() => {
                download(
                  "StudyFlow-backup-" + localDate(Date.now()) + ".json",
                  JSON.stringify(s, null, 2),
                );
                toast("Backup exported");
              }}
            >
              <Download size={17} />
              Export backup
            </button>
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  await flush();
                  location.reload();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <Cloud size={17} />
              Refresh from cloud
            </button>
            <label className="button secondary file-button">
              <Upload size={17} />
              Restore backup
              <input
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    if (f.size > 50 * 1024 * 1024)
                      throw new Error("Choose a backup under 50 MB");
                    const parsed: unknown = JSON.parse(await f.text());
                    if (!validateState(parsed))
                      throw new Error(
                        "This is not a valid StudyFlow backup. Your current library has not changed.",
                      );
                    setBackup(parsed);
                    setError("");
                  } catch (err) {
                    setError((err as Error).message);
                  }
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </section>
        {legacy && (
          <section className="settings-section">
            <h2>Previous library on this computer</h2>
            <p className="muted">
              Your earlier device library is preserved separately. Export it
              here, then use Restore backup above if you want it to replace the
              library in your signed-in account.
            </p>
            <button
              className="button secondary"
              onClick={() =>
                download(
                  "StudyFlow-previous-device-library.json",
                  JSON.stringify(legacy, null, 2),
                )
              }
            >
              <Download size={17} />
              Export previous library
            </button>
          </section>
        )}
        <section className="settings-section">
          <h2>About StudyFlow</h2>
          <p className="muted">
            Version 1.1.0 · An independent study companion for macOS and
            Windows.
          </p>
          <p className="muted small">
            Original branding and content. Not affiliated with Quizlet. All
            study tools are included without a subscription.
          </p>
          <Link to="/features" className="text-button">
            Explore your study tools
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      {backup && (
        <Modal title="Restore this backup?" onClose={() => setBackup(null)}>
          <p className="muted">
            This replaces your current library with {backup.sets.length} study
            sets and {backup.folders.length} folders. Export your current
            library first if you want to keep it.
          </p>
          <div className="row end gap">
            <button
              className="button secondary"
              onClick={() => setBackup(null)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => {
                update(() => backup);
                setBackup(null);
                toast("Backup restored");
              }}
            >
              Restore backup
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Profile() {
  const { user, signOut } = useAccount();
  const [signOutError, setSignOutError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const s = useStore();
  const [name, setName] = useState(s.settings.name);
  const toast = useToast();
  return (
    <>
      <PageTitle
        eyebrow="YOUR SPACE"
        title="Your profile"
        description="A little introduction to the person doing the learning."
      />
      <section className="profile-panel">
        <div className="avatar large">{s.settings.name[0]?.toUpperCase()}</div>
        <h2>{s.settings.name}</h2>
        <p className="muted">{user?.email || "Study engine test profile"}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              update((s) => ({
                ...s,
                settings: { ...s.settings, name: name.trim() },
              }));
              toast("Profile saved");
            }
          }}
        >
          <label className="field">
            Display name
            <input
              aria-label="Display name"
              value={name}
              required
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button className="button primary">
            Save profile
            <Check size={17} />
          </button>
        </form>
        <div className="local-callout">
          <ShieldCheck size={24} />
          <p>
            Your library belongs to your account. Your sets and progress are
            saved privately online.
          </p>
        </div>
        {user && (
          <div className="account-session">
            <span>
              Signed in as <b>{user.email}</b>
            </span>
            <button
              className="button secondary"
              disabled={leaving}
              onClick={async () => {
                setLeaving(true);
                setSignOutError("");
                try {
                  await signOut();
                } catch (e) {
                  setSignOutError((e as Error).message);
                  setLeaving(false);
                }
              }}
            >
              <LogOut size={17} />
              {leaving ? "Signing out…" : "Sign out"}
            </button>
            {signOutError && (
              <p className="error" role="alert">
                {signOutError}
              </p>
            )}
          </div>
        )}
        <Link className="text-button" to="/dashboard">
          Continue studying
          <ArrowRight size={17} />
        </Link>
      </section>
      {user && <AccountSecurity email={user.email || ""} />}
    </>
  );
}
function AccountSecurity({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  return (
    <section className="settings-section account-security">
      <h2>Account security</h2>
      <p className="muted">Change the password you use to log in.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setNotice("");
          if (password !== confirm) {
            setError("Your passwords don’t match.");
            return;
          }
          setBusy(true);
          try {
            const login = await supabase!.auth.signInWithPassword({
              email,
              password: current,
            });
            if (login.error) throw login.error;
            const result = await supabase!.auth.updateUser({ password });
            if (result.error) throw result.error;
            setCurrent("");
            setPassword("");
            setConfirm("");
            setNotice("Password changed.");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Current password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="field">
          New password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="field">
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={busy}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        <button className="button primary" disabled={busy}>
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
export function Features() {
  const s = useStore();
  return (
    <>
      <PageTitle
        eyebrow="MADE FOR THE WAY YOU LEARN"
        title="Find your study flow."
        description="Five ways to practise. One place for everything you know."
      />
      <div className="features-grid">
        {modes.map((m) => (
          <section className="feature-card" key={m.id}>
            <m.icon size={28} />
            <h2>{m.name}</h2>
            <p className="muted">{m.description}</p>
            <Link
              className="text-button"
              to={s.sets[0] ? "/set/" + s.sets[0].id + "/" + m.id : "/create"}
            >
              Try {m.name}
              <ArrowRight size={17} />
            </Link>
          </section>
        ))}
        <section className="feature-card">
          <CalendarCheck size={28} />
          <h2>Daily review</h2>
          <p className="muted">
            Real spaced repetition. A little review today, a stronger memory
            tomorrow.
          </p>
          <Link to="/reviews" className="text-button">
            See your reviews
            <ArrowRight size={17} />
          </Link>
        </section>
      </div>
      <section className="review-banner">
        <Logo small />
        <div>
          <h2>All your learning, always with you.</h2>
          <p>Your account, on macOS and Windows. No ads or study limits.</p>
        </div>
        <Link className="button primary" to="/create">
          Create a study set
          <ArrowRight size={17} />
        </Link>
      </section>
    </>
  );
}
