import {KEY_NAMES, keyLabel, type Key} from "../../core/music";
import Ladder, {type Mark} from "../../ui/Ladder";
import type {Progress, RevealResult, RosterEntry} from "../../shared/protocol";
import {formatPoints, Hearts} from "../bits";
import {liveKeys} from "../playback";
import {stageOf, useTicker, type RoomView} from "../useRoom";

const notes = (n: number) => `${n} ${n === 1 ? "note" : "notes"}`;

// The students scored this round: alive at its start, or already reported on
const playingThisRound = (view: RoomView) =>
  view.roster.filter((p) => (p.alive && !p.spectator) || view.progress[p.id] !== undefined);

function RoundHeader({view, keys, right}: {view: RoomView; keys: Key[]; right?: string}) {
  return (
    <div class="board-round">
      <span>
        Round {view.round} · {notes(view.current?.len ?? view.reveal?.pattern.length ?? 0)} · {keys[0].syl} = {KEY_NAMES[view.keyPc]}
      </span>
      {right && <span>{right}</span>}
    </div>
  );
}

export function RoundBoard({view, serverNow, marks}: {view: RoomView; serverNow: () => number; marks: Record<number, Mark>}) {
  useTicker(true, 100);
  const round = view.current!;
  const keys = liveKeys(view.settings, round.keyPc);
  const stage = stageOf(round, serverNow(), keys[0].syl, view.settings.timePerNote);
  const players = playingThisRound(view);
  const answered = players.filter((p) => view.progress[p.id]?.result).length;

  const status =
    stage.kind === "intro" || stage.kind === "countIn"
      ? stage.label
      : stage.kind === "listen"
        ? "Listen…"
        : stage.kind === "answer"
          ? "Your turn!"
          : "Get ready…";

  return (
    <main class="round-board">
      <RoundHeader view={view} keys={keys} right={stage.kind === "answer" ? `${answered} / ${players.length} answered` : undefined} />
      <div class="round-board-body">
        <div class="board-ladder">
          <Ladder keys={keys} marks={marks} active={false} onTap={() => {}} />
        </div>
        <div class="board-main">
          <p class={`board-status ${stage.kind}`} aria-live="polite">
            {status}
            {stage.kind === "answer" && <span class="board-countdown">{Math.ceil(stage.remainingMs / 1000)}</span>}
          </p>
          {stage.kind === "listen" && (
            <ol class="dots big" aria-label={`Note ${stage.note + 1} of ${round.len}`}>
              {Array.from({length: round.len}, (_, i) => (
                <li key={i} class={`dot ${i <= stage.note ? "next" : ""}`} />
              ))}
            </ol>
          )}
          {stage.kind === "answer" && (
            <div class="timer wide" aria-hidden="true">
              <div
                key={round.round}
                class="timer-fill"
                style={{animationDuration: `${stage.totalMs}ms`, animationDelay: `${stage.remainingMs - stage.totalMs}ms`}}
              />
            </div>
          )}
          <Tiles players={players} len={round.len} progress={view.progress} />
        </div>
      </div>
    </main>
  );
}

function Tiles({players, len, progress}: {players: RosterEntry[]; len: number; progress: Record<string, Progress>}) {
  return (
    <ul class="tiles">
      {players.map((p) => {
        const state = progress[p.id];
        const result = state?.result;
        return (
          <li key={p.id} class={`tile ${result ?? ""} ${p.connected ? "" : "offline"}`}>
            <span class="tile-name">{p.name || "…"}</span>
            <Hearts lives={p.lives} />
            <span class="tile-progress">
              {result === "ok" ? (
                "✓"
              ) : result === "miss" ? (
                "✗"
              ) : (
                <span class="tile-dots" aria-label={`${state?.taps ?? 0} of ${len}`}>
                  {Array.from({length: len}, (_, i) => (
                    <span key={i} class={i < (state?.taps ?? 0) ? "on" : ""} />
                  ))}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const RESULT_LABEL: Record<RevealResult["result"], string> = {ok: "✓", miss: "✗", timeout: "⏱"};

export function Reveal({view, onNext}: {view: RoomView; onNext: () => void}) {
  const reveal = view.reveal!;
  const keys = liveKeys(view.settings, view.keyPc);
  const byId = new Map(view.roster.map((p) => [p.id, p]));
  const cleared = reveal.results.filter((r) => r.result === "ok").length;
  const lost = reveal.results.length - cleared - reveal.out.length;
  const results = [...reveal.results].sort((a, b) => b.points - a.points);

  return (
    <main class="reveal">
      <RoundHeader view={view} keys={keys} />
      <ol class="reveal-pattern" aria-label="The pattern">
        {reveal.pattern.map((index, i) => (
          <li key={i} style={{animationDelay: `${i * 300}ms`}}>
            {keyLabel(keys[index])}
          </li>
        ))}
      </ol>
      <p class="reveal-summary">
        <span class="good">{cleared} got it</span>
        {lost > 0 && <span> · {lost} lost a life</span>}
        {reveal.out.length > 0 && <span class="bad"> · {reveal.out.length} out</span>}
      </p>
      <ul class="tiles">
        {results.map((r) => (
          <li key={r.id} class={`tile ${r.result} ${reveal.out.includes(r.id) ? "out" : ""}`}>
            <span class="tile-name">{byId.get(r.id)?.name || "…"}</span>
            <Hearts lives={r.livesLeft} />
            <span class="tile-progress">
              {r.result === "ok" ? `+${formatPoints(r.points)}` : reveal.out.includes(r.id) ? "Out" : RESULT_LABEL[r.result]}
            </span>
          </li>
        ))}
      </ul>
      <div class="board-next">
        <button type="button" class="link-button" onClick={onNext}>
          Skip to standings →
        </button>
      </div>
    </main>
  );
}
