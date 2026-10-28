// Builds the GitHub Pages site into ./dist.
// Code samples in src/samples/*.ftl are highlighted with the extension's own
// grammar (../extension/syntaxes/freemarker.tmLanguage.json), with HTML and
// SQL embedded, so the page shows what the extension really produces.
import { createHighlighter } from "shiki";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const grammar = JSON.parse(
  readFileSync(join(here, "../extension/syntaxes/freemarker.tmLanguage.json"), "utf8")
);
const version = JSON.parse(readFileSync(join(here, "../extension/package.json"), "utf8")).version;

const highlighter = await createHighlighter({
  themes: ["github-light", "github-dark"],
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
}

let html = readFileSync(join(here, "src/index.html"), "utf8");
html = html.replace(/\{\{sample:([\w-]+)\}\}/g, (_, name) => {
  if (!(name in samples)) throw new Error(`missing sample: ${name}`);
  return samples[name];
});
html = html.replaceAll("{{version}}", version);
if (/\{\{[^}]*\}\}/.test(html)) throw new Error("unresolved placeholder in src/index.html");

const out = join(here, "dist");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "index.html"), html);
cpSync(join(here, "assets"), join(out, "assets"), { recursive: true });
writeFileSync(join(out, ".nojekyll"), "");
console.log(`site built (v${version}, ${Object.keys(samples).length} samples) → dist/`);
