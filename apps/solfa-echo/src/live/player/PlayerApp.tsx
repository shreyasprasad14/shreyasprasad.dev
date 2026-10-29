// A student's device: join with a code and a nickname, then play each round on the ladder or piano.
import type {ComponentChildren} from "preact";
import {useEffect, useRef, useState} from "preact/hooks";
import {loadSamples, now, playNote, unlock} from "../../core/audio";
import {doMidi, keyLabel} from "../../core/music";
import {Scope} from "../../core/scheduler";
import {read, write} from "../../core/storage";
import {useSurface, useViewportHeight} from "../../ui/layout";
import Ladder from "../../ui/Ladder";
import {useNoteKeyboard} from "../../ui/NoteInput";
import Piano from "../../ui/Piano";
import ThemeToggle from "../../ui/ThemeToggle";
import {CODE_LENGTH, isCode, isPlayerId, type ClientMsg, type ErrorCode} from "../../shared/protocol";
import {NAME_MAX} from "../../shared/names";
import {isCorrect, TIMING} from "../../shared/says-core";
import {ConnectionBanner, ERROR_TEXT, formatPoints, Hearts, ordinal} from "../bits";
import {liveKeys, pitchesFor, playRound} from "../playback";
import {useMarks} from "../useMarks";
import {stageOf, useRoom, useTicker, type RoomView} from "../useRoom";

const PLAYER_KEY = "live.player.v1";
const NAME_KEY = "live.name.v1";
const TAP_SOUND_KEY = "live.tapSound.v1";

// One id per browser, so a sleeping Chromebook or a refreshed tab rejoins as the same player
function playerId(): string {
  const saved = read(PLAYER_KEY, "", isPlayerId);
  if (saved) return saved;
  const id = crypto.randomUUID();
  write(PLAYER_KEY, id);
  return id;
}

const isString = (v: unknown): v is string => typeof v === "string";
const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";

// Errors that send the student back to the join form
const JOIN_ERRORS: ErrorCode[] = ["ROOM_NOT_FOUND", "ROOM_FULL", "ROOM_LOCKED", "NAME_REQUIRED", "NAME_INVALID", "NAME_BLOCKED", "NAME_TAKEN"];

export default function PlayerApp({initialCode}: {initialCode: string}) {
  useViewportHeight();
  const [id] = useState(playerId);
  // A code from the link reconnects straight away; an unknown player is then asked for a name
  const [code, setCode] = useState(isCode(initialCode) ? initialCode : "");
  const [attempt, setAttempt] = useState(0);
  const [lastError, setLastError] = useState<ErrorCode | null>(null);
  const name = useRef<string | undefined>(undefined);

  const join = (nextCode: string, nextName: string) => {
    // Inside the tap: browsers only start audio from a user gesture
    unlock();
    name.current = nextName;
    write(NAME_KEY, nextName);
    setLastError(null);
    setCode(nextCode);
    setAttempt((a) => a + 1);
    history.replaceState(null, "", `#/join/${nextCode}`);
  };

  if (!code) return <JoinForm initialCode={initialCode} error={lastError} onJoin={join} />;
  return (
    <PlayerRoom
      key={`${code}:${attempt}`}
      code={code}
      hello={() => ({type: "hello", role: "player", playerId: id, ...(name.current ? {name: name.current} : {})})}
      onJoin={join}
      onLeave={(error) => {
        setLastError(error);
        setCode("");
      }}
    />
  );
}

