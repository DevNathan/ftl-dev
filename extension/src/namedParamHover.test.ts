import * as assert from "assert";
import {
  DIRECTIVE_PARAM_DOCS,
  paramDocumentation,
} from "./directiveParams";
import {
  builtinAt,
  clauseKeywordAt,
  directiveAt,
  namedParamAt,
} from "./hoverTokens";


function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

/** Offset of the first occurrence of `needle` in `text`. */
function offsetOf(text: string, needle: string, from = 0): number {
  const i = text.indexOf(needle, from);
  assert.ok(i >= 0, `expected to find ${JSON.stringify(needle)}`);
  return i;
}

// --- AC1: #ftl encoding ---
test("AC1: namedParamAt on encoding in #ftl", () => {
  const text = `<#ftl encoding="UTF-8">`;
  const off = offsetOf(text, "encoding");
  const hit = namedParamAt(text, off);
  assert.ok(hit);
  assert.strictEqual(hit!.name, "encoding");
  assert.strictEqual(
    paramDocumentation(hit!.name),
    DIRECTIVE_PARAM_DOCS.encoding
  );
  assert.strictEqual(
    paramDocumentation(hit!.name),
    "Template file encoding (charset name)."
  );
});

// --- AC2: camel LHS stripWhitespace ---
test("AC2: camel stripWhitespace same one-liner as strip_whitespace", () => {
  const text = `<#ftl stripWhitespace=true>`;
  const off = offsetOf(text, "stripWhitespace");
  const hit = namedParamAt(text, off);
  assert.ok(hit);
  assert.strictEqual(hit!.name, "stripWhitespace");
  assert.strictEqual(
    paramDocumentation(hit!.name),
    paramDocumentation("strip_whitespace")
  );
  assert.strictEqual(
    paramDocumentation(hit!.name),
    DIRECTIVE_PARAM_DOCS.strip_whitespace
  );
});

// --- AC3: #setting locale + #include ignore_missing / ignoreMissing ---
test("AC3: #setting locale and #include ignore_missing / ignoreMissing", () => {
  const setting = `<#setting locale="en_US">`;
  const sHit = namedParamAt(setting, offsetOf(setting, "locale"));
  assert.ok(sHit);
  assert.strictEqual(paramDocumentation(sHit!.name), DIRECTIVE_PARAM_DOCS.locale);

  const incSnake = `<#include "x.ftl" ignore_missing=true>`;
  const iHit = namedParamAt(incSnake, offsetOf(incSnake, "ignore_missing"));
  assert.ok(iHit);
  assert.strictEqual(
    paramDocumentation(iHit!.name),
    DIRECTIVE_PARAM_DOCS.ignore_missing
  );

  const incCamel = `<#include "x.ftl" ignoreMissing=true>`;
  const cHit = namedParamAt(incCamel, offsetOf(incCamel, "ignoreMissing"));
  assert.ok(cHit);
  assert.strictEqual(
    paramDocumentation(cHit!.name),
    DIRECTIVE_PARAM_DOCS.ignore_missing
  );
});

// --- AC4: square syntax ---
test("AC4: square [#ftl encoding=…] like angle", () => {
  const text = `[#ftl encoding="UTF-8"]`;
  const hit = namedParamAt(text, offsetOf(text, "encoding"));
  assert.ok(hit);
  assert.strictEqual(
    paramDocumentation(hit!.name),
    DIRECTIVE_PARAM_DOCS.encoding
  );
});

// --- AC5: directive name still owns Hover probe ---
test("AC5: caret on directive name → namedParamAt undefined, directiveAt wins", () => {
  const text = `<#ftl encoding="UTF-8">`;
  const off = offsetOf(text, "ftl");
  assert.strictEqual(namedParamAt(text, off), undefined);
  assert.strictEqual(directiveAt(text, off), "ftl");

  const setting = `<#setting locale="en_US">`;
  assert.strictEqual(
    namedParamAt(setting, offsetOf(setting, "setting")),
    undefined
  );
  assert.strictEqual(directiveAt(setting, offsetOf(setting, "setting")), "setting");

  const inc = `<#include "x.ftl" parse=true>`;
  assert.strictEqual(
    namedParamAt(inc, offsetOf(inc, "include")),
    undefined
  );
  assert.strictEqual(directiveAt(inc, offsetOf(inc, "include")), "include");
});

