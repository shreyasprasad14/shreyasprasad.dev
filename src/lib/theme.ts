// Light/dark choice shared by the site and every app. On the real domain the cookie is set for
// shreyasprasad.dev, so a choice made on any subdomain applies to all of them; with no cookie, pages
// follow the OS. Each page's <head> applies the cookie before first paint; this handles the rest.
// Copies: src/lib/theme.ts, apps/anagrams/src/theme.ts, apps/solfa-echo/src/ui/theme.ts. Keep them in sync.

export type Theme = "light" | "dark";

const APEX = "shreyasprasad.dev";
const COOKIE = /(?:^|;\s*)theme=(light|dark)(?:;|$)/;
const THEME_COLOR: Record<Theme, string> = {light: "#fafaf8", dark: "#121214"};

const root = document.documentElement;
const osDark = matchMedia("(prefers-color-scheme: dark)");
const osTheme = (): Theme => (osDark.matches ? "dark" : "light");

export const currentTheme = (): Theme => (root.dataset.theme as Theme | undefined) ?? osTheme();

function setOverride(theme: Theme | undefined) {
  if (theme) root.dataset.theme = theme;
  else delete root.dataset.theme;
  // The media-keyed theme-color tags only know the OS setting, so pin both to the shown theme
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute("content", THEME_COLOR[currentTheme()]);
  }
}

export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === "dark" ? "light" : "dark";
  // Picking the OS theme drops the override, so pages follow the OS again
  const follow = next === osTheme();
  const host = location.hostname;
  const domain = host === APEX || host.endsWith(`.${APEX}`) ? `; Domain=${APEX}` : "";
  const secure = location.protocol === "https:" ? "; Secure" : "";
  const value = follow ? "theme=; Max-Age=0" : `theme=${next}; Max-Age=31536000`;
  try {
    document.cookie = `${value}; Path=/${domain}; SameSite=Lax${secure}`;
  } catch {}
  setOverride(follow ? undefined : next);
  return next;
}

// Calls back with the shown theme whenever it changes without a click: the OS setting flips, or the
// page comes back from the back/forward cache after another subdomain changed the cookie
export function watchTheme(onChange: (theme: Theme) => void): () => void {
  const sync = () => {
    setOverride(root.dataset.theme as Theme | undefined);
    onChange(currentTheme());
  };
  const restore = (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    let saved: Theme | undefined;
    try {
      saved = document.cookie.match(COOKIE)?.[1] as Theme | undefined;
    } catch {}
    setOverride(saved);
    onChange(currentTheme());
  };
  osDark.addEventListener("change", sync);
  addEventListener("pageshow", restore);
  sync();
  return () => {
    osDark.removeEventListener("change", sync);
    removeEventListener("pageshow", restore);
  };
}
