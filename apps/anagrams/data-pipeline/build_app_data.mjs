// Trims the pipeline's word lists down to what the game reads at runtime,
// written to ../public so Vite copies them into the build as-is.
//   dictionary.txt: every 3-7 letter word (no answer can be longer than the 7 tiles)
//   starters.txt:   the 7-letter starting words, ranked list order, scores dropped
import {readFileSync, writeFileSync} from "node:fs";

const here = new URL(".", import.meta.url);
const read = (name) => readFileSync(new URL(name, here), "utf8").split(/\r?\n/);

const dictionary = read("words_alpha.txt").filter((w) => /^[a-z]{3,7}$/.test(w));
const starters = read("filtered_ranked_words.txt").map((line) => line.split(" ")[0]).filter(Boolean);

writeFileSync(new URL("../public/dictionary.txt", here), dictionary.join("\n") + "\n");
writeFileSync(new URL("../public/starters.txt", here), starters.join("\n") + "\n");
console.log(`dictionary: ${dictionary.length} words, starters: ${starters.length} words`);
