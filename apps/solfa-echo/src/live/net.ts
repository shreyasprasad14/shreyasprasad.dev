// The WebSocket to a Live room: typed messages, reconnect with backoff (re-sending hello, so the
// server answers with a fresh snapshot), a keepalive ping, and a server clock estimate.
import type {ClientMsg, ServerMsg} from "../shared/protocol";

export type Status = "connecting" | "open" | "offline";

const BACKOFF_MS = [500, 1000, 2000, 4000, 8000, 10_000];
const PING_MS = 20_000;
const PROBES = 5;

// Relative to the page, so it works at the subdomain root, under /apps/solfa-echo/ and in dev
export const apiUrl = (path: string) => {
  const url = new URL(path, location.href);
  url.hash = "";
  url.search = "";
  return url;
};

export const socketUrl = (code: string) => {
  const url = apiUrl(`api/rooms/${code}/ws`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.href;
};

export class Connection {
  private ws: WebSocket | null = null;
  private attempt = 0;
  private stopped = false;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private pingTimer: ReturnType<typeof setInterval> | undefined;
  private probesLeft = 0;
  private bestRtt = Infinity;
  // Server time ≈ Date.now() + offset
  offset = 0;

  constructor(
    private readonly url: string,
    private readonly hello: () => ClientMsg,
    private readonly onMessage: (msg: ServerMsg) => void,
    private readonly onStatus: (status: Status) => void,
  ) {
    addEventListener("online", this.reconnectNow);
    this.connect();
  }

  serverNow = () => Date.now() + this.offset;

  send(msg: ClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  // For good: after the room closes, a kick, or leaving the page
  stop() {
    this.stopped = true;
    removeEventListener("online", this.reconnectNow);
    clearTimeout(this.retryTimer);
    clearInterval(this.pingTimer);
    this.ws?.close(1000);
    this.ws = null;
  }

  private connect() {
    if (this.stopped) return;
    this.onStatus(this.attempt === 0 ? "connecting" : "offline");
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.onStatus("open");
      this.send(this.hello());
      this.probesLeft = PROBES;
      this.probe();
      clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send("ping"), PING_MS);
    };

    ws.onmessage = (event) => {
      if (typeof event.data !== "string" || event.data === "pong") return;
      let msg: ServerMsg;
      try {
        msg = JSON.parse(event.data) as ServerMsg;
      } catch {
        return;
      }
      if (msg.type === "time") this.onTime(msg.t0, msg.serverT);
      else this.onMessage(msg);
    };

    ws.onclose = () => {
      clearInterval(this.pingTimer);
      if (this.ws !== ws || this.stopped) return;
      this.ws = null;
      this.onStatus("offline");
      const delay = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)];
      this.attempt += 1;
      this.retryTimer = setTimeout(() => this.connect(), delay);
    };
  }

  private reconnectNow = () => {
    if (this.stopped || this.ws) return;
    clearTimeout(this.retryTimer);
    this.connect();
  };

  private probe() {
    if (this.probesLeft-- > 0) this.send({type: "time", t0: Date.now()});
  }

  // Keeps the estimate from the fastest round trip, where the one-way time is least uncertain
  private onTime(t0: number, serverT: number) {
    const rtt = Date.now() - t0;
    if (rtt < this.bestRtt) {
      this.bestRtt = rtt;
      this.offset = serverT - (t0 + rtt / 2);
    }
    this.probe();
  }
}
