// The rules as a pure state machine: step(state, event, rng) returns the next state and the effects
// (sounds, lights, timers) for the screen to carry out. No DOM, audio or clock in here.
import type {Key} from "../../core/music";
import {countInMs, isCorrect, nextNote, playbackMs, TIMING, type Rng} from "../../shared/says-core";

// The shared rules, re-exported so the solo game has one import
export {countInMs, isCorrect, nextNote, playbackMs, TIMING, type Rng} from "../../shared/says-core";

export type Phase =
  | "idle"
  | "intro"
  | "countIn"
  | "playback"
  | "awaitingInput"
  | "roundSuccess"
  | "failing"
  | "gameOver";

export interface SaysConfig {
  keys: Key[];
  startHome: boolean;
  practice: boolean;
  // Best score so far for these settings, to decide whether this game sets a record
  prevBest: number;
}

export interface SaysState {
  phase: Phase;
  config: SaysConfig | null;
  // Indices into config.keys
  pattern: number[];
  taps: number[];
  // Set in gameOver
  failedAt?: number;
  reason?: "wrong" | "timeout";
  score?: number;
  newBest?: boolean;
}

export type SaysEvent =
  | {type: "start"; config: SaysConfig}
  | {type: "introDone"}
  | {type: "countInDone"}
  | {type: "playbackDone"}
  | {type: "tap"; index: number}
  | {type: "timeout"}
  | {type: "next"}
  | {type: "finish"}
  | {type: "quit"};

export type Effect =
  | {type: "intro"}
  | {type: "countIn"}
  | {type: "playPattern"; pattern: number[]; lights: boolean}
  | {type: "startTimer"; ms: number}
  | {type: "stopTimer"}
  | {type: "tapFeedback"; index: number; correct: boolean}
  | {type: "after"; ms: number; event: SaysEvent}
  | {type: "saveBest"; score: number}
  | {type: "celebrate"}
  | {type: "cancelAll"};

export const initialState: SaysState = {phase: "idle", config: null, pattern: [], taps: []};

export const score = (state: SaysState) => Math.max(0, state.pattern.length - 1);

const play = (state: SaysState): Effect[] => [
  {type: "playPattern", pattern: state.pattern, lights: state.config!.practice},
  {type: "after", ms: playbackMs(state.pattern.length), event: {type: "playbackDone"}},
];

function gameOver(state: SaysState, failedAt: number, reason: "wrong" | "timeout") {
  const config = state.config!;
  const final = score(state);
  const newBest = !config.practice && final > config.prevBest;
  const effects: Effect[] = [{type: "stopTimer"}];
  if (newBest) effects.push({type: "saveBest", score: final});
  // Only worth balloons when it beats an earlier score, not on the first game
  if (newBest && config.prevBest > 0) effects.push({type: "celebrate"});
  return {state: {...state, phase: "gameOver" as const, failedAt, reason, score: final, newBest}, effects};
}

export function step(state: SaysState, event: SaysEvent, rng: Rng = Math.random): {state: SaysState; effects: Effect[]} {
  const unchanged = {state, effects: []};

  if (event.type === "quit") {
    return {state: initialState, effects: [{type: "cancelAll"}]};
  }

  if (event.type === "start") {
    if (state.phase !== "idle" && state.phase !== "gameOver") return unchanged;
    const {config} = event;
    const first = config.startHome ? 0 : Math.floor(rng() * config.keys.length);
    return {
      state: {phase: "intro", config, pattern: [first], taps: []},
      effects: [
        {type: "cancelAll"},
        {type: "intro"},
        {type: "after", ms: TIMING.introMs, event: {type: "introDone"}},
      ],
    };
  }

  switch (state.phase) {
    case "intro":
      if (event.type !== "introDone") return unchanged;
      return {
        state: {...state, phase: "countIn"},
        effects: [{type: "countIn"}, {type: "after", ms: countInMs(), event: {type: "countInDone"}}],
      };

    case "countIn":
      if (event.type !== "countInDone") return unchanged;
      return {state: {...state, phase: "playback"}, effects: play(state)};

    case "playback":
      if (event.type !== "playbackDone") return unchanged;
      return {
        state: {...state, phase: "awaitingInput", taps: []},
        effects: [{type: "startTimer", ms: TIMING.answerMs}],
      };

    case "awaitingInput": {
      if (event.type === "timeout") return gameOver(state, state.taps.length, "timeout");
      if (event.type !== "tap") return unchanged;

      const {keys} = state.config!;
      if (event.index < 0 || event.index >= keys.length) return unchanged;
      const at = state.taps.length;
      const correct = isCorrect(keys, state.pattern[at], event.index);
      const next = {...state, taps: [...state.taps, event.index]};
      const feedback: Effect = {type: "tapFeedback", index: event.index, correct};

      if (!correct) {
        return {
          state: {...next, phase: "failing", failedAt: at},
          effects: [feedback, {type: "stopTimer"}, {type: "after", ms: TIMING.failMs, event: {type: "finish"}}],
        };
      }
      if (next.taps.length < state.pattern.length) {
        return {state: next, effects: [feedback, {type: "startTimer", ms: TIMING.answerMs}]};
      }
      return {
        state: {...next, phase: "roundSuccess"},
        effects: [feedback, {type: "stopTimer"}, {type: "after", ms: TIMING.successMs, event: {type: "next"}}],
      };
    }

    case "roundSuccess": {
      if (event.type !== "next") return unchanged;
      const pattern = [...state.pattern, nextNote(state.config!.keys, state.pattern, rng)];
      const next = {...state, phase: "playback" as const, pattern, taps: []};
      return {state: next, effects: play(next)};
    }

    case "failing":
      if (event.type !== "finish") return unchanged;
      return gameOver(state, state.failedAt ?? state.taps.length - 1, "wrong");

    default:
      return unchanged;
  }
}
