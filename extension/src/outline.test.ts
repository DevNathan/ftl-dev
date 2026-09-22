import * as assert from "assert";
import { buildOutline, buildOutlineFromIndex } from "./outline";
import { indexFtl } from "./symbols";

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
`;

test("buildOutline lists assign macro function in order", () => {
  const outline = buildOutline(sample);
  assert.deepStrictEqual(
    outline.map((e) => `${e.kind}:${e.name}`),
    ["assign:user", "macro:greet", "function:add"]
  );
});

test("outline name offsets match index", () => {
  const index = indexFtl(sample);
  const outline = buildOutlineFromIndex(index);
  assert.strictEqual(outline.length, index.symbols.length);
  for (let i = 0; i < outline.length; i++) {
    const o = outline[i]!;
    const s = index.symbols[i]!;
    assert.strictEqual(o.name, s.name);
    assert.strictEqual(o.kind, s.kind);
    assert.strictEqual(o.nameOffset, s.nameOffset);
    assert.strictEqual(o.nameLength, s.nameLength);
    assert.strictEqual(sample.slice(o.nameOffset, o.nameOffset + o.nameLength), s.name);
  }
});

test("outline entries have empty children (no cheap nesting)", () => {
  const outline = buildOutline(sample);
  for (const e of outline) {
    assert.deepStrictEqual(e.children, []);
  }
});

test("empty document yields empty outline", () => {
  assert.deepStrictEqual(buildOutline(""), []);
});

console.log("All outline unit tests passed.");
