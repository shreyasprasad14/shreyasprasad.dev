// Load test for Solfa Echo Live: one host and N bot students play a short game against a running
// Worker, tapping with random delays and the odd wrong note. Checks that every bot sees the same
// final ranking, and prints message counts to compare with the dashboard's Durable Object metrics.
//
//   node apps/solfa-echo/scripts/live-load.mjs [app URL] [players] [rounds]
//   node apps/solfa-echo/scripts/live-load.mjs http://localhost:8787/apps/solfa-echo/ 40 3
import {randomUUID} from "node:crypto";

const base = new URL(process.argv[2] ?? "http://localhost:8787/apps/solfa-echo/");
const PLAYERS = Number(process.argv[3] ?? 40);
const ROUNDS = Number(process.argv[4] ?? 3);
const WRONG_RATE = 0.08;

const settings = {
  mode: "major", form: "natural", range: 3, keyPc: 0, sound: "voice", lights: false, startHome: true,
  timePerNote: 3, maxRounds: [10, 15, 20].includes(ROUNDS) ? ROUNDS : 0, studentAudio: false,
};

const socketUrl = (code) => {
  const url = new URL(`api/rooms/${code}/ws`, base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.href;
};

const stats = {sent: 0, received: 0, errors: []};

function open(code, onMessage) {
  const ws = new WebSocket(socketUrl(code));
  const send = (msg) => {
    stats.sent++;
    ws.send(JSON.stringify(msg));
  };
  ws.addEventListener("message", (event) => {
    stats.received++;
    const msg = JSON.parse(event.data);
    if (msg.type === "error") stats.errors.push(msg.code);
    onMessage(msg, send);
  });
  return new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve({ws, send}));
    ws.addEventListener("error", reject);
  });
}

const response = await fetch(new URL("api/rooms", base), {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({settings}),
});
if (!response.ok) throw new Error(`Creating a room failed: ${response.status} ${await response.text()}`);
const {code, hostKey} = await response.json();
console.log(`Room ${code}: ${PLAYERS} players, ${ROUNDS} rounds`);

let pattern = [];
let round = null;
const finals = new Map();
const started = Date.now();
let done;
const finished = new Promise((resolve) => (done = resolve));

const bots = [];
for (let i = 0; i < PLAYERS; i++) {
  const bot = {id: randomUUID(), name: `Bot ${i + 1}`, round: 0, timers: []};
  bot.conn = await open(code, (msg, send) => {
    if (msg.type === "round") {
      bot.round = msg.round;
      // Tap through the pattern from the host's copy, a little late and sometimes wrong
      let at = msg.inputOpensAt + 200 + Math.random() * 800;
      const wait = () => new Promise((r) => setTimeout(r, Math.max(0, at - Date.now())));
      (async () => {
        await new Promise((r) => setTimeout(r, Math.max(0, msg.inputOpensAt - Date.now())));
        for (let n = 0; n < msg.len; n++) {
          await wait();
          const expected = pattern[n];
          const wrong = Math.random() < WRONG_RATE;
          send({type: "tap", round: msg.round, i: n, key: wrong ? ((expected % 7) + 1) % 7 : expected});
          if (wrong) break;
          at += 150 + Math.random() * 600;
        }
      })();
    }
    if (msg.type === "over") finals.set(bot.id, JSON.stringify(msg.ranking));
  });
  bot.conn.send({type: "hello", role: "player", playerId: bot.id, name: bot.name});
  bots.push(bot);
}

const host = await open(code, (msg, send) => {
  if (msg.type === "round") {
    pattern = msg.pattern;
    round = msg.round;
    process.stdout.write(`round ${round} (${msg.len} notes)… `);
  }
  if (msg.type === "reveal") {
    const ok = msg.results.filter((r) => r.result === "ok").length;
    console.log(`${ok}/${msg.results.length} cleared, ${msg.out.length} out`);
  }
  if (msg.type === "leaderboard") setTimeout(() => (msg.round >= ROUNDS ? send({type: "end"}) : send({type: "next"})), 300);
  if (msg.type === "over") {
    finals.set("host", JSON.stringify(msg.ranking));
    setTimeout(done, 1000);
  }
});
host.send({type: "hello", role: "host", hostKey});
await new Promise((r) => setTimeout(r, 500));
host.send({type: "start"});

await Promise.race([finished, new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out")), 120_000))]);
host.send({type: "end"});

const rankings = new Set(finals.values());
const ranking = JSON.parse(finals.get("host"));
console.log(`\nFinished in ${((Date.now() - started) / 1000).toFixed(1)} s`);
console.log(`Top 3: ${ranking.slice(0, 3).map((s) => `${s.name} ${s.points}`).join(", ")}`);
console.log(`Messages: ${stats.sent} sent (≈${Math.ceil(stats.sent / 20)} billed requests at 20:1), ${stats.received} received`);
console.log(`Final ranking: ${finals.size - 1}/${PLAYERS} bots received it, ${rankings.size === 1 ? "all identical" : "MISMATCH"}`);
if (stats.errors.length) console.log(`Errors: ${[...new Set(stats.errors)].join(", ")}`);

for (const bot of bots) bot.conn.ws.close();
host.ws.close();
process.exit(rankings.size === 1 && finals.size === PLAYERS + 1 ? 0 : 1);
