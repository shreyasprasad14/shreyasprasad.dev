// Rules shared by the solo game and Solfa Echo Live, in the browser and in the Worker: the settings,
// how a pattern grows, what counts as a right answer, playback timing and live scoring.
// Pure: no DOM, audio or clock, so both runtimes can import it.
import {samePitchClass, type Form, type Key, type Mode, type Range, type Sound} from "../core/music";

export interface SaysSettings {
  mode: Mode;
  form: Form;
  range: Range;
  // Pitch class of Do, 0 = C
  keyPc: number | "random";
  sound: Sound;
  // Practice mode: keys light up during playback (on the board, in Live) and scores aren't saved
  lights: boolean;
  // The pattern always starts on home
  startHome: boolean;
}

export const TIMING = {
  // Seconds of headroom when scheduling audio, so the first note isn't clipped
  lead: 0.1,
  // Key-setting intro, in seconds from its start: four arpeggio notes, then a chord
  introNote: 0.38,
  introStep: 0.42,
  chordAt: 1.68,
  chordLength: 1,
  introMs: 3000,
  // Silent "3 · 2 · 1 · go" before the first playback
  countStepMs: 800,
  countSteps: 4,
  // Pattern playback, in seconds
  note: 0.65,
  gap: 0.14,
  // Time allowed for each note, restarted by every correct tap
  answerMs: 5000,
  tapNote: 0.3,
  tapVolume: 0.7,
  flashMs: 140,
  successMs: 1300,
  failMs: 500,
  // Solo, with a life to spare: the pause before the missed pattern plays again
  retryMs: 1600,
  celebrateMs: 3000,
};

export const countInMs = () => TIMING.countStepMs * TIMING.countSteps;

// From scheduling the pattern to the player's turn
export const playbackMs = (length: number) =>
  Math.round((TIMING.lead + length * TIMING.note + (length - 1) * TIMING.gap) * 1000) + 150;

export type Rng = () => number;

export function isCorrect(keys: Key[], expected: number, tapped: number): boolean {
  return tapped === expected || samePitchClass(keys[expected].midi, keys[tapped].midi);
}

// One more random key, rerolled (up to 30 times) so no note sounds three times in a row
export function nextNote(keys: Key[], pattern: number[], rng: Rng): number {
  const pick = () => Math.floor(rng() * keys.length);
  const [a, b] = pattern.slice(-2);
  const repeats = (i: number) =>
    pattern.length >= 2 && samePitchClass(keys[a].midi, keys[b].midi) && samePitchClass(keys[b].midi, keys[i].midi);
  let note = pick();
  for (let tries = 0; tries < 30 && repeats(note); tries++) note = pick();
  return note;
}

// Live rounds run on server time. A round's schedule, in ms after its playAt:
// round 1 opens with the key-setting intro and count-in, then every round plays the pattern
// and opens input as the last note ends.
export const LIVE_INTRO_MS = TIMING.introMs + TIMING.countStepMs * TIMING.countSteps;

export const patternMs = (length: number) =>
  Math.round((length * TIMING.note + Math.max(0, length - 1) * TIMING.gap) * 1000);

export function liveSchedule(length: number, intro: boolean) {
  const patternAt = intro ? LIVE_INTRO_MS : 0;
  return {patternAt, inputOpensAt: patternAt + patternMs(length) + 150};
}

// 500–1000 points for a cleared round, more for a faster one, scaled up as rounds get longer
export function roundPoints(round: number, elapsedMs: number, allowedMs: number): number {
  const fraction = Math.min(1, Math.max(0, elapsedMs / allowedMs));
  return Math.round(1000 * (1 - 0.5 * fraction) * (1 + round / 10));
}

export interface Rankable {
  points: number;
  rounds: number;
  lives: number;
}

// Points first (they already reward clearing more and later rounds), then rounds cleared, then lives
export const compareStandings = (a: Rankable, b: Rankable) =>
  b.points - a.points || b.rounds - a.rounds || b.lives - a.lives;

// Sorted best first, with players who tie on all three sharing a rank (1, 2, 2, 4)
export function rank<T extends Rankable>(entries: T[]): (T & {rank: number})[] {
  const sorted = [...entries].sort(compareStandings);
  const ranked: (T & {rank: number})[] = [];
  sorted.forEach((entry, i) => {
    const previous = ranked[i - 1];
    const tied = previous !== undefined && compareStandings(previous, entry) === 0;
    ranked.push({...entry, rank: tied ? previous.rank : i + 1});
  });
  return ranked;
}
