import {useRef, useState} from "preact/hooks";
import {loadSamples, now, playNote, unlock, type Sound} from "../../core/audio";
import {doMidi, introPitches, KEY_NAMES, keyLabel, keysFor, type Key, type Mode} from "../../core/music";
import {Scope} from "../../core/scheduler";
import Celebrate from "../../ui/Celebrate";
import Ladder, {type Mark} from "../../ui/Ladder";
import {useSurface, useViewportHeight} from "../../ui/layout";
import {useNoteKeyboard} from "../../ui/NoteInput";
import Piano from "../../ui/Piano";
import ThemeToggle from "../../ui/ThemeToggle";
import {bestKey, loadBests, saveBest} from "./bests";
import {initialState, isCorrect, step, TIMING, type Effect, type SaysEvent, type SaysState} from "./SaysGame";
import {loadSettings, saveSettings, type SaysSettings} from "./settings";
import SetupPanel, {BestsTable} from "./SetupPanel";

// What one game was started with, after a random key is resolved
interface Game {
  mode: Mode;
  keyPc: number;
  sound: Sound;
  keys: Key[];
  bestKey: string;
  practice: boolean;
}

const COUNT_IN = ["3", "2", "1", "Go"];

const notes = (n: number) => `${n} ${n === 1 ? "note" : "notes"}`;

