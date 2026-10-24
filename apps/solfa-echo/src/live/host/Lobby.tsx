import {useState} from "preact/hooks";
import type {ClientMsg, RosterEntry} from "../../shared/protocol";
import {ERROR_TEXT, QrCode} from "../bits";
import {describeSettings, LiveSettingsForm} from "../settings";
import type {RoomView} from "../useRoom";

export function joinLink(code: string) {
  return `${location.origin}${location.pathname}#/join/${code}`;
}

export function Lobby({view, send, onStart}: {view: RoomView; send: (msg: ClientMsg) => void; onStart: () => void}) {
  const [editing, setEditing] = useState(false);
  const site = `${location.host}${location.pathname.replace(/\/$/, "")}`;
  const ready = view.roster.some((p) => p.name !== "");

  return (
    <main class="lobby">
      <section class="join-panel">
        <p class="join-how">
          Go to <strong>{site}</strong>, tap <strong>Join a class</strong> and enter
        </p>
        <p class="join-code">{view.code}</p>
        <QrCode text={joinLink(view.code)} label={`QR code to join room ${view.code}`} />
        <p class="muted small">or scan to join</p>
      </section>

      <section class="lobby-side">
        <div class="lobby-head">
          <h2>
            {view.roster.length === 0 ? "Waiting for students…" : `${view.roster.length} joined`}
          </h2>
          <label class="toggle">
            <input type="checkbox" checked={view.locked} onChange={(e) => send({type: "lock", locked: e.currentTarget.checked})} />
            <span>Lock room</span>
          </label>
        </div>
        <Roster roster={view.roster} send={send} />

        <div class="lobby-actions">
          <button type="button" class="button big" onClick={onStart} disabled={!ready}>
            Start
          </button>
          {view.error === "NOT_ENOUGH_PLAYERS" && <p class="error">{ERROR_TEXT.NOT_ENOUGH_PLAYERS}</p>}
        </div>

        <div class="lobby-settings">
          <p class="muted small">{describeSettings(view.settings)}</p>
          <div class="lobby-links">
            <button type="button" class="link-button" aria-expanded={editing} onClick={() => setEditing(!editing)}>
              {editing ? "Done" : "Change settings"}
            </button>
            <button
              type="button"
              class="link-button"
              onClick={() => confirm("Close this room? Everyone in it will be disconnected.") && send({type: "end"})}
            >
              Close room
            </button>
          </div>
          {editing && <LiveSettingsForm settings={view.settings} onChange={(settings) => send({type: "settings", settings})} />}
        </div>
      </section>
    </main>
  );
}

// Tap a name to rename or remove that student
export function Roster({roster, send}: {roster: RosterEntry[]; send: (msg: ClientMsg) => void}) {
  const [open, setOpen] = useState<string | null>(null);
  if (roster.length === 0) return <p class="muted">Names appear here as students join.</p>;

  return (
    <ul class="roster">
      {roster.map((p) => (
        <li key={p.id} class={p.connected ? "" : "offline"}>
          <button
            type="button"
            class="roster-name"
            aria-expanded={open === p.id}
            onClick={() => setOpen(open === p.id ? null : p.id)}
          >
            {p.name || <span class="muted">picking a new name…</span>}
          </button>
          {open === p.id && (
            <span class="roster-menu">
              <button
                type="button"
                class="link-button"
                onClick={() => {
                  send({type: "rename", playerId: p.id});
                  setOpen(null);
                }}
              >
                Ask for a new name
              </button>
              <button
                type="button"
                class="link-button danger"
                onClick={() => {
                  send({type: "kick", playerId: p.id});
                  setOpen(null);
                }}
              >
                Remove
              </button>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
