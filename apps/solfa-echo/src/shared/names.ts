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
    .replace(/[\p{Cc}\p{Co}\p{Cn}]|(?!\u200D)\p{Cf}/gu, "")
    // At most two combining marks in a row, which is enough for real names and stops "zalgo" text
    .replace(/(\p{M}{2})\p{M}+/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim();

  let emoji = 0;
  name = graphemes(name)
    .filter((g) => !EMOJI.test(g) || ++emoji <= MAX_EMOJI)
    // The joiner only belongs inside an emoji; next to letters it is invisible ("A\u200Dda" would pass for "Ada")
    .map((g) => (EMOJI.test(g) ? g : g.replace(/\u200D/gu, "")))
    .join("")
    .trim();

  const length = graphemes(name).length;
  if (length < NAME_MIN || length > NAME_MAX || !/[\p{L}\p{N}]/u.test(name)) return {ok: false, reason: "invalid"};
  if (isBlocked(name)) return {ok: false, reason: "blocked"};
  return {ok: true, name};
}

// Names compare case-insensitively and without joiners, so "Bob", "bob" and "B\u200Dob" can't all join
export const nameKey = (name: string) => name.normalize("NFKC").replace(/\u200D/gu, "").toLocaleLowerCase("en");

// Matched anywhere in a word, or across pieces spaced out ("f u c k", "fu ck"); letters may repeat ("fuuuck")
// and any but the first may be starred out ("f*ck")
const BLOCKED_ANYWHERE = [
  "fuck", "shit", "bitch", "cunt", "pussy", "penis", "vagina", "whore", "slut", "bastard", "asshole",
  "twat", "porn", "dildo", "boob", "tits", "hitler", "nigger", "nigga", "faggot", "retard", "suicide",
  "sexy", "nude", "naked", "milf", "jizz", "nword",
  // "ass" itself is only blocked as a whole word, so the common compounds are listed here
  "bigass", "fatass", "dumbass", "jackass", "smartass", "badass", "asshat",
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

// Lowercase, accents off, look-alike symbols mapped to letters, "*" kept as a masked letter, everything else dropped
const fold = (word: string) =>
  [...word.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()]
    .map((c) => LOOKALIKES[c] ?? c)
    .filter((c) => (c >= "a" && c <= "z") || c === "*")
    .join("");

// "fuck" → /f+[u*]+[c*]+[k*]+/, so stretched and starred spellings still match
const stretchy = (term: string) => [...term].map((c, i) => (i === 0 ? `${c}+` : `[${c}*]+`)).join("");
const ANYWHERE = BLOCKED_ANYWHERE.map((term) => new RegExp(stretchy(term)));
// Every term, matched as a whole word
const WHOLE = [...BLOCKED_ANYWHERE, ...BLOCKED_WORDS].map((term) => new RegExp(`^${stretchy(term)}$`));

export function isBlocked(name: string): boolean {
  const tokens = name.split(/[\s._\-,;:/\\]+/);
  // Capitals start a new piece too, so "BigAss" is also read as "Big" and "Ass"
  const pieces = tokens.flatMap((token) => token.split(/(?<=\p{Ll})(?=\p{Lu})/u)).map(fold).filter(Boolean);
  const candidates = [...tokens.map(fold), ...pieces];
  // Runs of one- or two-letter pieces ("f u c k", "fu ck") are read as one word too
  let run: string[] = [];
  for (const piece of [...pieces, ""]) {
    if (piece.length > 0 && piece.length <= 2) {
      run.push(piece);
    } else {
      if (run.length > 1) candidates.push(run.join(""));
      run = [];
    }
  }
  // A lone letter is read with the next piece ("n word"), but only as a whole term, so an initial before a
  // name ("S Lutsky") isn't read as one word
  const joined = pieces.slice(1).flatMap((piece, i) => (pieces[i].length === 1 ? [pieces[i] + piece] : []));
  const words = candidates.filter(Boolean);
  return (
    words.some((word) => ANYWHERE.some((pattern) => pattern.test(word))) ||
    [...words, ...joined].some((word) => WHOLE.some((pattern) => pattern.test(word)))
  );
}
