// Scales, keys and solfège naming. Pitches are MIDI note numbers (60 = middle C).

export type Mode = "major" | "minorDo" | "minorLa" | "chromatic";
export type Form = "natural" | "harmonic" | "melodic";
// How far the notes go above home: to the 3rd, to the 5th, or the full octave
export type Range = 1 | 2 | 3;

export interface Key {
  syl: string;
  // Enharmonic syllable for chromatic notes: Di is also Ra
  alt?: string;
  midi: number;
  // An altered note in the chromatic scale, drawn like a black key
  chromatic?: boolean;
  // Above the home octave (the top Do or La), drawn narrower and dimmer
  outside?: boolean;
}

type Degree = [syl: string, offset: number, alt?: string];

const MAJOR: Degree[] = [["Do", 0], ["Re", 2], ["Mi", 4], ["Fa", 5], ["Sol", 7], ["La", 9], ["Ti", 11]];

const CHROMATIC: Degree[] = [
  ["Do", 0], ["Di", 1, "Ra"], ["Re", 2], ["Ri", 3, "Me"], ["Mi", 4], ["Fa", 5],
  ["Fi", 6, "Se"], ["Sol", 7], ["Si", 8, "Le"], ["La", 9], ["Li", 10, "Te"], ["Ti", 11],
];

const MINOR_DO: Record<Form, Degree[]> = {
  natural: [["Do", 0], ["Re", 2], ["Me", 3], ["Fa", 5], ["Sol", 7], ["Le", 8], ["Te", 10]],
  harmonic: [["Do", 0], ["Re", 2], ["Me", 3], ["Fa", 5], ["Sol", 7], ["Le", 8], ["Ti", 11]],
  melodic: [["Do", 0], ["Re", 2], ["Me", 3], ["Fa", 5], ["Sol", 7], ["Le", 8], ["La", 9], ["Te", 10], ["Ti", 11]],
};

// Offsets from the La below Do
const MINOR_LA: Record<Form, Degree[]> = {
  natural: [["La", 0], ["Ti", 2], ["Do", 3], ["Re", 5], ["Mi", 7], ["Fa", 8], ["Sol", 10]],
  harmonic: [["La", 0], ["Ti", 2], ["Do", 3], ["Re", 5], ["Mi", 7], ["Fa", 8], ["Si", 11]],
  melodic: [["La", 0], ["Ti", 2], ["Do", 3], ["Re", 5], ["Mi", 7], ["Fa", 8], ["Fi", 9], ["Sol", 10], ["Si", 11]],
};

const RANGE_TOP: Record<Range, number> = {1: 4, 2: 7, 3: 12};

export const KEY_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

export const isMinor = (mode: Mode) => mode === "minorDo" || mode === "minorLa";

function degreesFor(mode: Mode, form: Form): Degree[] {
  switch (mode) {
    case "major":
      return MAJOR;
    case "chromatic":
      return CHROMATIC;
    case "minorDo":
      return MINOR_DO[form];
    case "minorLa":
      return MINOR_LA[form];
  }
}

// Do sits between G3 and F♯4 whatever the key, so every key is comfortable to sing
export function doMidi(keyPc: number): number {
  let midi = 60 + keyPc;
  while (midi > 66) midi -= 12;
  while (midi < 55) midi += 12;
  return midi;
}

// The bottom key of the scale: Do, or the La below it for La-based minor
export const homeMidi = (mode: Mode, keyPc: number) => doMidi(keyPc) - (mode === "minorLa" ? 3 : 0);

// The playable keys, lowest (home) first
export function keysFor(mode: Mode, range: Range, form: Form, keyPc: number): Key[] {
  const home = homeMidi(mode, keyPc);
  const degrees = degreesFor(mode, form);
  const keys: Key[] = degrees
    .filter(([, offset]) => offset <= RANGE_TOP[range])
    .map(([syl, offset, alt]) => ({
      syl,
      midi: home + offset,
      ...(alt ? {alt, chromatic: true} : {}),
    }));
  if (range === 3) keys.push({syl: degrees[0][0], midi: home + 12, outside: true});
  return keys;
}

// Home, 3rd, 5th and octave, then a chord with the home note doubled an octave down
export function introPitches(mode: Mode, keyPc: number): {arpeggio: number[]; chord: number[]} {
  const home = homeMidi(mode, keyPc);
  const third = mode === "major" || mode === "chromatic" ? 4 : 3;
  return {
    arpeggio: [home, home + third, home + 7, home + 12],
    chord: [home - 12, home, home + third, home + 7],
  };
}

// Any octave counts as the same note
export const samePitchClass = (a: number, b: number) => (((a - b) % 12) + 12) % 12 === 0;

export const keyLabel = (key: Key) => (key.alt ? `${key.syl}/${key.alt}` : key.syl);

export const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);

// Keyboard input: a letter names a syllable of the major scale, and a pending + or − moves it a semitone
const LETTER_PC: Record<string, number> = {d: 0, r: 2, m: 4, f: 5, s: 7, l: 9, t: 11};
const DO_DEGREES = ["d", "r", "m", "f", "s", "l", "t"];
const LA_DEGREES = ["l", "t", "d", "r", "m", "f", "s"];

export const isNoteLetter = (letter: string) => letter in LETTER_PC;

// The letter for scale degree 1–8 (8 is home an octave up)
export const degreeLetter = (mode: Mode, degree: number) =>
  (mode === "minorLa" ? LA_DEGREES : DO_DEGREES)[(degree - 1) % 7];

// Index of the key a letter press means, or -1. Without a modifier, a letter falls back to any
// syllable starting with it, so M finds Me in minor and S finds Si in La-based harmonic minor.
export function keyForLetter(keys: Key[], doPitch: number, letter: string, shift: -1 | 0 | 1, top = false): number {
  const target = (LETTER_PC[letter] + shift + 12) % 12;
  const indices = keys.map((_, i) => i);
  let matches = indices.filter((i) => samePitchClass(keys[i].midi - doPitch, target));
  if (matches.length === 0 && shift === 0) {
    matches = indices.filter((i) =>
      [keys[i].syl, keys[i].alt].some((syl) => syl?.[0].toLowerCase() === letter),
    );
  }
  if (matches.length === 0) return -1;
  return top ? matches[matches.length - 1] : matches[0];
}
