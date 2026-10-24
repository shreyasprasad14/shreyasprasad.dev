// Solfa Echo Live's API, mounted by the site's Worker at solfa-echo.shreyasprasad.dev/api/*:
//   POST /api/rooms            → {code, hostKey}: makes a join code and a Room for it
//   GET  /api/rooms/:code/ws   → the room's WebSocket, for the host and the players
import {isCode, parseSettings} from "../src/shared/protocol";
import {makeCode} from "./codes";
import type {Room} from "./room";

export {Room} from "./room";

export interface LiveEnv {
  ROOM: DurableObjectNamespace<Room>;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {"Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store"},
  });

const SOCKET_PATH = /^\/api\/rooms\/([^/]+)\/ws$/;

// `path` is relative to the app, so it starts with /api/
export async function handleLive(request: Request, env: LiveEnv, path: string): Promise<Response> {
  if (path === "/api/rooms") {
    if (request.method !== "POST") return json({error: "METHOD_NOT_ALLOWED"}, 405);
    const body: unknown = await request.json().catch(() => null);
    const settings = parseSettings((body as {settings?: unknown} | null)?.settings);
    if (!settings) return json({error: "BAD_SETTINGS"}, 400);
    // 22⁴ codes, so a collision with a live room is rare; a few retries are plenty
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = makeCode();
      const created = await env.ROOM.get(env.ROOM.idFromName(code)).create(code, settings);
      if (created) return json({code, hostKey: created.hostKey});
    }
    return json({error: "UNAVAILABLE"}, 503);
  }

  const socket = path.match(SOCKET_PATH);
  if (socket) {
    const code = socket[1].toUpperCase();
    if (!isCode(code)) return json({error: "ROOM_NOT_FOUND"}, 404);
    if (request.headers.get("Upgrade") !== "websocket") return json({error: "EXPECTED_WEBSOCKET"}, 426);
    return env.ROOM.get(env.ROOM.idFromName(code)).fetch(request);
  }

  return json({error: "NOT_FOUND"}, 404);
}