// --- AC6: builtin still wins ---
test("AC6: caret on ?builtin → builtinAt, not namedParamAt", () => {
  const text = '${x?c} <#ftl encoding="UTF-8">';
  const off = offsetOf(text, "?c") + 1; // on 'c'
  assert.strictEqual(builtinAt(text, off), "c");
  assert.strictEqual(namedParamAt(text, off), undefined);
});
// --- AC7: value after = is not named-param Hover ---
test("AC7: caret on param value → no namedParamAt", () => {
  const enc = `<#ftl encoding="UTF-8">`;
  assert.strictEqual(namedParamAt(enc, offsetOf(enc, "UTF-8")), undefined);

  const sw = `<#ftl stripWhitespace=true>`;
  assert.strictEqual(namedParamAt(sw, offsetOf(sw, "true")), undefined);
});

// --- AC8: identifier inside quoted string ---
test("AC8: identifier only inside quoted string → no namedParamAt", () => {
  const text = `<#ftl encoding="encoding">`;
  // Second "encoding" is inside the string value
  const first = offsetOf(text, "encoding");
  const second = offsetOf(text, "encoding", first + 1);
  assert.ok(namedParamAt(text, first));
  assert.strictEqual(namedParamAt(text, second), undefined);
});

// --- AC9: nested keys under ns_prefixes= ---
test("AC9: nested = keys inside {} do not get namedParamAt", () => {
  const text = `<#ftl ns_prefixes={"foo":"http://x"}>`;
  assert.ok(namedParamAt(text, offsetOf(text, "ns_prefixes")));
  assert.strictEqual(namedParamAt(text, offsetOf(text, "foo")), undefined);
});

// --- Unknown LHS: no docs → no param Hover ---
test("unknown LHS with no docs → namedParamAt undefined", () => {
  const text = `<#ftl not_a_real_param=true>`;
  assert.strictEqual(
    namedParamAt(text, offsetOf(text, "not_a_real_param")),
    undefined
  );
});

// --- 0032a clause-keyword Hover (0030 AC10) ---

test("0032a AC1: clauseKeywordAt on as in #list", () => {
  const text = `<#list xs as x>`;
  const hit = clauseKeywordAt(text, offsetOf(text, " as ") + 1);
  assert.ok(hit);
  assert.strictEqual(hit!.name, "as");
  assert.strictEqual(paramDocumentation(hit!.name), DIRECTIVE_PARAM_DOCS.as);
  assert.strictEqual(namedParamAt(text, hit!.start), undefined);
});

test("0032a AC2: in on #assign and using on #visit", () => {
  const assign = `<#assign x = 1 in ns>`;
  const inHit = clauseKeywordAt(assign, offsetOf(assign, " in ") + 1);
  assert.ok(inHit);
  assert.strictEqual(inHit!.name, "in");
  assert.strictEqual(paramDocumentation(inHit!.name), DIRECTIVE_PARAM_DOCS.in);

  const visit = `<#visit node using ns>`;
  const usingHit = clauseKeywordAt(visit, offsetOf(visit, "using"));
  assert.ok(usingHit);
  assert.strictEqual(usingHit!.name, "using");
  assert.strictEqual(
    paramDocumentation(usingHit!.name),
    DIRECTIVE_PARAM_DOCS.using
  );
});

test("0032a AC3: caret on directive name → clauseKeywordAt undefined", () => {
  const text = `<#list xs as x>`;
  const off = offsetOf(text, "list");
  assert.strictEqual(clauseKeywordAt(text, off), undefined);
  assert.strictEqual(directiveAt(text, off), "list");
});

test("0032a AC4: clause keyword inside quoted string → no clause Hover", () => {
  const text = `<#list xs as "as">`;
  const firstAs = offsetOf(text, " as ") + 1;
  const stringAs = offsetOf(text, '"as"') + 1;
  assert.ok(clauseKeywordAt(text, firstAs));
  assert.strictEqual(clauseKeywordAt(text, stringAs), undefined);
});

console.log("All namedParamHover unit tests passed.");
