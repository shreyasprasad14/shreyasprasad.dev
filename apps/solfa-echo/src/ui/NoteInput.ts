import {useEffect, useRef, useState} from "preact/hooks";
import {degreeLetter, isNoteLetter, keyForLetter, type Key, type Mode} from "../core/music";

export type Shift = -1 | 0 | 1;

const MODIFIER_MS = 2500;

// Keyboard play: D R M F S L T name syllables and 1–8 name scale degrees (8 is the top note).
// Pressing + or − first raises or lowers the next note a semitone, for minor and chromatic notes.
export function useNoteKeyboard({
  enabled,
  keys,
  mode,
  doPitch,
  onNote,
}: {
  enabled: boolean;
  keys: Key[];
  mode: Mode;
  doPitch: number;
  onNote: (index: number) => void;
}): Shift {
  const [shift, setShift] = useState<Shift>(0);
  const shiftRef = useRef<Shift>(0);
  const expiry = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef({enabled, keys, mode, doPitch, onNote});
  latest.current = {enabled, keys, mode, doPitch, onNote};

  useEffect(() => {
    const setModifier = (next: Shift) => {
      clearTimeout(expiry.current);
      shiftRef.current = next;
      setShift(next);
      if (next !== 0) expiry.current = setTimeout(() => setModifier(0), MODIFIER_MS);
    };

    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
      const {enabled, keys, mode, doPitch, onNote} = latest.current;
      const key = e.key.toLowerCase();

      if (key === "escape") return setModifier(0);
      if (key === "+" || key === "=") return setModifier(1);
      if (key === "-" || key === "_") return setModifier(-1);

      let letter: string | null = null;
      let top = false;
      if (isNoteLetter(key)) {
        letter = key;
      } else if (/^[1-8]$/.test(key)) {
        letter = degreeLetter(mode, Number(key));
        top = key === "8";
      }
      if (letter === null || !enabled) return;

      e.preventDefault();
      const index = keyForLetter(keys, doPitch, letter, shiftRef.current, top);
      setModifier(0);
      if (index !== -1) onNote(index);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      clearTimeout(expiry.current);
    };
  }, []);

  return shift;
}

// Pointer-down for an immediate response on touch, plus click for keyboard activation (detail 0)
export function tapHandlers(onTap: () => void) {
  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      onTap();
    },
    onClick: (e: MouseEvent) => {
      if (e.detail === 0) onTap();
    },
  };
}
