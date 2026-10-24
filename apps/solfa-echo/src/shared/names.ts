// Nickname rules for Live. Players are likely children on shared screens, so names are cleaned up,
// limited in length and checked against a blocklist. The teacher can still rename or kick anyone:
// a list like this catches the obvious, not everything.

export const NAME_MIN = 2;
export const NAME_MAX = 16;
const MAX_EMOJI = 2;

export type NameCheck = {ok: true; name: string} | {ok: false; reason: "invalid" | "blocked"};

const graphemes = (text: string): string[] =>
  typeof Intl.Segmenter === "function"
    ? [...new Intl.Segmenter("en", {granularity: "grapheme"}).segment(text)].map((s) => s.segment)
    : [...text];

const EMOJI = /\p{Extended_Pictographic}/u;

export function cleanName(raw: string): NameCheck {
  let name = raw
    .normalize("NFKC")
    // Control, format (except the joiner inside emoji), private-use and unassigned characters
    .replace(/[\p{Cc}\p{Co}\p{Cn}]|(?!‍)\p{Cf}/gu, "")
    // At most two combining marks in a row, which is enough for real names and stops "zalgo" text
    .replace(/(\p{M}{2})\p{M}+/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim();

  let emoji = 0;
  name = graphemes(name)
    .filter((g) => !EMOJI.test(g) || ++emoji <= MAX_EMOJI)
    .join("")
    .trim();

  const length = graphemes(name).length;
  if (length < NAME_MIN || length > NAME_MAX || !/[\p{L}\p{N}]/u.test(name)) return {ok: false, reason: "invalid"};
  if (isBlocked(name)) return {ok: false, reason: "blocked"};
  return {ok: true, name};
}

// Names compare case-insensitively, so "Bob" and "bob" can't both join
export const nameKey = (name: string) => name.normalize("NFKC").toLocaleLowerCase("en");

// Matched anywhere in a word, or across letters spaced out ("f u c k"); letters may repeat ("fuuuck")
const BLOCKED_ANYWHERE = [
  "fuck", "shit", "bitch", "cunt", "pussy", "penis", "vagina", "whore", "slut", "bastard", "asshole",
  "twat", "porn", "dildo", "boob", "tits", "hitler", "nigger", "nigga", "faggot", "retard", "suicide",
  "sexy", "nude", "naked", "milf", "jizz",
];

// Only a whole word: inside a longer word these are innocent ("Cassie", "Essex", "Hancock", "Grape", "Nazim")
const BLOCKED_WORDS = [
  "ass", "arse", "sex", "cum", "fag", "dick", "cock", "tit", "piss", "butt", "rape", "nazi", "wank", "horny",
  "kill", "anal", "kkk",
];

const LOOKALIKES: Record<string, string> = {
  "@": "a", "4": "a", "8": "b", "(": "c", "3": "e", "6": "g", "9": "g", "#": "h",
  "1": "i", "!": "i", "|": "i", "0": "o", "$": "s", "5": "s", "7": "t", "+": "t", "2": "z",
};

// Lowercase, accents off, look-alike symbols mapped to letters, everything else dropped
const fold = (word: string) =>
  [...word.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()]
    .map((c) => LOOKALIKES[c] ?? c)
    .filter((c) => c >= "a" && c <= "z")
    .join("");

// "fuck" → /f+u+c+k+/, so stretched spellings still match
const stretchy = (term: string) => new RegExp([...term].map((c) => `${c}+`).join(""));
const ANYWHERE = BLOCKED_ANYWHERE.map(stretchy);
const WORDS = BLOCKED_WORDS.map((term) => new RegExp(`^${[...term].map((c) => `${c}+`).join("")}$`));

export function isBlocked(name: string): boolean {
  const words = name.split(/[\s._\-,;:/\\]+/).map(fold).filter(Boolean);
  // Runs of single letters ("f u c k") are read as one word too
  const candidates = [...words];
  let run = "";
  for (const word of [...words, ""]) {
    if (word.length === 1) {
      run += word;
    } else {
      if (run.length > 1) candidates.push(run);
      run = "";
    }
  }
  return candidates.some(
    (word) => ANYWHERE.some((pattern) => pattern.test(word)) || WORDS.some((pattern) => pattern.test(word)),
  );
}
