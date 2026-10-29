import {useState} from "preact/hooks";
import {KEY_NAMES} from "../core/music";
import {isRecord, read, write} from "../core/storage";
import SetupPanel, {Choice} from "../games/says/SetupPanel";
import {DEFAULT_LIVE_SETTINGS, LIVES_PRESETS, MAX_LIVES, parseSettings, type LiveSettings} from "../shared/protocol";

const PREFS_KEY = "live.prefs.v1";

export const loadLiveSettings = (): LiveSettings =>
  parseSettings({...DEFAULT_LIVE_SETTINGS, ...read(PREFS_KEY, {}, isRecord)}) ?? DEFAULT_LIVE_SETTINGS;

export const saveLiveSettings = (settings: LiveSettings) => write(PREFS_KEY, settings);

const SCALE: Record<LiveSettings["mode"], string> = {
  major: "Major",
  minorDo: "Minor (Do-based)",
  minorLa: "Minor (La-based)",
  chromatic: "Chromatic",
};

export function describeSettings(s: LiveSettings): string {
  const range = s.range === 3 ? "full scale" : s.range === 2 ? "to the 5th" : "to the 3rd";
  return [
    `${SCALE[s.mode]}, ${range}`,
    s.keyPc === "random" ? "random key" : `Do = ${KEY_NAMES[s.keyPc]}`,
    `${s.timePerNote} s a note`,
    s.maxRounds === 0 ? "no round limit" : `${s.maxRounds} rounds`,
    `${s.lives} ${s.lives === 1 ? "life" : "lives"}`,
    s.lights ? "notes lit on the board" : "by ear",
  ].join(" · ");
}

export function LiveSettingsForm({settings, onChange}: {settings: LiveSettings; onChange: (s: LiveSettings) => void}) {
  const set = (patch: Partial<LiveSettings>) => onChange({...settings, ...patch});
  const isPreset = (LIVES_PRESETS as readonly number[]).includes(settings.lives);
  // Kept apart from the value so typing 3 into the custom box doesn't snap back to the 3 chip
  const [custom, setCustom] = useState(!isPreset);
  return (
    <div class="setup">
      <SetupPanel
        settings={settings}
        onChange={onChange}
        modeHints={{
          game: "By ear only. The board shows the scale but doesn't light the notes.",
          practice: "The board lights each note as it plays.",
        }}
      />
      <Choice
        legend="Time per note"
        name="time"
        value={settings.timePerNote}
        options={[
          {value: 3, label: "3 s"},
          {value: 5, label: "5 s"},
          {value: 8, label: "8 s"},
        ]}
        onChange={(timePerNote) => set({timePerNote})}
      />
      <Choice
        legend="Rounds"
        name="rounds"
        value={settings.maxRounds}
        options={[
          {value: 10, label: "10"},
          {value: 15, label: "15"},
          {value: 20, label: "20"},
          {value: 0, label: "Until everyone's out"},
        ]}
        onChange={(maxRounds) => set({maxRounds})}
      />
      <Choice<number | "custom">
        legend="Lives"
        name="lives"
        value={custom || !isPreset ? "custom" : settings.lives}
        options={[...LIVES_PRESETS.map((n) => ({value: n, label: String(n)})), {value: "custom", label: "Custom"}]}
        onChange={(next) => {
          setCustom(next === "custom");
          if (next !== "custom") set({lives: next});
        }}
      />
      {(custom || !isPreset) && (
        <label class="field">
          <span class="legend">Lives per student (1–{MAX_LIVES})</span>
          <input
            class="input"
            type="number"
            min={1}
            max={MAX_LIVES}
            value={settings.lives}
            onInput={(e) => {
              const lives = e.currentTarget.valueAsNumber;
              if (Number.isInteger(lives) && lives >= 1 && lives <= MAX_LIVES) set({lives});
            }}
          />
        </label>
      )}
      <Choice
        legend="Audio"
        name="audio"
        value={settings.studentAudio}
        options={[
          {value: false, label: "Board only"},
          {value: true, label: "Board and student devices"},
        ]}
        onChange={(studentAudio) => set({studentAudio})}
        hint={
          settings.studentAudio
            ? "For headphones or remote classes. Student devices receive the notes, so a curious student could find them."
            : "Students listen to the board. Their devices never receive the notes."
        }
      />
    </div>
  );
}
