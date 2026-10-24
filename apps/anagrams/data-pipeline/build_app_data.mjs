// Builds the word lists the game reads at runtime, written to ../public so Vite copies them as-is.
//   dictionary.txt: every 3-7 letter word in words_alpha.txt (no answer can be longer than the 7 tiles)
//   common.txt:     the dictionary words common enough to count toward a puzzle's score; the end
//                   screen lists the ones the day's letters make
//   starters.txt:   one 7-letter word per day; the game plays line (days since START_DATE) % length
//
// Letters may repeat in the game, so a puzzle is really its set of distinct letters: words are
// compared as 26-bit letter masks, and anagrams like hastier/sheriat count as one puzzle.
//
// starters.txt is append-only so past and current days keep their word: a rerun keeps the existing
// lines and appends any newly qualifying puzzles. Pass --reset to rebuild it from scratch.
import {existsSync, readFileSync, writeFileSync} from "node:fs";

const STARTER_MAX_RANK = 30_000; // the starting word itself must be this common
const ANSWER_MAX_RANK = 50_000; // only answers this common count toward a puzzle's score
const MIN_ANSWERS = 20;
const MAX_STARTERS = 2_000;
const SHUFFLE_SEED = 0x616e6167;
// Points by word length; keep in sync with scoreTable in src/App.tsx
const SCORE_TABLE = [0, 0, 0, 100, 400, 1200, 2000, 5000];

const here = new URL(".", import.meta.url);
const startersFile = new URL("../public/starters.txt", here);
const read = (file) => readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);

const dictionary = read(new URL("words_alpha.txt", here)).filter((w) => /^[a-z]{3,7}$/.test(w));
// Names, fragments and unpleasant words that make a poor puzzle of the day; still valid guesses
const excluded = new Set(read(new URL("excluded_starters.txt", here)).filter((line) => !line.startsWith("#")));

// word_freq.txt is sorted most frequent first, so the line number is the rank
const rank = new Map();
read(new URL("word_freq.txt", here)).forEach((line, i) => {
  const word = line.slice(0, line.indexOf("\t"));
  if (!rank.has(word)) rank.set(word, i);
});
const rankOf = (word) => rank.get(word) ?? Infinity;

const maskOf = (word) => {
  let mask = 0;
  for (let i = 0; i < word.length; i++) mask |= 1 << (word.charCodeAt(i) - 97);
  return mask;
};

const wordsByMask = new Map();
for (const word of dictionary) {
  const mask = maskOf(word);
  if (!wordsByMask.has(mask)) wordsByMask.set(mask, []);
  wordsByMask.get(mask).push(word);
}

// One candidate per letter set: its most common 7-letter word, if that is common enough
const candidates = new Map();
for (const word of dictionary) {
  if (word.length !== 7 || rankOf(word) >= STARTER_MAX_RANK || excluded.has(word)) continue;
  const mask = maskOf(word);
  const best = candidates.get(mask);
  if (!best || rankOf(word) < rankOf(best)) candidates.set(mask, word);
}

// Score each puzzle by the common answers a player could find; at most 7 distinct letters means
// at most 127 non-empty letter subsets to look up
const puzzles = [];
for (const [mask, word] of candidates) {
  let answers = 0;
  let score = 0;
  for (let sub = mask; sub; sub = (sub - 1) & mask) {
    for (const answer of wordsByMask.get(sub) ?? []) {
      if (rankOf(answer) >= ANSWER_MAX_RANK) continue;
      answers++;
      score += SCORE_TABLE[answer.length];
    }
  }
  if (answers >= MIN_ANSWERS) puzzles.push({word, mask, score});
}
puzzles.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
const selected = puzzles.slice(0, MAX_STARTERS);

const reset = process.argv.includes("--reset");
const starters = !reset && existsSync(startersFile) ? read(startersFile) : [];
const playedMasks = new Set(starters.map(maskOf));
const added = shuffle(
  selected.filter((p) => !playedMasks.has(p.mask)).map((p) => p.word),
  mulberry32(SHUFFLE_SEED + starters.length),
);
starters.push(...added);

const common = dictionary.filter((word) => rankOf(word) < ANSWER_MAX_RANK);

writeFileSync(new URL("../public/dictionary.txt", here), dictionary.join("\n") + "\n");
writeFileSync(new URL("../public/common.txt", here), common.join("\n") + "\n");
writeFileSync(startersFile, starters.join("\n") + "\n");
console.log(
  `dictionary: ${dictionary.length} words, ${common.length} common; puzzles: ${puzzles.length} qualify, ` +
    `${added.length} added, ${starters.length} starters total`,
);

function shuffle(items, random) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}
