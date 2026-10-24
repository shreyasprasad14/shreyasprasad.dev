// Sampled notes on the Web Audio API: one small mp3 per pitch, fetched only when a game needs it.
// Output chain: per-note envelope → master gain → compressor → speakers.

import type {Sound} from "./music";

export type {Sound};

// public/samples/<sound>/<midi>.mp3 exist for E2 (40) to A5 (81)
const SAMPLE_LOW = 40;
const SAMPLE_HIGH = 81;
const ATTACK = 0.01;
const RELEASE = 0.08;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const loading = new Map<string, Promise<AudioBuffer>>();
const loaded = new Map<string, AudioBuffer>();

// Call from a user gesture (the Start tap): browsers keep audio suspended until then
export function unlock(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext({latencyHint: "interactive"});
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.createDynamicsCompressor()).connect(ctx.destination);
    // iOS: play even with the ringer switch on silent, like a music app would
    const session = (navigator as {audioSession?: {type: string}}).audioSession;
    if (session) session.type = "playback";
  }
  if (ctx.state !== "running") void ctx.resume();
  return ctx;
}

export const now = () => ctx?.currentTime ?? 0;

// False until a user gesture has started audio (Live's board needs one after a refresh)
export const running = () => ctx?.state === "running";

const sampleFor = (midi: number) => Math.min(SAMPLE_HIGH, Math.max(SAMPLE_LOW, midi));
const cacheKey = (sound: Sound, sample: number) => `${sound}/${sample}`;

function fetchSample(sound: Sound, sample: number): Promise<AudioBuffer> {
  const key = cacheKey(sound, sample);
  let promise = loading.get(key);
  if (!promise) {
    const context = unlock();
    promise = fetch(`${import.meta.env.BASE_URL}samples/${key}.mp3`)
      .then((response) => {
        if (!response.ok) throw new Error(`${key}: ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        loaded.set(key, buffer);
        return buffer;
      })
      .catch((error: unknown) => {
        // Let a later game retry instead of caching the failure
        loading.delete(key);
        throw error;
      });
    loading.set(key, promise);
  }
  return promise;
}

export async function loadSamples(sound: Sound, pitches: number[]): Promise<void> {
  await Promise.all([...new Set(pitches.map(sampleFor))].map((sample) => fetchSample(sound, sample)));
}

// Schedules one note at AudioContext time `when`. Returns the source so a game can stop it early,
// or null when the sample hasn't loaded (the note is skipped rather than played late).
export function playNote(sound: Sound, midi: number, when: number, duration: number, volume = 1): AudioBufferSourceNode | null {
  const sample = sampleFor(midi);
  const buffer = loaded.get(cacheKey(sound, sample));
  if (!ctx || !master || !buffer) return null;

  const start = Math.max(when, ctx.currentTime);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  // Only differs from 1 for pitches outside the sample set
  source.playbackRate.value = 2 ** ((midi - sample) / 12);

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(volume, start + ATTACK);
  envelope.gain.setValueAtTime(volume, start + duration);
  envelope.gain.linearRampToValueAtTime(0, start + duration + RELEASE);

  source.connect(envelope).connect(master);
  source.start(start);
  source.stop(start + duration + RELEASE + 0.02);
  return source;
}
