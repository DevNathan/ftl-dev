import * as assert from "assert";
import { symbolHover, symbolHoverAt } from "./docs";
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

// --- AC1 (suppress) ---
test("@nodoc at start yields no doc (AC1)", () => {
  assert.strictEqual(parseFtlDoc("@nodoc\nside effect"), undefined);
  assert.strictEqual(parseFtlDoc("  @NODOC trash\n"), undefined);
});

// --- AC2 ---
test("mid-body @nodoc does not wipe doc (AC2)", () => {
  const doc = parseFtlDoc("Keep me.\n@nodoc\n@param a x");
  assert.ok(doc);
  assert.ok(doc!.summary.includes("Keep me"));
  assert.strictEqual(doc!.params[0]?.name, "a");
});

// --- AC3 (hard cut: @ignore is not the suppress tag) ---
test("leading @ignore is not the nodoc short-circuit (AC3)", () => {
  // Unknown leading @ignore + following known tags → doc still builds (unlike @nodoc).
  const doc = parseFtlDoc("@ignore\n@param a x");
  assert.ok(doc);
  assert.strictEqual(doc!.params[0]?.name, "a");
  // Plan 0038: continuation lines belong to the tag and unknown tags are kept,
  // so a leading @ignore is an ordinary tag — still not the @nodoc short-circuit.
  assert.deepStrictEqual(parseFtlDoc("@ignore\nside effect")?.tags, [
    { tag: "ignore", text: "side effect" },
  ]);
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

// --- AC1 (index) ---
test("@nodoc assign has no doc (AC1)", () => {
  const text = `<#--
@nodoc
discard
-->
<#assign r = ob.log() />
`;
  const r = indexFtl(text).symbols.find((s) => s.name === "r");
  assert.ok(r);
  assert.strictEqual(r!.doc, undefined);
});

test("assign without nodoc keeps summary", () => {
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

// --- Plan 0038: Javadoc / JSDoc parity ---

test("T1 @param description on the next line (0038 AC1)", () => {
  const doc = parseFtlDoc("@param payload\n    raw request data");
  assert.deepStrictEqual(
    doc!.params.map((p) => ({ name: p.name, description: p.description })),
    [{ name: "payload", description: "raw request data" }]
  );
});

test("T2 @param continuation lines (0038 AC1)", () => {
  const doc = parseFtlDoc("@param header first line\n    second line");
  assert.strictEqual(doc!.params[0]!.description, "first line\nsecond line");
});

test("T3 deprecated / since / stop continuation (0038 AC1)", () => {
  const doc = parseFtlDoc(
    "@deprecated\n  use a\n  then b\n@since\n  2.0\n@stop\n  if empty"
  );
  assert.strictEqual(doc!.deprecated, "use a\nthen b");
  assert.strictEqual(doc!.since, "2.0");
  assert.deepStrictEqual(doc!.stops, ["if empty"]);
});

test("T4 @see continuation (0038 AC1)", () => {
  const doc = parseFtlDoc("@see one\n  more\n@see two");
  assert.deepStrictEqual(doc!.see, ["one\nmore", "two"]);
});

test("T5 summary dedent + paragraphs (0038 AC2)", () => {
  const doc = parseFtlDoc("\n    Line one.\n    Line two.\n\n    Para two.\n");
  assert.strictEqual(doc!.summary, "Line one.\nLine two.\n\nPara two.");
  const md = formatFtlDocMarkdown("f", "function", doc);
  assert.ok(md.includes("Line one.  \nLine two."));
  assert.ok(md.includes("\n\nPara two."));
  assert.ok(!md.includes("    Para two."));
});

test("T6 star gutter stripped when every line has it (0038 AC2)", () => {
  const doc = parseFtlDoc("\n * Sum.\n * @param a x\n ");
  assert.strictEqual(doc!.summary, "Sum.");
  assert.strictEqual(doc!.params[0]!.name, "a");
  assert.strictEqual(doc!.params[0]!.description, "x");
});

test("T7 mixed lines keep Markdown * bullets (0038 AC2)", () => {
  const doc = parseFtlDoc("Intro\n* first\n* second");
  assert.strictEqual(doc!.summary, "Intro\n* first\n* second");
  const md = formatFtlDocMarkdown("f", "function", doc);
  assert.ok(md.includes("Intro\n\n* first\n* second"));
});

test("T8 @return {type} desc (0038 AC3)", () => {
  const doc = parseFtlDoc("@return {hash} the result");
  assert.strictEqual(doc!.returnsType, "hash");
  assert.strictEqual(doc!.returns, "the result");
  const md = formatFtlDocMarkdown("f", "function", doc);
  assert.ok(md.includes("**Returns** `{hash}` — the result"));
});

test("T9 @return shape block (0038 AC3)", () => {
  const doc = parseFtlDoc("@return {\n    status: ...,\n    items: ...\n}");
  assert.strictEqual(doc!.returnsType, undefined);
  const md = formatFtlDocMarkdown("f", "function", doc);
  assert.ok(
    md.includes("**Returns**\n\n```\n{\n    status: ...,\n    items: ...\n}\n```"),
    md
  );
});

test("T10 {} / unclosed { / type + next-line text (0038 AC3)", () => {
  const empty = parseFtlDoc("@return {}");
  assert.strictEqual(empty!.returnsType, undefined);
  assert.strictEqual(empty!.returns, "{}");
  const open = parseFtlDoc("@return {");
  assert.strictEqual(open!.returnsType, undefined);
  assert.strictEqual(open!.returns, "{");
  const openMd = formatFtlDocMarkdown("f", "function", open);
  assert.ok(openMd.includes("**Returns** — {"));
  assert.ok(!openMd.includes("```"));
  const typed = parseFtlDoc("@returns {hash}\n  more");
  assert.strictEqual(typed!.returnsType, "hash");
  assert.strictEqual(typed!.returns, "more");
});

test("T11 @param {type} name desc (0038 AC4)", () => {
  const doc = parseFtlDoc("@param {string} name the name");
  assert.deepStrictEqual(doc!.params[0], {
    name: "name",
    type: "string",
    description: "the name",
    nameOffset: 16,
  });
});

test("T12 optional / default params (0038 AC4)", () => {
  const doc = parseFtlDoc(
    '@param [request] optional\n@param [request=null] opt\n@param {string} [label="a b"] x'
  );
  const [a, b, c] = doc!.params;
  assert.strictEqual(a!.name, "request");
  assert.strictEqual(a!.optional, true);
  assert.strictEqual(a!.defaultValue, undefined);
  assert.strictEqual(a!.description, "optional");
  assert.strictEqual(b!.optional, true);
  assert.strictEqual(b!.defaultValue, "null");
  assert.strictEqual(c!.name, "label");
  assert.strictEqual(c!.type, "string");
  assert.strictEqual(c!.defaultValue, '"a b"');
  assert.strictEqual(c!.description, "x");
});

test("T13 dotted @param nested under root (0038 AC4)", () => {
  const doc = parseFtlDoc("@param payload data\n@param payload.items list");
  assert.deepStrictEqual(
    doc!.params.map((p) => p.name),
    ["payload", "payload.items"]
  );
  const md = formatFtlDocMarkdown("f", "function", doc);
  assert.ok(
    md.includes("- `payload` — data\n  - `payload.items` — list"),
    md
  );
});

test("T14 unknown + note tags render in source order (0038 AC5)", () => {
  const doc = parseFtlDoc("@processing\n  1. a\n  2. b\n@note\n  text");
  assert.deepStrictEqual(doc!.tags, [
    { tag: "processing", text: "1. a\n2. b" },
    { tag: "note", text: "text" },
  ]);
  const md = formatFtlDocMarkdown("f", "function", doc);
  assert.ok(md.includes("**@processing**\n\n1. a\n2. b\n\n**Note**\n\ntext"), md);
});

test("T15 @example fenced ftl, verbatim (0038 AC5)", () => {
  const doc = parseFtlDoc("@example\n  <#assign x = parseRequest(p, h)>");
  const md = formatFtlDocMarkdown("f", "function", doc);
  assert.ok(
    md.includes("**Example**\n\n```ftl\n<#assign x = parseRequest(p, h)>\n```"),
    md
  );
});

test("T16 friendly headings + metadata order (0038 AC5)", () => {
  const doc = parseFtlDoc(
    "Sum.\n@author A\n@version 1\n@todo t\n@remarks r\n@Custom c\n@custom d\n@since 2"
  );
  const md = formatFtlDocMarkdown("f", "function", doc);
  const order = [
    "**TODO**",
    "**Remarks**",
    "**@Custom**",
    "**@custom**",
    "**Since**",
    "**Author**",
    "**Version**",
  ].map((h) => md.indexOf(h));
  assert.ok(order.every((n) => n >= 0), md);
  assert.deepStrictEqual(order, [...order].sort((x, y) => x - y), md);
});

test("T17 inline tags (0038 AC6)", () => {
  const doc = parseFtlDoc(
    "See {@link parseRequest} and {@link parseRequest the parser}, {@code a < b}, {@linkcode x}, {@link https://example.com docs}, {@literal @param}, {@foo bar}"
  );
  const md = formatFtlDocMarkdown("f", "function", doc);
  assert.ok(md.includes("See `parseRequest` and the parser, `a < b`, `x`"), md);
  assert.ok(md.includes("[docs](https://example.com)"));
  assert.ok(md.includes("\\@param"));
  assert.ok(md.includes("{@foo bar}"));
  const piped = formatFtlDocMarkdown(
    "f",
    "function",
    parseFtlDoc("{@link parseRequest|the parser} {@linkplain parseRequest}")
  );
  assert.ok(piped.includes("the parser parseRequest"), piped);
});

test("T18 inline tags untouched in code spans and @example (0038 AC6)", () => {
  const doc = parseFtlDoc("Use `{@code x}` here.\n@example\n  {@code x}");
  const md = formatFtlDocMarkdown("f", "function", doc);
  assert.ok(md.includes("Use `{@code x}` here."));
  assert.ok(md.includes("```ftl\n{@code x}\n```"));
});

test("T19 list after paragraph line gets a blank line (0038 AC7)", () => {
  const md = formatFtlDocMarkdown(
    "f",
    "function",
    parseFtlDoc("Intro line\n3. three\n4. four")
  );
  assert.ok(md.includes("Intro line\n\n3. three\n4. four"), md);
  assert.ok(!md.includes("Intro line  "));
});

test("T20 multi-line @param stays inside its list item (0038 AC7)", () => {
  const md = formatFtlDocMarkdown(
    "f",
    "function",
    parseFtlDoc("@param header line one\n  line two\n\n  para two")
  );
  assert.ok(md.includes("- `header` — line one  \n  line two\n\n  para two"), md);
});

const T21_TEXT = `<#--
    Parses the request payload and its header.
    Some fields may be empty hashes depending on the header.

@param payload
    raw request data
@param header
    mapped header data; may contain a route key,
    then a target key depending on routing

@return {
    status: ...,
    items: ...,
    ...
}

@processing
    1. read the header
    2. map the payload

@note
    remark text
-->
<#function parseRequest payload header>
</#function>
`;

const EXPECTED_T21 =
  "`parseRequest` — function\n\n" +
  "Parses the request payload and its header.  \n" +
  "Some fields may be empty hashes depending on the header.\n\n" +
  "**Parameters**\n\n" +
  "- `payload` — raw request data\n" +
  "- `header` — mapped header data; may contain a route key,  \n" +
  "  then a target key depending on routing\n\n" +
  "**Returns**\n\n" +
  "```\n{\n    status: ...,\n    items: ...,\n    ...\n}\n```\n\n" +
  "**@processing**\n\n" +
  "1. read the header\n2. map the payload\n\n" +
  "**Note**\n\n" +
  "remark text";

test("T21 report regression renders exactly (0038 AC7, AC8)", () => {
  const declOffset = T21_TEXT.indexOf("<#function");
  assert.strictEqual(
    formatFtlDocMarkdown(
      "parseRequest",
      "function",
      leadingFtlDoc(T21_TEXT, declOffset)
    ),
    EXPECTED_T21
  );
  // nameOffset is absolute (used by the @param diagnostics).
  const doc = leadingFtlDoc(T21_TEXT, declOffset)!;
  const p = doc.params[1]!;
  assert.strictEqual(T21_TEXT.slice(p.nameOffset!, p.nameOffset! + 6), "header");
});

test("T22 deep indentation after a blank line is fenced (0038 AC7)", () => {
  const md = formatFtlDocMarkdown(
    "f",
    "function",
    parseFtlDoc("Text\n\n        deep indented\n\nText")
  );
  assert.ok(md.includes("Text\n\n```\ndeep indented\n```\n\nText"), md);
});

test("T28 symbolHoverAt: function, #local scope, #import ns (0038 AC11)", () => {
  const text =
    '<#import "lib.ftl" as lib>\n' +
    "<#-- Adds. -->\n<#function add a b>\n</#function>\n" +
    "<#macro box>\n  <#-- Inner count. -->\n  <#local n = 1>\n  ${n}\n</#macro>\n" +
    "${add(1, 2)} ${n} ${lib.helper()}\n";
  const index = indexFtl(text);
  const lib = indexFtl("<#-- Helps out. -->\n<#function helper>\n</#function>\n");
  const byNs = new Map([["lib", lib.symbols]]);

  const add = index.symbols.find((s) => s.name === "add")!;
  assert.strictEqual(
    symbolHoverAt(text, text.indexOf("add(1") + 1, index, byNs),
    symbolHover("add", "function", undefined, add.doc)
  );
  const n = index.symbols.find((s) => s.kind === "local" && s.name === "n")!;
  assert.strictEqual(
    symbolHoverAt(text, text.indexOf("${n}") + 2, index, byNs),
    symbolHover("n", "local", undefined, n.doc)
  );
  assert.ok(n.doc?.summary.includes("Inner count."));
  // Same name outside the macro: #local out of scope → no hover.
  assert.strictEqual(
    symbolHoverAt(text, text.lastIndexOf("${n}") + 2, index, byNs),
    undefined
  );
  const helper = lib.symbols[0]!;
  assert.strictEqual(
    symbolHoverAt(text, text.indexOf("lib.helper") + 5, index, byNs),
    symbolHover("lib.helper", "function", "lib.ftl", helper.doc)
  );
});

console.log("All ftldoc unit tests passed.");
