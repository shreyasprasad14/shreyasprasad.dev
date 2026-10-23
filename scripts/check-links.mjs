// Fails the build if any page in dist/ links to a local path that doesn't exist.
// External links aren't fetched; this only guards against broken internal links.
import {existsSync, readdirSync, readFileSync, statSync} from "node:fs";
import {join} from "node:path";

const dist = new URL("../dist", import.meta.url).pathname;

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith(".html")) yield path;
  }
}

// Mirrors Cloudflare's html_handling: /a/ serves a/index.html, /a serves a.html or a/index.html
function resolves(pathname) {
  const file = join(dist, decodeURIComponent(pathname));
  if (existsSync(file) && statSync(file).isFile()) return true;
  return existsSync(join(file, "index.html")) || existsSync(`${file}.html`);
}

const attr = /\s(?:href|src)="([^"]+)"/g;
const broken = [];
let checked = 0;

for (const file of htmlFiles(dist)) {
  const page = file.slice(dist.length);
  for (const [, raw] of readFileSync(file, "utf8").matchAll(attr)) {
    if (/^(?:[a-z]+:|\/\/|#)/i.test(raw)) continue;
    const url = new URL(raw, `https://site.invalid${page}`);
    checked++;
    if (!resolves(url.pathname)) broken.push(`${page} → ${raw}`);
  }
}

if (broken.length > 0) {
  console.error(`Broken internal links:\n  ${broken.join("\n  ")}`);
  process.exit(1);
}
console.log(`Link check: ${checked} internal links OK.`);
