import * as assert from "assert";
import {
  findDefinitions,
  identifierAt,
  indexFtl,
  lineCharacterToOffset,
  offsetToLineCharacter,
} from "./symbols";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

const sample = `<#assign user = "Ada">
<#macro greet name>
  Hello \${name}
</#macro>
<#function add a b>
  <#return a + b>
</#function>
<#import "lib/tools.ftl" as tools>
<#include 'header.ftl'>
\${user} <@greet name="x"/> \${tools.helper()}
`;

test("indexes assign macro function", () => {
  const idx = indexFtl(sample);
  const names = idx.symbols.map((s) => `${s.kind}:${s.name}`).sort();
  assert.deepStrictEqual(names, [
    "assign:user",
    "function:add",
    "macro:greet",
  ]);
  const greet = idx.symbols.find((s) => s.name === "greet");
  const add = idx.symbols.find((s) => s.name === "add");
  assert.deepStrictEqual(greet?.params, [{ name: "name" }]);
  assert.deepStrictEqual(add?.params, [{ name: "a" }, { name: "b" }]);
});

test("indexes include and import paths", () => {
  const idx = indexFtl(sample);
  assert.strictEqual(idx.pathRefs.length, 2);
  const imp = idx.pathRefs.find((p) => p.kind === "import");
  assert.ok(imp);
  assert.strictEqual(imp!.path, "lib/tools.ftl");
  assert.strictEqual(imp!.asName, "tools");
  const inc = idx.pathRefs.find((p) => p.kind === "include");
  assert.strictEqual(inc!.path, "header.ftl");
});

test("findDefinitions by name", () => {
  const idx = indexFtl(sample);
  const defs = findDefinitions(idx, "greet");
  assert.strictEqual(defs.length, 1);
  assert.strictEqual(defs[0]!.kind, "macro");
});

test("identifierAt resolves dotted names", () => {
  const text = "${tools.helper()}";
  const at = text.indexOf("helper");
  const id = identifierAt(text, at);
  assert.ok(id);
  assert.strictEqual(id!.text, "tools.helper");
});

test("offset line/character roundtrip", () => {
  const text = "a\nbc\ndef";
  const off = lineCharacterToOffset(text, 2, 1);
  assert.strictEqual(text[off], "e");
  const pos = offsetToLineCharacter(text, off);
  assert.deepStrictEqual(pos, { line: 2, character: 1 });
});

test("square-bracket directives", () => {
  const text = `[#assign x = 1][#macro m][/#macro]`;
  const idx = indexFtl(text);
  assert.deepStrictEqual(
    idx.symbols.map((s) => s.name).sort(),
    ["m", "x"]
  );
});

console.log("All symbol unit tests passed.");
