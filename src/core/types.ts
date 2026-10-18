export type Card = {
  id: string;
  term: string;
  definition: string;
  starred?: boolean;
  termImage?: string;
  definitionImage?: string;
};
export type StudySet = {
  id: string;
  title: string;
  description: string;
  cards: Card[];
  created: number;
  updated: number;
  lastStudied?: number;
  sample?: boolean;
  color: string;
};
export type Folder = { id: string; name: string; setIds: string[] };
export type Review = {
  cardId: string;
  setId: string;
  repetitions: number;
  interval: number;
  ease: number;
  due: number;
  last: number;
  correct: number;
  incorrect: number;
};
export type Activity = {
  id: string;
  cardId: string;
  setId: string;
  at: number;
  correct: boolean | null;
  mode: string;
  seconds: number;
};
export type Settings = {
  name: string;
  theme: "light" | "dark" | "system";
  strict: boolean;
  dailyGoal: number;
};
export type State = {
  sets: StudySet[];
  folders: Folder[];
  reviews: Record<string, Review>;
  activity: Activity[];
  best: Record<string, number>;
  settings: Settings;
  draft: StudySet | null;
  version: 1;
};
export const uid = () => crypto.randomUUID();
