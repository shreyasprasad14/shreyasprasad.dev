// Past this many lives a row of hearts gets too wide for a tile, so it shows "♥ 7" instead
const MAX_DRAWN = 5;

export default function Hearts({lives, max, size = "normal"}: {lives: number; max: number; size?: "normal" | "large"}) {
  const label = `${lives} ${lives === 1 ? "life" : "lives"} left`;
  if (max > MAX_DRAWN) {
    return (
      <span class={`hearts ${size}`} aria-label={label}>
        <span class={lives > 0 ? "heart full" : "heart"} aria-hidden="true">
          {lives > 0 ? "♥" : "♡"}
        </span>
        <span aria-hidden="true">{lives}</span>
      </span>
    );
  }
  return (
    <span class={`hearts ${size}`} aria-label={label}>
      {Array.from({length: max}, (_, i) => (
        <span key={i} class={i < lives ? "heart full" : "heart"} aria-hidden="true">
          {i < lives ? "♥" : "♡"}
        </span>
      ))}
    </span>
  );
}
