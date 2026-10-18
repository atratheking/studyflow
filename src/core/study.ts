import type { Card, Review, StudySet } from "./types";
export const DAY = 86400000;
export function normalize(text: string, strict = false) {
  const s = text.normalize("NFKC").trim().replace(/\s+/g, " ");
  return strict ? s : s.toLocaleLowerCase();
}
export const isCorrect = (actual: string, expected: string, strict = false) =>
  normalize(actual, strict) === normalize(expected, strict);
export function schedule(
  previous: Review | undefined,
  cardId: string,
  setId: string,
  quality: number,
  now = Date.now(),
): Review {
  if (!Number.isFinite(quality) || quality < 0 || quality > 5)
    throw new Error("Quality must be between 0 and 5");
  const p = previous ?? {
    cardId,
    setId,
    repetitions: 0,
    interval: 0,
    ease: 2.5,
    due: now,
    last: 0,
    correct: 0,
    incorrect: 0,
  };
  const success = quality >= 3;
  const interval = success
    ? p.repetitions === 0
      ? 1
      : p.repetitions === 1
        ? 6
        : Math.ceil(p.interval * p.ease)
    : 1;
  return {
    ...p,
    repetitions: success ? p.repetitions + 1 : 0,
    interval,
    ease: Math.max(
      1.3,
      p.ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
    ),
    last: now,
    due: now + interval * DAY,
    correct: p.correct + (success ? 1 : 0),
    incorrect: p.incorrect + (success ? 0 : 1),
  };
}
export function shuffle<T>(items: T[], random = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function choices(
  cards: Card[],
  card: Card,
  direction: "term" | "definition" = "definition",
): string[] {
  return shuffle(
    [
      ...new Set([
        card[direction],
        ...shuffle(cards.filter((c) => c.id !== card.id)).map(
          (c) => c[direction],
        ),
      ]),
    ].slice(0, 4),
  );
}
export type QuestionType = "choice" | "written" | "boolean" | "matching";
export type Question = {
  id: string;
  cardId: string;
  type: QuestionType;
  prompt: string;
  answer: string;
  options: string[];
  candidate?: string;
  expected: string;
};
export function generateTest(
  set: StudySet,
  count: number,
  types: QuestionType[],
  direction: "term" | "definition",
  randomOrder = true,
): Question[] {
  if (!types.length || !set.cards.length) return [];
  const cards = (randomOrder ? shuffle(set.cards) : set.cards).slice(
    0,
    Math.max(1, Math.min(count, set.cards.length)),
  );
  return cards.map((card, i) => {
    const type = types[i % types.length];
    const distractors = set.cards.filter(
      (c) => c[direction] !== card[direction],
    );
    const candidate = (
      Math.random() < 0.5 && distractors.length ? shuffle(distractors)[0] : card
    )[direction];
    return {
      id: card.id + "-" + i,
      cardId: card.id,
      type,
      prompt: card[direction === "definition" ? "term" : "definition"],
      answer: card[direction],
      options:
        type === "matching"
          ? shuffle([...new Set(cards.map((c) => c[direction]))])
          : choices(set.cards, card, direction),
      candidate,
      expected:
        type === "boolean"
          ? String(candidate === card[direction])
          : card[direction],
    };
  });
}
export function priority(
  cards: Card[],
  reviews: Record<string, Review>,
  now = Date.now(),
): Card[] {
  return [...cards].sort((a, b) => {
    const ar = reviews[a.id],
      br = reviews[b.id];
    const score = (r: Review | undefined) =>
      !r ? -10 : (r.due - now) / DAY + r.repetitions * 2 - r.incorrect;
    return score(ar) - score(br);
  });
}
export function localDate(at: number) {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function streak(times: number[], now = Date.now()) {
  const dates = new Set(times.map(localDate));
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  if (!dates.has(localDate(+d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (dates.has(localDate(+d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
