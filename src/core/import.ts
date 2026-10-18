import { uid, type Card, type State } from "./types";
export function parseDelimited(text: string, delimiter = "\t"): Card[] {
  if (![",", "\t", ";"].includes(delimiter))
    throw new Error("Unsupported delimiter");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closed = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += c;
    } else if (c === '"' && !field && !closed) {
      quoted = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
      closed = false;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      field = "";
      closed = false;
    } else {
      if (closed && !/\s/.test(c))
        throw new Error("Unexpected text after a quoted field");
      field += c;
    }
  }
  if (quoted) throw new Error("An imported field has an unclosed quote");
  row.push(field);
  if (row.some((v) => v.trim())) rows.push(row);
  if (
    rows[0]?.length === 2 &&
    /^term$/i.test(rows[0][0].trim()) &&
    /^definition$/i.test(rows[0][1].trim())
  )
    rows.shift();
  if (!rows.length) throw new Error("Add at least one term and definition");
  return rows.map((r, i) => {
    if (r.length !== 2 || !r[0].trim() || !r[1].trim())
      throw new Error(`Row ${i + 1} needs exactly two non-empty fields`);
    return { id: uid(), term: r[0].trim(), definition: r[1].trim() };
  });
}
export function toCSV(cards: Card[]) {
  return (
    "\uFEFFterm,definition\r\n" +
    cards
      .map((c) =>
        [c.term, c.definition]
          .map((s) => '"' + s.replaceAll('"', '""') + '"')
          .join(","),
      )
      .join("\r\n")
  );
}
const obj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
export function validateState(v: unknown): v is State {
  if (
    !obj(v) ||
    v.version !== 1 ||
    !Array.isArray(v.sets) ||
    !Array.isArray(v.folders) ||
    !Array.isArray(v.activity) ||
    !obj(v.reviews) ||
    !obj(v.settings) ||
    !obj(v.best)
  )
    return false;
  const string = (x: unknown) => typeof x === "string";
  const num = (x: unknown) => typeof x === "number" && Number.isFinite(x);
  const card = (c: unknown) =>
    obj(c) &&
    string(c.id) &&
    string(c.term) &&
    string(c.definition) &&
    ["termImage", "definitionImage"].every(
      (k) =>
        c[k] === undefined ||
        (typeof c[k] === "string" &&
          /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
            c[k] as string,
          )),
    );
  const set = (s: unknown) =>
    obj(s) &&
    string(s.id) &&
    string(s.title) &&
    string(s.description) &&
    string(s.color) &&
    num(s.created) &&
    num(s.updated) &&
    Array.isArray(s.cards) &&
    s.cards.length > 0 &&
    s.cards.every(card);
  if (
    !v.sets.every(set) ||
    !v.folders.every(
      (f) =>
        obj(f) &&
        string(f.id) &&
        string(f.name) &&
        Array.isArray(f.setIds) &&
        f.setIds.every(string),
    )
  )
    return false;
  if (
    !v.activity.every(
      (a) =>
        obj(a) &&
        string(a.id) &&
        string(a.cardId) &&
        string(a.setId) &&
        string(a.mode) &&
        num(a.at) &&
        num(a.seconds) &&
        (a.correct === true || a.correct === false || a.correct === null),
    )
  )
    return false;
  if (
    !Object.values(v.reviews).every(
      (r) =>
        obj(r) &&
        ["cardId", "setId"].every((k) => string(r[k])) &&
        [
          "repetitions",
          "interval",
          "ease",
          "due",
          "last",
          "correct",
          "incorrect",
        ].every((k) => num(r[k])),
    )
  )
    return false;
  const settings = v.settings;
  if (
    !string(settings.name) ||
    !["light", "dark", "system"].includes(String(settings.theme)) ||
    typeof settings.strict !== "boolean" ||
    !num(settings.dailyGoal) ||
    Number(settings.dailyGoal) < 1
  )
    return false;
  if (!Object.values(v.best).every(num)) return false;
  if (v.draft !== null && !set(v.draft)) return false;
  const ids = v.sets.flatMap((s) =>
    (s as unknown as { cards: Card[] }).cards.map((c) => c.id),
  );
  return new Set(ids).size === ids.length;
}
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
