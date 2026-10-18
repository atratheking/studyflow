import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  RotateCcw,
  Brain,
  PenLine,
  Eye,
  Settings2,
  Timer,
  Volume2,
} from "lucide-react";
import { useStore, record } from "../core/store";
import { choices, isCorrect, priority } from "../core/study";
import { uid, type StudySet, type Card } from "../core/types";
import { StudyHeader } from "../components/StudyHeader";
import { Empty, Modal } from "../components/ui";
export function Practice({
  mode = "learn",
}: {
  mode?: "learn" | "write" | "review";
}) {
  const s = useStore();
  const { id } = useParams();
  const initial = useMemo(() => {
    if (mode === "review") {
      const cards = s.sets.flatMap((x) =>
        x.cards.filter((c) => s.reviews[c.id]?.due <= Date.now()),
      );
      return {
        id: "daily-reviews",
        title: "Daily review",
        description: "",
        color: "",
        created: 0,
        updated: 0,
        cards,
      };
    }
    return s.sets.find((x) => x.id === id);
  }, [id, mode]);
  if (!initial)
    return (
      <Empty
        title="Study set not found"
        description="Choose a set to practise."
        action="Your library"
        href="/library"
      />
    );
  if (!initial.cards.length)
    return (
      <Empty
        title="You’re all caught up"
        description="When your reviewed cards are due, they’ll be waiting here. Study any set to begin building your schedule."
        action="Explore your library"
        href="/library"
      />
    );
  return (
    <PracticeSession key={initial.id + mode} initial={initial} mode={mode} />
  );
}
function PracticeSession({
  initial,
  mode,
}: {
  initial: StudySet;
  mode: "learn" | "write" | "review";
}) {
  const s = useStore();
  const [cards] = useState(() => {
    const ordered = priority(initial.cards, s.reviews);
    if (mode !== "learn") return ordered;
    const learning = ordered.filter(
      (c) =>
        !s.reviews[c.id] ||
        s.reviews[c.id].repetitions < 3 ||
        s.reviews[c.id].due <= Date.now(),
    );
    return learning.length
      ? learning
      : ordered.slice(0, Math.min(5, ordered.length));
  });
  const [started, setStarted] = useState(mode !== "learn");
  const [sessionGoal, setSessionGoal] = useState<"cram" | "memorize">(
    "memorize",
  );
  const [queue, setQueue] = useState(() => cards.map((c) => c.id));
  const [successes, setSuccesses] = useState<Record<string, number>>({});
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    answer: string;
  } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [direction, setDirection] = useState<"term" | "definition">(
    "definition",
  );
  const [strict, setStrict] = useState(s.settings.strict);
  const [options, setOptions] = useState(false);
  const start = useRef(Date.now());
  const card = cards.find((c) => c.id === queue[0]);
  const goal = mode === "learn" && sessionGoal === "memorize" ? 2 : 1;
  const complete = cards.filter((c) => (successes[c.id] ?? 0) >= goal).length;
  const progressPoints = cards.reduce(
    (n, c) => n + Math.min(goal, successes[c.id] ?? 0),
    0,
  );
  const totalPoints = cards.length * goal;
  const written =
    mode !== "learn" ||
    questionNumber >= cards.length ||
    initial.cards.length < 2;
  const reverse = mode === "learn" && Math.floor(questionNumber / 2) % 2 === 1;
  const answerSide = reverse
    ? direction === "term"
      ? "definition"
      : "term"
    : direction;
  const promptSide = answerSide === "term" ? "definition" : "term";
  const answers = useMemo(
    () => (card ? choices(cards, card, answerSide) : []),
    [card?.id, answerSide, questionNumber],
  );
  const back = mode === "review" ? "/dashboard" : "/set/" + initial.id;
  function submit(value: string, reveal = false) {
    if (!card || feedback) return;
    const correct = !reveal && isCorrect(value, card[answerSide], strict);
    setAttempts((a) => a + 1);
    if (correct) setCorrectCount((n) => n + 1);
    setSuccesses((x) => ({
      ...x,
      [card.id]: correct ? (x[card.id] ?? 0) + 1 : 0,
    }));
    const owner =
      mode === "review"
        ? s.sets.find((x) => x.cards.some((c) => c.id === card.id))?.id
        : initial.id;
    if (owner)
      record(owner, card, correct, mode, (Date.now() - start.current) / 1000);
    setFeedback({ correct, answer: card[answerSide] });
  }
  function next() {
    if (!card || !feedback) return;
    setQuestionNumber((n) => n + 1);
    const repeat = (successes[card.id] ?? 0) < goal;
    setQueue((q) => [...q.slice(1), ...(repeat ? [card.id] : [])]);
    setAnswer("");
    setFeedback(null);
    start.current = Date.now();
  }
  function restart() {
    setQueue(cards.map((c) => c.id));
    setSuccesses({});
    setAttempts(0);
    setQuestionNumber(0);
    setCorrectCount(0);
    setFeedback(null);
    setAnswer("");
    start.current = Date.now();
  }
  return (
    <div className="study-page practice-page">
      <StudyHeader
        mode={mode}
        set={initial}
        progress={`${complete} / ${cards.length}`}
        onOptions={() => setOptions(true)}
      />
      {!started && (
        <div className="learn-goal-modal">
          <Modal
            title="Choose a goal for this session"
            onClose={() => setStarted(true)}
            wide
          >
            <p className="set-name">{initial.title}</p>
            <h2>Choose a goal for this session</h2>
            <div className="goal-choices">
              <button
                className={sessionGoal === "cram" ? "selected" : ""}
                onClick={() => setSessionGoal("cram")}
              >
                Cram for a test
                <Timer size={25} />
              </button>
              <button
                className={sessionGoal === "memorize" ? "selected" : ""}
                onClick={() => setSessionGoal("memorize")}
              >
                Memorize it all
                <Brain size={25} />
              </button>
            </div>
            <div className="goal-footer">
              <button
                className="button primary"
                onClick={() => {
                  setStarted(true);
                  start.current = Date.now();
                }}
              >
                Start Learn
                <ArrowRight size={19} />
              </button>
            </div>
          </Modal>
        </div>
      )}
      {!card ? (
        <div className="session-complete">
          <span className="success-circle">
            <Check size={35} />
          </span>
          <p className="eyebrow">SESSION COMPLETE</p>
          <h1>Look at what you know.</h1>
          <p>
            You completed {cards.length} cards with{" "}
            {attempts ? Math.round((correctCount / attempts) * 100) : 0}%
            accuracy across {attempts} attempts.
          </p>
          <p className="muted">
            Your next reviews have been scheduled automatically.
          </p>
          <div className="row center gap">
            <button className="button secondary" onClick={restart}>
              <RotateCcw size={17} />
              Practise again
            </button>
            <Link className="button primary" to={back}>
              Back to {mode === "review" ? "home" : "set"}
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div
            className="practice-progress"
            role="progressbar"
            aria-label="Successful recalls"
            aria-valuemin={0}
            aria-valuemax={totalPoints}
            aria-valuenow={progressPoints}
          >
            <span className="learning-current">{progressPoints}</span>
            <div className="progress-track">
              <div
                style={{ width: (progressPoints / totalPoints) * 100 + "%" }}
              />
            </div>
            <span className="learning-total">{totalPoints}</span>
          </div>
          <section className="question-panel">
            <div className="question-label">
              <span>{promptSide.toUpperCase()}</span>
              <button
                className="icon-button"
                aria-label="Read question aloud"
                onClick={() => {
                  if ("speechSynthesis" in window) {
                    speechSynthesis.cancel();
                    speechSynthesis.speak(
                      new SpeechSynthesisUtterance(card[promptSide]),
                    );
                  }
                }}
              >
                <Volume2 size={19} />
              </button>
            </div>
            <h2 className="question-prompt">{card[promptSide]}</h2>
            <p className="answer-label">
              {written
                ? "Type the matching " + answerSide
                : "Choose the matching " + answerSide}
            </p>
            {written ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (answer.trim()) submit(answer);
                }}
              >
                <input
                  className={
                    "written-answer " +
                    (feedback
                      ? feedback.correct
                        ? "correct-border"
                        : "incorrect-border"
                      : "")
                  }
                  autoFocus
                  key={card.id + attempts}
                  aria-label="Your answer"
                  placeholder="Type your answer here…"
                  value={answer}
                  disabled={!!feedback}
                  onChange={(e) => setAnswer(e.target.value)}
                  autoComplete="off"
                />
                <div className="row between question-actions">
                  <button
                    className="text-button"
                    type="button"
                    disabled={!!feedback}
                    onClick={() => submit("", true)}
                  >
                    <Eye size={16} />
                    Show answer / skip
                  </button>
                  {!feedback && (
                    <button
                      className="button primary"
                      disabled={!answer.trim()}
                    >
                      Check answer
                      <ArrowRight size={17} />
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="answer-grid">
                {answers.map((text, i) => (
                  <button
                    key={text}
                    className={
                      "answer-option " +
                      (feedback
                        ? text === feedback.answer
                          ? "correct-choice"
                          : text === answer
                            ? "incorrect-choice"
                            : ""
                        : "")
                    }
                    disabled={!!feedback}
                    onClick={() => {
                      setAnswer(text);
                      submit(text);
                    }}
                  >
                    <span>{i + 1}</span>
                    {text}
                  </button>
                ))}
              </div>
            )}
            {feedback && (
              <div
                className={
                  "feedback " + (feedback.correct ? "correct" : "incorrect")
                }
                role="status"
              >
                <div className="row gap">
                  {feedback.correct ? <Check size={22} /> : <X size={22} />}
                  <div>
                    <b>
                      {feedback.correct
                        ? "That’s right. Keep it going!"
                        : "You’re still learning this one."}
                    </b>
                    {!feedback.correct && (
                      <p>Correct answer: {feedback.answer}</p>
                    )}
                  </div>
                </div>
                <button className="button primary" autoFocus onClick={next}>
                  Continue
                  <ArrowRight size={17} />
                </button>
              </div>
            )}
          </section>
          <p className="practice-caption">
            {initial.title} <span>·</span>{" "}
            {mode === "learn"
              ? "Your session adapts as you learn. Missed cards come back for another try."
              : mode === "review"
                ? "Reviewing due cards with spaced repetition."
                : "Exact recall, with another chance for every missed card."}
          </p>
        </>
      )}
      {options && (
        <Modal title="Practice options" onClose={() => setOptions(false)}>
          <label className="field">
            Answer with
            <select
              value={direction}
              disabled={!!feedback}
              onChange={(e) => setDirection(e.target.value as typeof direction)}
            >
              <option value="definition">Definition</option>
              <option value="term">Term</option>
            </select>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={strict}
              onChange={(e) => setStrict(e.target.checked)}
            />
            Strict grading (case-sensitive)
          </label>
          <p className="muted small">
            Forgiving grading ignores capitalization and extra spaces. Both
            modes require the whole answer.
          </p>
          <button className="button primary" onClick={() => setOptions(false)}>
            Done
          </button>
        </Modal>
      )}
    </div>
  );
}
