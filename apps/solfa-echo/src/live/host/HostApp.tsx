// The teacher's board: create a room, then run it from the lobby to the podium.
import {useEffect, useState} from "preact/hooks";
import {loadSamples, running, unlock} from "../../core/audio";
import {Scope} from "../../core/scheduler";
import {useViewportHeight} from "../../ui/layout";
import ThemeToggle from "../../ui/ThemeToggle";
import {isCode} from "../../shared/protocol";
import {ConnectionBanner, ERROR_TEXT} from "../bits";
import {apiUrl} from "../net";
import {pitchesFor, playRound} from "../playback";
import {LiveSettingsForm, loadLiveSettings, saveLiveSettings} from "../settings";
import {useMarks} from "../useMarks";
import {useRoom} from "../useRoom";
import {Reveal, RoundBoard} from "./Board";
import {Lobby} from "./Lobby";
import {Leaderboard, Podium} from "./Standings";

const SESSION_KEY = "live.host.v1";

interface HostSession {
  code: string;
  hostKey: string;
}

// In sessionStorage, so a refresh reconnects this tab as the host but a new tab starts fresh
function readSession(): HostSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null") as Partial<HostSession> | null;
    return value && typeof value.code === "string" && isCode(value.code) && typeof value.hostKey === "string"
      ? {code: value.code, hostKey: value.hostKey}
      : null;
  } catch {
    return null;
  }
}

function writeSession(session: HostSession | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Without storage a refresh just loses the room
  }
}

export default function HostApp() {
  const [session, setSession] = useState(readSession);
  useViewportHeight();
  const change = (next: HostSession | null) => {
    writeSession(next);
    setSession(next);
  };
  return session ? <HostRoom key={session.code} session={session} onExit={() => change(null)} /> : <HostSetup onCreated={change} />;
}

function HostSetup({onCreated}: {onCreated: (session: HostSession) => void}) {
  const [settings, setSettings] = useState(loadLiveSettings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function create() {
    // Inside the click: browsers only start audio from a user gesture
    unlock();
    setBusy(true);
    setError(false);
    try {
      const response = await fetch(apiUrl("api/rooms"), {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({settings}),
      });
      if (!response.ok) throw new Error(`${response.status}`);
      onCreated((await response.json()) as HostSession);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

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
          <h1>Host a class game</h1>
          <p class="muted">
            Put this screen on the projector. Students join from their own devices with a code, then everyone hears
            the same pattern from the board and taps it back at once. Each student has three lives, and you choose
            when to start each round.
          </p>
        </div>
        <LiveSettingsForm
          settings={settings}
          onChange={(next) => {
            setSettings(next);
            saveLiveSettings(next);
          }}
        />
        <div class="start">
          <button type="button" class="button" onClick={create} disabled={busy}>
            {busy ? "Creating room…" : "Create room"}
          </button>
          {error && (
            <p class="error" role="alert">
              Couldn't create a room. Check your connection and try again.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function HostRoom({session, onExit}: {session: HostSession; onExit: () => void}) {
  const {view, status, serverNow, send} = useRoom(session.code, () => ({type: "hello", role: "host", hostKey: session.hostKey}));
  const {marks, flash, clear} = useMarks();
  const [audioOn, setAudioOn] = useState(running);

  // The board plays every round: the intro on round 1, then the pattern for the whole room
  useEffect(() => {
    const round = view.current;
    if (!round) return;
    const scope = new Scope();
    clear();
    void playRound(scope, round, view.settings, serverNow, {
      home: (ms) => flash(0, "lit", ms),
      note: view.settings.lights ? (index, ms) => flash(index, "lit", ms) : undefined,
    });
    return () => scope.dispose();
  }, [view.current]);

  // Fetch the samples while the class joins, so round 1 doesn't wait on the network
  useEffect(() => {
    if (view.phase === "lobby") loadSamples(view.settings.sound, pitchesFor(view.settings)).catch(() => {});
  }, [view.phase, view.settings]);

  // After a refresh, audio needs a click again
  useEffect(() => {
    if (audioOn) return;
    const enable = () => {
      unlock();
      setAudioOn(true);
    };
    addEventListener("pointerdown", enable, {once: true});
    return () => removeEventListener("pointerdown", enable);
  }, [audioOn]);

  // A clicker or the space bar moves the class on from across the room
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLButtonElement) return;
      if (e.key !== " " && e.key !== "ArrowRight" && e.key !== "PageDown") return;
      if (view.phase === "reveal" || view.phase === "leaderboard") {
        e.preventDefault();
        send({type: "next"});
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [view.phase]);

  if (view.closed || view.error === "ROOM_NOT_FOUND" || view.error === "BAD_HOST_KEY") {
    return (
      <div class="page">
        <main class="landing">
          <div class="intro">
            <h1>Room closed</h1>
            <p class="muted">
              {view.closed ? "This session has ended and nothing from it was kept." : ERROR_TEXT[view.error!]}
            </p>
          </div>
          <div class="start">
            <button type="button" class="button" onClick={onExit}>
              Host a new game
            </button>
          </div>
        </main>
      </div>
    );
  }

  const inRound = view.phase === "intro" || view.phase === "playback" || view.phase === "answering";
  const players = view.roster.filter((p) => !p.spectator).length;

  return (
    <div class="board">
      <header class="board-bar">
        <span class="board-code" aria-label={`Join code ${view.code}`}>
          {view.code}
        </span>
        <span class="muted">
          {view.roster.length} {view.roster.length === 1 ? "student" : "students"}
          {view.phase !== "lobby" && players < view.roster.length ? ` · ${view.roster.length - players} watching` : ""}
        </span>
        <div class="topbar-end">
          {view.phase !== "lobby" && view.phase !== "over" && (
            <button
              type="button"
              class="link-button"
              onClick={() => confirm("End the game now and show the final standings?") && send({type: "end"})}
            >
              End game
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      <ConnectionBanner status={status} />
      {!audioOn && view.phase !== "lobby" && (
        <p class="net-banner" role="status">
          Click anywhere to turn the board's sound on.
        </p>
      )}
      {view.error === "UNAVAILABLE" && (
        <p class="error" role="alert">
          {ERROR_TEXT.UNAVAILABLE}
        </p>
      )}

      {!view.ready ? (
        <p class="board-status muted">Connecting…</p>
      ) : view.phase === "lobby" ? (
        <Lobby
          view={view}
          send={send}
          onStart={() => {
            unlock();
            setAudioOn(true);
            send({type: "start"});
          }}
        />
      ) : inRound && view.current ? (
        <RoundBoard view={view} serverNow={serverNow} marks={marks} />
      ) : view.phase === "reveal" && view.reveal ? (
        <Reveal view={view} onNext={() => send({type: "next"})} />
      ) : view.phase === "leaderboard" && view.leaderboard ? (
        <Leaderboard view={view} onNext={() => send({type: "next"})} />
      ) : view.phase === "over" && view.over ? (
        <Podium view={view} onPlayAgain={() => send({type: "playAgain"})} onClose={() => send({type: "end"})} />
      ) : (
        <p class="board-status muted">Loading…</p>
      )}
    </div>
  );
}
