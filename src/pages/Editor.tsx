import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Upload,
  Check,
  GripVertical,
  ImagePlus,
  LockKeyhole,
} from "lucide-react";
import { useStore, saveSet, update, flush, getState } from "../core/store";
import { uid, type Card, type StudySet } from "../core/types";
import { parseDelimited } from "../core/import";
import { Modal, Empty, useToast } from "../components/ui";
const blank = (): Card => ({ id: uid(), term: "", definition: "" });
export function Editor() {
  const s = useStore();
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const existing = s.sets.find((x) => x.id === id);
  const [draft, setDraft] = useState<StudySet>(() =>
    getState().draft && (!id || getState().draft!.id === id)
      ? getState().draft!
      : existing
        ? structuredClone(existing)
        : {
            id: uid(),
            title: "",
            description: "",
            color: "#cfd5fa",
            created: Date.now(),
            updated: Date.now(),
            cards: [blank(), blank()],
          },
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(
    () =>
      new URLSearchParams(location.hash.split("?")[1]).get("import") === "1",
  );
  const latest = useRef(draft);
  latest.current = draft;
  const committed = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      if (!committed.current) update((s) => ({ ...s, draft }));
    }, 400);
    return () => clearTimeout(t);
  }, [draft]);
  useEffect(() => {
    const saveDraft = () => {
      if (!committed.current) update((s) => ({ ...s, draft: latest.current }));
    };
    window.addEventListener("beforeunload", saveDraft);
    window.addEventListener("studyflow-save-draft", saveDraft);
    return () => {
      window.removeEventListener("beforeunload", saveDraft);
      window.removeEventListener("studyflow-save-draft", saveDraft);
      saveDraft();
    };
  }, []);
  const change = (cardId: string, key: "term" | "definition", value: string) =>
    setDraft((d) => ({
      ...d,
      cards: d.cards.map((c) => (c.id === cardId ? { ...c, [key]: value } : c)),
    }));
  async function save(practice = false) {
    if (saving) return;
    const cards = draft.cards.filter(
      (c) => c.term.trim() || c.definition.trim(),
    );
    if (!draft.title.trim()) {
      setError("Give your study set a title.");
      return;
    }
    if (
      !cards.length ||
      cards.some((c) => !c.term.trim() || !c.definition.trim())
    ) {
      setError(
        "Every card needs a term and a definition. Empty cards can be left blank.",
      );
      return;
    }
    committed.current = true;
    setSaving(true);
    saveSet({
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      cards: cards.map((c) => ({
        ...c,
        term: c.term.trim(),
        definition: c.definition.trim(),
      })),
    });
    try {
      await flush();
      toast("Study set saved");
      nav("/set/" + draft.id + (practice ? "/flashcards" : ""));
    } catch {
      committed.current = false;
      setSaving(false);
      setError(
        "Could not save this set. Export a recovery backup and try again.",
      );
    }
  }
  if (id && !existing)
    return (
      <Empty
        title="Study set not found"
        description="Return to your library to choose a set."
        action="Your library"
        href="/library"
      />
    );
  return (
    <div className="editor">
      <Link className="back-link" to={id ? "/set/" + id : "/library"}>
        <ArrowLeft size={17} />
        Back to {id ? "study set" : "library"}
      </Link>
      <div className="page-heading">
        <div>
          <h1>
            {id ? "Edit your flashcard set" : "Create a new flashcard set"}
          </h1>
        </div>
        <div className="row gap">
          <button
            className="button secondary"
            aria-label={id ? "Save changes" : "Create set"}
            disabled={saving}
            onClick={() => save(false)}
          >
            {id ? "Save changes" : "Create"}
          </button>
          <button
            className="button primary"
            disabled={saving}
            onClick={() => save(true)}
          >
            {id ? "Save and practice" : "Create and practice"}
          </button>
        </div>
      </div>
      <div className="local-visibility">
        <LockKeyhole size={15} />
        Only on this device
      </div>
      <div className="editor-meta">
        <label className="field">
          Title
          <input
            aria-label="Study set title"
            placeholder="Enter a title, like “Biology — Chapter 1”"
            value={draft.title}
            maxLength={200}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>
        <label className="field">
          Description <span className="optional">optional</span>
          <textarea
            placeholder="Add a description…"
            value={draft.description}
            maxLength={2000}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
            rows={2}
          />
        </label>
      </div>
      <div className="row between editor-tools">
        <button className="text-button" onClick={() => setImporting(true)}>
          <Upload size={17} />
          Import from text or a file
        </button>
        <span className="muted small">
          <Check size={14} />
          Draft autosaves locally · {draft.cards.length} cards
        </span>
      </div>
      {error && (
        <p className="feedback incorrect" role="alert">
          {error}
        </p>
      )}
      <div className="editor-cards">
        {draft.cards.map((c, i) => (
          <section className="editor-card" key={c.id}>
            <div className="editor-card-header">
              <span>{i + 1}</span>
              <div className="row">
                <button
                  className="icon-button"
                  aria-label={"Move card " + (i + 1) + " up"}
                  disabled={i === 0}
                  onClick={() =>
                    setDraft((d) => {
                      const cards = [...d.cards];
                      [cards[i - 1], cards[i]] = [cards[i], cards[i - 1]];
                      return { ...d, cards };
                    })
                  }
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={"Move card " + (i + 1) + " down"}
                  disabled={i === draft.cards.length - 1}
                  onClick={() =>
                    setDraft((d) => {
                      const cards = [...d.cards];
                      [cards[i + 1], cards[i]] = [cards[i], cards[i + 1]];
                      return { ...d, cards };
                    })
                  }
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={"Duplicate card " + (i + 1)}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      cards: [
                        ...d.cards.slice(0, i + 1),
                        { ...c, id: uid() },
                        ...d.cards.slice(i + 1),
                      ],
                    }))
                  }
                >
                  <Copy size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={"Remove card " + (i + 1)}
                  disabled={draft.cards.length === 1}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      cards: d.cards.filter((x) => x.id !== c.id),
                    }))
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="editor-fields">
              <label>
                <ImageField
                  value={c.termImage}
                  label={"Term image " + (i + 1)}
                  onChange={(value) =>
                    setDraft((d) => ({
                      ...d,
                      cards: d.cards.map((x) =>
                        x.id === c.id ? { ...x, termImage: value } : x,
                      ),
                    }))
                  }
                />
                <div className="editor-text-field">
                  <textarea
                    aria-label={"Term " + (i + 1)}
                    placeholder="Enter term"
                    value={c.term}
                    onChange={(e) => change(c.id, "term", e.target.value)}
                    rows={2}
                  />
                  <span>TERM</span>
                </div>
              </label>
              <label>
                <div className="editor-text-field">
                  <textarea
                    aria-label={"Definition " + (i + 1)}
                    placeholder="Enter definition"
                    value={c.definition}
                    onChange={(e) => change(c.id, "definition", e.target.value)}
                    rows={2}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        setDraft((d) => ({
                          ...d,
                          cards: [...d.cards, blank()],
                        }));
                      }
                    }}
                  />
                  <span>DEFINITION</span>
                </div>
                <ImageField
                  value={c.definitionImage}
                  label={"Definition image " + (i + 1)}
                  onChange={(value) =>
                    setDraft((d) => ({
                      ...d,
                      cards: d.cards.map((x) =>
                        x.id === c.id ? { ...x, definitionImage: value } : x,
                      ),
                    }))
                  }
                />
              </label>
            </div>
          </section>
        ))}
      </div>
      <button
        className="add-card"
        onClick={() =>
          setDraft((d) => ({ ...d, cards: [...d.cards, blank()] }))
        }
      >
        <Plus size={20} />
        Add a card
      </button>
      <div className="row between editor-bottom">
        <span className="muted small">
          Tip: ⌘ / Ctrl + Enter adds a new card.
        </span>
        <button
          className="button primary"
          aria-label={id ? "Save changes" : "Create set"}
          disabled={saving}
          onClick={() => save(false)}
        >
          {id ? "Save changes" : "Create"}
        </button>
      </div>
      {importing && (
        <ImportDialog
          onClose={() => setImporting(false)}
          onImport={(cards) => {
            setDraft((d) => ({
              ...d,
              cards: [
                ...d.cards.filter((c) => c.term.trim() || c.definition.trim()),
                ...cards,
              ],
            }));
            setImporting(false);
            toast(`${cards.length} cards imported`);
          }}
        />
      )}
    </div>
  );
}
export function ImportDialog({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (cards: Card[]) => void;
}) {
  const [text, setText] = useState("");
  const [delimiter, setDelimiter] = useState("\t");
  const [fileError, setFileError] = useState("");
  const preview = useMemo(() => {
    if (!text.trim()) return { cards: [], error: "" };
    try {
      return { cards: parseDelimited(text, delimiter), error: "" };
    } catch (e) {
      return { cards: [], error: (e as Error).message };
    }
  }, [text, delimiter]);
  return (
    <Modal title="Import your flashcards" onClose={onClose} wide>
      <p className="muted">
        Paste two columns, or choose a CSV / TSV file. Your first column is the
        term; the second is its definition.
      </p>
      <div className="row between gap">
        <label className="field">
          Separate term and definition with
          <select
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value)}
          >
            <option value={"\t"}>Tab</option>
            <option value=",">Comma</option>
            <option value=";">Semicolon</option>
          </select>
        </label>
        <label className="button secondary file-button">
          <Upload size={17} />
          Choose file
          <input
            type="file"
            accept=".csv,.tsv,.txt,text/plain,text/csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 10 * 1024 * 1024) {
                setFileError("Choose a file under 10 MB");
                return;
              }
              setFileError("");
              setDelimiter(file.name.endsWith(".csv") ? "," : "\t");
              setText(await file.text());
            }}
          />
        </label>
      </div>
      <textarea
        aria-label="Import text"
        className="import-text"
        rows={7}
        placeholder={"Term\tDefinition\nCell\tThe smallest unit of life"}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {(preview.error || fileError) && (
        <p role="alert" className="error">
          {preview.error || fileError}
        </p>
      )}
      {preview.cards.length > 0 && (
        <div className="import-preview">
          <h3>Preview · {preview.cards.length} cards</h3>
          {preview.cards.slice(0, 5).map((c) => (
            <div className="term-row" key={c.id}>
              <b>{c.term}</b>
              <span>{c.definition}</span>
            </div>
          ))}
          {preview.cards.length > 5 && (
            <p className="muted small">
              And {preview.cards.length - 5} more cards.
            </p>
          )}
        </div>
      )}
      <div className="row end gap">
        <button className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="button primary"
          disabled={!preview.cards.length || !!fileError}
          onClick={() => onImport(preview.cards)}
        >
          Import {preview.cards.length || ""} cards
        </button>
      </div>
    </Modal>
  );
}

function ImageField({
  value,
  label,
  onChange,
}: {
  value?: string;
  label: string;
  onChange: (value: string | undefined) => void;
}) {
  const toast = useToast();
  return (
    <div className="image-field">
      {value ? (
        <>
          <img src={value} alt={label} />
          <button
            type="button"
            aria-label={"Remove " + label}
            onClick={() => onChange(undefined)}
          >
            <Trash2 size={14} />
          </button>
        </>
      ) : (
        <label className="image-upload">
          <ImagePlus size={23} />
          <span>Image</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label={label}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (
                !["image/png", "image/jpeg", "image/webp"].includes(
                  file.type,
                ) ||
                file.size > 3 * 1024 * 1024
              ) {
                toast("Choose a PNG, JPEG, or WebP image under 3 MB");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === "string") onChange(reader.result);
              };
              reader.readAsDataURL(file);
            }}
          />
        </label>
      )}
    </div>
  );
}
