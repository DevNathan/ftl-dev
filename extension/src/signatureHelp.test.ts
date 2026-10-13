import * as assert from "assert";
import {
  countCommaArgs,
  countMacroPositionalArgs,
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

console.log("All signatureHelp unit tests passed.");
