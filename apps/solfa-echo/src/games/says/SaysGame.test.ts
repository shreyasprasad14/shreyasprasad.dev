import {describe, expect, it} from "vitest";
import {keysFor, samePitchClass} from "../../core/music";
import {initialState, nextNote, step, TIMING, type Effect, type Rng, type SaysConfig, type SaysEvent, type SaysState} from "./SaysGame";

const keys = keysFor("major", 3, "natural", 0); // Do Re Mi Fa Sol La Ti Do′
const config = (overrides: Partial<SaysConfig> = {}): SaysConfig => ({
  keys,
  startHome: true,
  practice: false,
  prevBest: 0,
  ...overrides,
});

// Deterministic rng that returns the given values in turn, picking key floor(v * keys.length)
const sequence = (...values: number[]): Rng => {
  let i = 0;
  return () => values[i++ % values.length];
};
const pickKey = (index: number) => (index + 0.5) / keys.length;

function run(events: SaysEvent[], rng: Rng = sequence(0), from: SaysState = initialState) {
  let state = from;
  let effects: Effect[] = [];
  for (const event of events) ({state, effects} = step(state, event, rng));
  return {state, effects};
}

const toTurn: SaysEvent[] = [{type: "introDone"}, {type: "countInDone"}, {type: "playbackDone"}];
const started = (overrides?: Partial<SaysConfig>, rng?: Rng) =>
  run([{type: "start", config: config(overrides)}, ...toTurn], rng);

