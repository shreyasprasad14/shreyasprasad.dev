import {useMemo} from "preact/hooks";

const BALLOONS = 16;
const HUES = [212, 145, 32, 350, 270, 190];

// Balloons rising behind a banner; with reduced motion, just the banner
export default function Celebrate({text}: {text: string}) {
  const balloons = useMemo(
    () =>
      Array.from({length: BALLOONS}, (_, i) => ({
        left: 4 + Math.random() * 88,
        delay: Math.random() * 0.9,
        duration: 2.2 + Math.random() * 0.8,
        size: 34 + Math.random() * 26,
        hue: HUES[i % HUES.length],
      })),
    [],
  );

  return (
    <div class="celebrate">
      <div class="balloons" aria-hidden="true">
        {balloons.map((b, i) => (
          <span
            key={i}
            class="balloon"
            style={{
              left: `${b.left}%`,
              width: `${b.size}px`,
              height: `${b.size * 1.2}px`,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
              "--hue": String(b.hue),
            }}
          />
        ))}
      </div>
      <p class="banner">{text}</p>
    </div>
  );
}