export default function SaysScreen() {
  const [settings, setSettings] = useState(loadSettings);
  const [state, setState] = useState<SaysState>(initialState);
  const [game, setGame] = useState<Game | null>(null);
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [count, setCount] = useState<string | null>(null);
  // Bumped to restart the timer bar's animation; 0 hides it
  const [timerRun, setTimerRun] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [bests, setBests] = useState(loadBests);
  const {surface, canToggle, toggle} = useSurface();
  useViewportHeight();

  // Scheduled callbacks run long after the render that made them, so they read these refs
  const stateRef = useRef(state);
  const gameRef = useRef<Game | null>(null);
  const scope = useRef(new Scope());
  const cancelTimer = useRef<(() => void) | undefined>(undefined);
  const markTokens = useRef<Record<number, number>>({});

  const setMark = (index: number, mark: Mark | null) =>
    setMarks((current) => {
      const next = {...current};
      if (mark) next[index] = mark;
      else delete next[index];
      return next;
    });

  // Marks a key for ms; a newer mark on the same key isn't cleared by an older one's timeout
  const flash = (index: number, mark: Mark, ms: number) => {
    const token = (markTokens.current[index] ?? 0) + 1;
    markTokens.current[index] = token;
    setMark(index, mark);
    scope.current.later(ms, () => {
      if (markTokens.current[index] === token) setMark(index, null);
    });
  };

  function dispatch(event: SaysEvent) {
    const result = step(stateRef.current, event);
    stateRef.current = result.state;
    setState(result.state);
    for (const effect of result.effects) perform(effect);
  }

  function perform(effect: Effect) {
    const g = gameRef.current;
    const s = scope.current;
    switch (effect.type) {
      case "cancelAll":
        s.dispose();
        scope.current = new Scope();
        cancelTimer.current = undefined;
        setMarks({});
        setCount(null);
        setTimerRun(0);
        setCelebrating(false);
        return;

      case "intro": {
        if (!g) return;
        const {arpeggio, chord} = introPitches(g.mode, g.keyPc);
        const t0 = now() + TIMING.lead;
        arpeggio.forEach((midi, i) => s.track(playNote(g.sound, midi, t0 + i * TIMING.introStep, TIMING.introNote)));
        const chordAt = t0 + TIMING.chordAt;
        for (const midi of chord) s.track(playNote(g.sound, midi, chordAt, TIMING.chordLength, 0.55));
        s.at(chordAt, () => flash(0, "lit", TIMING.chordLength * 1000));
        return;
      }

      case "countIn":
        COUNT_IN.forEach((label, i) => s.later(i * TIMING.countStepMs, () => setCount(label)));
        s.later(COUNT_IN.length * TIMING.countStepMs, () => setCount(null));
        return;

      case "playPattern": {
        if (!g) return;
        const t0 = now() + TIMING.lead;
        effect.pattern.forEach((index, i) => {
          const t = t0 + i * (TIMING.note + TIMING.gap);
          s.track(playNote(g.sound, g.keys[index].midi, t, TIMING.note));
          if (effect.lights) s.at(t, () => flash(index, "lit", TIMING.note * 1000));
        });
        return;
      }

      case "startTimer":
        cancelTimer.current?.();
        cancelTimer.current = s.later(effect.ms, () => dispatch({type: "timeout"}));
        setTimerRun((run) => run + 1);
        return;

      case "stopTimer":
        cancelTimer.current?.();
        cancelTimer.current = undefined;
        setTimerRun(0);
        return;

      case "tapFeedback":
        if (!g) return;
        s.track(playNote(g.sound, g.keys[effect.index].midi, now(), TIMING.tapNote, TIMING.tapVolume));
        // A wrong key stays red until the game ends
        flash(effect.index, effect.correct ? "ok" : "bad", effect.correct ? TIMING.flashMs : TIMING.failMs);
        return;

      case "after":
        s.later(effect.ms, () => dispatch(effect.event));
        return;

      case "saveBest":
        if (g) saveBest(g.bestKey, effect.score);
        setBests(loadBests());
        return;

      case "celebrate":
        setCelebrating(true);
        s.later(TIMING.celebrateMs, () => setCelebrating(false));
        return;
    }
  }

  async function start() {
    // Inside the tap, before any await: browsers only start audio from a user gesture
    unlock();
    const {mode, form, range, sound, lights, startHome} = settings;
    const keyPc = settings.keyPc === "random" ? Math.floor(Math.random() * 12) : settings.keyPc;
    const keys = keysFor(mode, range, form, keyPc);
    const {arpeggio, chord} = introPitches(mode, keyPc);

    setLoading(true);
    setLoadError(false);
    try {
      await loadSamples(sound, [...keys.map((k) => k.midi), ...arpeggio, ...chord]);
    } catch {
      setLoadError(true);
      return;
    } finally {
      setLoading(false);
    }

    const g: Game = {mode, keyPc, sound, keys, bestKey: bestKey(mode, form, range), practice: lights};
    gameRef.current = g;
    setGame(g);
    dispatch({type: "start", config: {keys, startHome, practice: lights, prevBest: loadBests()[g.bestKey] ?? 0}});
  }

  const changeSettings = (next: SaysSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const playing = state.phase !== "idle" && state.phase !== "gameOver";

  const shift = useNoteKeyboard({
    enabled: state.phase === "awaitingInput",
    keys: game?.keys ?? [],
    mode: game?.mode ?? "major",
    doPitch: doMidi(game?.keyPc ?? 0),
    onNote: (index) => dispatch({type: "tap", index}),
  });

  if (playing && game) {
    return (
      <Round
        state={state}
        game={game}
        marks={marks}
        count={count}
        timerRun={timerRun}
        shift={shift}
        surface={surface}
        canToggle={canToggle}
        onToggle={toggle}
        onTap={(index) => dispatch({type: "tap", index})}
        onQuit={() => dispatch({type: "quit"})}
      />
    );
  }

  return (
    <div class="page">
      <header class="topbar">
        <a href="https://shreyasprasad.dev/apps/">← Apps</a>
        <div class="topbar-end">
          <a href="https://shreyasprasad.dev/">shreyasprasad.dev</a>
          <ThemeToggle />
        </div>
      </header>

      <main class="landing">
        <div class="intro">
          <h1>Solfa Echo</h1>
          <p class="muted">
            Listen to a run of notes, then sing it back with your fingers. Every round adds one more note.
          </p>
        </div>

        {state.phase === "gameOver" && game && <Result state={state} game={game} />}

        <SetupPanel settings={settings} onChange={changeSettings} />

        <div class="start">
          <button type="button" class="button" onClick={start} disabled={loading}>
            {loading ? "Loading sounds…" : state.phase === "gameOver" ? "Play again" : "Start"}
          </button>
          {loadError && (
            <p class="error" role="alert">
              Couldn't load the sounds. Check your connection and try again.
            </p>
          )}
        </div>

        <BestsTable bests={bests} />

        <details class="help">
          <summary>How to play</summary>
          <p>
            First you'll hear the key: an arpeggio and chord ending on home ({settings.mode === "minorLa" ? "La" : "Do"}).
            Then the pattern plays. Tap the notes back in order; any octave counts. You have five seconds for each
            note. One wrong note or running out of time ends the game, and your score is the longest pattern you
            got right.
          </p>
          <p>
            On a keyboard, press D R M F S L T for the syllables or 1–8 for scale degrees. Press + or − first to
            raise or lower the next note a semitone, for notes like Me or Fi.
          </p>
        </details>
      </main>

      <footer class="credits muted">
        Voice samples from the{" "}
        <a href="https://github.com/gleitz/midi-js-soundfonts">Musyng Kite soundfont</a>{" "}
        (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>), piano from FluidR3_GM (
        <a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>), via midi-js-soundfonts. Trimmed and
        re-encoded.
      </footer>

      {celebrating && state.newBest && <Celebrate text={`New best: ${notes(state.score ?? 0)}`} />}
    </div>
  );
}

function Result({state, game}: {state: SaysState; game: Game}) {
  const {keys} = game;
  const at = state.failedAt ?? 0;
  const expected = keys[state.pattern[at]];
  const tapped = state.reason === "wrong" ? keys[state.taps[at]] : undefined;
  const score = state.score ?? 0;

  return (
    <section class="result" aria-live="polite">
      <p class="result-label">{state.newBest ? "New best" : "You echoed"}</p>
      <p class="result-score">{notes(score)}</p>
      <p>
        {tapped
          ? `Note ${at + 1} was ${keyLabel(expected)}, not ${keyLabel(tapped)}.`
          : `Time ran out on note ${at + 1}, which was ${keyLabel(expected)}.`}
      </p>
      <p class="pattern">{state.pattern.map((i) => keyLabel(keys[i])).join(" ")}</p>
      {game.practice && <p class="muted small">Practice mode, so this score isn't saved.</p>}
    </section>
  );
}

function Round({
  state,
  game,
  marks,
  count,
  timerRun,
  shift,
  surface,
  canToggle,
  onToggle,
  onTap,
  onQuit,
}: {
  state: SaysState;
  game: Game;
  marks: Record<number, Mark>;
  count: string | null;
  timerRun: number;
  shift: number;
  surface: "ladder" | "piano";
  canToggle: boolean;
  onToggle: () => void;
  onTap: (index: number) => void;
  onQuit: () => void;
}) {
  const {keys} = game;
  const length = state.pattern.length;
  const status: Record<string, string> = {
    intro: `This is ${keys[0].syl}`,
    countIn: "Get ready",
    playback: "Listen…",
    awaitingInput: "Your turn",
    roundSuccess: `✓ ${notes(length)}`,
    failing: "Not quite",
  };
  const active = state.phase === "awaitingInput";
  const Surface = surface === "piano" ? Piano : Ladder;

  return (
    <div class="round" data-surface={surface}>
      <header class="round-bar">
        <button type="button" class="link-button" onClick={onQuit}>
          ✕ Quit
        </button>
        <span class="round-label">
          Round {length} · {notes(length)} · Do = {KEY_NAMES[game.keyPc]}
        </span>
        {canToggle ? (
          <button type="button" class="link-button" onClick={onToggle}>
            {surface === "ladder" ? "Piano view" : "Ladder view"}
          </button>
        ) : (
          <span />
        )}
      </header>

      <div class="round-status">
        {count ? (
          <p class="count" aria-live="assertive">
            {count}
          </p>
        ) : (
          <p class={`status ${state.phase}`} role="status">
            {status[state.phase]}
          </p>
        )}
        <ol class="dots" aria-label={`${state.taps.length} of ${length} notes entered`}>
          {state.pattern.map((expected, i) => {
            const tap = state.taps[i];
            const result =
              tap === undefined ? (active && i === state.taps.length ? "next" : "") : isCorrect(keys, expected, tap) ? "ok" : "bad";
            return <li key={i} class={`dot ${result}`} />;
          })}
        </ol>
        <div class="timer" aria-hidden="true">
          {timerRun > 0 && <div key={timerRun} class="timer-fill" style={{animationDuration: `${TIMING.answerMs}ms`}} />}
        </div>
        <p class="shift" aria-live="polite">
          {shift === 1 ? "♯ Next note raised" : shift === -1 ? "♭ Next note lowered" : ""}
        </p>
      </div>

      <div class="surface">
        <Surface keys={keys} marks={marks} active={active} onTap={onTap} />
      </div>
    </div>
  );
}
