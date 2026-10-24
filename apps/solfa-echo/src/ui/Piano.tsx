import {isBlackKey, type Key} from "../core/music";
import type {SurfaceProps} from "./Ladder";
import {tapHandlers} from "./NoteInput";

const BLACK_WIDTH = 0.6; // of a white key

// A real keyboard from just below the lowest note to just above the highest. Only scale notes are
// labelled and playable; the others are drawn so the shape of the key is visible.
export default function Piano({keys, marks, active, onTap}: SurfaceProps) {
  const byMidi = new Map(keys.map((key, i) => [key.midi, i]));
  let low = Math.min(...keys.map((k) => k.midi)) - 1;
  let high = Math.max(...keys.map((k) => k.midi)) + 1;
  while (isBlackKey(low)) low--;
  while (isBlackKey(high)) high++;

  const whites: number[] = [];
  const blacks: {midi: number; left: number}[] = [];
  for (let midi = low; midi <= high; midi++) {
    if (isBlackKey(midi)) blacks.push({midi, left: whites.length});
    else whites.push(midi);
  }
  const whiteWidth = 100 / whites.length;

  const pianoKey = (midi: number, color: "white" | "black", style?: Record<string, string>) => {
    const index = byMidi.get(midi);
    if (index === undefined) {
      return <div key={midi} class={`piano-key ${color} silent`} style={style} aria-hidden="true" />;
    }
    const key: Key = keys[index];
    return (
      <button
        key={midi}
        type="button"
        class={`piano-key ${color}${index === 0 ? " home" : ""}`}
        style={style}
        data-mark={marks[index]}
        aria-label={key.alt ? `${key.syl} or ${key.alt}` : key.syl}
        aria-disabled={!active}
        {...tapHandlers(() => onTap(index))}
      >
        <span class="piano-label">
          {key.syl}
          {key.alt && <span class="piano-alt">{key.alt}</span>}
        </span>
      </button>
    );
  };

  return (
    <div class="piano" data-active={active}>
      {whites.map((midi) => pianoKey(midi, "white"))}
      {blacks.map(({midi, left}) =>
        pianoKey(midi, "black", {
          left: `${(left - BLACK_WIDTH / 2) * whiteWidth}%`,
          width: `${BLACK_WIDTH * whiteWidth}%`,
        }),
      )}
    </div>
  );
}
