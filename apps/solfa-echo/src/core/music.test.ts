import {describe, expect, it} from "vitest";
import {doMidi, homeMidi, introPitches, keyForLetter, keysFor, type Form, type Mode, type Range} from "./music";

const syllables = (mode: Mode, range: Range, form: Form = "natural") => keysFor(mode, range, form, 0).map((k) => k.syl);
const offsets = (mode: Mode, range: Range, form: Form, keyPc = 0) => {
  const keys = keysFor(mode, range, form, keyPc);
  return keys.map((k) => k.midi - keys[0].midi);
};

describe("keysFor", () => {
  it("builds the major scale with the top Do on the full range", () => {
    expect(syllables("major", 3)).toEqual(["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti", "Do"]);
    expect(offsets("major", 3, "natural")).toEqual([0, 2, 4, 5, 7, 9, 11, 12]);
    expect(keysFor("major", 3, "natural", 0).at(-1)).toMatchObject({outside: true});
  });

  it("cuts the scale at the 3rd and the 5th", () => {
    expect(syllables("major", 1)).toEqual(["Do", "Re", "Mi"]);
    expect(syllables("major", 2)).toEqual(["Do", "Re", "Mi", "Fa", "Sol"]);
    expect(syllables("minorDo", 1)).toEqual(["Do", "Re", "Me"]);
    expect(syllables("minorLa", 1)).toEqual(["La", "Ti", "Do"]);
    expect(syllables("minorLa", 2)).toEqual(["La", "Ti", "Do", "Re", "Mi"]);
    expect(syllables("chromatic", 1)).toEqual(["Do", "Di", "Re", "Ri", "Mi"]);
  });

  it("flags the altered chromatic notes with both names", () => {
    const keys = keysFor("chromatic", 3, "natural", 0);
    expect(keys).toHaveLength(13);
    expect(keys.filter((k) => k.chromatic).map((k) => `${k.syl}/${k.alt}`)).toEqual([
      "Di/Ra", "Ri/Me", "Fi/Se", "Si/Le", "Li/Te",
    ]);
  });

  it.each<[Mode, Form, string[], number[]]>([
    ["minorDo", "natural", ["Do", "Re", "Me", "Fa", "Sol", "Le", "Te", "Do"], [0, 2, 3, 5, 7, 8, 10, 12]],
    ["minorDo", "harmonic", ["Do", "Re", "Me", "Fa", "Sol", "Le", "Ti", "Do"], [0, 2, 3, 5, 7, 8, 11, 12]],
    ["minorDo", "melodic", ["Do", "Re", "Me", "Fa", "Sol", "Le", "La", "Te", "Ti", "Do"], [0, 2, 3, 5, 7, 8, 9, 10, 11, 12]],
    ["minorLa", "natural", ["La", "Ti", "Do", "Re", "Mi", "Fa", "Sol", "La"], [0, 2, 3, 5, 7, 8, 10, 12]],
    ["minorLa", "harmonic", ["La", "Ti", "Do", "Re", "Mi", "Fa", "Si", "La"], [0, 2, 3, 5, 7, 8, 11, 12]],
    ["minorLa", "melodic", ["La", "Ti", "Do", "Re", "Mi", "Fa", "Fi", "Sol", "Si", "La"], [0, 2, 3, 5, 7, 8, 9, 10, 11, 12]],
  ])("%s %s", (mode, form, syls, offs) => {
    expect(keysFor(mode, 3, form, 0).map((k) => k.syl)).toEqual(syls);
    expect(offsets(mode, 3, form)).toEqual(offs);
  });

  it("keeps Do between G3 and F♯4 in every key, with La-based home a minor 3rd below", () => {
    for (let keyPc = 0; keyPc < 12; keyPc++) {
      const d = doMidi(keyPc);
      expect(d).toBeGreaterThanOrEqual(55);
      expect(d).toBeLessThanOrEqual(66);
      expect(d % 12).toBe(keyPc);
      for (const mode of ["major", "minorDo", "chromatic"] as Mode[]) {
        for (const range of [1, 2, 3] as Range[]) {
          expect(keysFor(mode, range, "harmonic", keyPc)[0].midi).toBe(d);
        }
      }
      expect(homeMidi("minorLa", keyPc)).toBe(d - 3);
      // The scale moves with the key but keeps its shape
      expect(offsets("major", 3, "natural", keyPc)).toEqual(offsets("major", 3, "natural", 0));
    }
    expect(doMidi(0)).toBe(60);
    expect(doMidi(7)).toBe(55);
    expect(doMidi(6)).toBe(66);
  });

  it("only needs pitches the sample set covers", () => {
    for (let keyPc = 0; keyPc < 12; keyPc++) {
      for (const mode of ["major", "minorDo", "minorLa", "chromatic"] as Mode[]) {
        const {arpeggio, chord} = introPitches(mode, keyPc);
        const pitches = [...arpeggio, ...chord, ...keysFor(mode, 3, "melodic", keyPc).map((k) => k.midi)];
        expect(Math.min(...pitches)).toBeGreaterThanOrEqual(40);
        expect(Math.max(...pitches)).toBeLessThanOrEqual(81);
      }
    }
  });
});

describe("introPitches", () => {
  it("uses a major or minor 3rd to match the scale", () => {
    expect(introPitches("major", 0)).toEqual({arpeggio: [60, 64, 67, 72], chord: [48, 60, 64, 67]});
    expect(introPitches("minorDo", 0)).toEqual({arpeggio: [60, 63, 67, 72], chord: [48, 60, 63, 67]});
    expect(introPitches("minorLa", 0)).toEqual({arpeggio: [57, 60, 64, 69], chord: [45, 57, 60, 64]});
  });
});

describe("keyForLetter", () => {
  const major = keysFor("major", 3, "natural", 0);
  const doPitch = doMidi(0);

  it("maps letters to syllables, low octave first", () => {
    expect(keyForLetter(major, doPitch, "s", 0)).toBe(4);
    expect(keyForLetter(major, doPitch, "d", 0)).toBe(0);
    expect(keyForLetter(major, doPitch, "d", 0, true)).toBe(7);
  });

  it("applies a pending sharp or flat", () => {
    const chromatic = keysFor("chromatic", 3, "natural", 0);
    expect(chromatic[keyForLetter(chromatic, doPitch, "r", 0)].syl).toBe("Re");
    expect(chromatic[keyForLetter(chromatic, doPitch, "r", 1)].syl).toBe("Ri");
    expect(chromatic[keyForLetter(chromatic, doPitch, "t", -1)].syl).toBe("Li");
    expect(keyForLetter(major, doPitch, "r", 1)).toBe(-1);
  });

  it("falls back to a syllable with the same first letter", () => {
    const minor = keysFor("minorDo", 3, "natural", 0);
    expect(minor[keyForLetter(minor, doPitch, "m", 0)].syl).toBe("Me");
    const laHarmonic = keysFor("minorLa", 3, "harmonic", 0);
    expect(laHarmonic[keyForLetter(laHarmonic, doPitch, "s", 0)].syl).toBe("Si");
    const melodic = keysFor("minorDo", 3, "melodic", 0);
    expect(melodic[keyForLetter(melodic, doPitch, "l", 0)].syl).toBe("La");
    expect(melodic[keyForLetter(melodic, doPitch, "l", -1)].syl).toBe("Le");
  });
});