function JoinForm({
  initialCode,
  error,
  onJoin,
  title = "Join a class",
}: {
  initialCode: string;
  error: ErrorCode | null;
  onJoin: (code: string, name: string) => void;
  title?: string;
}) {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [name, setName] = useState(() => read(NAME_KEY, "", isString));
  const codeOk = isCode(code);

  return (
    <div class="page">
      <header class="topbar">
        <a href="#">← Solfa Echo</a>
        <div class="topbar-end">
          <ThemeToggle />
        </div>
      </header>
      <main class="landing">
        <div class="intro">
          <h1>{title}</h1>
          <p class="muted">Enter the code on the board and pick a nickname. Don't use your full real name.</p>
        </div>
        <form
          class="join-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (codeOk && name.trim()) onJoin(code, name);
          }}
        >
          <label class="field">
            <span class="legend">Code</span>
            <input
              class="input code-input"
              value={code}
              maxLength={CODE_LENGTH}
              autocomplete="off"
              autocapitalize="characters"
              spellcheck={false}
              inputMode="text"
              onInput={(e) => setCode(e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            />
          </label>
          <label class="field">
            <span class="legend">Nickname</span>
            <input
              class="input"
              value={name}
              maxLength={NAME_MAX * 2}
              autocomplete="nickname"
              onInput={(e) => setName(e.currentTarget.value)}
            />
          </label>
          <button type="submit" class="button" disabled={!codeOk || !name.trim()}>
            Join
          </button>
          {error && (
            <p class="error" role="alert">
              {ERROR_TEXT[error]}
            </p>
          )}
        </form>
      </main>
    </div>
  );
}

function PlayerRoom({
  code,
  hello,
  onJoin,
  onLeave,
}: {
  code: string;
  hello: () => ClientMsg;
  onJoin: (code: string, name: string) => void;
  onLeave: (error: ErrorCode | null) => void;
}) {
  const room = useRoom(code, hello);
  const {view, status, send} = room;

  // Room-level problems go back to the form, with the reason
  useEffect(() => {
    if (view.error === "ROOM_NOT_FOUND" || view.error === "ROOM_FULL" || view.error === "ROOM_LOCKED") onLeave(view.error);
  }, [view.error]);

  if (view.error === "KICKED" || view.closed) {
    return (
      <Notice
        title={view.closed ? "Game over" : "Removed"}
        text={view.closed ? "The teacher has closed this room. Thanks for playing!" : ERROR_TEXT.KICKED}
      />
    );
  }

  // Not in the room yet, or the teacher asked for a different name
  if (view.needName || (!view.you && view.error && JOIN_ERRORS.includes(view.error))) {
    const renaming = view.needName && view.you !== null;
    return (
      <JoinForm
        key={view.error ?? "rename"}
        initialCode={code}
        title={renaming ? "Pick a new nickname" : "Join a class"}
        error={renaming && !view.error ? null : view.error}
        onJoin={(nextCode, name) => {
          if (!renaming || nextCode !== code) return onJoin(nextCode, name);
          write(NAME_KEY, name);
          send({type: "setName", name});
        }}
      />
    );
  }

  if (!view.ready || !view.you) {
    return (
      <>
        <ConnectionBanner status={status} />
        <Notice title="Joining…" text={`Room ${code}`} />
      </>
    );
  }

  const inRound = view.phase === "intro" || view.phase === "playback" || view.phase === "answering";
  return (
    <>
      <ConnectionBanner status={status} />
      {inRound && view.current ? <PlayerRound room={room} /> : <Between view={view} />}
    </>
  );
}

function Notice({title, text, children}: {title: string; text: string; children?: ComponentChildren}) {
  return (
    <div class="page">
      <main class="landing">
        <div class="intro">
          <h1>{title}</h1>
          <p class="muted">{text}</p>
        </div>
        {children}
      </main>
    </div>
  );
}

function StatusLine({view}: {view: RoomView}) {
  const you = view.you!;
  if (you.spectator) return <p class="ghost-note">You joined mid-game, so play along for practice. You'll be scored next game.</p>;
  if (!you.alive) return <p class="ghost-note">Out after round {you.outRound}. Keep playing for practice; it won't count.</p>;
  return null;
}

