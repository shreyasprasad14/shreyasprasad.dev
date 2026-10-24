// A Live room as the client sees it: the server's messages folded into one view, plus the
// player's own taps (shown before the server confirms them).
import {useEffect, useReducer, useRef, useState} from "preact/hooks";
import type {
  ClientMsg,
  ErrorCode,
  LeaderboardMsg,
  LiveSettings,
  OverMsg,
  Phase,
  Progress,
  Result,
  RevealMsg,
  Role,
  RosterEntry,
  RoundMsg,
  ServerMsg,
  You,
} from "../shared/protocol";
import {DEFAULT_LIVE_SETTINGS} from "../shared/protocol";
import {TIMING} from "../shared/says-core";
import {Connection, socketUrl, type Status} from "./net";

export interface TapView {
  key: number;
  // null until the server says (when the player doesn't have the pattern to check locally)
  ok: boolean | null;
}

export interface Outcome {
  result: Result;
  points: number;
  livesLeft?: number;
  out?: boolean;
  expected?: number;
}

export interface RoomView {
  ready: boolean;
  code: string;
  role: Role | null;
  phase: Phase;
  settings: LiveSettings;
  keyPc: number;
  round: number;
  locked: boolean;
  roster: RosterEntry[];
  you: You | null;
  current: RoundMsg | null;
  // Host: each playing student's progress this round
  progress: Record<string, Progress>;
  // Player: this round's taps and how it went
  taps: TapView[];
  outcome: Outcome | null;
  reveal: RevealMsg | null;
  leaderboard: LeaderboardMsg | null;
  over: OverMsg | null;
  error: ErrorCode | null;
  needName: boolean;
  closed: boolean;
}

type Action = ServerMsg | {type: "localTap"; key: number; ok: boolean | null};

const initialView = (code: string): RoomView => ({
  ready: false,
  code,
  role: null,
  phase: "lobby",
  settings: DEFAULT_LIVE_SETTINGS,
  keyPc: 0,
  round: 0,
  locked: false,
  roster: [],
  you: null,
  current: null,
  progress: {},
  taps: [],
  outcome: null,
  reveal: null,
  leaderboard: null,
  over: null,
  error: null,
  needName: false,
  closed: false,
});

function outcomeFromYou(you: You): Outcome | null {
  if (!you.result) return null;
  return {result: you.result, points: you.roundPoints ?? 0, livesLeft: you.lives};
}

function reduce(view: RoomView, msg: Action): RoomView {
  switch (msg.type) {
    case "snapshot": {
      const you = msg.you ?? null;
      return {
        ...view,
        ready: true,
        code: msg.code,
        role: msg.role,
        phase: msg.phase,
        settings: msg.settings,
        keyPc: msg.keyPc,
        round: msg.round,
        locked: msg.locked,
        roster: msg.roster,
        you,
        progress: msg.progress ?? {},
        // Every tap but a missed last one was right, or the round would have ended there
        taps: (you?.taps ?? []).map((key, i, all) => ({key, ok: !(you?.result === "miss" && i === all.length - 1)})),
        outcome: you ? outcomeFromYou(you) : null,
        current: null,
        reveal: null,
        leaderboard: null,
        over: null,
        error: null,
        needName: you?.name === "",
      };
    }
    // Any of these means the last request went through, so an old error no longer applies
    case "roster":
      return {...view, roster: msg.players, locked: msg.locked, error: null};
    case "settings":
      return {...view, settings: msg.settings};
    case "round":
      // The phase within a round (intro, playback, answering) is read off the clock by stageOf
      return {
        ...view,
        phase: msg.intro ? "intro" : "playback",
        round: msg.round,
        keyPc: msg.keyPc,
        current: msg,
        reveal: null,
        leaderboard: null,
        over: null,
        error: null,
        // A snapshot mid-round already filled these in for this round
        ...(msg.round !== view.round ? {progress: {}, taps: [], outcome: null} : {}),
      };
    case "localTap":
      return {...view, taps: [...view.taps, {key: msg.key, ok: msg.ok}]};
    case "tapAck": {
      if (msg.round !== view.round) return view;
      const taps = [...view.taps];
      taps[msg.i] = {key: taps[msg.i]?.key ?? -1, ok: msg.ok};
      const outcome: Outcome | null = !msg.done
        ? view.outcome
        : msg.ok
          ? {result: "ok", points: msg.points ?? 0}
          : {result: "miss", points: 0, livesLeft: msg.livesLeft, out: msg.out, expected: msg.expected};
      return {...view, taps, outcome};
    }
    case "progress":
      return {...view, progress: {...view.progress, [msg.playerId]: {taps: msg.taps, result: msg.result}}};
    case "reveal": {
      const mine = view.you && msg.results.find((r) => r.id === view.you!.id);
      const outcome = view.outcome ?? (mine ? {result: mine.result, points: mine.points, livesLeft: mine.livesLeft} : null);
      return {...view, phase: "reveal", reveal: msg, outcome};
    }
    case "leaderboard":
      return {...view, phase: "leaderboard", leaderboard: msg};
    case "over":
      return {...view, phase: "over", over: msg};
    case "you":
      return {...view, you: msg.you, needName: msg.you.name === "" ? view.needName : false, error: null};
    case "needName":
      return {...view, needName: true};
    case "closed":
      return {...view, closed: true};
    case "error":
      return {...view, error: msg.code};
    case "time":
      return view;
  }
}

