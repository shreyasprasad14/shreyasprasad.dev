import {describe, expect, it} from "vitest";
import {cleanName, isBlocked, nameKey} from "./names";
import {DEFAULT_LIVE_SETTINGS, parseClientMsg, parseSettings} from "./protocol";
import {rank, roundPoints} from "./says-core";

describe("roundPoints", () => {
  it("gives 1000 for an instant answer and 500 at the buzzer, scaled by round", () => {
    expect(roundPoints(0, 0, 5000)).toBe(1000);
    expect(roundPoints(0, 5000, 5000)).toBe(500);
    expect(roundPoints(10, 0, 5000)).toBe(2000);
    expect(roundPoints(1, 2500, 5000)).toBe(825);
    // Clamped: late or early taps don't go outside the range
    expect(roundPoints(0, 9000, 5000)).toBe(500);
    expect(roundPoints(0, -200, 5000)).toBe(1000);
  });
});

describe("rank", () => {
  it("orders by points, then rounds, then lives, and shares tied ranks", () => {
    const ranked = rank([
      {id: "a", points: 900, rounds: 3, lives: 1},
      {id: "b", points: 900, rounds: 3, lives: 2},
      {id: "c", points: 1200, rounds: 2, lives: 0},
      {id: "d", points: 900, rounds: 3, lives: 2},
      {id: "e", points: 900, rounds: 4, lives: 0},
    ]);
    expect(ranked.map((r) => `${r.id}${r.rank}`)).toEqual(["c1", "e2", "b3", "d3", "a5"]);
  });
});

describe("cleanName", () => {
  it("trims, collapses spaces and strips invisible characters", () => {
    expect(cleanName("  Ada   Lovelace ")).toEqual({ok: true, name: "Ada Lovelace"});
    expect(cleanName("A​da\u0007")).toEqual({ok: true, name: "Ada"});
    // Full-width letters fold to plain ones
    expect(cleanName("Ａｄａ")).toEqual({ok: true, name: "Ada"});
  });

  it("enforces 2–16 characters with at least one letter or digit", () => {
    expect(cleanName("A")).toEqual({ok: false, reason: "invalid"});
    expect(cleanName("A".repeat(17))).toEqual({ok: false, reason: "invalid"});
    expect(cleanName("!!!")).toEqual({ok: false, reason: "invalid"});
    expect(cleanName("Zoë")).toEqual({ok: true, name: "Zoë"});
    expect(cleanName("李明")).toEqual({ok: true, name: "李明"});
  });

  it("keeps at most two emoji", () => {
    expect(cleanName("Ada 🎵🎹🎻🎺")).toEqual({ok: true, name: "Ada 🎵🎹"});
  });

  it("compares names case-insensitively", () => {
    expect(nameKey("Bob")).toBe(nameKey("bob"));
  });
});

describe("isBlocked", () => {
  it.each(["fuck", "FUUUCK", "f u c k", "f.u.c.k", "$h!t", "sh1t head", "big ass", "B1tch"])("blocks %s", (name) => {
    expect(isBlocked(name)).toBe(true);
  });

  it.each(["Cassie", "Essex", "Hancock", "Titus", "Dickens", "Grape", "Nazim", "Skillet", "Bob", "Mississippi", "Analise"])(
    "allows %s",
    (name) => {
      expect(isBlocked(name)).toBe(false);
    },
  );
});

describe("parseClientMsg", () => {
  const id = "00000000-0000-4000-8000-00000000000a";

  it("accepts well-formed messages", () => {
    expect(parseClientMsg(JSON.stringify({type: "hello", role: "player", playerId: id, name: "Ada"}))).toEqual({
      type: "hello",
      role: "player",
      playerId: id,
      name: "Ada",
    });
    expect(parseClientMsg(JSON.stringify({type: "tap", round: 2, i: 1, key: 4}))).toEqual({type: "tap", round: 2, i: 1, key: 4});
    expect(parseClientMsg(JSON.stringify({type: "settings", settings: DEFAULT_LIVE_SETTINGS}))).toEqual({
      type: "settings",
      settings: DEFAULT_LIVE_SETTINGS,
    });
  });

  it.each([
    "not json",
    "[]",
    JSON.stringify({type: "nope"}),
    JSON.stringify({type: "hello", role: "player", playerId: "not-a-uuid"}),
    JSON.stringify({type: "tap", round: 1, i: -1, key: 0}),
    JSON.stringify({type: "tap", round: 1, i: 0, key: 1.5}),
    JSON.stringify({type: "settings", settings: {...DEFAULT_LIVE_SETTINGS, timePerNote: 4}}),
  ])("rejects %s", (raw) => {
    expect(parseClientMsg(raw)).toBeNull();
  });

  it("drops unknown settings keys", () => {
    expect(parseSettings({...DEFAULT_LIVE_SETTINGS, extra: "x"})).toEqual(DEFAULT_LIVE_SETTINGS);
  });
});
