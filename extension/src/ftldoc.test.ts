import * as assert from "assert";
import { symbolHover } from "./docs";
import {
  formatFtlDocMarkdown,
  leadingFtlDoc,
  parseFtlDoc,
} from "./ftldoc";
import { findDefinitions, indexFtl } from "./symbols";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

// --- AC4 ---
test("parseFtlDoc summary and tags (AC4)", () => {
  const doc = parseFtlDoc(`
  Greets a user.

  @param name display name
  @return greeting
  @deprecated use sayHi
`);
  assert.ok(doc);
  assert.ok(doc!.summary.includes("Greets"));
  assert.strictEqual(doc!.params.length, 1);
  assert.strictEqual(doc!.params[0]!.name, "name");
  assert.strictEqual(doc!.params[0]!.description, "display name");
  assert.strictEqual(doc!.returns, "greeting");
  assert.ok(doc!.deprecated?.includes("sayHi"));

  const viaReturns = parseFtlDoc("@returns the value");
  assert.strictEqual(viaReturns?.returns, "the value");

  const bareDep = parseFtlDoc("@deprecated");
  assert.ok(bareDep);
  assert.strictEqual(bareDep!.deprecated, "");
});

test("parseFtlDoc see since stop tags", () => {
  const doc = parseFtlDoc(`
  Needs a value.

  @param x value
  @stop if x is missing
  @stop on invalid type
  @see say
  @see https://example.com/docs
  @since 1.2.0
`);
  assert.ok(doc);
  assert.deepStrictEqual(doc!.stops, [
    "if x is missing",
    "on invalid type",
  ]);
  assert.deepStrictEqual(doc!.see, ["say", "https://example.com/docs"]);
  assert.strictEqual(doc!.since, "1.2.0");

  const md = formatFtlDocMarkdown("require", "function", doc);
  assert.ok(md.includes("**Stop**"));
  assert.ok(md.includes("**See**"));
  assert.ok(md.includes("**Since**"));
  assert.ok(md.includes("1.2.0"));
});

// --- AC3 ---
test("@ignore at start yields no doc (AC3)", () => {
  assert.strictEqual(parseFtlDoc("@ignore\nside effect"), undefined);
  assert.strictEqual(parseFtlDoc("  @IGNORE trash\n"), undefined);
});

test("mid-body @ignore does not wipe doc", () => {
  const doc = parseFtlDoc("Keep me.\n@ignore\n@param a x");
  assert.ok(doc);
  assert.ok(doc!.summary.includes("Keep me"));
  assert.strictEqual(doc!.params[0]?.name, "a");
});

// --- AC1 ---
test("leading comment attaches to function (AC1)", () => {
  const text = `<#--
  Says hello.
  @param name who
-->
<#function say name>
  <#return "hi">
</#function>
`;
  const index = indexFtl(text);
  const say = index.symbols.find((s) => s.name === "say");
  assert.ok(say?.doc);
  assert.ok(say!.doc!.summary.includes("Says hello"));
  assert.strictEqual(say!.doc!.params[0]?.name, "name");

  const viaLeading = leadingFtlDoc(text, text.indexOf("<#function"));
  assert.ok(viaLeading?.summary.includes("Says hello"));
});

test("leading comment attaches to macro/assign/local/global (AC1)", () => {
  const text = `<#-- macro docs -->
<#macro box>
  <#-- local docs -->
  <#local n = 1>
</#macro>
<#-- assign docs -->
<#assign title = "x" />
<#-- global docs -->
<#global g = 2>
`;
  const index = indexFtl(text);
  assert.ok(
    index.symbols.find((s) => s.kind === "macro" && s.name === "box")?.doc
      ?.summary.includes("macro docs")
  );
  assert.ok(
    index.symbols.find((s) => s.kind === "local" && s.name === "n")?.doc
      ?.summary.includes("local docs")
  );
  assert.ok(
    index.symbols.find((s) => s.kind === "assign" && s.name === "title")?.doc
      ?.summary.includes("assign docs")
  );
  assert.ok(
    index.symbols.find((s) => s.kind === "global" && s.name === "g")?.doc
      ?.summary.includes("global docs")
  );
});