describe("SaysGame", () => {
  it("plays the intro and count-in only before round 1", () => {
    const first = run([{type: "start", config: config()}]);
    expect(first.state.phase).toBe("intro");
    expect(first.effects.map((e) => e.type)).toContain("intro");

    const round1 = run([{type: "tap", index: 0}, {type: "next"}], sequence(pickKey(4)), started().state);
    expect(round1.state.phase).toBe("playback");
    expect(round1.effects.map((e) => e.type)).not.toContain("intro");
    expect(round1.effects.map((e) => e.type)).not.toContain("countIn");
  });

  it("starts on home with Always Do, or anywhere otherwise", () => {
    expect(started().state.pattern).toEqual([0]);
    expect(started({startHome: false}, sequence(pickKey(5))).state.pattern).toEqual([5]);
  });

  it("grows the same pattern by one note per round", () => {
    let {state} = started();
    const rng = sequence(pickKey(2), pickKey(4), pickKey(6));
    for (let round = 1; round <= 3; round++) {
      const before = state.pattern;
      for (const index of before) ({state} = step(state, {type: "tap", index}, rng));
      expect(state.phase).toBe("roundSuccess");
      ({state} = step(state, {type: "next"}, rng));
      expect(state.pattern.slice(0, -1)).toEqual(before);
      expect(state.pattern).toHaveLength(round + 1);
      ({state} = step(state, {type: "playbackDone"}, rng));
    }
    expect(state.pattern).toEqual([0, 2, 4, 6]);
  });

  it("never lets a note sound three times in a row, counting octaves as the same note", () => {
    // Do, then Do′: the next note may not be either Do
    const pattern = [0, 7];
    const rng = sequence(pickKey(0), pickKey(7), pickKey(0), pickKey(3));
    expect(nextNote(keys, pattern, rng)).toBe(3);

    const random = Math.random;
    for (let trial = 0; trial < 200; trial++) {
      const p = [0];
      for (let i = 0; i < 30; i++) p.push(nextNote(keys, p, random));
      for (let i = 2; i < p.length; i++) {
        const same = (a: number, b: number) => samePitchClass(keys[p[a]].midi, keys[p[b]].midi);
        expect(same(i, i - 1) && same(i - 1, i - 2)).toBe(false);
      }
    }
  });

  it("accepts the right note in any octave", () => {
    const low = run([{type: "tap", index: 7}], sequence(0), started().state);
    expect(low.state.phase).toBe("roundSuccess");
    expect(low.effects).toContainEqual({type: "tapFeedback", index: 7, correct: true});
  });

  it("ignores taps outside the player's turn", () => {
    const {state} = run([{type: "start", config: config()}, {type: "introDone"}, {type: "countInDone"}]);
    expect(state.phase).toBe("playback");
    const after = step(state, {type: "tap", index: 3});
    expect(after.state).toBe(state);
    expect(after.effects).toEqual([]);
  });

  it("restarts the answer timer after every correct tap that isn't the last", () => {
    let {state, effects} = started();
    expect(effects).toContainEqual({type: "startTimer", ms: TIMING.answerMs});
    ({state} = run([{type: "tap", index: 0}, {type: "next"}, {type: "playbackDone"}], sequence(pickKey(4)), state));
    expect(state.pattern).toEqual([0, 4]);

    ({state, effects} = step(state, {type: "tap", index: 0}));
    expect(effects).toContainEqual({type: "startTimer", ms: TIMING.answerMs});
    ({state, effects} = step(state, {type: "tap", index: 4}));
    expect(effects).toContainEqual({type: "stopTimer"});
    expect(effects.map((e) => e.type)).not.toContain("startTimer");
  });

  it("ends the game on a timeout", () => {
    const {state} = run([{type: "timeout"}], sequence(0), started().state);
    expect(state).toMatchObject({phase: "gameOver", reason: "timeout", failedAt: 0, score: 0});
  });

  it("ends the game 500 ms after a wrong tap, scoring the pattern length − 1", () => {
    let {state} = run([{type: "tap", index: 0}, {type: "next"}, {type: "playbackDone"}], sequence(pickKey(4)), started().state);
    ({state} = run([{type: "tap", index: 0}, {type: "tap", index: 4}, {type: "next"}, {type: "playbackDone"}], sequence(pickKey(2)), state));
    expect(state.pattern).toEqual([0, 4, 2]);

    const wrong = run([{type: "tap", index: 0}, {type: "tap", index: 5}], sequence(0), state);
    expect(wrong.state.phase).toBe("failing");
    expect(wrong.effects).toContainEqual({type: "after", ms: TIMING.failMs, event: {type: "finish"}});
    expect(step(wrong.state, {type: "tap", index: 2}).state).toBe(wrong.state);

    const over = step(wrong.state, {type: "finish"});
    expect(over.state).toMatchObject({phase: "gameOver", reason: "wrong", failedAt: 1, score: 2, newBest: true});
    expect(over.effects).toContainEqual({type: "saveBest", score: 2});
  });

  it("only records a best in Game mode, and only when it beats the old one", () => {
    // Complete rounds of [0] and [0, 4], then time out on [0, 4, 2]: score 2
    const threeRounds = (overrides: Partial<SaysConfig>) =>
      run(
        [
          {type: "tap", index: 0}, {type: "next"}, {type: "playbackDone"},
          {type: "tap", index: 0}, {type: "tap", index: 4}, {type: "next"}, {type: "playbackDone"},
          {type: "timeout"},
        ],
        sequence(pickKey(4), pickKey(2)),
        started(overrides).state,
      );

    const practice = threeRounds({practice: true});
    expect(practice.state).toMatchObject({score: 2, newBest: false});
    expect(practice.effects.map((e) => e.type)).not.toContain("saveBest");

    expect(threeRounds({prevBest: 2}).state.newBest).toBe(false);
    expect(threeRounds({prevBest: 0}).effects.map((e) => e.type)).toEqual(["stopTimer", "saveBest"]);
    expect(threeRounds({prevBest: 1}).effects.map((e) => e.type)).toEqual(["stopTimer", "saveBest", "celebrate"]);
  });

  it("drops everything on quit", () => {
    const {state, effects} = run([{type: "quit"}], sequence(0), started().state);
    expect(state).toEqual(initialState);
    expect(effects).toEqual([{type: "cancelAll"}]);
  });
});
