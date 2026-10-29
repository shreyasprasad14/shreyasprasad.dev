import qrcode from "qrcode-generator";
import {useMemo} from "preact/hooks";
import type {Status} from "./net";

export {default as Hearts} from "../ui/Hearts";

// Dark modules on white whatever the theme, since phone cameras expect that
export function QrCode({text, label}: {text: string; label: string}) {
  const path = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
    return {d, size: n + 8};
  }, [text]);

  return (
    <svg class="qr" viewBox={`0 0 ${path.size} ${path.size}`} role="img" aria-label={label} shape-rendering="crispEdges">
      <rect width={path.size} height={path.size} fill="#fff" />
      <path d={path.d} fill="#000" />
    </svg>
  );
}

export function ConnectionBanner({status}: {status: Status}) {
  if (status === "open") return null;
  return (
    <p class="net-banner" role="status">
      {status === "connecting" ? "Connecting…" : navigator.onLine ? "Reconnecting…" : "You're offline. Reconnecting when you're back…"}
    </p>
  );
}

export const ordinal = (n: number) => {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ({1: "st", 2: "nd", 3: "rd"} as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
};

export const formatPoints = (points: number) => points.toLocaleString("en");

export const ERROR_TEXT: Record<string, string> = {
  ROOM_NOT_FOUND: "There's no room with that code. Check the board and try again.",
  BAD_HOST_KEY: "This room belongs to another board.",
  NAME_REQUIRED: "Pick a nickname to join.",
  NAME_INVALID: "Nicknames are 2 to 16 characters, with at least one letter or number.",
  NAME_BLOCKED: "Please pick a different nickname.",
  NAME_TAKEN: "Someone already has that nickname. Try another.",
  ROOM_FULL: "This room is full (60 players).",
  ROOM_LOCKED: "The teacher has locked this room, so no one new can join.",
  KICKED: "The teacher removed you from this room.",
  NOT_ENOUGH_PLAYERS: "Wait for at least one student to join.",
  UNAVAILABLE: "The room is unavailable right now. Try again in a minute.",
};
