import * as assert from "assert";
import {
  findReferencesAt,
  renameSymbolAt,
  replacementTextForHit,
} from "./references";

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
\${user} <@greet name="x"/> \${tools.helper()} \${add(1, 2)}
`;

test("AC1: rename from declaration updates all references", () => {
  const at = sample.indexOf("user =");
  const offset = at + sample.slice(at).indexOf("user");
  const edits = renameSymbolAt(sample, offset, "member");
  assert.ok(edits);
  const refs = findReferencesAt(sample, offset, { includeDeclaration: true });
  assert.ok(refs);
  assert.strictEqual(edits!.length, refs!.length);
  const expectedTexts = new Set(refs!.map((r) => "member"));
  for (const e of edits!) {
    assert.strictEqual(e.newText, "member");
    expectedTexts.delete(e.newText);
  }
  assert.strictEqual(expectedTexts.size, 0);
  let renamed = sample;
  for (const e of edits!) {
    renamed =
      renamed.slice(0, e.startOffset) + e.newText + renamed.slice(e.endOffset);
  }
  assert.ok(renamed.includes('<#assign member = "Ada"'));
  assert.ok(renamed.includes("${member}"));
  assert.ok(!renamed.includes("${user}"));
});

test("AC2: rename from use site matches declaration rename", () => {
  const declAt = sample.indexOf("<#macro greet");
  const declOffset = declAt + "<#macro ".length;
  const useAt = sample.indexOf("<@greet");
  const useOffset = useAt + 2;
  const fromDecl = renameSymbolAt(sample, declOffset, "sayHi");
  const fromUse = renameSymbolAt(sample, useOffset, "sayHi");
  assert.ok(fromDecl);
  assert.ok(fromUse);
  const key = (e: { startOffset: number; endOffset: number; newText: string }) =>
    `${e.startOffset}:${e.endOffset}:${e.newText}`;
  assert.deepStrictEqual(
    fromDecl!.map(key).sort(),
    fromUse!.map(key).sort()
  );
});

test("AC3: occurrences inside FTL comments are not edited", () => {
  const text = `<#assign user = "x">
<#-- mention user in comment -->
\${user}
`;
  const at = text.indexOf("user =") + text.slice(text.indexOf("user =")).indexOf("user");
  const edits = renameSymbolAt(text, at, "member");
  assert.ok(edits);
  assert.strictEqual(edits!.length, 2);
  for (const e of edits!) {
    assert.ok(!text.slice(e.startOffset, e.endOffset).includes("comment"));
    const slice = text.slice(e.startOffset, e.endOffset);
    assert.ok(slice === "user" || slice === "member");
  }
  const commentUser = text.indexOf("mention") + "mention ".length;
  assert.ok(commentUser > 0);
  for (const e of edits!) {
    assert.notStrictEqual(e.startOffset, commentUser);
  }
});

test("AC4: non-identifier cursor returns undefined", () => {
  assert.strictEqual(renameSymbolAt(sample, 0, "x"), undefined);
});

test("AC4: non-renameable identifier returns undefined", () => {
  const at = sample.indexOf("tools.helper") + "tools.".length;
  assert.strictEqual(renameSymbolAt(sample, at, "other"), undefined);
});

test("invalid newName returns undefined", () => {
  const at = sample.indexOf("user =") + sample.slice(sample.indexOf("user =")).indexOf("user");
  assert.strictEqual(renameSymbolAt(sample, at, ""), undefined);
  assert.strictEqual(renameSymbolAt(sample, at, "9bad"), undefined);
  assert.strictEqual(renameSymbolAt(sample, at, "bad-name"), undefined);
});

test("qualified hits preserve namespace prefix", () => {
  assert.strictEqual(replacementTextForHit("tools.helper", "newHelper"), "tools.newHelper");
  assert.strictEqual(replacementTextForHit("helper", "foo.bar"), "bar");
});

console.log("All rename unit tests passed.");
