// Messages between Solfa Echo Live clients and the Room Durable Object. Both sides import this file,
// so the types and the guards that check what arrives can't drift apart.
import type {Form, Mode, Range, Sound} from "../core/music";
import type {Rankable, SaysSettings} from "./says-core";

export interface LiveSettings extends SaysSettings {
  // Seconds per note: a round of n notes allows n × this
  timePerNote: 3 | 5 | 8;
  // 0 = unlimited
  maxRounds: 0 | 10 | 15 | 20;
  // Also play the pattern on student devices (for headphones). Sends them the notes, so off by default.
  studentAudio: boolean;
}

export const TIMES_PER_NOTE = [3, 5, 8] as const;
export const MAX_ROUNDS = [10, 15, 20, 0] as const;

export const DEFAULT_LIVE_SETTINGS: LiveSettings = {
  mode: "major",
  form: "natural",
  range: 3,
  keyPc: 0,
  sound: "voice",
  lights: false,
  startHome: true,
  timePerNote: 5,
  maxRounds: 15,
  studentAudio: false,
};

export const LIVES = 3;
export const MAX_PLAYERS = 60;
export const MAX_MESSAGE_BYTES = 1024;

// Join codes: 4 characters with no look-alikes (no O/0, I/1, B/8, S/5, Z/2, G/6, L, Q)
export const CODE_ALPHABET = "ACDEFHJKMNPRTUVWXY3479";
export const CODE_LENGTH = 4;
export const isCode = (value: string) =>
  value.length === CODE_LENGTH && [...value].every((c) => CODE_ALPHABET.includes(c));

export type Role = "host" | "player";
export type Phase = "lobby" | "intro" | "playback" | "answering" | "reveal" | "leaderboard" | "over";
export type Result = "ok" | "miss" | "timeout";

export type ErrorCode =
  | "ROOM_NOT_FOUND"
  | "BAD_HOST_KEY"
  | "NAME_REQUIRED"
  | "NAME_INVALID"
  | "NAME_BLOCKED"
  | "NAME_TAKEN"
  | "ROOM_FULL"
  | "ROOM_LOCKED"
  | "KICKED"
  | "NOT_ENOUGH_PLAYERS"
  | "UNAVAILABLE";

// Client → server

export type ClientMsg =
  | {type: "hello"; role: "host"; hostKey: string}
  | {type: "hello"; role: "player"; playerId: string; name?: string}
  | {type: "settings"; settings: LiveSettings}
  | {type: "start" | "next" | "end" | "playAgain"}
  | {type: "kick" | "rename"; playerId: string}
  | {type: "lock"; locked: boolean}
  | {type: "setName"; name: string}
  | {type: "tap"; round: number; i: number; key: number}
  | {type: "time"; t0: number};

// Server → client

export interface RosterEntry {
  id: string;
  // Empty while the teacher has asked the player for a new name
  name: string;
  connected: boolean;
  lives: number;
  alive: boolean;
  // Joined mid-game: plays along unscored until the next game
  spectator: boolean;
}

export interface You {
  id: string;
  name: string;
  lives: number;
  points: number;
  rounds: number;
  alive: boolean;
  spectator: boolean;
  outRound?: number;
  // This round so far, so a reconnect picks up where it left off
  taps: number[];
  result?: Result;
  roundPoints?: number;
}

export interface Progress {
  taps: number;
  result?: Result;
}

export interface RoundMsg {
  type: "round";
  round: number;
  len: number;
  keyPc: number;
  // Server epoch ms: the intro (round 1) or pattern starts at playAt
  playAt: number;
  patternAt: number;
  inputOpensAt: number;
  deadline: number;
  intro: boolean;
  // Only for the host, and for players when student audio is on
  pattern?: number[];
}

export interface RevealResult {
  id: string;
  result: Result;
  points: number;
  livesLeft: number;
}

export interface RevealMsg {
  type: "reveal";
  round: number;
  pattern: number[];
  results: RevealResult[];
  // Players who lost their last life this round
  out: string[];
}

export interface Standing extends Rankable {
  id: string;
  name: string;
  rank: number;
  outRound?: number;
}

export interface LeaderboardMsg {
  type: "leaderboard";
  round: number;
  top: Standing[];
  you?: Standing;
}

