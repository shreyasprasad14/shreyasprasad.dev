// The rules of a Live room as plain code over a plain state object. The Room Durable Object
// (room.ts) loads the state, calls one of these methods with the current time, delivers the
// messages it queued and saves the state. Nothing here touches sockets, storage or the clock,
// so tests drive it with fake time.
import {keysFor, type Key} from "../src/core/music";
import {cleanName, nameKey} from "../src/shared/names";
import {
  LIVES,
  MAX_PLAYERS,
  type ErrorCode,
  type LeaderboardMsg,
  type LiveSettings,
  type Phase,
  type Progress,
  type Result,
  type RevealMsg,
  type Role,
  type RosterEntry,
  type RoundMsg,
  type ServerMsg,
  type SnapshotMsg,
  type Standing,
  type You,
} from "../src/shared/protocol";
import {isCorrect, liveSchedule, nextNote, rank, roundPoints, type Rng} from "../src/shared/says-core";

// Time for the round message to reach every device and the board to schedule its audio
export const START_LEAD_MS = 1500;
// Slack after the last note's time runs out, for taps still on the wire
export const GRACE_MS = 750;
// Taps this early are accepted: the client's clock estimate can be a little ahead
export const EARLY_MS = 300;
export const IDLE_MS = 2 * 60 * 60 * 1000;

// Long enough for the board to light up the whole pattern note by note
export const revealMs = (length: number) => Math.max(4000, 1500 + length * 300);

export interface PlayerRecord {
  // "" while the teacher has asked for a new name
  name: string;
  joinedAt: number;
  connected: boolean;
  spectator: boolean;
  alive: boolean;
  lives: number;
  points: number;
  roundsSurvived: number;
  outRound?: number;
  // This round: playing is whether it counts (alive and in the game when it started)
  playing: boolean;
  taps: number[];
  doneAt?: number;
  result?: Result;
  roundPoints?: number;
}

export interface RoomState {
  code: string;
  // SHA-256 of the secret the host got when creating the room
  hostKeyHash: string;
  settings: LiveSettings;
  phase: Phase;
  round: number;
  // The key for this game, with "random" resolved at start
  keyPc: number;
  // Indices into keysFor(settings, keyPc)
  pattern: number[];
  // Server epoch ms for the current round
  playAt: number;
  patternAt: number;
  inputOpensAt: number;
  deadline: number;
  revealEndsAt: number;
  // Insertion order is join order
  players: Record<string, PlayerRecord>;
  banned: string[];
  locked: boolean;
  createdAt: number;
  lastActivity: number;
  // The alarm currently set, so it's only rewritten when it changes
  alarmAt: number | null;
}

export type Target = "all" | "host" | "players" | {player: string};

export interface Outgoing {
  to: Target;
  msg: ServerMsg;
}

export function newRoomState(code: string, hostKeyHash: string, settings: LiveSettings, now: number): RoomState {
  return {
    code,
    hostKeyHash,
    settings,
    phase: "lobby",
    round: 0,
    keyPc: typeof settings.keyPc === "number" ? settings.keyPc : 0,
    pattern: [],
    playAt: 0,
    patternAt: 0,
    inputOpensAt: 0,
    deadline: 0,
    revealEndsAt: 0,
    players: {},
    banned: [],
    locked: false,
    createdAt: now,
    lastActivity: now,
    alarmAt: null,
  };
}

const freshPlayer = (name: string, now: number, spectator: boolean): PlayerRecord => ({
  name,
  joinedAt: now,
  connected: true,
  spectator,
  alive: !spectator,
  lives: spectator ? 0 : LIVES,
  points: 0,
  roundsSurvived: 0,
  playing: false,
  taps: [],
});

const clearRound = (p: PlayerRecord) => {
  p.taps = [];
  delete p.doneAt;
  delete p.result;
  delete p.roundPoints;
};

export class RoomCore {
  readonly out: Outgoing[] = [];
  // Set by anything that changes the state, so the caller knows to save it
  dirty = false;

  constructor(
    readonly s: RoomState,
    private readonly rng: Rng = Math.random,
  ) {}

  private send(to: Target, msg: ServerMsg) {
    this.out.push({to, msg});
  }

  private get keys(): Key[] {
    const {mode, range, form} = this.s.settings;
    return keysFor(mode, range, form, this.s.keyPc);
  }

  private get timed() {
    return this.s.phase === "intro" || this.s.phase === "playback" || this.s.phase === "answering";
  }

  private changed() {
    this.dirty = true;
  }

  // Marks host activity, which keeps the room from expiring
  touch(now: number) {
    this.s.lastActivity = now;
    this.changed();
  }