// Everything that isn't a round: the lobby, the reveal, the standings and the end
function Between({view}: {view: RoomView}) {
  const you = view.you!;
  const head = (
    <header class="topbar">
      <span class="muted">
        {you.name} · Room {view.code}
      </span>
      <div class="topbar-end">
        {!you.spectator && <Hearts lives={you.lives} max={view.settings.lives} />}
        <ThemeToggle />
      </div>
    </header>
  );

  let body: ComponentChildren;
  if (view.phase === "lobby") {
    body = (
      <div class="intro">
        <h1>You're in, {you.name}!</h1>
        <p class="muted">Look at the board. The game starts when your teacher is ready.</p>
      </div>
    );
  } else if (view.phase === "reveal" && view.reveal) {
    const keys = liveKeys(view.settings, view.keyPc);
    body = (
      <>
        <Feedback view={view} />
        <p class="pattern big">{view.reveal.pattern.map((i) => keyLabel(keys[i])).join(" ")}</p>
      </>
    );
  } else if (view.phase === "leaderboard" && view.leaderboard) {
    const mine = view.leaderboard.you;
    body = (
      <div class="intro">
        <p class="result-label">After round {view.leaderboard.round}</p>
        {mine ? (
          <>
            <p class="player-big">{ordinal(mine.rank)}</p>
            <p>{formatPoints(mine.points)} points</p>
          </>
        ) : (
          <p>Watching this game</p>
        )}
        <p class="muted">Look at the board for the next round.</p>
      </div>
    );
  } else if (view.phase === "over" && view.over) {
    const mine = view.over.ranking.find((entry) => entry.id === you.id);
    body = (
      <div class="intro">
        <p class="result-label">Final result</p>
        {mine ? (
          <>
            <p class="player-big">
              {ordinal(mine.rank)} <span class="muted small">of {view.over.ranking.length}</span>
            </p>
            <p>
              {formatPoints(mine.points)} points · {mine.rounds} {mine.rounds === 1 ? "round" : "rounds"} cleared
            </p>
          </>
        ) : (
          <p>You watched this game. You'll play in the next one.</p>
        )}
        <p class="muted">Thanks for playing!</p>
      </div>
    );
  } else {
    body = <p class="muted">Look at the board.</p>;
  }

  return (
    <div class="page">
      {head}
      <main class="landing player-between">
        {body}
        <StatusLine view={view} />
      </main>
    </div>
  );
}

function Feedback({view}: {view: RoomView}) {
  const {outcome, you} = view;
  const keys = liveKeys(view.settings, view.keyPc);
  if (!outcome) return <p class="feedback">Round over</p>;
  if (outcome.result === "ok") {
    return <p class="feedback ok">✓ Correct{you!.alive && !you!.spectator ? `, +${formatPoints(outcome.points)}` : ""}</p>;
  }
  const what = outcome.result === "timeout" ? "Out of time" : "Missed";
  const expected = outcome.expected !== undefined ? ` (it was ${keyLabel(keys[outcome.expected])})` : "";
  const lives = outcome.livesLeft ?? you!.lives;
  // Ghosts and spectators weren't playing for lives this round
  const unscored = you!.spectator || (you!.outRound !== undefined && you!.outRound < view.round);
  const scored = unscored ? "" : lives === 0 ? ": you're out" : `: ${lives} ${lives === 1 ? "life" : "lives"} left`;
  return (
    <p class="feedback bad">
      ✗ {what}
      {expected}
      {scored}
    </p>
  );
}