// --- AC2 ---
test("non-whitespace between comment and decl → no doc (AC2)", () => {
  const text = `<#-- orphaned docs -->
<p>gap</p>
<#assign title = "x" />
`;
  const t = indexFtl(text).symbols.find((s) => s.name === "title");
  assert.ok(t);
  assert.strictEqual(t!.doc, undefined);

  const codeBetween = `<#-- docs -->
<#assign other = 1>
<#function f>
</#function>
`;
  // Comment sits above assign, not above function (non-ws code between).
  const f = indexFtl(codeBetween).symbols.find((s) => s.name === "f");
  assert.ok(f);
  assert.strictEqual(f!.doc, undefined);
});

// --- AC3 (index) ---
test("@ignore assign has no doc (AC3)", () => {
  const text = `<#--
@ignore
discard
-->
<#assign r = ob.log() />
`;
  const r = indexFtl(text).symbols.find((s) => s.name === "r");
  assert.ok(r);
  assert.strictEqual(r!.doc, undefined);
});

test("assign without ignore keeps summary", () => {
  const text = `<#-- title for page -->
<#assign title = "x" />
`;
  const t = indexFtl(text).symbols.find((s) => s.name === "title");
  assert.ok(t?.doc?.summary.includes("title for page"));
});

// --- AC7 ---
test("local only visible inside enclosing function (AC7)", () => {
  const text = `<#function outer>
  <#-- inner local -->
  <#local x = 1>
  \${x}
</#function>
\${x}
`;
  const index = indexFtl(text);
  const local = index.symbols.find((s) => s.kind === "local" && s.name === "x");
  assert.ok(local?.scopeStart !== undefined);
  assert.ok(local?.scopeEnd !== undefined);
  assert.ok(local?.doc?.summary.includes("inner local"));

  const inside = text.indexOf("${x}");
  const outside = text.lastIndexOf("${x}");
  assert.ok(inside < outside);

  const inHits = findDefinitions(index, "x", inside);
  assert.ok(inHits.some((s) => s.kind === "local"));

  const outHits = findDefinitions(index, "x", outside);
  assert.ok(!outHits.some((s) => s.kind === "local"));
});

// --- AC5 ---
test("formatFtlDocMarkdown renders sections (AC5)", () => {
  const md = formatFtlDocMarkdown("say", "function", {
    summary: "Hi",
    params: [{ name: "n", description: "name" }],
    returns: "string",
    deprecated: "use other",
  });
  assert.ok(md.includes("`say`"));
  assert.ok(md.includes("Hi"));
  assert.ok(md.includes("**Deprecated**: use other"));
  assert.ok(md.includes("**Parameters**"));
  assert.ok(md.includes("**Returns**"));

  const flagOnly = formatFtlDocMarkdown("x", "assign", {
    summary: "",
    params: [],
    deprecated: "",
  });
  assert.ok(flagOnly.includes("**Deprecated**"));
  assert.ok(!flagOnly.includes("**Deprecated**:"));
});

// --- AC6 ---
test("Hover path surfaces Markdown via symbolHover + doc (AC6)", () => {
  const text = `<#-- Greets.
@param name who
@return text
-->
<#function say name>
</#function>
`;
  const say = indexFtl(text).symbols.find((s) => s.name === "say");
  assert.ok(say?.doc);
  const md = symbolHover(say!.name, say!.kind, undefined, say!.doc);
  assert.ok(md.includes("Greets"));
  assert.ok(md.includes("**Parameters**"));
  assert.ok(md.includes("**Returns**"));
});

// --- AC8 ---
test("square-bracket leading comment (AC8)", () => {
  const text = `[#-- docs --]
[#function f]
[/#function]
`;
  const f = indexFtl(text).symbols.find((s) => s.name === "f");
  assert.ok(f?.doc?.summary.includes("docs"));
});

console.log("All ftldoc unit tests passed.");
