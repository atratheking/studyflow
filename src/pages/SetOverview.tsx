import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Copy,
  Download,
  Trash2,
  FolderPlus,
  Star,
  Layers,
  Brain,
  FileCheck2,
  Grid2X2,
  PenLine,
  ArrowRight,
  BookOpen,
  Bookmark,
  CalendarCheck,
} from "lucide-react";
import {
  useStore,
  duplicateSet,
  deleteSet,
  toggleStar,
  update,
} from "../core/store";
import { toCSV, download } from "../core/import";
import { Empty, Modal, Confirm, useToast } from "../components/ui";
import { FlashcardViewer } from "./Flashcards";
export const modes = [
  {
    id: "flashcards",
    name: "Flashcards",
    icon: Layers,
    description: "Get familiar, one card at a time.",
  },
  {
    id: "learn",
    name: "Learn",
    icon: Brain,
    description: "A practice session that adapts to you.",
  },
  {
    id: "test",
    name: "Test",
    icon: FileCheck2,
    description: "See what you know before exam day.",
  },
  {
    id: "match",
    name: "Match",
    icon: Grid2X2,
    description: "Connect ideas. Beat your best time.",
  },
  {
    id: "write",
    name: "Write",
    icon: PenLine,
    description: "Recall it in your own words.",
  },
];
export function SetOverview() {
  const s = useStore();
  const { id } = useParams();
  const set = s.sets.find((x) => x.id === id);
  const nav = useNavigate();
  const toast = useToast();
  const [action, setAction] = useState("");
  const [filter, setFilter] = useState(false);
  if (!set)
    return (
      <Empty
        title="Study set not found"
        description="This set may have been removed."
        action="Your library"
        href="/library"
      />
    );
  const mastered = set.cards.filter(
    (c) => (s.reviews[c.id]?.repetitions ?? 0) >= 3,
  ).length;
  return (
    <>
      <div className="set-overview-actions">
        <Link className="back-link" to="/library">
          <FolderPlus size={17} />
          Your library
        </Link>
        <div className="row">
          <Link to={"/set/" + id + "/edit"} className="button secondary">
            <Pencil size={16} />
            Edit set
          </Link>
          <button
            className="icon-button"
            aria-label="Add set to folder"
            onClick={() => setAction("folder")}
          >
            <Bookmark size={20} />
          </button>
          <button
            className="icon-button"
            aria-label="More set actions"
            onClick={() => setAction("menu")}
          >
            •••
          </button>
        </div>
      </div>
      <div className="set-heading">
        <div>
          <h1>{set.title}</h1>
          <p className="muted">{set.description}</p>
        </div>
      </div>
      <div className="mode-tabs">
        {modes.slice(0, 3).map((m) => (
          <Link to={"/set/" + id + "/" + m.id} key={m.id}>
            <m.icon size={22} />
            <span>{m.name}</span>
            <ArrowRight size={16} />
          </Link>
        ))}
      </div>
      <FlashcardViewer set={set} preview />
      <h2 className="games-heading">Play your way to mastery</h2>
      <div className="set-game-links">
        <Link to={"/set/" + id + "/match"}>
          <Grid2X2 size={29} />
          Match
          <ArrowRight size={18} className="push" />
        </Link>
        <Link to={"/set/" + id + "/write"}>
          <PenLine size={29} />
          Write
          <ArrowRight size={18} className="push" />
        </Link>
      </div>
      <div className="creator-line row gap">
        <span className="avatar" style={{ background: set.color }}>
          {set.sample ? <BookOpen size={19} /> : s.settings.name[0]}
        </span>
        <div>
          <p>Created by</p>
          <b>{set.sample ? "StudyFlow originals" : s.settings.name}</b>
        </div>
        <span className="muted push small">
          {set.sample
            ? "Original starter set"
            : new Date(set.created).toLocaleDateString()}
        </span>
      </div>
      <div className="set-progress row between">
        <div>
          <span className="green-dot" /> {mastered} mastered{" "}
          <span className="muted">of {set.cards.length} terms</span>
        </div>
        <Link to={"/set/" + id + "/learn"}>
          Build your knowledge
          <ArrowRight size={16} />
        </Link>
      </div>
      <section className="section">
        <div className="section-heading">
          <h2>
            Terms in this set <span className="count">{set.cards.length}</span>
          </h2>
          <button
            className={"text-button " + (filter ? "active-text" : "")}
            onClick={() => setFilter(!filter)}
          >
            <Star size={16} />
            {filter ? "Showing starred" : "Starred terms"}
          </button>
        </div>
        <div className="terms-list">
          {set.cards
            .filter((c) => !filter || c.starred)
            .map((c) => (
              <div className="term-row" key={c.id}>
                <b>{c.term}</b>
                <span>{c.definition}</span>
                <button
                  className={"icon-button " + (c.starred ? "starred" : "")}
                  aria-label={(c.starred ? "Unstar " : "Star ") + c.term}
                  onClick={() => toggleStar(set.id, c.id)}
                >
                  <Star size={18} fill={c.starred ? "currentColor" : "none"} />
                </button>
              </div>
            ))}
        </div>
        {filter && !set.cards.some((c) => c.starred) && (
          <p className="muted">
            Star a card to keep track of the terms you want to revisit.
          </p>
        )}
      </section>
      {action === "menu" && (
        <Modal title="Study set options" onClose={() => setAction("")}>
          <div className="action-list">
            <button
              onClick={() => {
                duplicateSet(set);
                toast("Set duplicated in your library");
                setAction("");
              }}
            >
              <Copy size={18} />
              Duplicate set
            </button>
            <button onClick={() => setAction("folder")}>
              <FolderPlus size={18} />
              Add to folder
            </button>
            <button
              onClick={() => {
                download(
                  set.title + ".csv",
                  toCSV(set.cards),
                  "text/csv;charset=utf-8",
                );
                toast("CSV exported");
                setAction("");
              }}
            >
              <Download size={18} />
              Export as CSV
            </button>
            <button
              onClick={() => {
                download(set.title + ".json", JSON.stringify(set, null, 2));
                toast("JSON exported");
                setAction("");
              }}
            >
              <Download size={18} />
              Export as JSON
            </button>
            <button className="danger-text" onClick={() => setAction("delete")}>
              <Trash2 size={18} />
              Delete set
            </button>
          </div>
        </Modal>
      )}
      {action === "folder" && (
        <Modal title="Add to folder" onClose={() => setAction("")}>
          {s.folders.length ? (
            <div className="action-list">
              {s.folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    update((s) => ({
                      ...s,
                      folders: s.folders.map((x) =>
                        x.id === f.id
                          ? {
                              ...x,
                              setIds: [...new Set([...x.setIds, set.id])],
                            }
                          : x,
                      ),
                    }));
                    setAction("");
                    toast("Added to " + f.name);
                  }}
                >
                  <FolderPlus size={18} />
                  {f.name}
                </button>
              ))}
            </div>
          ) : (
            <>
              <p className="muted">
                Create a folder to organise your subjects.
              </p>
              <Link to="/folders" className="button primary">
                Create a folder
              </Link>
            </>
          )}
        </Modal>
      )}
      {action === "delete" && (
        <Confirm
          title="Delete this study set?"
          detail="This removes the set and its review schedule from this device. Export a backup first if you want to keep a copy."
          onClose={() => setAction("")}
          onConfirm={() => {
            deleteSet(set.id);
            nav("/library");
            toast("Study set deleted");
          }}
        />
      )}
    </>
  );
}