function PlayerRound({room}: {room: ReturnType<typeof useRoom>}) {
  const {view, serverNow, send, localTap} = room;
  const round = view.current!;
  const you = view.you!;
  const keys = liveKeys(view.settings, round.keyPc);
  const {surface, canToggle, toggle} = useSurface();
  const {marks, flash, clear} = useMarks();
  const [tapSound, setTapSound] = useState(() => read(TAP_SOUND_KEY, false, isBoolean));
  const scope = useRef(new Scope());
  useTicker(true, 100);

  const t = serverNow();
  const stage = stageOf(round, t, keys[0].syl, view.settings.timePerNote);
  const done = view.outcome !== null || view.taps.some((tap) => tap.ok === false) || view.taps.length >= round.len;
  const canTap = stage.kind === "answer" && t <= round.deadline && !done;

  // Student audio: the pattern plays here too (it only arrives when the teacher turned that on)
  useEffect(() => {
    scope.current.dispose();
    scope.current = new Scope();
    clear();
    if (view.settings.studentAudio) void playRound(scope.current, round, view.settings, serverNow, {home: (ms) => flash(0, "lit", ms)});
    else if (tapSound) loadSamples(view.settings.sound, pitchesFor(view.settings, round.keyPc)).catch(() => {});
    return () => scope.current.dispose();
  }, [round.round]);

  const tap = (key: number) => {
    if (!canTap) return;
    const i = view.taps.length;
    // With the pattern on this device the answer shows at once; otherwise the server's ack fills it in
    const ok = round.pattern ? isCorrect(keys, round.pattern[i], key) : null;
    localTap(key, ok);
    send({type: "tap", round: round.round, i, key});
    flash(key, ok === false ? "bad" : ok ? "ok" : "lit", ok === false ? TIMING.failMs : TIMING.flashMs);
    if (tapSound || view.settings.studentAudio) playNote(view.settings.sound, keys[key].midi, now(), TIMING.tapNote, TIMING.tapVolume);
  };

  // A wrong answer the server reports is shown on the key that was tapped
  const lastBad = view.taps.findIndex((tapView) => tapView.ok === false);
  const shownMarks = lastBad >= 0 && view.taps[lastBad].key >= 0 ? {...marks, [view.taps[lastBad].key]: "bad" as const} : marks;

  const shift = useNoteKeyboard({
    enabled: canTap,
    keys,
    mode: view.settings.mode,
    doPitch: doMidi(round.keyPc),
    onNote: tap,
  });

  const status =
    stage.kind === "intro" || stage.kind === "countIn"
      ? stage.label
      : stage.kind === "listen"
        ? "Listen…"
        : stage.kind === "answer" && !done
          ? t > round.deadline
            ? "Time's up"
            : "Your turn!"
          : stage.kind === "waiting"
            ? "Get ready…"
            : null;
  const Surface = surface === "piano" ? Piano : Ladder;

  return (
    <div class="round" data-surface={surface}>
      <header class="round-bar">
        <span class="round-label">
          {you.name} · Round {round.round}
        </span>
        {you.spectator ? <span class="muted small">practice</span> : <Hearts lives={you.lives} max={view.settings.lives} />}
        <span class="round-tools">
          <button
            type="button"
            class="link-button"
            aria-pressed={tapSound}
            onClick={() => {
              unlock();
              if (!tapSound) loadSamples(view.settings.sound, pitchesFor(view.settings, round.keyPc)).catch(() => {});
              setTapSound(!tapSound);
              write(TAP_SOUND_KEY, !tapSound);
            }}
          >
            {tapSound ? "Sound on" : "Sound off"}
          </button>
          {canToggle && (
            <button type="button" class="link-button" onClick={toggle}>
              {surface === "ladder" ? "Piano" : "Ladder"}
            </button>
          )}
        </span>
      </header>

      <div class="round-status">
        {status ? (
          <p class={`status ${stage.kind === "answer" ? "awaitingInput" : ""} ${stage.kind === "countIn" ? "count" : ""}`} role="status">
            {status}
          </p>
        ) : (
          <Feedback view={view} />
        )}
        <ol class="dots" aria-label={`${view.taps.length} of ${round.len} notes entered`}>
          {Array.from({length: round.len}, (_, i) => {
            const tapView = view.taps[i];
            const cls = tapView === undefined ? (canTap && i === view.taps.length ? "next" : "") : tapView.ok === false ? "bad" : tapView.ok ? "ok" : "sent";
            return <li key={i} class={`dot ${cls}`} />;
          })}
        </ol>
        <div class="timer" aria-hidden="true">
          {stage.kind === "answer" && !done && (
            <div
              key={round.round}
              class="timer-fill"
              style={{animationDuration: `${stage.totalMs}ms`, animationDelay: `${stage.remainingMs - stage.totalMs}ms`}}
            />
          )}
        </div>
        <p class="shift" aria-live="polite">
          {shift === 1 ? "♯ Next note raised" : shift === -1 ? "♭ Next note lowered" : ""}
        </p>
        <StatusLine view={view} />
      </div>

      <div class="surface">
        <Surface keys={keys} marks={shownMarks} active={canTap} onTap={tap} />
      </div>
    </div>
  );
}
