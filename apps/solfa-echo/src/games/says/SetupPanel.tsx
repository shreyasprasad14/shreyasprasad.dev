import {useState} from "preact/hooks";
import {isMinor, KEY_NAMES, type Form, type Mode, type Range} from "../../core/music";
import {bestKey, type Bests} from "./bests";
import type {SaysSettings} from "./settings";

interface Option<T> {
  value: T;
  label: string;
}

export function Choice<T extends string | number | boolean>({
  legend,
  name,
  value,
  options,
  onChange,
  hint,
}: {
  legend: string;
  name: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  hint?: string;
}) {
  return (
    <fieldset class="choice">
      <legend>{legend}</legend>
      <div class="chips">
        {options.map((option) => (
          <label class="chip" key={String(option.value)}>
            <input
              type="radio"
              name={name}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {hint && <p class="hint">{hint}</p>}
    </fieldset>
  );
}

type Scale = "major" | "minor" | "chromatic";

const SOLO_MODE_HINTS = {
  game: "By ear only. Your best score is saved.",
  practice: "Keys light up as they play. Scores aren't saved.",
};

// Generic so Live can pass its larger settings object through unchanged
export default function SetupPanel<S extends SaysSettings>({
  settings,
  onChange,
  modeHints = SOLO_MODE_HINTS,
}: {
  settings: S;
  onChange: (settings: S) => void;
  modeHints?: {game: string; practice: string};
}) {
  const set = (patch: Partial<SaysSettings>) => onChange({...settings, ...patch});
  const {mode} = settings;
  const scale: Scale = isMinor(mode) ? "minor" : (mode as Scale);
  const home = mode === "minorLa" ? "La" : "Do";

  return (
    <div class="setup">
      <Choice<Scale>
        legend="Scale"
        name="scale"
        value={scale}
        options={[
          {value: "major", label: "Major"},
          {value: "minor", label: "Minor"},
          {value: "chromatic", label: "Chromatic"},
        ]}
        onChange={(next) => {
          if (next !== scale) set({mode: next === "minor" ? "minorDo" : next});
        }}
      />

      {isMinor(mode) && (
        <div class="minor-options">
          <Choice<Mode>
            legend="Minor home"
            name="minor-base"
            value={mode}
            options={[
              {value: "minorDo", label: "Do-based"},
              {value: "minorLa", label: "La-based"},
            ]}
            onChange={(next) => set({mode: next})}
          />
          <Choice<Form>
            legend="Minor type"
            name="form"
            value={settings.form}
            options={[
              {value: "natural", label: "Natural"},
              {value: "harmonic", label: "Harmonic"},
              {value: "melodic", label: "Melodic"},
            ]}
            onChange={(next) => set({form: next})}
            hint={settings.range === 3 ? undefined : "Only changes the 6th and 7th, so it applies to the full scale."}
          />
        </div>
      )}

      <Choice<Range>
        legend="Notes"
        name="range"
        value={settings.range}
        options={[
          {value: 1, label: mode === "minorLa" ? "La–Do" : "Do–Mi"},
          {value: 2, label: mode === "minorLa" ? "La–Mi" : "Do–Sol"},
          {value: 3, label: "Full scale"},
        ]}
        onChange={(next) => set({range: next})}
      />

      <div class="choice">
        <label class="legend" for="key">Key</label>
        <select
          id="key"
          class="select"
          value={String(settings.keyPc)}
          onChange={(e) => {
            const value = e.currentTarget.value;
            set({keyPc: value === "random" ? "random" : Number(value)});
          }}
        >
          {KEY_NAMES.map((name, pc) => (
            <option key={pc} value={String(pc)}>
              Do = {name}
            </option>
          ))}
          <option value="random">Random key</option>
        </select>
      </div>

      <Choice
        legend="Sound"
        name="sound"
        value={settings.sound}
        options={[
          {value: "voice", label: "Voice"},
          {value: "piano", label: "Piano"},
        ]}
        onChange={(next) => set({sound: next})}
      />

      <Choice
        legend="Mode"
        name="lights"
        value={settings.lights}
        options={[
          {value: false, label: "Game"},
          {value: true, label: "Practice"},
        ]}
        onChange={(next) => set({lights: next})}
        hint={settings.lights ? modeHints.practice : modeHints.game}
      />

      <Choice
        legend="First note"
        name="first"
        value={settings.startHome}
        options={[
          {value: true, label: `Always ${home}`},
          {value: false, label: "Any note"},
        ]}
        onChange={(next) => set({startHome: next})}
      />
    </div>
  );
}

const BEST_ROWS: {mode: Mode; label: string}[] = [
  {mode: "major", label: "Major"},
  {mode: "minorDo", label: "Minor, Do-based"},
  {mode: "minorLa", label: "Minor, La-based"},
  {mode: "chromatic", label: "Chromatic"},
];

const FORM_SHORT: Record<Form, string> = {natural: "Nat", harmonic: "Harm", melodic: "Mel"};

export function BestsTable({bests}: {bests: Bests}) {
  const [open, setOpen] = useState(false);
  const cell = (mode: Mode, range: Range, form: Form = "natural") => bests[bestKey(mode, form, range)] ?? "–";

  return (
    <section class="bests">
      <button type="button" class="link-button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Hide best scores" : "Best scores"}
      </button>
      {open && (
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Scale</th>
                <th scope="col">To 3rd</th>
                <th scope="col">To 5th</th>
                <th scope="col">Full</th>
              </tr>
            </thead>
            <tbody>
              {BEST_ROWS.map(({mode, label}) => (
                <tr key={mode}>
                  <th scope="row">{label}</th>
                  <td>{cell(mode, 1)}</td>
                  <td>{cell(mode, 2)}</td>
                  <td>
                    {isMinor(mode) ? (
                      <span class="forms">
                        {(["natural", "harmonic", "melodic"] as Form[]).map((form) => (
                          <span key={form}>
                            <span class="muted">{FORM_SHORT[form]}</span> {cell(mode, 3, form)}
                          </span>
                        ))}
                      </span>
                    ) : (
                      cell(mode, 3)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
