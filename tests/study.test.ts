import { describe, it, expect } from "vitest";
import {
  schedule,
  DAY,
  choices,
  generateTest,
  isCorrect,
  streak,
  localDate,
  priority,
} from "../src/core/study";
import { parseDelimited, toCSV, validateState } from "../src/core/import";
import { seed } from "../src/core/seed";

describe("SM-2 scheduling", () => {
  it("uses the 1-day, 6-day and ease-based successful intervals", () => {
    const a = schedule(undefined, "c", "s", 4, 0);
    const b = schedule(a, "c", "s", 4, DAY);
    const c = schedule(b, "c", "s", 4, 7 * DAY);
    expect([a.interval, b.interval, c.interval]).toEqual([1, 6, 15]);
    expect(c.due).toBe(22 * DAY);
    expect(c.repetitions).toBe(3);
    expect(c.correct).toBe(3);
  });
  it("resets a lapse while retaining history and a bounded ease", () => {
    let r = schedule(undefined, "c", "s", 4, 0);
    r = schedule(r, "c", "s", 4, DAY);
    for (let i = 0; i < 20; i++) r = schedule(r, "c", "s", 0, 2 * DAY);
    expect(r.repetitions).toBe(0);
    expect(r.interval).toBe(1);
    expect(r.ease).toBe(1.3);
    expect(r.incorrect).toBe(20);
    expect(r.correct).toBe(2);
  });
  it("rejects invalid grades", () => {
    expect(() => schedule(undefined, "c", "s", NaN)).toThrow();
    expect(() => schedule(undefined, "c", "s", 6)).toThrow();
  });
  it("prioritises unseen and missed cards ahead of stable cards", () => {
    const set = seed().sets[0];
    const stable = {
      ...schedule(undefined, set.cards[0].id, set.id, 5),
      repetitions: 4,
      due: Date.now() + DAY * 30,
    };
    const order = priority(set.cards, { [set.cards[0].id]: stable });
    expect(order.at(-1)?.id).toBe(set.cards[0].id);
  });
});
describe("grading and test generation", () => {
  it("normalises case, Unicode and whitespace without accepting unrelated answers", () => {
    expect(isCorrect("  WATER  ", "water")).toBe(true);
    expect(isCorrect("water", "Water", true)).toBe(false);
    expect(isCorrect("wat", "water")).toBe(false);
    expect(isCorrect("ａｂｃ", "abc")).toBe(true);
  });
  it("handles single-card sets and does not duplicate answer choices", () => {
    const set = seed().sets[2];
    set.cards = [set.cards[0], { ...set.cards[0], id: "other" }];
    expect(choices(set.cards, set.cards[0])).toEqual([set.cards[0].definition]);
    const q = generateTest(
      { ...set, cards: [set.cards[0]] },
      99,
      ["boolean"],
      "definition",
    );
    expect(q).toHaveLength(1);
    expect(q[0].expected).toBe("true");
  });
  it("generates every question type with unique cards and supports reverse direction", () => {
    const set = seed().sets[0];
    const q = generateTest(
      set,
      99,
      ["written", "choice", "boolean", "matching"],
      "term",
      false,
    );
    expect(q).toHaveLength(set.cards.length);
    expect(new Set(q.map((x) => x.cardId)).size).toBe(q.length);
    expect(q[0].prompt).toBe(set.cards[0].definition);
    expect(q[0].answer).toBe(set.cards[0].term);
    expect(new Set(q.map((x) => x.type)).size).toBe(4);
    expect(generateTest(set, 10, [], "term")).toEqual([]);
  });
});
describe("import/export and backup validation", () => {
  it("round trips Unicode, quotes, commas, tabs and multiline fields through CSV", () => {
    const cards = [
      { id: "x", term: 'café, "sí"', definition: "line 1\nline 2\t終わり" },
      { id: "y", term: "Hello", definition: "a,b" },
    ];
    const parsed = parseDelimited(toCSV(cards), ",");
    expect(
      parsed.map(({ term, definition }) => ({ term, definition })),
    ).toEqual(cards.map(({ term, definition }) => ({ term, definition })));
  });
  it("supports TSV, BOM and CRLF", () => {
    expect(parseDelimited("\uFEFFterm\tdefinition\r\nA\tB\r\n")).toMatchObject([
      { term: "A", definition: "B" },
    ]);
  });
  it("rejects malformed rows instead of silently discarding them", () => {
    expect(() => parseDelimited("A\t")).toThrow("Row 1");
    expect(() => parseDelimited("A\tB\tC")).toThrow();
    expect(() => parseDelimited('"unfinished,field', ",")).toThrow("unclosed");
    expect(() => parseDelimited("")).toThrow();
  });
  it("validates complete backups and rejects malformed nested data", () => {
    const s = seed();
    expect(validateState(s)).toBe(true);
    expect(
      validateState({ ...s, settings: { ...s.settings, dailyGoal: "bad" } }),
    ).toBe(false);
    expect(validateState({ ...s, reviews: { bad: {} } })).toBe(false);
    expect(validateState({ ...s, activity: [{ id: "bad" }] })).toBe(false);
    const duplicate = structuredClone(s);
    duplicate.sets[1].cards[0].id = duplicate.sets[0].cards[0].id;
    expect(validateState(duplicate)).toBe(false);
  });
});
describe("real streaks", () => {
  it("allows yesterday as the current streak and stops on gaps", () => {
    const now = new Date(2026, 9, 17, 12).getTime();
    const d = (offset: number) => {
      const x = new Date(now);
      x.setDate(x.getDate() + offset);
      return +x;
    };
    expect(streak([d(-1), d(-2), d(-4)], now)).toBe(2);
    expect(streak([], now)).toBe(0);
    expect(streak([d(0), d(-1), d(-2)], now)).toBe(3);
    expect(localDate(now)).toBe("2026-10-17");
  });
});
