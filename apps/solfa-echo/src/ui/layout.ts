import {useEffect, useState} from "preact/hooks";
import {read, write} from "../core/storage";

export type Surface = "ladder" | "piano";

const LAYOUT_KEY = "ui.layout.v1";

// Phones pick the surface by orientation; anything bigger gets a toggle instead
const isPhone = () =>
  matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 600;

const isLandscape = () => innerWidth > innerHeight;

export function useSurface(): {surface: Surface; canToggle: boolean; toggle: () => void} {
  const [phone, setPhone] = useState(isPhone);
  const [landscape, setLandscape] = useState(isLandscape);
  const [choice, setChoice] = useState<Surface>(() =>
    read(LAYOUT_KEY, "ladder" as Surface, (v): v is Surface => v === "ladder" || v === "piano"),
  );

  useEffect(() => {
    const update = () => {
      setPhone(isPhone());
      setLandscape(isLandscape());
    };
    addEventListener("resize", update);
    return () => removeEventListener("resize", update);
  }, []);

  const toggle = () => {
    const next = choice === "ladder" ? "piano" : "ladder";
    setChoice(next);
    write(LAYOUT_KEY, next);
  };

  return {surface: phone ? (landscape ? "piano" : "ladder") : choice, canToggle: !phone, toggle};
}

// iOS Safari's 100vh includes the area behind its toolbars; the visual viewport doesn't
export function useViewportHeight() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => document.documentElement.style.setProperty("--app-h", `${viewport.height}px`);
    update();
    viewport.addEventListener("resize", update);
    return () => viewport.removeEventListener("resize", update);
  }, []);
}

// Height of an element, kept current as it resizes
export function useHeight(): [(el: HTMLElement | null) => void, number] {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return [setEl, height];
}
