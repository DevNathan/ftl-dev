import * as assert from "assert";
import {
  findNameOccurrences,
  findReferencesAt,
  findReferencesInText,
  importNamespaces,
} from "./references";
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
\${user} <@greet name="x"/> \${tools.helper()} \${add(1, 2)}
`;

test("findNameOccurrences finds word-boundary matches", () => {
  const hits = findNameOccurrences(sample, "user");
  assert.ok(hits.length >= 2);
  for (const h of hits) {
    assert.strictEqual(sample.slice(h.startOffset, h.endOffset), "user");
  }
});

test("findNameOccurrences does not match substrings", () => {
  const text = "<#assign username = 1>${user}";
  const hits = findNameOccurrences(text, "user");
  assert.strictEqual(hits.length, 1);
  assert.strictEqual(text.slice(hits[0]!.startOffset, hits[0]!.endOffset), "user");
});

test("findReferencesInText includes declaration by default", () => {
  const hits = findReferencesInText(sample, "greet");
  const texts = hits.map((h) => sample.slice(h.startOffset, h.endOffset));
  assert.ok(texts.includes("greet"));
  assert.ok(hits.length >= 2); // decl + <@greet
});

test("findReferencesInText can exclude declaration", () => {
  const withDecl = findReferencesInText(sample, "add", {
    includeDeclaration: true,
  });
  const without = findReferencesInText(sample, "add", {
    includeDeclaration: false,
  });
  assert.ok(without.length < withDecl.length);
  for (const h of without) {
    const slice = sample.slice(h.startOffset, h.endOffset);
    // remaining should be usage in ${add(...)}
    assert.ok(slice === "add" || slice.endsWith(".add"));
  }
});

test("ns.sym best-effort: simple name also finds tools.helper", () => {
  const hits = findReferencesInText(sample, "helper");
  const texts = hits.map((h) => sample.slice(h.startOffset, h.endOffset));
  assert.ok(texts.includes("tools.helper"));
});

test("ns.sym best-effort: dotted name finds tools.helper", () => {
  const hits = findReferencesInText(sample, "tools.helper");
  assert.ok(hits.length >= 1);
  assert.strictEqual(
    sample.slice(hits[0]!.startOffset, hits[0]!.endOffset),
    "tools.helper"
  );
});

test("importNamespaces from index", () => {
  const ns = importNamespaces(indexFtl(sample));
  assert.deepStrictEqual(ns, ["tools"]);
});

test("findReferencesAt uses identifier under cursor", () => {
  const at = sample.indexOf("<@greet") + 2; // on 'g' of greet
  const hits = findReferencesAt(sample, at);
  assert.ok(hits);
  assert.ok(hits!.length >= 2);
});

test("findReferencesAt returns undefined off identifier", () => {
  const hits = findReferencesAt(sample, 0); // '<' of <#assign
  assert.strictEqual(hits, undefined);
});

console.log("All references unit tests passed.");
