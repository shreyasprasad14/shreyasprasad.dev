import type {Form, Mode, Sound} from "../../core/music";
import {isRecord, read, write} from "../../core/storage";
import type {SaysSettings} from "../../shared/says-core";

export type {SaysSettings};

export const SOLO_LIVES = [1, 3, 5] as const;

export interface SoloSettings extends SaysSettings {
  lives: (typeof SOLO_LIVES)[number];
}

export const DEFAULT_SETTINGS: SoloSettings = {
  mode: "major",
  form: "natural",
  range: 3,
  keyPc: 0,
  sound: "voice",
  lights: false,
  startHome: true,
  lives: 1,
};

const PREFS_KEY = "says.prefs.v1";

const MODES: Mode[] = ["major", "minorDo", "minorLa", "chromatic"];
const FORMS: Form[] = ["natural", "harmonic", "melodic"];
const SOUNDS: Sound[] = ["voice", "piano"];

// Range and Practice mode aren't remembered: every visit opens on the full scale, in Game mode
export function loadSettings(): SoloSettings {
  const saved = read(PREFS_KEY, {}, isRecord);
  const pick = <T,>(value: unknown, allowed: readonly T[], fallback: T) =>
    allowed.includes(value as T) ? (value as T) : fallback;
  const keyPc = saved.keyPc;
  return {
    ...DEFAULT_SETTINGS,
    mode: pick(saved.mode, MODES, DEFAULT_SETTINGS.mode),
    form: pick(saved.form, FORMS, DEFAULT_SETTINGS.form),
    sound: pick(saved.sound, SOUNDS, DEFAULT_SETTINGS.sound),
    keyPc: keyPc === "random" || (Number.isInteger(keyPc) && (keyPc as number) >= 0 && (keyPc as number) < 12)
      ? (keyPc as number | "random")
      : DEFAULT_SETTINGS.keyPc,
    startHome: typeof saved.startHome === "boolean" ? saved.startHome : DEFAULT_SETTINGS.startHome,
    lives: pick(saved.lives, SOLO_LIVES, DEFAULT_SETTINGS.lives),
  };
}

export function saveSettings({mode, form, keyPc, sound, startHome, lives}: SoloSettings) {
  write(PREFS_KEY, {mode, form, keyPc, sound, startHome, lives});
}
