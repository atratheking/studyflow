import { useEffect, useState } from "react";
import {
  NavLink,
  Outlet,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  Home,
  Library,
  Folder,
  ChartNoAxesColumn,
  Plus,
  Search,
  Settings,
  CheckCheck,
  Menu,
  Layers,
  Brain,
  PenLine,
  Grid2X2,
  FileCheck2,
  Upload,
} from "lucide-react";
import { useAccount } from "./AuthGate";
import { useStore } from "../core/store";
import { Logo } from "./ui";
export function Layout() {
  const s = useStore();
  const { user } = useAccount();
  const nav = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const due = Object.values(s.reviews).filter(
    (r) => r.due <= Date.now(),
  ).length;
  const studying =
    /^\/set\/[^/]+\/(flashcards|learn|write|test|match)$/.test(
      location.pathname,
    ) || location.pathname === "/reviews";
  const editing =
    location.pathname === "/create" ||
    /^\/set\/[^/]+\/edit$/.test(location.pathname);
  const overview = /^\/set\/[^/]+$/.test(location.pathname);
  const firstSet = s.sets[0];
  const mode = (name: string) =>
    firstSet ? "/set/" + firstSet.id + "/" + name : "/create";
  const narrow = overview && !collapsed;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (studying) nav("/search");
        else document.getElementById("global-search")?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [studying]);
  useEffect(() => {
    document.querySelector("main")?.scrollTo(0, 0);
    setDrawer(false);
  }, [location.pathname]);
  return (
    <div
      className={
        "app " +
        (studying ? "study-shell " : "") +
        ((overview ? narrow : collapsed) ? "collapsed " : "") +
        (overview ? "overview-shell " : "") +
        (editing ? "editor-shell" : "")
      }
    >
      <div className="desktop-titlebar">
        <span>StudyFlow</span>
        <span className="titlebar-status">
          <span className="status-dot" />
          {user ? "Cloud connected" : "Study test fixture"}
        </span>
      </div>
      {!studying && (
        <>
          <header className="topbar">
            <div className="header-brand">
              <button
                className="icon-button menu-button"
                aria-label="Toggle sidebar"
                onClick={() => {
                  if (editing || window.innerWidth < 820) setDrawer(!drawer);
                  else setCollapsed(!collapsed);
                }}
              >
                <Menu size={23} />
              </button>
              <Link
                to="/dashboard"
                className="brand-link"
                aria-label="StudyFlow home"
              >
                <Logo />
              </Link>
            </div>
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                nav("/search?q=" + encodeURIComponent(q));
              }}
            >
              <Search size={23} />
              <input
                id="global-search"
                aria-label="Search your library"
                placeholder="Flashcard sets, terms, definitions"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </form>
            <div className="header-actions">
              <Link className="button import-header" to="/create?import=1">
                <Upload size={18} />
                Import flashcards
              </Link>
              <Link to="/create" className="create-round" aria-label="Create">
                <Plus size={29} />
              </Link>
              <Link to="/features" className="button included-header">
                All tools included
              </Link>
              <Link to="/profile" className="avatar" aria-label="Your profile">
                {s.settings.name.slice(0, 1).toUpperCase()}
              </Link>
            </div>
          </header>
          {(!editing || drawer) && (
            <aside className={"sidebar" + (drawer ? " drawer-open" : "")}>
              <nav aria-label="Main navigation">
                <NavLink to="/dashboard" title="Home">
                  <Home size={22} />
                  <span>Home</span>
                </NavLink>
                <NavLink to="/library" title="Your library">
                  <Library size={22} />
                  <span>Your library</span>
                </NavLink>
                <NavLink to="/statistics" title="Your progress">
                  <ChartNoAxesColumn size={22} />
                  <span>Your progress</span>
                </NavLink>
                <NavLink to="/reviews" title="Daily review">
                  <CheckCheck size={22} />
                  <span>Daily review</span>
                  {due > 0 && <b className="nav-count">{due}</b>}
                </NavLink>
              </nav>
              <div className="sidebar-divider" />
              <p className="nav-label">Start here</p>
              <nav className="mode-nav">
                <NavLink to={mode("flashcards")} title="Flashcards">
                  <Layers size={22} />
                  <span>Flashcards</span>
                </NavLink>
                <NavLink to={mode("learn")} title="Learn">
                  <Brain size={22} />
                  <span>Learn</span>
                </NavLink>
                <NavLink to={mode("write")} title="Write">
                  <PenLine size={22} />
                  <span>Write</span>
                </NavLink>
                <NavLink to={mode("match")} title="Games">
                  <Grid2X2 size={22} />
                  <span>Games</span>
                </NavLink>
                <NavLink to={mode("test")} title="Practice tests">
                  <FileCheck2 size={22} />
                  <span>Practice tests</span>
                </NavLink>
              </nav>
              <div className="sidebar-divider" />
              <div className="row between folder-nav-label">
                <p className="nav-label">Your folders</p>
                <Link
                  to="/folders"
                  aria-label="Manage folders"
                  className="icon-button"
                >
                  <Folder size={16} />
                </Link>
              </div>
              <div className="folder-nav">
                {s.folders.map((f) => (
                  <NavLink key={f.id} to={"/folder/" + f.id} title={f.name}>
                    <Folder size={22} />
                    <span>{f.name}</span>
                  </NavLink>
                ))}
                <Link className="add-folder" to="/folders" title="New folder">
                  <Plus size={21} />
                  <span>New folder</span>
                </Link>
              </div>
              <div className="sidebar-bottom">
                <NavLink to="/settings" title="Settings">
                  <Settings size={22} />
                  <span>Settings</span>
                </NavLink>
              </div>
            </aside>
          )}
        </>
      )}
      <main id="main-content" tabIndex={-1}>
        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
