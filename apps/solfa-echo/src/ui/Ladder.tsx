import {keyLabel, type Key} from "../core/music";
import {useHeight} from "./layout";
import {tapHandlers} from "./NoteInput";

export type Mark = "lit" | "ok" | "bad";

export interface SurfaceProps {
  keys: Key[];
  marks: Record<number, Mark>;
  // Whether taps count right now; keys stay visible but inert otherwise
  active: boolean;
  onTap: (index: number) => void;
}

// Below this a key gets hard to hit, so the ladder splits into two columns instead
const MIN_KEY_PX = 44;
const GAP_PX = 6;

// High notes on top, home at the bottom
export default function Ladder({keys, marks, active, onTap}: SurfaceProps) {
  const [ref, height] = useHeight();
  const fits = height === 0 || (height - GAP_PX * (keys.length - 1)) / keys.length >= MIN_KEY_PX;
  const indices = keys.map((_, i) => i);
  const half = Math.ceil(keys.length / 2);
  const columns = fits ? [indices] : [indices.slice(0, half), indices.slice(half)];

  return (
    <div class="ladder" ref={ref} data-active={active}>
      {columns.map((column, c) => (
        <div class="ladder-column" key={c}>
          {[...column].reverse().map((i) => {
            const key = keys[i];
            const classes = ["rung", key.chromatic && "chromatic", key.outside && "outside", i === 0 && "home"];
            return (
              <button
                key={i}
                type="button"
                class={classes.filter(Boolean).join(" ")}
                data-mark={marks[i]}
                aria-label={key.alt ? `${key.syl} or ${key.alt}` : key.syl}
                aria-disabled={!active}
                {...tapHandlers(() => onTap(i))}
              >
                {keyLabel(key)}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
