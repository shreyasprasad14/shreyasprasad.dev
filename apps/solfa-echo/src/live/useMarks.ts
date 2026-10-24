import {useRef, useState} from "preact/hooks";
import type {Mark} from "../ui/Ladder";

// Key highlights that clear themselves; a newer mark on a key isn't cleared by an older one's timer
export function useMarks() {
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const tokens = useRef<Record<number, number>>({});

  const flash = (index: number, mark: Mark, ms: number) => {
    const token = (tokens.current[index] ?? 0) + 1;
    tokens.current[index] = token;
    setMarks((current) => ({...current, [index]: mark}));
    setTimeout(() => {
      if (tokens.current[index] !== token) return;
      setMarks((current) => {
        const next = {...current};
        delete next[index];
        return next;
      });
    }, ms);
  };

  return {marks, flash, clear: () => setMarks({})};
}
