// localStorage that never throws: private windows and blocked site data make every access fail,
// and the app should still work, just without remembering anything.

export function read<T>(key: string, fallback: T, valid: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    return valid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked
  }
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