  // Carries out any phase change whose time has come. Runs before every message and on the alarm,
  // so a late alarm never leaves the room behind the clock.
  tick(now: number) {
    const s = this.s;
    if ((s.phase === "intro" || s.phase === "playback") && now >= s.inputOpensAt) {
      s.phase = "answering";
      this.changed();
    }
    if (s.phase === "answering" && now >= s.deadline) this.closeRound(now);
    if (s.phase === "reveal" && now >= s.revealEndsAt) this.afterReveal();
  }

  // When the room next needs waking: a phase deadline, or else the idle expiry
  nextAlarm(): number {
    const s = this.s;
    if (s.phase === "intro" || s.phase === "playback") return s.inputOpensAt;
    if (s.phase === "answering") return s.deadline;
    if (s.phase === "reveal") return s.revealEndsAt;
    return s.lastActivity + IDLE_MS;
  }

  expired(now: number) {
    return !this.timed && this.s.phase !== "reveal" && now >= this.s.lastActivity + IDLE_MS;
  }

  // Joining and moderation

  join(playerId: string, rawName: string | undefined, now: number): ErrorCode | null {
    const s = this.s;
    if (s.banned.includes(playerId)) return "KICKED";
    const existing = s.players[playerId];
    if (existing) {
      existing.connected = true;
      this.changed();
      if (existing.name === "" && rawName !== undefined) {
        const error = this.setName(playerId, rawName);
        if (error) return error;
      }
      this.sendRoster();
      return null;
    }

    if (rawName === undefined) return "NAME_REQUIRED";
    if (s.locked) return "ROOM_LOCKED";
    if (Object.keys(s.players).length >= MAX_PLAYERS) return "ROOM_FULL";
    const checked = this.checkName(rawName);
    if ("error" in checked) return checked.error;
    // Late joiners play along unscored until the next game
    s.players[playerId] = freshPlayer(checked.name, now, s.phase !== "lobby");
    this.changed();
    this.sendRoster();
    return null;
  }

  private checkName(rawName: string, self?: string): {name: string} | {error: ErrorCode} {
    const check = cleanName(rawName);
    if (!check.ok) return {error: check.reason === "blocked" ? "NAME_BLOCKED" : "NAME_INVALID"};
    const key = nameKey(check.name);
    const taken = Object.entries(this.s.players).some(([id, p]) => id !== self && p.name && nameKey(p.name) === key);
    return taken ? {error: "NAME_TAKEN"} : {name: check.name};
  }

  setName(playerId: string, rawName: string): ErrorCode | null {
    const p = this.s.players[playerId];
    // Only after the teacher asked for a new one
    if (!p || p.name !== "") return null;
    const checked = this.checkName(rawName, playerId);
    if ("error" in checked) return checked.error;
    p.name = checked.name;
    this.changed();
    this.sendRoster();
    this.send({player: playerId}, {type: "you", you: this.you(playerId)});
    return null;
  }

  disconnect(playerId: string, now: number) {
    const p = this.s.players[playerId];
    if (!p) return;
    p.connected = false;
    this.changed();
    this.sendRoster();
    // The round shouldn't wait for someone who has left
    if (this.s.phase === "answering") this.closeIfAllDone(now);
  }

  kick(playerId: string, now: number) {
    const s = this.s;
    if (!s.players[playerId]) return;
    delete s.players[playerId];
    s.banned.push(playerId);
    this.changed();
    this.sendRoster();
    if (s.phase === "answering") this.closeIfAllDone(now);
  }

  rename(playerId: string) {
    const p = this.s.players[playerId];
    if (!p || p.name === "") return;
    p.name = "";
    this.changed();
    this.sendRoster();
    this.send({player: playerId}, {type: "needName"});
  }

  lock(locked: boolean) {
    this.s.locked = locked;
    this.changed();
    this.sendRoster();
  }

  setSettings(settings: LiveSettings) {
    if (this.s.phase !== "lobby") return;
    this.s.settings = settings;
    if (typeof settings.keyPc === "number") this.s.keyPc = settings.keyPc;
    this.changed();
    this.send("all", {type: "settings", settings});
  }

  // The game

  start(now: number): ErrorCode | null {
    const s = this.s;
    if (s.phase !== "lobby") return null;
    if (!Object.values(s.players).some((p) => !p.spectator)) return "NOT_ENOUGH_PLAYERS";
    s.keyPc = s.settings.keyPc === "random" ? Math.floor(this.rng() * 12) : s.settings.keyPc;
    s.round = 0;
    s.pattern = [];
    this.beginRound(now);
    return null;
  }

  next(now: number) {
    const s = this.s;
    // From the reveal, Next skips ahead to the standings; from the standings it starts the next round
    if (s.phase === "reveal") this.afterReveal();
    else if (s.phase === "leaderboard") this.beginRound(now);
  }