const COUNT_IN = ["3", "2", "1", "Go"];

// Errors after which reconnecting can't help
const FATAL: ErrorCode[] = ["ROOM_NOT_FOUND", "BAD_HOST_KEY", "KICKED", "ROOM_FULL", "ROOM_LOCKED"];

export function useRoom(code: string, hello: () => ClientMsg) {
  const [view, dispatch] = useReducer(reduce, code, initialView);
  const [status, setStatus] = useState<Status>("connecting");
  const connection = useRef<Connection | null>(null);
  const helloRef = useRef(hello);
  helloRef.current = hello;

  useEffect(() => {
    const conn = new Connection(
      socketUrl(code),
      () => helloRef.current(),
      (msg) => {
        dispatch(msg);
        if ((msg.type === "error" && FATAL.includes(msg.code)) || msg.type === "closed") conn.stop();
      },
      setStatus,
    );
    connection.current = conn;
    return () => conn.stop();
  }, [code]);

  // Phase changes the server makes on its own clock (input opening) are applied here on ours
  const serverNow = () => connection.current?.serverNow() ?? Date.now();

  return {
    view,
    status,
    serverNow,
    send: (msg: ClientMsg) => connection.current?.send(msg),
    localTap: (key: number, ok: boolean | null) => dispatch({type: "localTap", key, ok}),
  };
}

// Re-renders every `ms` while active, for countdowns and anything else driven by the clock
export function useTicker(active: boolean, ms = 100) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(timer);
  }, [active, ms]);
}

export type Stage =
  | {kind: "intro"; label: string}
  | {kind: "countIn"; label: string}
  | {kind: "listen"; note: number}
  | {kind: "answer"; remainingMs: number; totalMs: number}
  | {kind: "waiting"};

// Where a round is right now, from its schedule and the server clock
export function stageOf(round: RoundMsg, now: number, home: string, timePerNote: number): Stage {
  if (now < round.playAt) return {kind: "waiting"};
  if (round.intro && now < round.patternAt) {
    const sinceIntro = now - round.playAt;
    if (sinceIntro < TIMING.introMs) return {kind: "intro", label: `This is ${home}`};
    const step = Math.floor((sinceIntro - TIMING.introMs) / TIMING.countStepMs);
    return {kind: "countIn", label: COUNT_IN[Math.min(step, COUNT_IN.length - 1)]};
  }
  if (now < round.inputOpensAt) {
    const noteMs = (TIMING.note + TIMING.gap) * 1000;
    return {kind: "listen", note: Math.min(round.len - 1, Math.floor(Math.max(0, now - round.patternAt) / noteMs))};
  }
  const totalMs = round.len * timePerNote * 1000;
  return {kind: "answer", remainingMs: Math.max(0, round.inputOpensAt + totalMs - now), totalMs};
}
