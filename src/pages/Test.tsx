import { useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  FileCheck2,
  RotateCcw,
} from "lucide-react";
import { useStore, record } from "../core/store";
import {
  generateTest,
  isCorrect,
  type Question,
  type QuestionType,
} from "../core/study";
import { StudyHeader } from "../components/StudyHeader";
import { Empty, Modal } from "../components/ui";
export function Test() {
  const s = useStore();
  const { id } = useParams();
  const nav = useNavigate();
  const set = s.sets.find((x) => x.id === id);
  const [count, setCount] = useState(Math.min(10, set?.cards.length ?? 10));
  const [types, setTypes] = useState<QuestionType[]>(["choice"]);
  const [direction, setDirection] = useState<"term" | "definition">(
    "definition",
  );
  const [randomOrder, setRandom] = useState(true);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [graded, setGraded] = useState(false);
  const start = useRef(Date.now());
  if (!set)
    return (
      <Empty
        title="Study set not found"
        description="Choose a set to test yourself."
        action="Your library"
        href="/library"
      />
    );
  const grade = (q: Question) =>
    isCorrect(answers[q.id] ?? "", q.expected, s.settings.strict);
  const correct = questions?.filter(grade).length ?? 0;
  const answered = questions?.filter((q) => answers[q.id]?.trim()).length ?? 0;
  const names: Record<QuestionType, string> = {
    written: "Written",
    choice: "Multiple choice",
    boolean: "True or false",
    matching: "Matching",
  };
  return (
    <div className="study-page test-page">
      <StudyHeader
        mode="test"
        set={set}
        progress={
          questions ? `${answered} / ${questions.length}` : "Practice test"
        }
      />
      {!questions ? (
        <div className="test-config-overlay">
          <Modal title="Set up your test" onClose={() => nav("/set/" + id)}>
            <div className="test-config-title">
              <p>{set.title}</p>
              <h2>Set up your test</h2>
              <FileCheck2 size={48} />
            </div>
            <div className="test-config">
              <label className="test-config-row">
                <span>
                  Questions <small>(max {set.cards.length})</small>
                </span>
                <input
                  aria-label="Number of questions"
                  type="number"
                  min={1}
                  max={set.cards.length}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </label>
              <label className="test-config-row">
                <span>Answer with</span>
                <select
                  aria-label="Answer with"
                  value={direction}
                  onChange={(e) =>
                    setDirection(e.target.value as typeof direction)
                  }
                >
                  <option value="definition">Definition</option>
                  <option value="term">Term</option>
                </select>
              </label>
              <div className="test-config-divider" />
              {(
                ["boolean", "choice", "matching", "written"] as QuestionType[]
              ).map((t) => (
                <label className="test-config-row switch-row" key={t}>
                  <span>{names[t]}</span>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label={names[t]}
                    checked={types.includes(t)}
                    onChange={(e) =>
                      setTypes(
                        e.target.checked
                          ? [...types, t]
                          : types.filter((x) => x !== t),
                      )
                    }
                  />
                </label>
              ))}
              <label className="test-config-row switch-row">
                <span>Randomise question order</span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Randomise question order"
                  checked={randomOrder}
                  onChange={(e) => setRandom(e.target.checked)}
                />
              </label>
              <div className="row end">
                <button
                  className="button primary"
                  disabled={
                    !types.length ||
                    !Number.isInteger(count) ||
                    count < 1 ||
                    count > set.cards.length
                  }
                  onClick={() => {
                    const selected = (
                      [
                        "written",
                        "choice",
                        "boolean",
                        "matching",
                      ] as QuestionType[]
                    ).filter((t) => types.includes(t));
                    setQuestions(
                      generateTest(
                        set,
                        count,
                        selected,
                        direction,
                        randomOrder,
                      ),
                    );
                    setAnswers({});
                    setGraded(false);
                    start.current = Date.now();
                  }}
                >
                  Start test
                </button>
              </div>
            </div>
          </Modal>
        </div>
      ) : (
        <>
          {graded ? (
            <div className="test-result">
              <span className="score-circle">
                {Math.round((correct / questions.length) * 100)}
                <small>%</small>
              </span>
              <div>
                <p className="eyebrow">TEST COMPLETE</p>
                <h1>
                  {correct === questions.length
                    ? "You know your stuff."
                    : "You’re making connections."}
                </h1>
                <p className="muted">
                  {correct} correct out of {questions.length}. Review your
                  answers below.
                </p>
                <div className="row gap">
                  <button
                    className="button secondary"
                    onClick={() => {
                      setQuestions(null);
                      setGraded(false);
                    }}
                  >
                    <RotateCcw size={17} />
                    Create another test
                  </button>
                  <Link className="button primary" to={"/set/" + id + "/learn"}>
                    Keep learning
                    <ArrowRight size={17} />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="section-heading">
              <h1>Your practice test</h1>
              <span className="muted">
                {answered} / {questions.length} answered
              </span>
            </div>
          )}
          <div className="test-questions">
            {questions.map((q, i) => (
              <section
                className={
                  "test-question " +
                  (graded ? (grade(q) ? "test-correct" : "test-incorrect") : "")
                }
                key={q.id}
              >
                <div className="row between">
                  <span className="question-number">
                    {i + 1} <span>of {questions.length}</span>
                  </span>
                  <span className="tiny-label">
                    {names[q.type]}
                    {graded &&
                      (grade(q) ? <Check size={18} /> : <X size={18} />)}
                  </span>
                </div>
                <h2>{q.prompt}</h2>
                {q.type === "boolean" && (
                  <p className="truefalse-candidate">{q.candidate}</p>
                )}
                {q.type === "written" ? (
                  <input
                    aria-label={"Answer " + (i + 1)}
                    placeholder="Type your answer"
                    disabled={graded}
                    value={answers[q.id] ?? ""}
                    onChange={(e) =>
                      setAnswers({ ...answers, [q.id]: e.target.value })
                    }
                  />
                ) : q.type === "matching" ? (
                  <label className="field">
                    Choose its matching answer
                    <select
                      aria-label={"Answer " + (i + 1)}
                      disabled={graded}
                      value={answers[q.id] ?? ""}
                      onChange={(e) =>
                        setAnswers({ ...answers, [q.id]: e.target.value })
                      }
                    >
                      <option value="">Select a match</option>
                      {q.options.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="answer-grid">
                    {(q.type === "boolean" ? ["true", "false"] : q.options).map(
                      (v, j) => (
                        <label
                          className={
                            "answer-option " +
                            (answers[q.id] === v ? "selected" : "")
                          }
                          key={v}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={answers[q.id] === v}
                            disabled={graded}
                            onChange={() =>
                              setAnswers({ ...answers, [q.id]: v })
                            }
                          />
                          <span>{String.fromCharCode(65 + j)}</span>
                          {q.type === "boolean"
                            ? v === "true"
                              ? "True"
                              : "False"
                            : v}
                        </label>
                      ),
                    )}
                  </div>
                )}
                {graded && (
                  <div
                    className={
                      "feedback " + (grade(q) ? "correct" : "incorrect")
                    }
                  >
                    <b>
                      {grade(q)
                        ? "Correct"
                        : "Correct answer: " +
                          (q.type === "boolean"
                            ? q.expected === "true"
                              ? "True"
                              : "False"
                            : q.answer)}
                    </b>
                    {!grade(q) && (
                      <p>Your answer: {answers[q.id] || "Not answered"}</p>
                    )}
                  </div>
                )}
              </section>
            ))}
          </div>
          {!graded && (
            <div className="test-submit">
              <p className="muted">
                {answered < questions.length
                  ? `${questions.length - answered} unanswered questions will be marked incorrect.`
                  : "Ready when you are."}
              </p>
              <button
                className="button primary"
                onClick={() => {
                  setGraded(true);
                  const seconds =
                    (Date.now() - start.current) / 1000 / questions.length;
                  questions.forEach((q) => {
                    const card = set.cards.find((c) => c.id === q.cardId);
                    if (card) record(set.id, card, grade(q), "test", seconds);
                  });
                  document
                    .querySelector("main")
                    ?.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Submit test
                <FileCheck2 size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