export interface OverMsg {
  type: "over";
  round: number;
  ranking: Standing[];
}

export interface SnapshotMsg {
  type: "snapshot";
  code: string;
  role: Role;
  phase: Phase;
  settings: LiveSettings;
  keyPc: number;
  round: number;
  locked: boolean;
  roster: RosterEntry[];
  you?: You;
  progress?: Record<string, Progress>;
}

export type ServerMsg =
  | SnapshotMsg
  | {type: "roster"; players: RosterEntry[]; locked: boolean}
  | {type: "settings"; settings: LiveSettings}
  | RoundMsg
  | {type: "tapAck"; round: number; i: number; ok: boolean; done: boolean; points?: number; livesLeft?: number; out?: boolean; expected?: number}
  | {type: "progress"; playerId: string; taps: number; result?: Result}
  | RevealMsg
  | LeaderboardMsg
  | OverMsg
  | {type: "you"; you: You}
  | {type: "needName"}
  | {type: "closed"}
  | {type: "time"; t0: number; serverT: number}
  | {type: "error"; code: ErrorCode};

// Guards for what arrives over the socket. Anything that doesn't match exactly is rejected.

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isInt = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
const isString = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max;
const oneOf = <T,>(value: unknown, allowed: readonly T[]): value is T => allowed.includes(value as T);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isPlayerId = (value: unknown): value is string => typeof value === "string" && UUID.test(value);

const MODES: Mode[] = ["major", "minorDo", "minorLa", "chromatic"];
const FORMS: Form[] = ["natural", "harmonic", "melodic"];
const RANGES: Range[] = [1, 2, 3];
const SOUNDS: Sound[] = ["voice", "piano"];

export function parseSettings(value: unknown): LiveSettings | null {
  if (!isObject(value)) return null;
  const v = value;
  if (
    !oneOf(v.mode, MODES) ||
    !oneOf(v.form, FORMS) ||
    !oneOf(v.range, RANGES) ||
    !(v.keyPc === "random" || isInt(v.keyPc, 0, 11)) ||
    !oneOf(v.sound, SOUNDS) ||
    typeof v.lights !== "boolean" ||
    typeof v.startHome !== "boolean" ||
    !oneOf(v.timePerNote, TIMES_PER_NOTE) ||
    !oneOf(v.maxRounds, MAX_ROUNDS) ||
    typeof v.studentAudio !== "boolean"
  ) {
    return null;
  }
  // Rebuilt field by field so no extra keys get stored
  return {
    mode: v.mode,
    form: v.form,
    range: v.range,
    keyPc: v.keyPc as number | "random",
    sound: v.sound,
    lights: v.lights,
    startHome: v.startHome,
    timePerNote: v.timePerNote,
    maxRounds: v.maxRounds,
    studentAudio: v.studentAudio,
  };
}

export function parseClientMsg(raw: string): ClientMsg | null {
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(v)) return null;

  switch (v.type) {
    case "hello":
      if (v.role === "host") return isString(v.hostKey, 128) ? {type: "hello", role: "host", hostKey: v.hostKey} : null;
      if (v.role !== "player" || !isPlayerId(v.playerId)) return null;
      if (v.name === undefined) return {type: "hello", role: "player", playerId: v.playerId};
      return isString(v.name, 200) ? {type: "hello", role: "player", playerId: v.playerId, name: v.name} : null;
    case "settings": {
      const settings = parseSettings(v.settings);
      return settings ? {type: "settings", settings} : null;
    }
    case "start":
    case "next":
    case "end":
    case "playAgain":
      return {type: v.type};
    case "kick":
    case "rename":
      return isPlayerId(v.playerId) ? {type: v.type, playerId: v.playerId} : null;
    case "lock":
      return typeof v.locked === "boolean" ? {type: "lock", locked: v.locked} : null;
    case "setName":
      return isString(v.name, 200) ? {type: "setName", name: v.name} : null;
    case "tap":
      return isInt(v.round, 1, 10_000) && isInt(v.i, 0, 10_000) && isInt(v.key, 0, 63)
        ? {type: "tap", round: v.round, i: v.i, key: v.key}
        : null;
    case "time":
      return typeof v.t0 === "number" && Number.isFinite(v.t0) ? {type: "time", t0: v.t0} : null;
    default:
      return null;
  }
}
