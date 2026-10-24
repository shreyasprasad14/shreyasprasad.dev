// Plays a Live round on this device at the server's schedule: the key-setting intro (round 1),
// then the pattern. Times arrive as server epoch ms and are converted to AudioContext time through
// the clock offset, so the board and any student devices play in step.
import {loadSamples, now, playNote} from "../core/audio";
import {introPitches, keysFor, type Key} from "../core/music";
import type {Scope} from "../core/scheduler";
import type {LiveSettings, RoundMsg} from "../shared/protocol";
import {TIMING} from "../shared/says-core";

export const liveKeys = (settings: LiveSettings, keyPc: number): Key[] =>
  keysFor(settings.mode, settings.range, settings.form, keyPc);

// Every pitch a game with these settings can need; all twelve keys when the key is random
export function pitchesFor(settings: LiveSettings, keyPc?: number): number[] {
  const keyPcs = keyPc !== undefined ? [keyPc] : settings.keyPc === "random" ? [...Array(12).keys()] : [settings.keyPc];
  return keyPcs.flatMap((pc) => {
    const {arpeggio, chord} = introPitches(settings.mode, pc);
    return [...liveKeys(settings, pc).map((k) => k.midi), ...arpeggio, ...chord];
  });
}

export interface Lights {
  // Home lights up with the intro's chord, as in the solo game
  home?: (ms: number) => void;
  // Each pattern note as it plays (the board in Practice mode)
  note?: (index: number, ms: number) => void;
}

// Lights run on timers rather than audio time, so the board shows them even before audio is unlocked
export async function playRound(scope: Scope, round: RoundMsg, settings: LiveSettings, serverNow: () => number, lights: Lights = {}) {
  const keys = liveKeys(settings, round.keyPc);
  const atServer = (serverT: number, fn: () => void) => scope.later(Math.max(0, serverT - serverNow()), fn);

  const {home, note} = lights;
  if (round.intro && home) atServer(round.playAt + TIMING.chordAt * 1000, () => home(TIMING.chordLength * 1000));
  const step = (TIMING.note + TIMING.gap) * 1000;
  if (note) round.pattern?.forEach((index, i) => atServer(round.patternAt + i * step, () => note(index, TIMING.note * 1000)));

  try {
    await loadSamples(settings.sound, pitchesFor(settings, round.keyPc));
  } catch {
    // Without samples the round still runs; it's just silent here
    return;
  }
  if (!scope.alive) return;

  // AudioContext time for a server time; notes already in the past are skipped, not played late
  const toCtx = (serverT: number) => now() + (serverT - serverNow()) / 1000;
  const play = (midi: number, serverT: number, duration: number, volume?: number) => {
    const t = toCtx(serverT);
    if (t >= now() - 0.02) scope.track(playNote(settings.sound, midi, t, duration, volume));
  };

  if (round.intro) {
    const {arpeggio, chord} = introPitches(settings.mode, round.keyPc);
    arpeggio.forEach((midi, i) => play(midi, round.playAt + i * TIMING.introStep * 1000, TIMING.introNote));
    for (const midi of chord) play(midi, round.playAt + TIMING.chordAt * 1000, TIMING.chordLength, 0.55);
  }
  round.pattern?.forEach((index, i) => play(keys[index].midi, round.patternAt + i * step, TIMING.note));
}
