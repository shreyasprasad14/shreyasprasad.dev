import type {Sound} from "../../core/audio";
import type {Form, Mode, Range} from "../../core/music";
import {isRecord, read, write} from "../../core/storage";

export interface SaysSettings {
  mode: Mode;
  form: Form;
  range: Range;
  // Pitch class of Do, 0 = C
  keyPc: number | "random";
  sound: Sound;
  // Practice mode: keys light up during playback and scores aren't saved
  lights: boolean;
  // The pattern always starts on home
  startHome: boolean;
}

export const DEFAULT_SETTINGS: SaysSettings = {
  mode: "major",
  form: "natural",
  range: 3,
  keyPc: 0,
  sound: "voice",
  lights: false,
  startHome: true,
};

const PREFS_KEY = "says.prefs.v1";

const MODES: Mode[] = ["major", "minorDo", "minorLa", "chromatic"];
const FORMS: Form[] = ["natural", "harmonic", "melodic"];
const SOUNDS: Sound[] = ["voice", "piano"];

// Range and Practice mode aren't remembered: every visit opens on the full scale, in Game mode
export function loadSettings(): SaysSettings {
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
  };
}

export function saveSettings({mode, form, keyPc, sound, startHome}: SaysSettings) {
  write(PREFS_KEY, {mode, form, keyPc, sound, startHome});
}
