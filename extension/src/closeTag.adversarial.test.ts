/**
 * Adversarial matrix for auto-close. Prefer false negatives (user types `>`)
 * over false positives (extension invents `>` / close tags).
 */
import * as assert from "assert";
import {
  applyCloseEdit,
  autoCloseAfterSlash,
  autoClosePairOnCloser,
  autoClosePairOnEnter,
} from "./closeTag";

type SlashExpect = "deny" | "allow>" | "allow]";

/**
 * Plan 0034 case table (row ids match the plan). `|` marks the cursor right
 * after the typed `/` when text follows it; otherwise the cursor is at the end.
 */
const slashCases: { name: string; text: string; expect: SlashExpect }[] = [
  { name: "A1", text: "<#assign /", expect: "allow>" },
  { name: "A2", text: "<#local /", expect: "allow>" },
  { name: "A3", text: "<@banner /", expect: "allow>" },
  { name: "A4", text: "[#assign /", expect: "allow]" },
  { name: "A5", text: "<#assign name /", expect: "allow>" },
  { name: "A6", text: "<#local name /", expect: "allow>" },
  { name: "A7", text: "<#global name /", expect: "allow>" },
  { name: "A8", text: "[#assign name /", expect: "allow]" },
  { name: "A9", text: "<#include \"lib.ftl\" /", expect: "allow>" },
  { name: "A10", text: "<#include 'lib.ftl' /", expect: "allow>" },
  { name: "A11", text: "<#assign x = \"a\" /", expect: "allow>" },
  { name: "A12", text: "<#assign x = \"\" /", expect: "allow>" },
  { name: "A13", text: "<#assign x = \"a/b\" /", expect: "allow>" },
  { name: "A14", text: "[#include \"lib.ftl\" /", expect: "allow]" },
  { name: "A15", text: "<@box title=\"x\" /", expect: "allow>" },
  { name: "A16", text: "<@banner foo /", expect: "allow>" },
  { name: "A17", text: "<#include tpl /", expect: "allow>" },
  { name: "A18", text: "<#nested /", expect: "allow>" },
  { name: "A19", text: "<#nested x /", expect: "allow>" },
  { name: "A20", text: "<#return /", expect: "allow>" },
  { name: "A21", text: "<#assign x++ /", expect: "allow>" },
  { name: "A22", text: "<#function f\n  <#assign /", expect: "allow>" },
  { name: "A23", text: "<#function f\n  <#assign name /", expect: "allow>" },
  { name: "A24", text: "<#-- c --> <#assign /", expect: "allow>" },
  { name: "C1", text: "<#assign num = 3 /|>", expect: "deny" },
  { name: "C2", text: "<#assign num = 3 /| />", expect: "deny" },
  { name: "C3", text: "<#assign x /|\n>", expect: "deny" },
  { name: "C4", text: "<#assign x /|/>", expect: "deny" },
  { name: "C5", text: "<#assign x /| y=\"a\">", expect: "deny" },
  { name: "C6", text: "[#assign x /| ]", expect: "deny" },
  { name: "C7", text: "<#assign  /|>", expect: "deny" },
  { name: "C8", text: "<#assign x /|\n<div>", expect: "allow>" },
  { name: "O1", text: "<#assign num = 3 /> /", expect: "deny" },
  { name: "O2", text: "a / b", expect: "deny" },
  { name: "O3", text: "<#-- <#assign /", expect: "deny" },
  { name: "O4", text: "[#-- [#assign /", expect: "deny" },
  { name: "B1", text: "<#function name /", expect: "deny" },
  { name: "B2", text: "<#function /", expect: "deny" },
  { name: "B3", text: "<#macro m /", expect: "deny" },
  { name: "B4", text: "<#if x /", expect: "deny" },
  { name: "B5", text: "<#if /", expect: "deny" },
  { name: "B6", text: "<#list xs as x /", expect: "deny" },
  { name: "B7", text: "<#else /", expect: "deny" },
  { name: "B8", text: "<#items as x /", expect: "deny" },
  { name: "B9", text: "<#sep /", expect: "deny" },
  { name: "B10", text: "<#noparse /", expect: "deny" },
  { name: "B11", text: "<#outputformat \"HTML\" /", expect: "deny" },
  { name: "B12", text: "[#if /", expect: "deny" },
  { name: "D1", text: "<#assign num = 3 /", expect: "deny" },
  { name: "D2", text: "<#assign x = 10/", expect: "deny" },
  { name: "D3", text: "<#assign x = 10 /", expect: "deny" },
  { name: "D4", text: "<#local i = startBit /", expect: "deny" },
  { name: "D5", text: "<#assign x = a.b /", expect: "deny" },
  { name: "D6", text: "<#assign x += y /", expect: "deny" },
  { name: "D7", text: "<#assign x = foo() /", expect: "deny" },
  { name: "D8", text: "<#assign x = ob.loadText(\"foo\") /", expect: "deny" },
  { name: "D9", text: "<#assign x = xs[0] /", expect: "deny" },
  { name: "D10", text: "<#assign x = y?size /", expect: "deny" },
  { name: "D11", text: "<#assign x = y!0 /", expect: "deny" },
  { name: "D12", text: "<@box w=10/", expect: "deny" },
  { name: "D13", text: "<@box w=10 /", expect: "deny" },
  { name: "D14", text: "<#return total /", expect: "deny" },
  { name: "D15", text: "<#assign x = /", expect: "deny" },
  { name: "D16", text: "<#assign x = 1 /", expect: "deny" },
  { name: "U1", text: "<#assign whiteListSql = ob.loadText(\"./", expect: "deny" },
  { name: "U2", text: "<#assign x = loadText(\"a/b/", expect: "deny" },
  { name: "U3", text: "<#assign u = \"https://", expect: "deny" },
  { name: "U4", text: "<#assign x = './", expect: "deny" },
  { name: "U5", text: "<#assign x = \"a\\\"b/", expect: "deny" },
  { name: "U6", text: "<#assign x = \"<!-- /", expect: "deny" },
  { name: "U7", text: "<#assign x = ../", expect: "deny" },
  { name: "U8", text: "<#assign x = ./", expect: "deny" },
  { name: "U9", text: "<#assign x = foo(/", expect: "deny" },
  { name: "U10", text: "<#assign x = [1,/", expect: "deny" },
  { name: "U11", text: "<@box title=\"./", expect: "deny" },
  { name: "U12", text: "<#function f\n  <#assign x = \"./", expect: "deny" },
  { name: "U13", text: "<#include lib/", expect: "deny" },
  { name: "U14", text: "<#include path/to/", expect: "deny" },
  { name: "U15", text: "<#import lib/", expect: "deny" },
];