  // Ends the game. Returns true when there's no game to end, meaning the room itself should close.
  end(): boolean {
    const s = this.s;
    if (s.phase === "lobby" || s.phase === "over") return true;
    // A round in progress isn't scored
    if (this.timed) for (const p of Object.values(s.players)) clearRound(p);
    this.finish();
    return false;
  }

  playAgain() {
    const s = this.s;
    if (s.phase !== "over") return;
    s.phase = "lobby";
    s.round = 0;
    s.pattern = [];
    for (const [id, p] of Object.entries(s.players)) s.players[id] = {...freshPlayer(p.name, p.joinedAt, false), connected: p.connected};
    this.changed();
    this.sendSnapshots();
  }

  tap(playerId: string, round: number, i: number, key: number, now: number) {
    const s = this.s;
    const p = s.players[playerId];
    if (!p || !this.timed || round !== s.round) return;
    if (now < s.inputOpensAt - EARLY_MS || now > s.deadline) return;
    if (p.result !== undefined || i !== p.taps.length) return;
    const keys = this.keys;
    if (key < 0 || key >= keys.length) return;

    if (s.phase !== "answering") s.phase = "answering";
    const ok = isCorrect(keys, s.pattern[i], key);
    p.taps.push(key);
    this.changed();
    const ack = {type: "tapAck" as const, round, i, ok};

    if (!ok) {
      p.result = "miss";
      p.doneAt = now;
      if (p.playing) this.loseLife(p);
      this.send({player: playerId}, {...ack, done: true, livesLeft: p.lives, out: p.playing && !p.alive, expected: s.pattern[i]});
    } else if (p.taps.length === s.pattern.length) {
      p.result = "ok";
      p.doneAt = now;
      const allowed = s.pattern.length * s.settings.timePerNote * 1000;
      if (p.playing) p.roundPoints = roundPoints(s.round, now - s.inputOpensAt, allowed);
      this.send({player: playerId}, {...ack, done: true, points: p.roundPoints ?? 0});
    } else {
      this.send({player: playerId}, {...ack, done: false});
    }

    if (p.playing) this.send("host", {type: "progress", playerId, taps: p.taps.length, result: p.result});
    this.closeIfAllDone(now);
  }

  private loseLife(p: PlayerRecord) {
    p.lives = Math.max(0, p.lives - 1);
    if (p.lives === 0) {
      p.alive = false;
      p.outRound = this.s.round;
    }
  }

  private beginRound(now: number) {
    const s = this.s;
    const intro = s.round === 0;
    const keys = this.keys;
    s.round += 1;
    if (intro) s.pattern = [s.settings.startHome ? 0 : Math.floor(this.rng() * keys.length)];
    else s.pattern = [...s.pattern, nextNote(keys, s.pattern, this.rng)];

    const {patternAt, inputOpensAt} = liveSchedule(s.pattern.length, intro);
    s.playAt = now + START_LEAD_MS;
    s.patternAt = s.playAt + patternAt;
    s.inputOpensAt = s.playAt + inputOpensAt;
    s.deadline = s.inputOpensAt + s.pattern.length * s.settings.timePerNote * 1000 + GRACE_MS;
    s.phase = intro ? "intro" : "playback";
    s.lastActivity = now;
    for (const p of Object.values(s.players)) {
      clearRound(p);
      p.playing = p.alive && !p.spectator;
    }
    this.changed();
    this.send("host", this.roundMsg("host"));
    this.send("players", this.roundMsg("player"));
  }

  private roundMsg(role: Role): RoundMsg {
    const s = this.s;
    const msg: RoundMsg = {
      type: "round",
      round: s.round,
      len: s.pattern.length,
      keyPc: s.keyPc,
      playAt: s.playAt,
      patternAt: s.patternAt,
      inputOpensAt: s.inputOpensAt,
      deadline: s.deadline,
      intro: s.round === 1,
    };
    // Students only get the notes when they'll hear them on their own device
    if (role === "host" || s.settings.studentAudio) msg.pattern = s.pattern;
    return msg;
  }

  private closeIfAllDone(now: number) {
    const waiting = Object.values(this.s.players).filter((p) => p.playing && p.connected);
    if (this.s.phase === "answering" && waiting.length > 0 && waiting.every((p) => p.result !== undefined)) {
      this.closeRound(now);
    }
  }

  private closeRound(now: number) {
    const s = this.s;
    for (const p of Object.values(s.players)) {
      if (p.result === undefined) {
        p.result = "timeout";
        if (p.playing) this.loseLife(p);
      }
      if (p.playing && p.result === "ok") {
        p.points += p.roundPoints ?? 0;
        p.roundsSurvived += 1;
      }
    }
    s.phase = "reveal";
    s.revealEndsAt = now + revealMs(s.pattern.length);
    this.changed();
    this.send("all", this.revealMsg());
    this.sendRoster();
    this.sendYou();
  }

