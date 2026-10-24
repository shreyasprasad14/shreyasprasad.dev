import {now} from "./audio";

// Everything one game has scheduled: timeouts and sounding notes. Disposing it on quit or restart
// means a stale callback can never light a key or play a note in the next game.
export class Scope {
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private sources = new Set<AudioScheduledSourceNode>();
  private disposed = false;

  get alive() {
    return !this.disposed;
  }

  // Runs fn after ms unless the scope is disposed first; returns a cancel function
  later(ms: number, fn: () => void): () => void {
    if (this.disposed) return () => {};
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (!this.disposed) fn();
    }, ms);
    this.timers.add(timer);
    return () => {
      clearTimeout(timer);
      this.timers.delete(timer);
    };
  }

  // Runs fn at AudioContext time t, so visuals line up with scheduled audio
  at(t: number, fn: () => void): () => void {
    return this.later(Math.max(0, (t - now()) * 1000), fn);
  }

  track(source: AudioScheduledSourceNode | null) {
    if (!source || this.disposed) return;
    this.sources.add(source);
    source.addEventListener("ended", () => this.sources.delete(source));
  }

  dispose() {
    this.disposed = true;
    for (const timer of this.timers) clearTimeout(timer);
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // Already stopped
      }
    }
    this.timers.clear();
    this.sources.clear();
  }
}