const pairDeny: { name: string; text: string }[] = [
  { name: "gt in paren", text: "<#if (x >" },
  { name: "else mid", text: "<#else>" },
  { name: "self-close already", text: "<@banner/>" },
  { name: "short assign", text: "<#assign x = 1>" },
  { name: "include", text: '<#include "x.ftl">' },
  // Angle syntax: bare `>` closes the tag; comparison must use (a > b) or gt.
  // `<#if a >` is a complete open tag (condition `a`) — pairing is intentional.
];

const pairAllow: { name: string; text: string; close: string }[] = [
  { name: "if", text: "<#if x>", close: "</#if>" },
  { name: "if truthy bare", text: "<#if a>", close: "</#if>" },
  { name: "function", text: "<#function f>", close: "</#function>" },
  { name: "macro", text: "<#macro m>", close: "</#macro>" },
  { name: "capture assign", text: "<#assign note>", close: "</#assign>" },
  { name: "html div", text: "<div>", close: "</div>" },
  { name: "multiline function", text: "<#function f\n  a>", close: "</#function>" },
];

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

for (const c of slashCases) {
  const cursor = c.text.indexOf("|");
  const text = cursor < 0 ? c.text : c.text.slice(0, cursor) + c.text.slice(cursor + 1);
  const offset = cursor < 0 ? text.length : cursor;
  test(`slash ${c.name}: ${JSON.stringify(c.text)} → ${c.expect}`, () => {
    const edit = autoCloseAfterSlash(text, offset);
    if (c.expect === "deny") {
      assert.strictEqual(
        edit,
        undefined,
        `expected deny, got ${JSON.stringify(edit)} for ${JSON.stringify(c.text)}`
      );
      return;
    }
    assert.ok(edit, `expected allow for ${JSON.stringify(c.text)}`);
    assert.strictEqual(edit!.insertText, c.expect === "allow>" ? ">" : "]");
    assert.strictEqual(edit!.insertAt, offset);
    assert.strictEqual(edit!.cursorAt, offset + 1);
  });
}

test("slash: already /> does not double", () => {
  const text = "<#assign  />";
  const edit = autoCloseAfterSlash(text, "<#assign  /".length);
  assert.strictEqual(edit, undefined);
});

for (const c of pairDeny) {
  test(`pair deny: ${c.name}`, () => {
    assert.strictEqual(
      autoClosePairOnCloser(c.text, c.text.length),
      undefined,
      c.name
    );
  });
}

for (const c of pairAllow) {
  test(`pair allow: ${c.name}`, () => {
    const edit = autoClosePairOnCloser(c.text, c.text.length);
    assert.ok(edit, c.name);
    assert.strictEqual(edit!.insertText, c.close);
  });
}

test("enter allow if", () => {
  const text = "<#if x>\n";
  const edit = autoClosePairOnEnter(text, text.length);
  assert.ok(edit);
  assert.ok(applyCloseEdit(text, edit!).includes("</#if>"));
});

test("enter deny short assign", () => {
  assert.strictEqual(
    autoClosePairOnEnter("<#assign x = 1>\n", "<#assign x = 1>\n".length),
    undefined
  );
});

test("enter deny when close already below", () => {
  const text = "<#if x>\n  body\n</#if>";
  assert.strictEqual(autoClosePairOnEnter(text, "<#if x>\n".length), undefined);
});

test("</ innermost not swallowed function", () => {
  const text = "<#function f\n\n  <#assign>\n</";
  const out = applyCloseEdit(text, autoCloseAfterSlash(text, text.length)!);
  assert.ok(out.includes("</#assign>"));
  assert.ok(!out.includes("</#function>"));
});

test("pair: gt inside string does not close early — full short assign", () => {
  const text = '<#assign x = "a>b">';
  assert.strictEqual(autoClosePairOnCloser(text, text.length), undefined);
});

console.log("\nAll closeTag adversarial checks passed.");
