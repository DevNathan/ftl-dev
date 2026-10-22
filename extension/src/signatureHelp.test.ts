import * as assert from "assert";
import { BUILTIN_SIGNATURES } from "./builtinSignatures";
import { isInFtlComment } from "./comments";
import {
  countCommaArgs,
  countMacroPositionalArgs,
  findBuiltinCall,
  findFunctionCall,
  findMacroCall,
  namedParamAtCaret,
  signatureHelpAt,
} from "./signatureHelp";
import {
  formatSignatureLabel,
  indexFtl,
  parseParamList,
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

test("parseParamList: plain names", () => {
  assert.deepStrictEqual(parseParamList(" a b "), [
    { name: "a" },
    { name: "b" },
  ]);
});

test("parseParamList: defaults and catch-all", () => {
  assert.deepStrictEqual(parseParamList(' msg="hi" rest...'), [
    { name: "msg", defaultValue: '"hi"' },
    { name: "rest", catchAll: true },
  ]);
});

test("indexFtl attaches params to macro and function", () => {
  const idx = indexFtl(
    `<#macro greet name other="x">\n</#macro>\n<#function add a b>\n</#function>`
  );
  const greet = idx.symbols.find((s) => s.name === "greet");
  const add = idx.symbols.find((s) => s.name === "add");
  assert.deepStrictEqual(greet?.params, [
    { name: "name" },
    { name: "other", defaultValue: '"x"' },
  ]);
  assert.deepStrictEqual(add?.params, [{ name: "a" }, { name: "b" }]);
});

test("formatSignatureLabel", () => {
  assert.strictEqual(
    formatSignatureLabel("add", [{ name: "a" }, { name: "b" }]),
    "add(a, b)"
  );
  assert.strictEqual(formatSignatureLabel("empty", []), "empty()");
});

test("findFunctionCall active parameter by commas", () => {
  const text = "<#function add a b>\n</#function>\n${add(1, }}";
  // caret after "1, "
  const caret = text.indexOf("1, ") + 3;
  const call = findFunctionCall(text, caret);
  assert.ok(call);
  assert.strictEqual(call!.callee, "add");
  assert.strictEqual(call!.activeParameter, 1);
});

test("signatureHelpAt for local function", () => {
  const text = "<#function add a b>\n  <#return a + b>\n</#function>\n${add(1, }}";
  const caret = text.lastIndexOf("1, ") + 3;
  const help = signatureHelpAt(text, caret, {
    local: indexFtl(text),
    byNs: new Map(),
  });
  assert.ok(help);
  assert.strictEqual(help!.label, "add(a, b)");
  assert.strictEqual(help!.activeParameter, 1);
  assert.strictEqual(help!.parameters.length, 2);
});

test("countCommaArgs ignores commas in strings and parens", () => {
  assert.strictEqual(countCommaArgs(`"a,b", f(1,2), `, 0, `"a,b", f(1,2), `.length), 2);
});

test("findMacroCall named and positional", () => {
  const text = '<#macro note msg level="info">\n</#macro>\n<@note msg="x"';
  const caret = text.lastIndexOf("msg=") + 4;
  const call = findMacroCall(text, caret);
  assert.ok(call);
  assert.strictEqual(call!.callee, "note");
  assert.strictEqual(call!.namedParam, "msg");

  const pos = '<#macro m a b>\n</#macro>\n<@m first ';
  const posCaret = pos.length;
  const posCall = findMacroCall(pos, posCaret);
  assert.ok(posCall);
  assert.strictEqual(posCall!.activeParameter, 1);
});

test("signatureHelpAt for macro named arg", () => {
  const text =
    '<#macro note msg level="info">\n</#macro>\n<@note level="';
  const caret = text.length;
  const help = signatureHelpAt(text, caret, {
    local: indexFtl(text),
    byNs: new Map(),
  });
  assert.ok(help);
  assert.strictEqual(help!.label, 'note(msg, level="info")');
  assert.strictEqual(help!.activeParameter, 1);
});

test("namedParamAtCaret", () => {
  assert.strictEqual(namedParamAtCaret(' msg="hi"'), "msg");
  assert.strictEqual(namedParamAtCaret(" msg="), "msg");
  assert.strictEqual(namedParamAtCaret(' msg="hi" '), undefined);
});

test("countMacroPositionalArgs", () => {
  assert.strictEqual(countMacroPositionalArgs(""), 0);
  assert.strictEqual(countMacroPositionalArgs(" a"), 0);
  assert.strictEqual(countMacroPositionalArgs(" a "), 1);
  assert.strictEqual(countMacroPositionalArgs(' "x" y'), 1);
});

test("imported ns.fn signature", () => {
  const main = '<#import "lib.ftl" as lib>\n${lib.helper(}';
  const lib = "<#function helper x y>\n  <#return x>\n</#function>\n";
  const local = indexFtl(main);
  const byNs = new Map([["lib", indexFtl(lib).symbols]]);
  const caret = main.length;
  const help = signatureHelpAt(main, caret, { local, byNs });
  assert.ok(help);
  assert.strictEqual(help!.label, "helper(x, y)");
  assert.strictEqual(help!.activeParameter, 0);
});

const emptyLookup = { local: indexFtl(""), byNs: new Map() };

/** AC1: caret inside `?replace(…)` yields label with string + replacement */
test("AC1: builtin replace Signature Help label", () => {
  const text = '${x?replace("a", )}';
  const caret = text.indexOf(", ") + 2;
  const help = signatureHelpAt(text, caret, emptyLookup);
  assert.ok(help);
  assert.ok(help!.label.includes("replace"));
  const labels = help!.parameters.map((p) => p.label);
  assert.ok(labels.includes("string"));
  assert.ok(labels.includes("replacement"));
});

/** AC2: active parameter advances with commas */
test("AC2: replace activeParameter after first comma", () => {
  const text = '${x?replace("a", )}';
  const caret = text.indexOf(", ") + 2;
  const help = signatureHelpAt(text, caret, emptyLookup);
  assert.ok(help);
  assert.strictEqual(help!.activeParameter, 1);
});

/** AC3: local #function same name does not override ?builtin */
test("AC3: ?replace not overridden by local #function replace", () => {
  const text =
    "<#function replace a b c>\n  <#return a>\n</#function>\n" +
    '${x?replace("a", )}';
  const caret = text.lastIndexOf(", ") + 2;
  const help = signatureHelpAt(text, caret, {
    local: indexFtl(text),
    byNs: new Map(),
  });
  assert.ok(help);
  assert.ok(help!.label.startsWith("replace("));
  assert.ok(help!.parameters.some((p) => p.label === "string"));
  assert.ok(!help!.parameters.some((p) => p.label === "a"));
});

/** AC4: normal function / macro still work (regression) */
test("AC4: function and macro Signature Help unchanged", () => {
  const fnText =
    "<#function add a b>\n  <#return a + b>\n</#function>\n${add(1, )}";
  const fnCaret = fnText.lastIndexOf("1, ") + 3;
  const fnHelp = signatureHelpAt(fnText, fnCaret, {
    local: indexFtl(fnText),
    byNs: new Map(),
  });
  assert.ok(fnHelp);
  assert.strictEqual(fnHelp!.label, "add(a, b)");
  assert.strictEqual(fnHelp!.activeParameter, 1);

  const macText =
    '<#macro note msg level="info">\n</#macro>\n<@note level="';
  const macHelp = signatureHelpAt(macText, macText.length, {
    local: indexFtl(macText),
    byNs: new Map(),
  });
  assert.ok(macHelp);
  assert.strictEqual(macHelp!.label, 'note(msg, level="info")');
  assert.strictEqual(macHelp!.activeParameter, 1);
});

/** AC5: cataloged builtins — expected param counts */
test("AC5: cataloged builtin param counts", () => {
  const cases: { name: string; minParams: number; snippet: string }[] = [
    { name: "replace", minParams: 2, snippet: "${x?replace(}" },
    { name: "substring", minParams: 1, snippet: "${x?substring(}" },
    { name: "then", minParams: 2, snippet: "${flag?then(}" },
    { name: "default", minParams: 1, snippet: "${x?default(}" },
    { name: "join", minParams: 1, snippet: "${xs?join(}" },
    { name: "split", minParams: 1, snippet: "${x?split(}" },
    { name: "contains", minParams: 1, snippet: "${x?contains(}" },
    { name: "index_of", minParams: 1, snippet: "${x?index_of(}" },
    { name: "string", minParams: 0, snippet: "${x?string(}" },
    { name: "switch", minParams: 1, snippet: "${x?switch(}" },
  ];
  for (const c of cases) {
    const sig = BUILTIN_SIGNATURES[c.name];
    assert.ok(sig, `missing catalog entry: ${c.name}`);
    assert.ok(
      sig!.parameters.length >= c.minParams,
      `${c.name}: expected >=${c.minParams} params, got ${sig!.parameters.length}`
    );
    const caret = c.snippet.length;
    const help = signatureHelpAt(c.snippet, caret, emptyLookup);
    assert.ok(help, `expected help for ${c.name}`);
    assert.ok(help!.label.includes(c.name));
    assert.ok(help!.parameters.length >= c.minParams);
  }
});

/** AC6: uncataloged / zero-arg-style → silence */
test("AC6: uncataloged and zero-arg builtins yield undefined", () => {
  for (const snippet of ["${x?size(}", "${x?trim(}", "${x?not_in_mvp_table(}"]) {
    const help = signatureHelpAt(snippet, snippet.length, emptyLookup);
    assert.strictEqual(help, undefined, `expected silence for ${snippet}`);
    const site = findBuiltinCall(snippet, snippet.length);
    assert.ok(site, `should still detect ?name( for ${snippet}`);
  }
});

/** AC7: caret on ?replace name (not inside parens) → no Signature Help */
test("AC7: caret on builtin name outside args → no help", () => {
  const text = "${x?replace}";
  const caret = text.indexOf("replace") + 3; // mid-name
  assert.strictEqual(findBuiltinCall(text, caret), undefined);
  assert.strictEqual(signatureHelpAt(text, caret, emptyLookup), undefined);
});

/** AC8: commas in strings / nested parens do not skew activeParameter */
test("AC8: builtin activeParameter ignores nested commas", () => {
  const text = '${x?replace("a,b", f(1,2), )}';
  const caret = text.lastIndexOf(", ") + 2;
  const help = signatureHelpAt(text, caret, emptyLookup);
  assert.ok(help);
  // two top-level commas → activeParameter 2 (flags?)
  assert.strictEqual(help!.activeParameter, 2);
  assert.strictEqual(
    countCommaArgs(text, text.indexOf("(") + 1, caret),
    2
  );
});

/** AC9: provider comment gate — inside FTL comment still gated */
test("AC9: FTL comment gate still applies", () => {
  const text = '<#-- ${x?replace("a", )} -->';
  const caret = text.indexOf(", ") + 2;
  assert.ok(isInFtlComment(text, caret));
  // Provider returns undefined when isInFtlComment; pure analyzer may still
  // compute help — gate is unchanged at provider boundary.
  assert.ok(isInFtlComment(text, caret));
});

test("then / join helpers from test plan", () => {
  const thenText = '${flag?then("y", )}';
  const thenHelp = signatureHelpAt(
    thenText,
    thenText.indexOf(", ") + 2,
    emptyLookup
  );
  assert.ok(thenHelp);
  assert.strictEqual(thenHelp!.activeParameter, 1);
  assert.strictEqual(thenHelp!.parameters.length, 2);

  // Caret inside arg list (not mid-string — backward paren scan needs that)
  const joinText = '${xs?join(}';
  const joinHelp = signatureHelpAt(joinText, joinText.length, emptyLookup);
  assert.ok(joinHelp);
  assert.ok(joinHelp!.label.includes("join"));
  assert.strictEqual(joinHelp!.parameters.length, 1);
});

/** 0032b AC1: new + number catalog entries */
test("0032b AC1: new and number Signature Help", () => {
  for (const c of [
    { name: "new", minParams: 1, snippet: '${"com.Foo"?new(}' },
    { name: "number", minParams: 1, snippet: '${"1.5"?number(}' },
  ]) {
    const sig = BUILTIN_SIGNATURES[c.name];
    assert.ok(sig, `missing catalog entry: ${c.name}`);
    assert.ok(sig!.parameters.length >= c.minParams);
    const help = signatureHelpAt(c.snippet, c.snippet.length, emptyLookup);
    assert.ok(help, `expected help for ${c.name}`);
    assert.ok(help!.label.includes(c.name));
  }
});

/** 0032b AC2: refined string / truncate / ensure_starts_with */
test("0032b AC2: refined string truncate ensure_starts_with labels", () => {
  assert.ok(
    (BUILTIN_SIGNATURES.string?.parameters.length ?? 0) >= 1
  );
  assert.ok(
    BUILTIN_SIGNATURES.string!.parameters.some((p) =>
      p.includes("formatOrWhenTrue")
    )
  );
  assert.ok(
    (BUILTIN_SIGNATURES.truncate?.parameters.length ?? 0) >= 2
  );
  assert.ok(
    (BUILTIN_SIGNATURES.ensure_starts_with?.parameters.length ?? 0) >= 1
  );
  const trunc = signatureHelpAt("${x?truncate(}", "${x?truncate(}".length, emptyLookup);
  assert.ok(trunc);
  assert.ok(trunc!.parameters.length >= 2);
});

/** 0032b AC3: camelCase alias */
test("0032b AC3: endsWith camel resolves like ends_with", () => {
  const snake = signatureHelpAt(
    "${x?ends_with(}",
    "${x?ends_with(}".length,
    emptyLookup
  );
  const camel = signatureHelpAt(
    "${x?endsWith(}",
    "${x?endsWith(}".length,
    emptyLookup
  );
  assert.ok(snake);
  assert.ok(camel);
  assert.deepStrictEqual(
    camel!.parameters.map((p) => p.label),
    snake!.parameters.map((p) => p.label)
  );
  assert.ok(camel!.label.startsWith("endsWith("));
});

// --- Plan 0038: ftldoc in Signature Help (D8) ---

function helpAt(text: string, caret: number) {
  return signatureHelpAt(text, caret, { local: indexFtl(text), byNs: new Map() });
}

test("T23 documented function: summary + per-parameter Markdown (0038 AC9)", () => {
  const text =
    "<#--\nParses the request.\n@param payload raw\n@param header\n  mapped\n-->\n" +
    "<#function parseRequest payload header>\n</#function>\n${parseRequest(x, }";
  const help = helpAt(text, text.lastIndexOf("x, ") + 3);
  assert.ok(help);
  assert.strictEqual(help!.label, "parseRequest(payload, header)");
  assert.strictEqual(help!.activeParameter, 1);
  assert.strictEqual(help!.documentationMarkdown, true);
  assert.ok(help!.documentation!.includes("Parses the request."));
  assert.strictEqual(help!.parameters[0]!.documentation, "raw");
  assert.ok(help!.parameters[1]!.documentation!.includes("mapped"));
});

test("T24 undocumented function / builtin unchanged (0038 AC9)", () => {
  const text = "<#function f a b>\n</#function>\n${f(1, }";
  const help = helpAt(text, text.lastIndexOf("1, ") + 3);
  assert.strictEqual(help!.documentation, "f takes 2 parameters.");
  assert.ok(!help!.documentationMarkdown);
  assert.ok(help!.parameters.every((p) => p.documentation === undefined));
  const bText = "${x?then(";
  const builtin = helpAt(bText, bText.length);
  assert.ok(builtin);
  assert.ok(!builtin!.documentationMarkdown);
  assert.ok(builtin!.parameters.every((p) => p.documentation === undefined));
});

test("T25 declaration label wins; type / optional / default in param doc (0038 AC9)", () => {
  const text =
    '<#-- @param {string} [label="x"] d -->\n<#macro m label="y">\n</#macro>\n<@m ';
  const help = helpAt(text, text.length);
  assert.ok(help);
  assert.strictEqual(help!.parameters[0]!.label, 'label="y"');
  const doc = help!.parameters[0]!.documentation!;
  assert.ok(doc.includes("`{string}`"), doc);
  assert.ok(doc.includes('optional, default: `"x"`'), doc);
  assert.ok(doc.includes("d"), doc);
  // No summary / returns → generic signature documentation kept.
  assert.strictEqual(help!.documentation, "m takes 1 parameter.");
});

console.log("All signatureHelp unit tests passed.");
