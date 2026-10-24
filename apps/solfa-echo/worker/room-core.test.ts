import {describe, expect, it} from "vitest";
import {keysFor} from "../src/core/music";
import {DEFAULT_LIVE_SETTINGS, type LiveSettings, type ServerMsg} from "../src/shared/protocol";
import {LIVE_INTRO_MS, roundPoints} from "../src/shared/says-core";
import {GRACE_MS, IDLE_MS, newRoomState, revealMs, RoomCore, START_LEAD_MS, type Outgoing, type RoomState} from "./room-core";

const keys = keysFor("major", 3, "natural", 0); // Do Re Mi Fa Sol La Ti Do′
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const C = "00000000-0000-4000-8000-00000000000c";

// Deterministic rng: always picks Sol (index 4), so the pattern is Do Sol Sol Sol…
// (never three in a row is the rule, but nextNote gives up rerolling a constant rng)
const constant = (index: number) => () => (index + 0.5) / keys.length;

class Harness {
  s: RoomState;
  now = 1_000_000;
  sent: Outgoing[] = [];

  constructor(settings: Partial<LiveSettings> = {}, private rng = constant(4)) {
    this.s = newRoomState("K7Q2", "hash", {...DEFAULT_LIVE_SETTINGS, ...settings}, this.now);
  }

  run<T>(fn: (core: RoomCore) => T): T {
    const core = new RoomCore(this.s, this.rng);
    core.tick(this.now);
    const result = fn(core);
    this.sent.push(...core.out);
    return result;
  }

  at(ms: number) {
    this.now = ms;
    this.run(() => {});
  }

  messages(type: ServerMsg["type"], to?: string) {
    return this.sent
      .filter((o) => o.msg.type === type && (to === undefined || (typeof o.to === "object" ? o.to.player : o.to) === to))
      .map((o) => o.msg);
  }

  tapAll(player: string, taps: number[]) {
    taps.forEach((key, i) => this.run((core) => core.tap(player, this.s.round, i, key, this.now)));
  }
}

function startedGame(settings: Partial<LiveSettings> = {}) {
  const h = new Harness(settings);
  h.run((core) => {
    core.join(A, "Ada", h.now);
    core.join(B, "Ben", h.now);
  });
  h.run((core) => core.start(h.now));
  return h;
}

describe("joining", () => {
  it("cleans names and rejects duplicates case-insensitively", () => {
    const h = new Harness();
    expect(h.run((core) => core.join(A, "  Ada  ", h.now))).toBeNull();
    expect(h.s.players[A].name).toBe("Ada");
    expect(h.run((core) => core.join(B, "ADA", h.now))).toBe("NAME_TAKEN");
    expect(h.run((core) => core.join(B, "x", h.now))).toBe("NAME_INVALID");
    expect(h.run((core) => core.join(B, undefined, h.now))).toBe("NAME_REQUIRED");
  });

  it("lets a known player back in without a name, but never a kicked one", () => {
    const h = new Harness();
    h.run((core) => core.join(A, "Ada", h.now));
    h.run((core) => core.disconnect(A, h.now));
    expect(h.s.players[A].connected).toBe(false);
    expect(h.run((core) => core.join(A, undefined, h.now))).toBeNull();
    expect(h.s.players[A].connected).toBe(true);

    h.run((core) => core.kick(A, h.now));
    expect(h.s.players[A]).toBeUndefined();
    expect(h.run((core) => core.join(A, "Ada", h.now))).toBe("KICKED");
  });

  it("stops new players when locked or full", () => {
    const h = new Harness();
    h.run((core) => core.lock(true));
    expect(h.run((core) => core.join(A, "Ada", h.now))).toBe("ROOM_LOCKED");
    h.run((core) => core.lock(false));
    for (let i = 0; i < 60; i++) {
      const id = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
      expect(h.run((core) => core.join(id, `Player ${i}`, h.now))).toBeNull();
    }
    expect(h.run((core) => core.join(A, "Ada", h.now))).toBe("ROOM_FULL");
  });

  it("makes late joiners unscored spectators", () => {
    const h = startedGame();
    h.run((core) => core.join(C, "Cy", h.now));
    expect(h.s.players[C]).toMatchObject({spectator: true, alive: false});
    expect(h.run((core) => core.standings()).map((s) => s.id)).not.toContain(C);
  });

  it("asks for a new name on rename and accepts it", () => {
    const h = new Harness();
    h.run((core) => core.join(A, "Ada", h.now));
    h.run((core) => core.rename(A));
    expect(h.s.players[A].name).toBe("");
    expect(h.messages("needName", A)).toHaveLength(1);
    expect(h.run((core) => core.setName(A, "Ada Two"))).toBeNull();
    expect(h.s.players[A].name).toBe("Ada Two");
  });
});

