import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  entryPoints: [fileURLToPath(new URL("../src/playground-highlight.js", import.meta.url))],
  bundle: true, write: false, platform: "node", format: "esm",
});
const { createTokenHighlighter } = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const highlight = await createTokenHighlighter();

test("ordinary comments meet normal-text contrast on the site's code panels", () => {
  function luminance(hex) {
    const channels = hex.match(/[a-f0-9]{2}/gi).map((value) => parseInt(value, 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  for (const token of highlight('<#-- Keep this comment readable. -->')) {
    for (const [theme, background] of [["light", "ffffff"], ["dark", "0d182b"]]) {
      const foreground = token.style.match(new RegExp(`--shiki-${theme}:#([a-f0-9]{6})`, "i"))[1];
      const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
      assert.ok((values[1] + 0.05) / (values[0] + 0.05) >= 4.5, `${theme}: ${foreground}`);
    }
  }
});

test("every example has valid token ranges and colors for both themes", () => {
  for (const directory of ["../src/samples/", "../../tests/fixtures/playground/", "../../tests/fixtures/navigation/", "../../tests/fixtures/ftldoc/"]) {
    const folder = new URL(directory, import.meta.url);
    for (const file of readdirSync(folder).filter((name) => /\.ftl[hx]?$/.test(name))) {
      const text = readFileSync(new URL(file, folder), "utf8");
      const tokens = highlight(text);
      assert.ok(tokens.length > 0, file);
      for (const token of tokens) {
        assert.ok(token.from >= 0 && token.to > token.from && token.to <= text.length, file);
        assert.match(token.style, /--shiki-light:#[0-9a-f]{6}/i, file);
        assert.match(token.style, /--shiki-dark:#[0-9a-f]{6}/i, file);
      }
      assert.ok(new Set(tokens.map((token) => token.style)).size > 1, file);
    }
  }
});

test("highlighting handles incomplete edits and pauses on oversized input", () => {
  for (const text of ['<#assign x = "', '[#macro card', '<#-- @lang sql -->\n<#assign query>SELECT', '${items[0']) {
    assert.ok(highlight(text).length);
  }
  assert.deepEqual(highlight("x".repeat(30001)), []);
  assert.deepEqual(highlight("x".repeat(2001)), []);
});
