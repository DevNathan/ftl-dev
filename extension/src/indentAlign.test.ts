import * as assert from "assert";
import {
  alignIndentAfterCloser,
  applyIndentAlignEdit,
} from "./indentAlign";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

function typeCloser(text: string, closer: ">" | "]"): string {
  const offset = text.length;
  const withCloser = text + closer;
  const edit = alignIndentAfterCloser(withCloser, offset + 1);
  return edit ? applyIndentAlignEdit(withCloser, edit) : withCloser;
}

test("elseif typed at body indent aligns to if", () => {
  const before =
    "<#if note?has_content>\n" +
    "  ${note}\n" +
    "  <#elseif title?has_content";
  const after = typeCloser(before, ">");
  assert.ok(after.includes("\n<#elseif title?has_content>"), after);
  assert.ok(!after.includes("\n  <#elseif"), after);
});

test("else typed at body indent aligns to if", () => {
  const before =
    "<#if x>\n" +
    "  yes\n" +
    "  <#else";
  const after = typeCloser(before, ">");
  assert.strictEqual(
    after,
    "<#if x>\n" + "  yes\n" + "<#else>"
  );
});

test("nested else aligns to inner if", () => {
  const before =
    "<#if a>\n" +
    "  <#if b>\n" +
    "    x\n" +
    "    <#else";
  const after = typeCloser(before, ">");
  assert.ok(after.includes("\n  <#else>"), after);
  assert.ok(!after.includes("\n    <#else"), after);
});

test("recover aligns to attempt", () => {
  const before =
    "<#attempt>\n" +
    "  risky\n" +
    "  <#recover";
  const after = typeCloser(before, ">");
  assert.ok(after.includes("\n<#recover>"), after);
});

test("recover aligns even when </#attempt> is on the same line", () => {
  // Common after HTML-style pair + typing recover before the close on the body line.
  const before =
    "<#attempt>\n" +
    "  <#recover";
  const withCloser = before + "></#attempt>";
  const edit = alignIndentAfterCloser(withCloser, before.length + 1);
  assert.ok(edit, "expected align edit");
  const after = applyIndentAlignEdit(withCloser, edit!);
  assert.strictEqual(after, "<#attempt>\n<#recover></#attempt>");
});

test("close attempt after recover aligns to attempt", () => {
  const before =
    "<#attempt>\n" +
    "  risky\n" +
    "<#recover>\n" +
    "  handle\n" +
    "  </#attempt";
  const after = typeCloser(before, ">");
  assert.strictEqual(
    after,
    "<#attempt>\n" +
      "  risky\n" +
      "<#recover>\n" +
      "  handle\n" +
      "</#attempt>"
  );
});

test("close tag aligns to opener", () => {
  const before =
    "<#if x>\n" +
    "  body\n" +
    "  </#if";
  const after = typeCloser(before, ">");
  assert.strictEqual(after, "<#if x>\n" + "  body\n" + "</#if>");
});

test("already aligned mid-block is a no-op", () => {
  const text =
    "<#if x>\n" +
    "  body\n" +
    "<#else>";
  const edit = alignIndentAfterCloser(text, text.length);
  assert.strictEqual(edit, undefined);
});

test("if with paren comparison still finds parent for else", () => {
  const before =
    "<#if (x > y)>\n" +
    "  yes\n" +
    "  <#else";
  const after = typeCloser(before, ">");
  assert.ok(after.includes("\n<#else>"), after);
});

test("square-bracket else aligns", () => {
  const before =
    "[#if x]\n" +
    "  yes\n" +
    "  [#else";
  const after = typeCloser(before, "]");
  assert.strictEqual(after, "[#if x]\n" + "  yes\n" + "[#else]");
});

console.log("All indentAlign unit tests passed.");
