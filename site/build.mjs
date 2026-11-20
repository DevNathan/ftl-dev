// Builds the GitHub Pages site into ./dist.
// Code samples in src/samples/*.ftl are highlighted with the extension's own
// grammar (../extension/syntaxes/freemarker.tmLanguage.json), with HTML and
// SQL embedded, so the page shows what the extension really produces.
import { createHighlighter } from "shiki";
import { build } from "esbuild";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { codeThemes } from "./src/code-themes.js";

const here = dirname(fileURLToPath(import.meta.url));
const grammar = JSON.parse(
  readFileSync(join(here, "../extension/syntaxes/freemarker.tmLanguage.json"), "utf8")
);
const version = JSON.parse(readFileSync(join(here, "../extension/package.json"), "utf8")).version;
const preferences = readFileSync(join(here, "src/preferences.js"), "utf8");

const highlighter = await createHighlighter({
  themes: codeThemes,
  langs: ["html", "sql", { ...grammar, name: "freemarker", embeddedLangs: ["html", "sql"] }],
});

// Squiggles drawn on samples (0-based line / character), like the editor shows them.
const decorations = {
  diag: [{ start: { line: 3, character: 2 }, end: { line: 3, character: 11 }, properties: { class: "squiggle" } }],
};

const samples = {};
for (const file of readdirSync(join(here, "src/samples"))) {
  if (!file.endsWith(".ftl")) continue;
  const code = readFileSync(join(here, "src/samples", file), "utf8").replace(/\n$/, "");
  samples[file.replace(/\.ftl$/, "")] = highlighter.codeToHtml(code, {
    lang: "freemarker",
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
    decorations: decorations[file.replace(/\.ftl$/, "")] ?? [],
  });
  const title = file === "hero.ftl" ? "greeting.ftl" : "switch.ftl";
  samples[file.replace(/\.ftl$/, "")] = samples[file.replace(/\.ftl$/, "")]
    .replace("<pre ", `<pre tabindex="0" role="region" aria-label="${title}" `);
}

let html = readFileSync(join(here, "src/index.html"), "utf8");
html = html.replace(/\{\{sample:([\w-]+)\}\}/g, (_, name) => {
  if (!(name in samples)) throw new Error(`missing sample: ${name}`);
  return samples[name];
});
html = html.replaceAll("{{version}}", version);
html = html.replaceAll("{{preferences}}", preferences);
if (/\{\{[^}]*\}\}/.test(html)) throw new Error("unresolved placeholder in src/index.html");

const out = join(here, "dist");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "index.html"), html);
cpSync(join(here, "assets"), join(out, "assets"), { recursive: true });
writeFileSync(join(out, "playground.html"),
  readFileSync(join(here, "src/playground.html"), "utf8")
    .replaceAll("{{version}}", version).replaceAll("{{preferences}}", preferences));
cpSync(join(here, "src/playground.css"), join(out, "assets/playground.css"));

const playgroundSamples = {
  "hero.ftl": readFileSync(join(here, "src/samples/hero.ftl"), "utf8"),
  "switch.ftl": readFileSync(join(here, "src/samples/diag.ftl"), "utf8"),
};
for (const group of ["playground", "navigation", "ftldoc"]) {
  const directory = join(here, "../tests/fixtures", group);
  for (const file of readdirSync(directory).sort()) {
    if (/\.ftl[hx]?$/.test(file)) {
      playgroundSamples[`${group}/${file}`] = readFileSync(join(directory, file), "utf8");
    }
  }
}
writeFileSync(join(out, "assets/playground-samples.json"), JSON.stringify(playgroundSamples));
await build({
  entryPoints: [join(here, "src/playground.js")],
  outdir: join(out, "assets"),
  entryNames: "playground",
  chunkNames: "chunks/[name]-[hash]",
  splitting: true,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
});
writeFileSync(join(out, ".nojekyll"), "");
console.log(`site built (v${version}, ${Object.keys(playgroundSamples).length} editable examples) → dist/`);