  private revealMsg(): RevealMsg {
    const s = this.s;
    const playing = Object.entries(s.players).filter(([, p]) => p.playing);
    return {
      type: "reveal",
      round: s.round,
      pattern: s.pattern,
      results: playing.map(([id, p]) => ({id, result: p.result ?? "timeout", points: p.roundPoints ?? 0, livesLeft: p.lives})),
      out: playing.filter(([, p]) => p.outRound === s.round).map(([id]) => id),
    };
  }

  private gameOver() {
    const s = this.s;
    const anyAlive = Object.values(s.players).some((p) => p.alive && !p.spectator);
    return !anyAlive || (s.settings.maxRounds > 0 && s.round >= s.settings.maxRounds);
  }

  private afterReveal() {
    if (this.gameOver()) {
      this.finish();
      return;
    }
    this.s.phase = "leaderboard";
    this.changed();
    this.sendLeaderboard();
  }

  private finish() {
    this.s.phase = "over";
    this.changed();
    this.send("all", this.overMsg());
    this.sendYou();
  }

  // Views

  standings(): Standing[] {
    const entries = Object.entries(this.s.players)
      .filter(([, p]) => !p.spectator)
      .map(([id, p]) => ({
        id,
        name: p.name || "…",
        points: p.points,
        rounds: p.roundsSurvived,
        lives: p.lives,
        rank: 0,
        ...(p.outRound !== undefined ? {outRound: p.outRound} : {}),
      }));
    return rank(entries);
  }

  private leaderboardMsgs(): Outgoing[] {
    const standings = this.standings();
    const top = standings.slice(0, 10);
    const base: LeaderboardMsg = {type: "leaderboard", round: this.s.round, top};
    return [
      {to: "host", msg: base},
      ...Object.keys(this.s.players).map((id) => ({
        to: {player: id},
        msg: {...base, you: standings.find((entry) => entry.id === id)},
      })),
    ];
  }

  private sendLeaderboard() {
    this.out.push(...this.leaderboardMsgs());
  }

  private overMsg(): ServerMsg {
    return {type: "over", round: this.s.round, ranking: this.standings()};
  }

  roster(): RosterEntry[] {
    return Object.entries(this.s.players).map(([id, p]) => ({
      id,
      name: p.name,
      connected: p.connected,
      lives: p.lives,
      alive: p.alive,
      spectator: p.spectator,
    }));
  }

  private sendRoster() {
    this.send("all", {type: "roster", players: this.roster(), locked: this.s.locked});
  }

  you(playerId: string): You {
    const p = this.s.players[playerId];
    return {
      id: playerId,
      name: p.name,
      lives: p.lives,
      points: p.points,
      rounds: p.roundsSurvived,
      alive: p.alive,
      spectator: p.spectator,
      taps: p.taps,
      ...(p.outRound !== undefined ? {outRound: p.outRound} : {}),
      ...(p.result !== undefined ? {result: p.result} : {}),
      ...(p.roundPoints !== undefined ? {roundPoints: p.roundPoints} : {}),
    };
  }

  private sendYou() {
    for (const id of Object.keys(this.s.players)) this.send({player: id}, {type: "you", you: this.you(id)});
  }

  // Everything one socket needs to draw the room from scratch: on hello, on reconnect, after Play again
  snapshot(role: Role, playerId?: string): ServerMsg[] {
    const s = this.s;
    const snap: SnapshotMsg = {
      type: "snapshot",
      code: s.code,
      role,
      phase: s.phase,
      settings: s.settings,
      keyPc: s.keyPc,
      round: s.round,
      locked: s.locked,
      roster: this.roster(),
    };
    if (role === "player" && playerId && s.players[playerId]) snap.you = this.you(playerId);
    if (role === "host") {
      const progress: Record<string, Progress> = {};
      for (const [id, p] of Object.entries(s.players)) {
        if (p.playing) progress[id] = {taps: p.taps.length, ...(p.result ? {result: p.result} : {})};
      }
      snap.progress = progress;
    }

    const messages: ServerMsg[] = [snap];
    if (this.timed) messages.push(this.roundMsg(role));
    if (s.phase === "reveal") messages.push(this.revealMsg());
    if (s.phase === "leaderboard") {
      const target = role === "host" ? "host" : playerId;
      const own = this.leaderboardMsgs().find((o) => (typeof o.to === "object" ? o.to.player : o.to) === target);
      if (own) messages.push(own.msg);
    }
    if (s.phase === "over") messages.push(this.overMsg());
    return messages;
  }

  private sendSnapshots() {
    for (const msg of this.snapshot("host")) this.send("host", msg);
    for (const id of Object.keys(this.s.players)) {
      for (const msg of this.snapshot("player", id)) this.send({player: id}, msg);
    }
  }
}
