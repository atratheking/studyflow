import { Component, useEffect, useState, type ReactNode } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ToastProvider, Empty, Logo } from "./components/ui";
import { Dashboard } from "./pages/Dashboard";
import { Library, Folders } from "./pages/Library";
import { Editor } from "./pages/Editor";
import { SetOverview } from "./pages/SetOverview";
import { Flashcards } from "./pages/Flashcards";
import { Practice } from "./pages/Practice";
import { Test } from "./pages/Test";
import { Match } from "./pages/Match";
import { Statistics, Settings, Profile, Features } from "./pages/Account";
import {
  useStore,
  initialize,
  storageStatus,
  getState,
  flush,
} from "./core/store";
import { AuthGate } from "./components/AuthGate";
import { SyncProblem } from "./components/SyncProblem";
import { download } from "./core/import";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    if (this.state.error)
      return (
        <div className="boot-screen">
          <Logo />
          <h1>Let’s get you back on track.</h1>
          <p>
            The app encountered an unexpected error. Your saved library is still
            on this device.
          </p>
          <p className="muted">{this.state.error}</p>
          <button
            className="button secondary"
            onClick={() => {
              const s = getState();
              if (s)
                download("StudyFlow-recovery.json", JSON.stringify(s, null, 2));
            }}
          >
            Export recovery backup
          </button>
          <button className="button primary" onClick={() => location.reload()}>
            Reopen StudyFlow
          </button>
        </div>
      );
    return this.props.children;
  }
}
function ReadyApp() {
  const s = useStore();
  const [media, setMedia] = useState(
    () => matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const q = matchMedia("(prefers-color-scheme: dark)");
    const fn = () => setMedia(q.matches);
    q.addEventListener("change", fn);
    return () => q.removeEventListener("change", fn);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme =
      s?.settings.theme === "dark" || (s?.settings.theme === "system" && media)
        ? "dark"
        : "light";
  }, [s?.settings.theme, media]);
  if (!s)
    return (
      <div className="boot-screen">
        <Logo />
        <p>{storageStatus().error ?? "Opening your library…"}</p>
      </div>
    );
  return (
    <ToastProvider>
      <HashRouter>
        <button
          className="skip-link"
          onClick={() => document.getElementById("main-content")?.focus()}
        >
          Skip to content
        </button>
        {storageStatus().error && (
          <div role="alert" className="storage-error">
            <SyncProblem />
          </div>
        )}
        <div inert={Boolean(storageStatus().error)}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="library" element={<Library />} />
              <Route path="create" element={<Editor key="create" />} />
              <Route path="set/:id" element={<SetOverview />} />
              <Route path="set/:id/edit" element={<Editor key="edit" />} />
              <Route path="set/:id/flashcards" element={<Flashcards />} />
              <Route path="set/:id/learn" element={<Practice />} />
              <Route path="set/:id/test" element={<Test />} />
              <Route path="set/:id/match" element={<Match />} />
              <Route path="set/:id/write" element={<Practice mode="write" />} />
              <Route path="reviews" element={<Practice mode="review" />} />
              <Route path="folders" element={<Folders />} />
              <Route path="folder/:id" element={<Library folder />} />
              <Route path="search" element={<Library search />} />
              <Route path="statistics" element={<Statistics />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="features" element={<Features />} />
              <Route
                path="login"
                element={<Navigate to="/dashboard" replace />}
              />
              <Route
                path="signup"
                element={<Navigate to="/dashboard" replace />}
              />
              <Route
                path="*"
                element={
                  <Empty
                    title="Let’s find your way back"
                    description="This page isn’t in your library."
                    action="Go home"
                    href="/dashboard"
                  />
                }
              />
            </Route>
          </Routes>
        </div>
      </HashRouter>
    </ToastProvider>
  );
}
function StudyApp() {
  useEffect(
    () =>
      window.studyflowDesktop?.onBeforeClose(async () => {
        window.dispatchEvent(new Event("studyflow-save-draft"));
        try {
          await flush();
          return true;
        } catch {
          return false;
        }
      }),
    [],
  );
  return (
    <ErrorBoundary>
      <ReadyApp />
    </ErrorBoundary>
  );
}

function LocalTestApp() {
  const [, render] = useState(0);
  useEffect(() => {
    initialize().finally(() => render((n) => n + 1));
  }, []);
  return <StudyApp />;
}
export default function App() {
  // This isolated fixture build is used only by the pre-existing study engine tests.
  // Normal development and release builds always require online authentication.
  if (import.meta.env.MODE === "study-test") return <LocalTestApp />;
  return (
    <ErrorBoundary>
      <AuthGate>
        <StudyApp />
      </AuthGate>
    </ErrorBoundary>
  );
}
