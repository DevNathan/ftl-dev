import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  entryPoints: [fileURLToPath(new URL("../src/playground-language.ts", import.meta.url))],
  bundle: true, write: false, platform: "node", format: "esm",
});
const { analyze, completionsAt, definitionAt, hoverAt, resolveFile } =
  await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const fixture = (path) => readFileSync(new URL("../../tests/fixtures/" + path, import.meta.url), "utf8");

test("editing the site's switch example clears its diagnostic", () => {
  const source = readFileSync(new URL("../src/samples/diag.ftl", import.meta.url), "utf8");
  const files = new Map([["switch.ftl", source]]);
  assert.ok(analyze("switch.ftl", files, false).diagnostics.some((d) => /mix/.test(d.message)));
  files.set("switch.ftl", source.replace("<#case 3>", "<#on 3>"));
  assert.deepEqual(analyze("switch.ftl", files, false).diagnostics, []);
  assert.ok(analyze("switch.ftl", files, true).diagnostics.some((d) => /count/.test(d.message)));
});

test("path hover and definitions use the edited virtual files", () => {
  const source = '<#import "lib.ftl" as lib>\n<#include "../navigation/header.ftl">\n${lib.label("hi")}';
  const files = new Map([
    ["playground/main.ftl", source],
    ["playground/lib.ftl", fixture("playground/lib.ftl")],
    ["navigation/header.ftl", fixture("navigation/header.ftl")],
  ]);
  let data = analyze("playground/main.ftl", files, false);
  assert.match(hoverAt(data, "playground/main.ftl", files, source.indexOf("lib.ftl")).markdown, /Reusable cards/);
  assert.match(hoverAt(data, "playground/main.ftl", files, source.indexOf("header.ftl")).markdown, /Shared header/);
  assert.deepEqual(definitionAt(data, "playground/main.ftl", files, source.indexOf("header.ftl")),
    { file: "navigation/header.ftl", offset: 0 });
  files.set("playground/lib.ftl", '<#-- @file Updated library description. -->\n<#function label text><#return text></#function>');
  data = analyze("playground/main.ftl", files, false);
  assert.match(hoverAt(data, "playground/main.ftl", files, source.indexOf("lib.ftl")).markdown, /Updated library description/);
});

test("namespaced definitions prefer the imported declaration and completion replaces the member", () => {
  const library = '<#-- Imported label. -->\n<#function label text><#return text></#function>';
  const source = '<#import "lib.ftl" as lib>\n<#assign label = "local">\n${lib.label("hi")}\n${lib.la';
  const files = new Map([["main.ftl", source], ["lib.ftl", library]]);
  const data = analyze("main.ftl", files, false);
  const call = source.indexOf("label(\"hi");
  assert.deepEqual(definitionAt(data, "main.ftl", files, call), { file: "lib.ftl", offset: library.indexOf("label text") });
  assert.match(hoverAt(data, "main.ftl", files, call).markdown, /Imported label/);
  const result = completionsAt(data, source.length, true);
  assert.equal(result.from, source.length - 2);
  const completion = result.items.find((item) => item.label === "label");
  assert.equal(completion.insertText, "label($0)");
  assert.match(completion.documentation, /Imported label/);
});

test("ftldoc tag help includes the language policy without completing inside comments", () => {
  const text = '<#-- @lang sql -->\n<#assign query>SELECT id FROM orders</#assign>';
  const files = new Map([["sql.ftl", text]]);
  const data = analyze("sql.ftl", files, false);
  const hover = hoverAt(data, "sql.ftl", files, text.indexOf("@lang"));
  assert.match(hover.markdown, /Currently only SQL/);
  assert.match(hover.markdown, /More languages may be added later, but there are no plans yet/);
  assert.equal(completionsAt(data, text.indexOf("sql"), true), undefined);
  assert.equal(definitionAt(data, "sql.ftl", files, text.indexOf("sql")), undefined);
});

test("local definitions respect scope and built-ins provide reference help", () => {
  const source = '<#function f><#local tmp = "hi"><#return tmp?upper_case></#function>\n${tmp}';
  const files = new Map([["main.ftl", source]]);
  const data = analyze("main.ftl", files, false);
  assert.deepEqual(definitionAt(data, "main.ftl", files, source.indexOf("tmp?")), { file: "main.ftl", offset: source.indexOf("tmp =") });
  assert.equal(definitionAt(data, "main.ftl", files, source.lastIndexOf("tmp")), undefined);
  assert.match(hoverAt(data, "main.ftl", files, source.indexOf("upper_case")).markdown, /FreeMarker Manual/);
});

test("virtual paths stay local and malformed paths do not break analysis", () => {
  assert.equal(resolveFile("playground/main.ftl", "../navigation/header.ftl"), "navigation/header.ftl");
  assert.equal(resolveFile("main.ftl", "https://example.com/remote.ftl"), undefined);
  assert.equal(resolveFile("main.ftl", "%broken.ftl"), undefined);
  assert.equal(resolveFile("main.ftl", "http://["), undefined);
  const text = '<#import "%broken.ftl" as broken>\n<#include "${dynamic}.ftl">';
  const files = new Map([["main.ftl", text]]);
  const data = analyze("main.ftl", files, false);
  assert.equal(hoverAt(data, "main.ftl", files, text.indexOf("dynamic")), undefined);
});