describe("rounds", () => {
  it("needs a player to start", () => {
    const h = new Harness();
    expect(h.run((core) => core.start(h.now))).toBe("NOT_ENOUGH_PLAYERS");
  });

  it("schedules round 1 with the intro and only sends the pattern to the host", () => {
    const h = startedGame();
    expect(h.s.phase).toBe("intro");
    expect(h.s.pattern).toEqual([0]);
    expect(h.s.playAt).toBe(h.now + START_LEAD_MS);
    expect(h.s.patternAt).toBe(h.s.playAt + LIVE_INTRO_MS);
    expect(h.s.deadline).toBe(h.s.inputOpensAt + 1 * 5000 + GRACE_MS);

    const rounds = h.sent.filter((o) => o.msg.type === "round");
    const forHost = rounds.find((o) => o.to === "host")!.msg;
    const forPlayers = rounds.find((o) => o.to === "players")!.msg;
    expect(forHost).toMatchObject({pattern: [0], intro: true});
    expect(forPlayers).not.toHaveProperty("pattern");
  });

  it("sends players the pattern when student audio is on", () => {
    const h = startedGame({studentAudio: true});
    const forPlayers = h.sent.find((o) => o.msg.type === "round" && o.to === "players")!.msg;
    expect(forPlayers).toMatchObject({pattern: [0]});
  });

  it("ignores taps before input opens, for the wrong round or out of order", () => {
    const h = startedGame();
    h.run((core) => core.tap(A, 1, 0, 0, h.now));
    expect(h.s.players[A].taps).toEqual([]);
    h.at(h.s.inputOpensAt);
    expect(h.s.phase).toBe("answering");
    h.run((core) => core.tap(A, 2, 0, 0, h.now));
    h.run((core) => core.tap(A, 1, 1, 0, h.now));
    expect(h.s.players[A].taps).toEqual([]);
  });

  it("scores faster answers higher and closes the round when everyone is done", () => {
    const h = startedGame();
    h.at(h.s.inputOpensAt + 1000);
    h.tapAll(A, [7]); // the top Do counts as Do
    h.at(h.s.inputOpensAt + 4000);
    h.tapAll(B, [0]);
    expect(h.s.phase).toBe("reveal");
    expect(h.s.players[A].points).toBe(roundPoints(1, 1000, 5000));
    expect(h.s.players[B].points).toBe(roundPoints(1, 4000, 5000));
    expect(h.s.players[A].points).toBeGreaterThan(h.s.players[B].points);

    const reveal = h.messages("reveal")[0];
    expect(reveal).toMatchObject({round: 1, pattern: [0], out: []});
  });

  it("takes a life for a miss and reports it on the tap", () => {
    const h = startedGame();
    h.at(h.s.inputOpensAt);
    h.tapAll(A, [2]);
    expect(h.s.players[A]).toMatchObject({lives: 2, alive: true, result: "miss"});
    expect(h.messages("tapAck", A).at(-1)).toMatchObject({ok: false, done: true, livesLeft: 2, out: false, expected: 0});
    expect(h.messages("progress", "host").at(-1)).toMatchObject({playerId: A, taps: 1, result: "miss"});
  });

  it("times out whoever hasn't finished at the deadline", () => {
    const h = startedGame();
    h.at(h.s.inputOpensAt);
    h.tapAll(A, [0]);
    h.at(h.s.deadline);
    expect(h.s.phase).toBe("reveal");
    expect(h.s.players[B]).toMatchObject({result: "timeout", lives: 2});
  });

  it("doesn't wait for a player who disconnects", () => {
    const h = startedGame();
    h.at(h.s.inputOpensAt);
    h.tapAll(A, [0]);
    expect(h.s.phase).toBe("answering");
    h.run((core) => core.disconnect(B, h.now));
    expect(h.s.phase).toBe("reveal");
    expect(h.s.players[B].result).toBe("timeout");
  });

  it("moves reveal → leaderboard on time, and waits there for the teacher", () => {
    const h = startedGame();
    h.at(h.s.inputOpensAt);
    h.tapAll(A, [0]);
    h.tapAll(B, [0]);
    const revealAt = h.now;
    h.at(revealAt + revealMs(1) - 1);
    expect(h.s.phase).toBe("reveal");
    h.at(revealAt + revealMs(1));
    expect(h.s.phase).toBe("leaderboard");

    const forA = h.messages("leaderboard", A)[0];
    expect(forA).toMatchObject({type: "leaderboard", you: {id: A, rank: 1}});

    h.at(h.now + 60 * 60 * 1000);
    expect(h.s.phase).toBe("leaderboard");
    h.run((core) => core.next(h.now));
    expect(h.s.phase).toBe("playback");
    expect(h.s.round).toBe(2);
    expect(h.s.pattern).toEqual([0, 4]);
    // No intro after round 1
    expect(h.s.patternAt).toBe(h.s.playAt);
  });

  it("puts a player out after three misses and ends the game when nobody is left", () => {
    const h = startedGame();
    h.run((core) => core.kick(B, h.now));
    for (let round = 1; round <= 3; round++) {
      h.at(h.s.inputOpensAt);
      h.tapAll(A, [2]);
      expect(h.s.phase).toBe("reveal");
      h.run((core) => core.next(h.now));
      if (round < 3) h.run((core) => core.next(h.now));
    }
    expect(h.s.players[A]).toMatchObject({lives: 0, alive: false, outRound: 3});
    expect(h.s.phase).toBe("over");
    const over = h.messages("over")[0];
    expect(over).toMatchObject({ranking: [{id: A, outRound: 3, rank: 1}]});
  });

  it("lets an out player keep tapping as a ghost, unscored", () => {
    const h = startedGame();
    h.s.players[A].lives = 1;
    h.at(h.s.inputOpensAt);
    h.tapAll(A, [2]);
    h.tapAll(B, [0]);
    h.run((core) => core.next(h.now));
    h.run((core) => core.next(h.now));
    expect(h.s.players[A].playing).toBe(false);
    h.at(h.s.inputOpensAt);
    h.tapAll(A, [0, 4]);
    expect(h.s.players[A]).toMatchObject({result: "ok", points: 0, lives: 0});
    expect(h.messages("tapAck", A).at(-1)).toMatchObject({ok: true, done: true, points: 0});
    // B, the only scored player, decides when the round closes
    expect(h.s.phase).toBe("answering");
  });

  it("ends after the last round", () => {
    const h = startedGame({maxRounds: 10});
    for (let round = 1; round <= 10; round++) {
      h.at(h.s.inputOpensAt);
      h.tapAll(A, h.s.pattern);
      h.tapAll(B, h.s.pattern);
      h.at(h.now + revealMs(round));
      if (round < 10) h.run((core) => core.next(h.now));
    }
    expect(h.s.phase).toBe("over");
    expect(h.s.players[A].roundsSurvived).toBe(10);
  });

  it("ends early on the teacher's word, without scoring the round in progress", () => {
    const h = startedGame();
    h.at(h.s.inputOpensAt);
    h.tapAll(A, [0]);
    expect(h.run((core) => core.end())).toBe(false);
    expect(h.s.phase).toBe("over");
    expect(h.s.players[A].points).toBe(0);
    // From the final screen, End closes the room
    expect(h.run((core) => core.end())).toBe(true);
  });

  it("resets scores and keeps the roster on play again", () => {
    const h = startedGame();
    h.run((core) => core.join(C, "Cy", h.now));
    h.at(h.s.inputOpensAt);
    h.tapAll(A, [0]);
    h.tapAll(B, [2]);
    h.run((core) => core.end());
    h.run((core) => core.playAgain());
    expect(h.s.phase).toBe("lobby");
    for (const id of [A, B, C]) {
      expect(h.s.players[id]).toMatchObject({lives: 3, points: 0, alive: true, spectator: false});
    }
    expect(h.messages("snapshot", C).at(-1)).toMatchObject({phase: "lobby"});
  });
});

describe("snapshots and alarms", () => {
  it("rebuilds a player's round after a reconnect", () => {
    const h = startedGame();
    h.at(h.s.inputOpensAt);
    h.run((core) => core.next(h.now)); // ignored mid-round
    const [snap, round] = h.run((core) => core.snapshot("player", A));
    expect(snap).toMatchObject({type: "snapshot", phase: "answering", you: {id: A, lives: 3, taps: []}});
    expect(round).toMatchObject({type: "round", round: 1});
    expect(round).not.toHaveProperty("pattern");
  });

  it("wakes for the next deadline, or for idle expiry when waiting", () => {
    const h = new Harness();
    const core = () => new RoomCore(h.s);
    expect(core().nextAlarm()).toBe(h.s.lastActivity + IDLE_MS);
    expect(core().expired(h.now + IDLE_MS)).toBe(true);

    h.run((c) => c.join(A, "Ada", h.now));
    h.run((c) => c.start(h.now));
    expect(core().nextAlarm()).toBe(h.s.inputOpensAt);
    expect(core().expired(h.now + IDLE_MS)).toBe(false);
    h.at(h.s.inputOpensAt);
    expect(core().nextAlarm()).toBe(h.s.deadline);
  });
});
