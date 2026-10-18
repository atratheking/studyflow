import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Star,
  Shuffle,
  RotateCcw,
  Volume2,
  Maximize2,
  FlipHorizontal,
  Check,
  X,
  Settings,
  Play,
  Pause,
  Lightbulb,
} from "lucide-react";
import { useStore, toggleStar, record } from "../core/store";
import { shuffle } from "../core/study";
import type { StudySet } from "../core/types";
import { Empty, Modal, useToast } from "../components/ui";
import { StudyHeader } from "../components/StudyHeader";
export function Flashcards() {
  const s = useStore();
  const { id } = useParams();
  const set = s.sets.find((x) => x.id === id);
  if (!set)
    return (
      <Empty
        title="Study set not found"
        description="Choose another set from your library."
        action="Your library"
        href="/library"
      />
    );
  return (
    <div className="study-page">
      <FlashcardViewer set={set} />
    </div>
  );
}
export function FlashcardViewer({
  set,
  preview = false,
}: {
  set: StudySet;
  preview?: boolean;
}) {
  const toast = useToast();
  const [order, setOrder] = useState(() => set.cards.map((c) => c.id));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [starred, setStarred] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [finished, setFinished] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [tracking, setTracking] = useState(!preview);
  const [options, setOptions] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [hint, setHint] = useState(false);
  const [known, setKnown] = useState(0);
  const [learning, setLearning] = useState(0);
  const start = useRef(Date.now());
  const all = order
    .map((id) => set.cards.find((c) => c.id === id))
    .filter(
      (c): c is StudySet["cards"][number] => !!c && (!starred || !!c.starred),
    );
  const card = all[Math.min(index, all.length - 1)];
  const front = reverse ? "definition" : "term";
  const back = reverse ? "term" : "definition";
  const next = useCallback(() => {
    if (!card) return;
    if (!preview)
      record(
        set.id,
        card,
        null,
        "flashcards",
        (Date.now() - start.current) / 1000,
      );
    start.current = Date.now();
    setFlipped(false);
    setHint(false);
    if (index >= all.length - 1) {
      if (preview) setIndex(0);
      else setFinished(true);
    } else setIndex((i) => i + 1);
  }, [card, preview, set.id, index, all.length]);
  const previous = useCallback(() => {
    setFlipped(false);
    setHint(false);
    setIndex((i) => Math.max(0, i - 1));
    start.current = Date.now();
  }, []);
  useEffect(() => {
    if (preview || options || finished) return;
    const key = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("input,textarea,select,[contenteditable]")
      )
        return;
      if (e.code === "Space") {
        if (
          e.target instanceof HTMLElement &&
          e.target.closest("button,a") &&
          !e.target.closest(".flash-face")
        )
          return;
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        previous();
      }
      if (e.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [next, previous, preview, options, finished]);
  useEffect(() => {
    if (!playing || finished || !card) return;
    const t = setTimeout(
      () => {
        if (flipped) next();
        else setFlipped(true);
      },
      flipped ? 2500 : 2000,
    );
    return () => clearTimeout(t);
  }, [playing, flipped, next, finished, card]);
  useEffect(
    () => () => {
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    },
    [],
  );
  function restart() {
    setFinished(false);
    setIndex(0);
    setFlipped(false);
    setHint(false);
    setKnown(0);
    setLearning(0);
    start.current = Date.now();
  }
  function assess(correct: boolean) {
    if (!card) return;
    record(
      set.id,
      card,
      correct,
      "flashcards",
      (Date.now() - start.current) / 1000,
    );
    if (correct) setKnown((n) => n + 1);
    else setLearning((n) => n + 1);
    start.current = Date.now();
    setFlipped(false);
    setHint(false);
    if (index >= all.length - 1) setFinished(true);
    else setIndex((i) => i + 1);
  }
  function randomise() {
    setShuffleOn(!shuffleOn);
    setOrder(
      shuffleOn
        ? set.cards.map((c) => c.id)
        : shuffle(set.cards.map((c) => c.id)),
    );
    restart();
    toast(shuffleOn ? "Card shuffle is off" : "Card shuffle is on");
  }
  const header = !preview && (
    <StudyHeader
      mode="flashcards"
      set={set}
      progress={`${Math.min(index + 1, all.length)} / ${all.length}`}
      onOptions={() => {
        if (!all.length) setStarred(false);
        setOptions(true);
      }}
    />
  );
  if (!all.length)
    return (
      <>
        {header}
        <div className="empty">
          <Star size={30} />
          <h2>No starred cards yet</h2>
          <p>Star terms in your set, or study all cards.</p>
          <button
            className="button primary"
            onClick={() => {
              setStarred(false);
              setOptions(false);
            }}
          >
            Study all cards
          </button>
        </div>
      </>
    );
  if (finished)
    return (
      <>
        {header}
        <div className="session-complete">
          <span className="success-circle">
            <Check size={35} />
          </span>
          <h1>Round complete!</h1>
          <p>
            You reviewed {all.length} cards.
            {tracking && ` ${known} known · ${learning} still learning.`}
          </p>
          <div className="row center gap">
            <button className="button secondary" onClick={restart}>
              <RotateCcw size={17} />
              Study again
            </button>
            <Link className="button primary" to={"/set/" + set.id + "/learn"}>
              Try Learn
              <ArrowRight size={17} />
            </Link>
          </div>
          <Link className="text-button" to={"/set/" + set.id}>
            Back to study set
          </Link>
        </div>
      </>
    );
  return (
    <>
      {header}
      <section
        className={
          "flashcard-viewer " +
          (preview ? "preview" : "") +
          (fullscreen ? " flash-fullscreen" : "")
        }
      >
        {!preview && tracking && (
          <div className="learning-counts">
            <span>
              <b>{learning}</b>Still learning
            </span>
            <span>
              Know<b>{known}</b>
            </span>
          </div>
        )}
        {!preview && !tracking && (
          <div className="flash-topline">
            <span>
              {index + 1} / {all.length}
            </span>
            <span>Flashcards</span>
          </div>
        )}
        <div className={"flashcard " + (flipped ? "flipped" : "")}>
          <button
            className="flash-face"
            aria-label="Flip flashcard"
            onClick={() => setFlipped(!flipped)}
          >
            <span className="flash-content">
              {card[
                (flipped ? back : front) === "term"
                  ? "termImage"
                  : "definitionImage"
              ] && (
                <img
                  className="flash-image"
                  src={
                    card[
                      (flipped ? back : front) === "term"
                        ? "termImage"
                        : "definitionImage"
                    ]
                  }
                  alt="Flashcard illustration"
                />
              )}
              <span className="flash-text" key={String(flipped) + card.id}>
                {card[flipped ? back : front]}
              </span>
            </span>
            <span className="flip-hint">
              Press Space or click on the card to flip
            </span>
          </button>
          <button className="card-hint" onClick={() => setHint(!hint)}>
            <Lightbulb size={17} />
            {hint
              ? card[back].slice(
                  0,
                  Math.max(1, Math.min(12, Math.ceil(card[back].length / 5))),
                ) + "…"
              : "Get a hint"}
          </button>
          <div className="flash-card-actions">
            <button
              className="icon-button"
              aria-label="Read card aloud"
              onClick={() => {
                if (!("speechSynthesis" in window)) {
                  toast("Text-to-speech is unavailable on this device");
                  return;
                }
                const utterance = new SpeechSynthesisUtterance(
                  card[flipped ? back : front],
                );
                speechSynthesis.cancel();
                speechSynthesis.speak(utterance);
              }}
            >
              <Volume2 size={19} />
            </button>
            <button
              className={"icon-button " + (card.starred ? "starred" : "")}
              aria-label={card.starred ? "Unstar card" : "Star card"}
              onClick={() => toggleStar(set.id, card.id)}
            >
              <Star size={19} fill={card.starred ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
        <div className="flash-controls">
          <label className="tracking-label">
            Track progress
            <button
              type="button"
              className={"toggle-switch " + (tracking ? "on" : "")}
              role="switch"
              aria-checked={tracking}
              aria-label="Track progress"
              onClick={() => {
                setTracking(!tracking);
                setPlaying(false);
              }}
            />
          </label>
          {tracking ? (
            <div className="recall-buttons">
              <button
                className="recall-button"
                aria-label="Still learning"
                title="Still learning"
                onClick={() => assess(false)}
              >
                <X size={26} />
              </button>
              <button
                className="recall-button know"
                aria-label="Know it"
                title="Know"
                onClick={() => assess(true)}
              >
                <Check size={26} />
              </button>
            </div>
          ) : (
            <div className="row flash-navigation">
              <button
                className="round-button"
                aria-label="Previous card"
                disabled={index === 0}
                onClick={previous}
              >
                <ArrowLeft size={20} />
              </button>
              <span>
                {index + 1} / {all.length}
              </span>
              <button
                className="round-button"
                aria-label="Next card"
                onClick={next}
              >
                <ArrowRight size={20} />
              </button>
            </div>
          )}
          <div className="row gap">
            {tracking ? (
              <button
                className="icon-button"
                aria-label="Previous card"
                disabled={!index}
                onClick={previous}
              >
                <RotateCcw size={20} />
              </button>
            ) : (
              <button
                className="icon-button"
                aria-label={playing ? "Pause flashcards" : "Play flashcards"}
                onClick={() => setPlaying(!playing)}
              >
                {playing ? <Pause size={20} /> : <Play size={20} />}
              </button>
            )}
            <button
              className={
                "icon-button " + (shuffleOn ? "flash-settings-button" : "")
              }
              aria-label="Shuffle flashcards"
              onClick={randomise}
            >
              <Shuffle size={20} />
            </button>
            {preview && (
              <>
                <button
                  className="icon-button"
                  aria-label="Flashcard options"
                  onClick={() => setOptions(true)}
                >
                  <Settings size={20} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Expand flashcards"
                  onClick={() => setFullscreen(!fullscreen)}
                >
                  <Maximize2 size={20} />
                </button>
              </>
            )}
          </div>
        </div>
        {!preview && !tracking && (
          <div className="progress-track">
            <div style={{ width: ((index + 1) / all.length) * 100 + "%" }} />
          </div>
        )}
        {fullscreen && (
          <button
            className="fullscreen-close icon-button"
            aria-label="Exit fullscreen"
            onClick={() => setFullscreen(false)}
          >
            <X size={22} />
          </button>
        )}
        {options && (
          <Modal title="Flashcard options" onClose={() => setOptions(false)}>
            <label className="field">
              Card orientation
              <select
                value={reverse ? "definition" : "term"}
                onChange={(e) => {
                  setReverse(e.target.value === "definition");
                  setFlipped(false);
                }}
              >
                <option value="term">Term first</option>
                <option value="definition">Definition first</option>
              </select>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={starred}
                onChange={(e) => {
                  setStarred(e.target.checked);
                  setOptions(false);
                  restart();
                }}
              />
              Study starred cards only
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={tracking}
                onChange={(e) => setTracking(e.target.checked)}
              />
              Track progress
            </label>
            <div className="row between gap">
              <button
                className="text-button"
                onClick={() => {
                  restart();
                  setOptions(false);
                }}
              >
                <RotateCcw size={17} />
                Restart Flashcards
              </button>
              <button
                className="button primary"
                onClick={() => setOptions(false)}
              >
                Done
              </button>
            </div>
          </Modal>
        )}
      </section>
    </>
  );
}
