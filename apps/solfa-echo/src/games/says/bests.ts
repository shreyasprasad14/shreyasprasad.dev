import {isMinor, type Form, type Mode, type Range} from "../../core/music";
import {isRecord, read, write} from "../../core/storage";

const BESTS_KEY = "says.bests.v1";

export type Bests = Record<string, number>;

// The minor form only changes the 6th and 7th, so it's part of the key only on the full scale.
// Extra lives make a long run easier, so they get their own bests; one life keeps the original key.
export const bestKey = (mode: Mode, form: Form, range: Range, lives = 1) =>
  `${mode}${isMinor(mode) && range === 3 ? `-${form}` : ""}|${range}${lives > 1 ? `|${lives}` : ""}`;

const isBests = (value: unknown): value is Bests =>
  isRecord(value) && Object.values(value).every((v) => Number.isInteger(v) && (v as number) >= 0);

export const loadBests = (): Bests => read(BESTS_KEY, {}, isBests);

export function saveBest(key: string, score: number) {
  const bests = loadBests();
  if (score <= (bests[key] ?? 0)) return;
  write(BESTS_KEY, {...bests, [key]: score});
}
