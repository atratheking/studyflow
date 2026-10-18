import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Layers,
  Brain,
  FileCheck2,
  Grid2X2,
  PenLine,
  ChevronDown,
  X,
  Settings,
  Home,
} from "lucide-react";
import type { StudySet } from "../core/types";
const items = [
  { id: "flashcards", name: "Flashcards", icon: Layers },
  { id: "learn", name: "Learn", icon: Brain },
  { id: "test", name: "Test", icon: FileCheck2 },
  { id: "match", name: "Match", icon: Grid2X2 },
  { id: "write", name: "Write", icon: PenLine },
];
export function StudyHeader({
  mode,
  set,
  progress,
  onOptions,
}: {
  mode: string;
  set: StudySet;
  progress?: string;
  onOptions?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const m = items.find((m) => m.id === mode) ?? items[1];
  return (
    <header className="activity-header">
      <div className="activity-menu">
        <button
          className="mode-selector"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <m.icon size={23} />
          <h1>{mode === "review" ? "Daily review" : m.name}</h1>
          <ChevronDown size={18} />
        </button>
        {open && (
          <>
            <button
              className="menu-dismiss"
              aria-label="Close mode menu"
              onClick={() => setOpen(false)}
            />
            <nav className="mode-dropdown" aria-label="Study modes">
              {items.map((x) => (
                <Link
                  to={"/set/" + set.id + "/" + x.id}
                  key={x.id}
                  onClick={() => setOpen(false)}
                >
                  <x.icon size={19} />
                  {x.name}
                </Link>
              ))}
              <Link to="/dashboard">
                <Home size={18} />
                Home
              </Link>
            </nav>
          </>
        )}
      </div>
      <div className="activity-set">
        <b className="activity-progress">{progress ?? "Study at your pace"}</b>
        <Link to={mode === "review" ? "/dashboard" : "/set/" + set.id}>
          {set.title}
        </Link>
      </div>
      <div className="activity-actions">
        {onOptions && (
          <button
            className="icon-button"
            aria-label="Practice options"
            onClick={onOptions}
          >
            <Settings size={23} />
          </button>
        )}
        <Link
          className="icon-button"
          aria-label="Back to set"
          to={mode === "review" ? "/dashboard" : "/set/" + set.id}
        >
          <X size={22} />
        </Link>
      </div>
    </header>
  );
}
