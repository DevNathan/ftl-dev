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

const slashCases: { name: string; text: string; expect: SlashExpect }[] = [
  { name: "bare assign", text: "<#assign /", expect: "allow>" },
  { name: "bare local", text: "<#local /", expect: "allow>" },
  { name: "bare user macro", text: "<@banner /", expect: "allow>" },
  { name: "include string", text: '<#include "lib.ftl" /', expect: "allow>" },
  { name: "include single quotes", text: "<#include 'lib.ftl' /", expect: "allow>" },
  { name: "assign closed string", text: '<#assign x = "a" /', expect: "allow>" },
  { name: "empty string trailer", text: '<#assign x = "" /', expect: "allow>" },
  { name: "string with slashes then trailer", text: '<#assign x = "a/b" /', expect: "allow>" },
  { name: "square bare", text: "[#assign /", expect: "allow]" },
  { name: "square include", text: '[#include "lib.ftl" /', expect: "allow]" },

  { name: "user repro loadText ./", text: '<#assign whiteListSql = ob.loadText("./', expect: "deny" },
  { name: "path mid string", text: '<#assign x = loadText("a/b/', expect: "deny" },
  { name: "https unfinished", text: '<#assign u = "https://', expect: "deny" },
  { name: "single-quoted path", text: "<#assign x = './", expect: "deny" },
  { name: "escaped quote still in string", text: '<#assign x = "a\\"b/', expect: "deny" },
  { name: "html comment-like in string", text: '<#assign x = "<!-- /', expect: "deny" },
  { name: "raw ../ after =", text: "<#assign x = ../", expect: "deny" },
  { name: "raw ./ after =", text: "<#assign x = ./", expect: "deny" },
  { name: "unquoted include path segment", text: "<#include lib/", expect: "deny" },
  { name: "unquoted include deeper", text: "<#include path/to/", expect: "deny" },
  { name: "user macro with arg then slash", text: "<@banner foo /", expect: "deny" },
  { name: "division ident", text: "<#local i = startBit /", expect: "deny" },
  { name: "division number", text: "<#assign x = 10/", expect: "deny" },
  { name: "division spaced", text: "<#assign x = 10 /", expect: "deny" },
  { name: "call open paren", text: "<#assign x = foo(/", expect: "deny" },
  {
    name: "call closed still =",
    text: '<#assign x = ob.loadText("foo") /',
    expect: "deny",
  },
  { name: "list open bracket", text: "<#assign x = [1,/", expect: "deny" },
  { name: "compound +=", text: "<#assign x += y /", expect: "deny" },
  { name: "hash access", text: "<#assign x = a.b /", expect: "deny" },
  { name: "macro named unfinished string", text: '<@box title="./', expect: "deny" },
  { name: "macro named = value", text: "<@box w=10/", expect: "deny" },
  { name: "nested string in unclosed function", text: '<#function f\n  <#assign x = "./', expect: "deny" },
  { name: "nested bare assign in unclosed function", text: "<#function f\n  <#assign /", expect: "allow>" },
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
  test(`slash: ${c.name}`, () => {
    const edit = autoCloseAfterSlash(c.text, c.text.length);
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
