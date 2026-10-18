import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Folder,
  ArrowRight,
  Trash2,
  Pencil,
  Layers,
} from "lucide-react";
import { useStore, update, deleteSet, duplicateSet } from "../core/store";
import { uid, type StudySet } from "../core/types";
import {
  PageTitle,
  SetCard,
  Empty,
  Modal,
  Confirm,
  useToast,
} from "../components/ui";
export function Library({
  search = false,
  folder = false,
}: {
  search?: boolean;
  folder?: boolean;
}) {
  const s = useStore();
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState("recent");
  const [manage, setManage] = useState<StudySet | null>(null);
  const [confirm, setConfirm] = useState(false);
  const toast = useToast();
  const f = s.folders.find((x) => x.id === id);
  const studyMode = params.get("mode") ?? "";
  const term = (search ? (params.get("q") ?? "") : query).toLocaleLowerCase();
  const sets = useMemo(
    () =>
      s.sets
        .filter(
          (x) =>
            (!folder || f?.setIds.includes(x.id)) &&
            [
              x.title,
              x.description,
              ...x.cards.flatMap((c) => [c.term, c.definition]),
            ].some((t) => t.toLocaleLowerCase().includes(term)),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.title.localeCompare(b.title)
            : sort === "terms"
              ? b.cards.length - a.cards.length
              : (b.lastStudied ?? b.updated) - (a.lastStudied ?? a.updated),
        ),
    [s.sets, folder, f, term, sort],
  );
  const folders = search
    ? s.folders.filter((f) => f.name.toLocaleLowerCase().includes(term))
    : [];
  if (folder && !f)
    return (
      <Empty
        title="Folder not found"
        description="This folder may have been removed."
        action="Your folders"
        href="/folders"
      />
    );
  return (
    <>
      <div className="library-heading">
        <h1>{search ? "Search" : folder ? f!.name : "Your library"}</h1>
      </div>
      {!search && !folder && (
        <nav className="library-tabs" aria-label="Library categories">
          <Link className={!studyMode ? "selected" : ""} to="/library">
            Flashcard sets
          </Link>
          <Link to="/statistics">Activities</Link>
          <Link to="/folders">Folders</Link>
          <Link
            className={studyMode === "learn" ? "selected" : ""}
            to="/library?mode=learn"
          >
            Learn
          </Link>
          <Link
            className={studyMode === "write" ? "selected" : ""}
            to="/library?mode=write"
          >
            Write
          </Link>
          <Link
            className={studyMode === "match" ? "selected" : ""}
            to="/library?mode=match"
          >
            Games
          </Link>
          <Link
            className={studyMode === "test" ? "selected" : ""}
            to="/library?mode=test"
          >
            Practice tests
          </Link>
        </nav>
      )}
      <div className="library-toolbar">
        <select
          aria-label="Sort study sets"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="recent">Recent</option>
          <option value="name">Alphabetical</option>
          <option value="terms">Most terms</option>
        </select>
        <form
          className="input-search"
          onSubmit={(e) => {
            e.preventDefault();
            if (search) setParams({ q: query });
          }}
        >
          <input
            aria-label="Filter study sets"
            value={query}
            placeholder={
              search ? "Search sets, cards, and folders" : "Search flashcards"
            }
            onChange={(e) => {
              setQuery(e.target.value);
              if (search) setParams({ q: e.target.value });
            }}
          />
          <Search size={21} />
        </form>
      </div>
      {folders.length > 0 && (
        <section className="section">
          <h2>Folders</h2>
          <div className="folder-grid">
            {folders.map((f) => (
              <Link className="folder-card" to={"/folder/" + f.id} key={f.id}>
                <Folder size={22} />
                {f.name}
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </section>
      )}
      {sets.length ? (
        <div className="library-list">
          {sets.map((set, i) => {
            const date = new Date(
              set.lastStudied ?? set.updated,
            ).toLocaleDateString("en-US", { month: "long", year: "numeric" });
            const previous = i
              ? new Date(
                  sets[i - 1].lastStudied ?? sets[i - 1].updated,
                ).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })
              : null;
            return (
              <div key={set.id}>
                {(i === 0 || (sort === "recent" && date !== previous)) && (
                  <div className="library-month">
                    <h2>
                      {sort === "recent" ? "In " + date : "Your study sets"}
                    </h2>
                    <i />
                  </div>
                )}
                <div className="set-wrapper">
                  <SetCard set={set} mode={studyMode} />
                  <button
                    className="manage-set"
                    onClick={() => setManage(set)}
                    aria-label={"Manage " + set.title}
                  >
                    •••
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          title={
            term
              ? "No matches this time"
              : folder
                ? "This folder is ready to fill"
                : "Create your first study set"
          }
          description={
            term
              ? "Try a different term or check your spelling."
              : folder
                ? "Add a study set from your library."
                : "Your flashcards will appear here, ready when you are."
          }
          action={folder ? "Open your library" : "Create a study set"}
          href={folder ? "/library" : "/create"}
        />
      )}{" "}
      {manage && (
        <Modal title="Manage study set" onClose={() => setManage(null)}>
          <h3>{manage.title}</h3>
          <div className="action-list">
            <Link
              to={"/set/" + manage.id + "/edit"}
              onClick={() => setManage(null)}
            >
              <Pencil size={18} />
              Edit study set
            </Link>
            <button
              onClick={() => {
                duplicateSet(manage);
                setManage(null);
                toast("Study set duplicated");
              }}
            >
              <Layers size={18} />
              Duplicate study set
            </button>
            <label>
              Add to folder
              <select
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  update((s) => ({
                    ...s,
                    folders: s.folders.map((f) =>
                      f.id === e.target.value
                        ? {
                            ...f,
                            setIds: [...new Set([...f.setIds, manage.id])],
                          }
                        : f,
                    ),
                  }));
                  toast("Added to folder");
                  setManage(null);
                }}
              >
                <option value="">Choose a folder</option>
                {s.folders.map((f) => (
                  <option value={f.id} key={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="danger-text" onClick={() => setConfirm(true)}>
              <Trash2 size={18} />
              Delete study set
            </button>
          </div>
        </Modal>
      )}
      {confirm && manage && (
        <Confirm
          title="Delete this study set?"
          detail="This removes the set and its review schedule from this device. Study history is retained."
          onClose={() => setConfirm(false)}
          onConfirm={() => {
            deleteSet(manage.id);
            setManage(null);
            toast("Study set deleted");
          }}
        />
      )}
      {folder && f && (
        <section className="section">
          <h2>Organise this folder</h2>
          <p className="muted">Choose which sets belong here.</p>
          <div className="list-panel">
            {s.sets.map((set) => (
              <label className="checkbox-row" key={set.id}>
                <input
                  type="checkbox"
                  checked={f.setIds.includes(set.id)}
                  onChange={(e) =>
                    update((s) => ({
                      ...s,
                      folders: s.folders.map((x) =>
                        x.id === f.id
                          ? {
                              ...x,
                              setIds: e.target.checked
                                ? [...x.setIds, set.id]
                                : x.setIds.filter((i) => i !== set.id),
                            }
                          : x,
                      ),
                    }))
                  }
                />
                {set.title}
              </label>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
export function Folders() {
  const s = useStore();
  const [edit, setEdit] = useState<{ id?: string; name: string } | null>(null);
  const [remove, setRemove] = useState<string | null>(null);
  const [error, setError] = useState("");
  const toast = useToast();
  return (
    <>
      <PageTitle
        eyebrow="YOUR SPACE"
        title="Your folders"
        description="A little organisation goes a long way."
        action={
          <button
            className="button primary"
            onClick={() => {
              setError("");
              setEdit({ name: "" });
            }}
          >
            <Plus size={18} />
            New folder
          </button>
        }
      />
      {s.folders.length ? (
        <div className="folder-grid">
          {s.folders.map((f) => (
            <div className="folder-card folder-manage" key={f.id}>
              <Link to={"/folder/" + f.id}>
                <Folder size={26} />
                <div>
                  <h3>{f.name}</h3>
                  <span>{f.setIds.length} study sets</span>
                </div>
              </Link>
              <button
                className="icon-button"
                aria-label={"Rename " + f.name}
                onClick={() => {
                  setError("");
                  setEdit(f);
                }}
              >
                <Pencil size={16} />
              </button>
              <button
                className="icon-button"
                aria-label={"Delete " + f.name}
                onClick={() => setRemove(f.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title="Give your subjects a home"
          description="Group related study sets into folders, ready for your next session."
        />
      )}
      {edit && (
        <Modal
          title={edit.id ? "Rename folder" : "Create a folder"}
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!edit.name.trim()) {
                setError("Give your folder a name");
                return;
              }
              update((s) => ({
                ...s,
                folders: edit.id
                  ? s.folders.map((f) =>
                      f.id === edit.id ? { ...f, name: edit.name.trim() } : f,
                    )
                  : [
                      ...s.folders,
                      { id: uid(), name: edit.name.trim(), setIds: [] },
                    ],
              }));
              toast(edit.id ? "Folder renamed" : "Folder created");
              setEdit(null);
            }}
          >
            <label className="field">
              Folder name
              <input
                autoFocus
                value={edit.name}
                maxLength={100}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                placeholder="e.g. Biology, semester one"
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="row end">
              <button className="button primary" type="submit">
                {edit.id ? "Save changes" : "Create folder"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {remove && (
        <Confirm
          title="Delete this folder?"
          detail="Your study sets will stay in your library. Only the folder is removed."
          onClose={() => setRemove(null)}
          onConfirm={() => {
            update((s) => ({
              ...s,
              folders: s.folders.filter((f) => f.id !== remove),
            }));
            toast("Folder deleted");
          }}
        />
      )}
    </>
  );
}
