import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Clock,
  Grid2X2,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { useStore, update, record } from "../core/store";
import { shuffle } from "../core/study";
import { StudyHeader } from "../components/StudyHeader";
import { Empty } from "../components/ui";
export function Match() {
  const s = useStore();
  const { id } = useParams();
  const set = s.sets.find((x) => x.id === id);
  const [round, setRound] = useState(0);
  const cards = useMemo(
    () => shuffle(set?.cards ?? []).slice(0, 6),
    [id, round],
  );
  const tiles = useMemo(
    () =>
      shuffle(
        cards.flatMap((c) => [
          { id: c.id + "-t", cardId: c.id, text: c.term, side: "t" },
          { id: c.id + "-d", cardId: c.id, text: c.definition, side: "d" },
        ]),
      ),
    [cards],
  );
  const [running, setRunning] = useState(false);
  const [matched, setMatched] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [done, setDone] = useState(false);
  const started = useRef(0);
  const lastAction = useRef(0);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!running) return;
    const t = setInterval(
      () => setElapsed((Date.now() - started.current) / 1000),
      100,
    );
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => () => clearTimeout(wrongTimer.current), []);
  if (!set)
    return (
      <Empty
        title="Study set not found"
        description="Choose a set to start matching."
        action="Your library"
        href="/library"
      />
    );
  function restart() {
    clearTimeout(wrongTimer.current);
    setRound((x) => x + 1);
    setRunning(false);
    setDone(false);
    setMatched([]);
    setSelected(null);
    setWrong([]);
    setElapsed(0);
    setPenalty(0);
  }
  function select(tile: (typeof tiles)[number]) {
    if (!running || wrong.length || matched.includes(tile.cardId)) return;
    if (selected === tile.id) {
      setSelected(null);
      return;
    }
    if (!selected) {
      setSelected(tile.id);
      return;
    }
    const previous = tiles.find((t) => t.id === selected)!;
    const correct =
      previous.cardId === tile.cardId && previous.side !== tile.side;
    const c = cards.find((c) => c.id === tile.cardId)!;
    if (correct) {
      const next = [...matched, tile.cardId];
      setMatched(next);
      setSelected(null);
      record(
        set!.id,
        c,
        true,
        "match",
        Math.max(0, (Date.now() - lastAction.current) / 1000),
      );
      lastAction.current = Date.now();
      if (next.length === cards.length) {
        const time = (Date.now() - started.current) / 1000 + penalty;
        setElapsed(time - penalty);
        setDone(true);
        setRunning(false);
        update((s) => ({
          ...s,
          best: {
            ...s.best,
            [set!.id]: Math.min(s.best[set!.id] ?? Infinity, time),
          },
        }));
      }
    } else {
      setPenalty((p) => p + 1);
      record(
        set!.id,
        c,
        false,
        "match",
        Math.max(0, (Date.now() - lastAction.current) / 1000),
      );
      lastAction.current = Date.now();
      setWrong([selected, tile.id]);
      wrongTimer.current = setTimeout(() => {
        setWrong([]);
        setSelected(null);
      }, 650);
    }
  }
  return (
    <div className="study-page match-page">
      <StudyHeader
        mode="match"
        set={set}
        progress={
          running ? `${matched.length} / ${cards.length} pairs` : "Match"
        }
      />
      {!running && !done ? (
        <section className="session-complete match-start">
          <span className="mode-large-icon">
            <Grid2X2 size={32} />
          </span>
          <p className="eyebrow">MAKE THE CONNECTION</p>
          <h1>Ready, set, match.</h1>
          <p>
            Pair each term with its definition. Clear the board as quickly as
            you can.
          </p>
          <p className="muted small">
            {cards.length} pairs · One second added for each incorrect match.
          </p>
          {s.best[set.id] !== undefined && (
            <p className="personal-best">
              <Trophy size={18} />
              Personal best: {s.best[set.id].toFixed(1)} seconds
            </p>
          )}
          <button
            className="button primary"
            onClick={() => {
              started.current = Date.now();
              lastAction.current = Date.now();
              setRunning(true);
            }}
          >
            Start game
            <Grid2X2 size={18} />
          </button>
        </section>
      ) : done ? (
        <section className="session-complete">
          <span className="success-circle">
            <Trophy size={34} />
          </span>
          <p className="eyebrow">ALL CONNECTED</p>
          <h1>{(elapsed + penalty).toFixed(1)} seconds</h1>
          <p>You matched every pair. That’s knowledge coming together.</p>
          <p className="personal-best">
            <Trophy size={18} />
            Personal best: {s.best[set.id]?.toFixed(1)} seconds
          </p>
          <div className="row center gap">
            <button className="button primary" onClick={restart}>
              <RotateCcw size={17} />
              Play again
            </button>
            <Link className="button secondary" to={"/set/" + id}>
              Back to set
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="match-info">
            <div>
              <h1>Find your match.</h1>
              <p className="muted">Select a term, then its definition.</p>
            </div>
            <div className="match-timer">
              <Clock size={21} />
              {(elapsed + penalty).toFixed(1)}
              <small>s</small>
            </div>
          </div>
          <div className="match-grid">
            {tiles.map((t) => (
              <button
                className={
                  "match-tile " +
                  (selected === t.id ? "selected " : "") +
                  (wrong.includes(t.id) ? "wrong " : "") +
                  (matched.includes(t.cardId) ? "matched" : "")
                }
                key={t.id}
                disabled={matched.includes(t.cardId)}
                onClick={() => select(t)}
              >
                {matched.includes(t.cardId) ? <Check size={27} /> : t.text}
              </button>
            ))}
          </div>
          <p className="muted center">
            {matched.length} / {cards.length} pairs matched
          </p>
        </>
      )}
    </div>
  );
}
