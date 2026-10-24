// One Live room: the lobby and the authoritative game server for one join code.
// Built on the WebSocket hibernation API so the object sleeps (unbilled) between messages,
// which is what keeps a classroom game inside the Workers Free plan:
// - sockets are accepted with ctx.acceptWebSocket and carry their identity as an attachment;
// - the state lives in storage and is reloaded in the constructor after a hibernation;
// - timers are alarms, never setTimeout;
// - pings are answered by the runtime without waking the object.
import {DurableObject} from "cloudflare:workers";
import {MAX_MESSAGE_BYTES, parseClientMsg, type ClientMsg, type ErrorCode, type LiveSettings, type ServerMsg} from "../src/shared/protocol";
import {hashKey, makeHostKey} from "./codes";
import {newRoomState, RoomCore, type Outgoing, type RoomState} from "./room-core";

interface Attachment {
  role: "host" | "player" | null;
  playerId?: string;
}

// Per-socket message budget: bursts of 30, refilled at 20 a second
const BUCKET_SIZE = 30;
const BUCKET_RATE = 20 / 1000;
// A socket that keeps going over is closed
const MAX_DROPPED = 60;

interface Bucket {
  tokens: number;
  at: number;
  dropped: number;
}

export class Room extends DurableObject {
  private state: RoomState | null = null;
  // In memory only: losing them to a hibernation just resets the budgets
  private buckets = new WeakMap<WebSocket, Bucket>();

  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
    void ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<RoomState>("state")) ?? null;
    });
  }

  // Called by the Worker over RPC. Returns null if the code is already in use.
  async create(code: string, settings: LiveSettings): Promise<{hostKey: string} | null> {
    if (this.state) return null;
    const hostKey = makeHostKey();
    const now = Date.now();
    this.state = newRoomState(code, await hashKey(hostKey), settings, now);
    await this.save(new RoomCore(this.state));
    return {hostKey};
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected a WebSocket", {status: 426});
    const {0: client, 1: server} = new WebSocketPair();
    if (!this.state) {
      // A browser can't read an HTTP error from a WebSocket handshake, so say it over the socket
      server.accept();
      server.send(JSON.stringify({type: "error", code: "ROOM_NOT_FOUND"} satisfies ServerMsg));
      server.close(4404, "Room not found");
      return new Response(null, {status: 101, webSocket: client});
    }
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({role: null} satisfies Attachment);
    return new Response(null, {status: 101, webSocket: client});
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string" || message.length > MAX_MESSAGE_BYTES) return ws.close(1009, "Message too large");
    if (!this.allow(ws)) return;
    const msg = parseClientMsg(message);
    if (!msg) return ws.close(1008, "Bad message");

    if (msg.type === "time") return this.reply(ws, {type: "time", t0: msg.t0, serverT: Date.now()});
    if (!this.state) {
      this.reply(ws, {type: "error", code: "ROOM_NOT_FOUND"});
      return ws.close(4404, "Room not found");
    }

    const now = Date.now();
    const core = new RoomCore(this.state);
    core.tick(now);
    const attachment = ws.deserializeAttachment() as Attachment;

    if (msg.type === "hello") {
      await this.hello(ws, msg, core, now);
    } else if (attachment.role === "host") {
      if ((await this.host(msg, core, now)) === "close") return this.closeRoom();
    } else if (attachment.role === "player" && attachment.playerId) {
      this.player(ws, attachment.playerId, msg, core, now);
    } else {
      return ws.close(1008, "Say hello first");
    }
    await this.save(core);
  }

  async webSocketClose(ws: WebSocket) {
    await this.dropped(ws);
  }

  async webSocketError(ws: WebSocket) {
    await this.dropped(ws);
  }

  async alarm() {
    if (!this.state) return;
    const now = Date.now();
    const core = new RoomCore(this.state);
    if (core.expired(now)) return this.closeRoom();
    core.tick(now);
    // The alarm that fired is gone, so make sure the next one is set
    this.state.alarmAt = null;
    await this.save(core);
  }

  private async hello(ws: WebSocket, msg: Extract<ClientMsg, {type: "hello"}>, core: RoomCore, now: number) {
    if (msg.role === "host") {
      if ((await hashKey(msg.hostKey)) !== core.s.hostKeyHash) {
        this.reply(ws, {type: "error", code: "BAD_HOST_KEY"});
        return ws.close(4403, "Not the host");
      }
      ws.serializeAttachment({role: "host"} satisfies Attachment);
      core.touch(now);
      for (const m of core.snapshot("host")) this.reply(ws, m);
      return;
    }

    const error = core.join(msg.playerId, msg.name, now);
    if (error) {
      this.reply(ws, {type: "error", code: error});
      if (error === "KICKED" || error === "ROOM_FULL" || error === "ROOM_LOCKED") ws.close(4403, error);
      return;
    }
    ws.serializeAttachment({role: "player", playerId: msg.playerId} satisfies Attachment);
    for (const m of core.snapshot("player", msg.playerId)) this.reply(ws, m);
  }

  private async host(msg: ClientMsg, core: RoomCore, now: number): Promise<"close" | void> {
    core.touch(now);
    switch (msg.type) {
      case "settings":
        return core.setSettings(msg.settings);
      case "start": {
        const error = core.start(now);
        if (error) core.out.push({to: "host", msg: {type: "error", code: error}});
        return;
      }
      case "next":
        return core.next(now);
      case "end":
        return core.end() ? "close" : undefined;
      case "playAgain":
        return core.playAgain();
      case "kick":
        core.kick(msg.playerId, now);
        for (const socket of this.socketsOf(msg.playerId)) {
          this.reply(socket, {type: "error", code: "KICKED"});
          socket.close(4403, "Removed by the teacher");
        }
        return;
      case "rename":
        return core.rename(msg.playerId);
      case "lock":
        return core.lock(msg.locked);
    }
  }

  private player(ws: WebSocket, playerId: string, msg: ClientMsg, core: RoomCore, now: number) {
    switch (msg.type) {
      case "tap":
        return core.tap(playerId, msg.round, msg.i, msg.key, now);
      case "setName": {
        const error: ErrorCode | null = core.setName(playerId, msg.name);
        if (error) this.reply(ws, {type: "error", code: error});
        return;
      }
    }
  }

  // A player counts as gone once their last socket closes (a phone can have two tabs open)
  private async dropped(ws: WebSocket) {
    const attachment = ws.deserializeAttachment() as Attachment | null;
    if (!this.state || attachment?.role !== "player" || !attachment.playerId) return;
    if (this.socketsOf(attachment.playerId).some((socket) => socket !== ws)) return;
    const core = new RoomCore(this.state);
    core.tick(Date.now());
    core.disconnect(attachment.playerId, Date.now());
    await this.save(core);
  }

  private allow(ws: WebSocket): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(ws) ?? {tokens: BUCKET_SIZE, at: now, dropped: 0};
    bucket.tokens = Math.min(BUCKET_SIZE, bucket.tokens + (now - bucket.at) * BUCKET_RATE);
    bucket.at = now;
    this.buckets.set(ws, bucket);
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }
    if (++bucket.dropped > MAX_DROPPED) ws.close(1008, "Too many messages");
    return false;
  }

  private socketsOf(playerId: string): WebSocket[] {
    return this.ctx.getWebSockets().filter((socket) => {
      const attachment = socket.deserializeAttachment() as Attachment | null;
      return attachment?.role === "player" && attachment.playerId === playerId;
    });
  }

  private reply(ws: WebSocket, msg: ServerMsg) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // Closed under us; its close handler tidies up
    }
  }

  private deliver(out: Outgoing[]) {
    if (out.length === 0) return;
    const sockets = this.ctx.getWebSockets().map((socket) => ({
      socket,
      attachment: (socket.deserializeAttachment() as Attachment | null) ?? {role: null},
    }));
    for (const {to, msg} of out) {
      const text = JSON.stringify(msg);
      for (const {socket, attachment} of sockets) {
        const match =
          to === "all"
            ? attachment.role !== null
            : to === "host" || to === "players"
              ? attachment.role === (to === "host" ? "host" : "player")
              : attachment.role === "player" && attachment.playerId === to.player;
        if (!match) continue;
        try {
          socket.send(text);
        } catch {
          // Closed under us
        }
      }
    }
  }

  // Sends what the core queued, then saves the state and moves the alarm if it changed
  private async save(core: RoomCore) {
    this.deliver(core.out);
    const s = core.s;
    const alarmAt = core.nextAlarm();
    const moveAlarm = alarmAt !== s.alarmAt;
    if (!core.dirty && !moveAlarm) return;
    s.alarmAt = alarmAt;
    try {
      await this.ctx.storage.put("state", s);
      if (moveAlarm) await this.ctx.storage.setAlarm(alarmAt);
    } catch {
      // Most likely the free plan's daily write limit, which errors rather than bills
      for (const socket of this.ctx.getWebSockets()) this.reply(socket, {type: "error", code: "UNAVAILABLE"});
    }
  }

  // Ends the session: everyone is told, and nothing about the room is kept
  private async closeRoom() {
    for (const socket of this.ctx.getWebSockets()) {
      this.reply(socket, {type: "closed"});
      try {
        socket.close(4000, "Room closed");
      } catch {
        // Already closed
      }
    }
    this.state = null;
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }
}
