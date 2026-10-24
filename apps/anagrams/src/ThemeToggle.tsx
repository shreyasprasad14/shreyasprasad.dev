import {useEffect, useState} from "preact/hooks";
import {currentTheme, toggleTheme, watchTheme} from "./theme";

// Same button as the site header; the choice is shared with the site and the other apps
export default function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme);
  useEffect(() => watchTheme(setTheme), []);

  return (
    <button
      class="theme-toggle"
      type="button"
      aria-label="Dark theme"
      aria-pressed={theme === "dark"}
      onClick={() => setTheme(toggleTheme())}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.5" />
        <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor" />
      </svg>
    </button>
  );
}
