// Builds every workspace app under apps/ and copies its output to dist/apps/<slug>/.
// Runs after `astro build`, which clears dist/ on every build.
import {execFileSync} from "node:child_process";
import {cpSync, existsSync, readFileSync, readdirSync, rmSync} from "node:fs";
import {join} from "node:path";

const root = new URL("..", import.meta.url).pathname;
const appsDir = join(root, "apps");

// Reuse the pnpm running this script (it may come from corepack and not be on PATH)
const pnpm = process.env.npm_execpath
  ? [process.execPath, process.env.npm_execpath]
  : ["pnpm"];

const slugs = readdirSync(appsDir, {withFileTypes: true})
  .filter((entry) => entry.isDirectory() && existsSync(join(appsDir, entry.name, "package.json")))
  .map((entry) => entry.name);

for (const slug of slugs) {
  const appDir = join(appsDir, slug);
  const contentEntry = join(root, "src/content/apps", `${slug}.md`);
  if (!existsSync(contentEntry)) {
    throw new Error(`apps/${slug} has no src/content/apps/${slug}.md, so the gallery wouldn't list it`);
  }

  console.log(`\n▸ building apps/${slug}`);
  execFileSync(pnpm[0], [...pnpm.slice(1), "--filter", `./apps/${slug}`, "run", "build"], {cwd: root, stdio: "inherit"});

  const out = join(root, "dist/apps", slug);
  rmSync(out, {recursive: true, force: true});
  cpSync(join(appDir, "dist"), out, {recursive: true});
  console.log(`  copied to dist/apps/${slug}/`);
}

// The gallery links to <slug>.shreyasprasad.dev, which the link checker skips, so check here that
// every listed app (tier 2 built above, tier 3 copied from public/) has a page to serve.
const contentDir = join(root, "src/content/apps");
for (const file of readdirSync(contentDir).filter((name) => name.endsWith(".md"))) {
  const slug = file.slice(0, -".md".length);
  if (/^draft:\s*true\s*$/m.test(readFileSync(join(contentDir, file), "utf8"))) continue;
  if (!existsSync(join(root, "dist/apps", slug, "index.html"))) {
    throw new Error(`src/content/apps/${file} has no dist/apps/${slug}/index.html; add apps/${slug}/ or public/apps/${slug}/`);
  }
}

console.log(`\nBuilt ${slugs.length} app${slugs.length === 1 ? "" : "s"}.`);
