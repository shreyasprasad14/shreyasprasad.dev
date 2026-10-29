import type {Standing} from "../../shared/protocol";
import {formatPoints, Hearts, ordinal} from "../bits";
import type {RoomView} from "../useRoom";

function StandingRow({entry, maxLives}: {entry: Standing; maxLives: number}) {
  return (
    <li class={entry.outRound !== undefined ? "out" : ""}>
      <span class="standing-rank">{entry.rank}</span>
      <span class="standing-name">{entry.name}</span>
      {entry.outRound !== undefined ? (
        <span class="muted small">out after round {entry.outRound}</span>
      ) : (
        <Hearts lives={entry.lives} max={maxLives} />
      )}
      <span class="standing-points">{formatPoints(entry.points)}</span>
    </li>
  );
}

export function Leaderboard({view, onNext}: {view: RoomView; onNext: () => void}) {
  const {top, round} = view.leaderboard!;
  const max = view.settings.maxRounds;
  return (
    <main class="standings">
      <h2>After round {round}{max > 0 ? ` of ${max}` : ""}</h2>
      <ol class="standing-list">
        {top.map((entry) => (
          <StandingRow key={entry.id} entry={entry} maxLives={view.settings.lives} />
        ))}
      </ol>
      <div class="board-next">
        <button type="button" class="button big" onClick={onNext} autofocus>
          Next round →
        </button>
        <p class="muted small">Space or → also works</p>
      </div>
    </main>
  );
}

const PLACES = ["first", "second", "third"];

export function Podium({view, onPlayAgain, onClose}: {view: RoomView; onPlayAgain: () => void; onClose: () => void}) {
  const {ranking, round} = view.over!;
  const top = ranking.slice(0, 3);
  // Second, first, third, like a real podium
  const order = [top[1], top[0], top[2]].filter((entry): entry is Standing => entry !== undefined);

  return (
    <main class="standings">
      <h2>Final standings · {round} {round === 1 ? "round" : "rounds"}</h2>
      {top.length > 0 ? (
        <ol class="podium">
          {order.map((entry) => {
            const place = top.indexOf(entry);
            return (
              <li key={entry.id} class={`podium-step ${PLACES[place]}`}>
                <span class="podium-name">{entry.name}</span>
                <span class="podium-points">{formatPoints(entry.points)}</span>
                <span class="podium-block">{ordinal(entry.rank)}</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p class="muted">Nobody played this game.</p>
      )}
      {ranking.length > 3 && (
        <ol class="standing-list compact">
          {ranking.slice(3).map((entry) => (
            <StandingRow key={entry.id} entry={entry} maxLives={view.settings.lives} />
          ))}
        </ol>
      )}
      <div class="board-next row">
        <button type="button" class="button big" onClick={onPlayAgain}>
          Play again
        </button>
        <button
          type="button"
          class="link-button"
          onClick={() => confirm("Close this room? Everyone in it will be disconnected.") && onClose()}
        >
          Close room
        </button>
      </div>
    </main>
  );
}
