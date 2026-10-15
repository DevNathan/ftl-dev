import * as assert from "assert";
import { test } from "node:test";
import {
  findMatchingBrace,
  isFtlCommentStart,
  matchDirectiveHead,
  scanDirectiveClose,
  skipString,
} from "./scan";

test("matchDirectiveHead angle open/close", () => {
  const open = matchDirectiveHead("<#if x>", 0);
  assert.ok(open);
  assert.strictEqual(open!.name, "if");
  assert.strictEqual(open!.isClose, false);
  assert.strictEqual(open!.sigil, "#");

  const close = matchDirectiveHead("</#if>", 0);
  assert.ok(close);
  assert.strictEqual(close!.isClose, true);
  assert.strictEqual(close!.name, "if");
});

test("matchDirectiveHead square user macro", () => {
  const m = matchDirectiveHead("[@greet name=]", 0);
  assert.ok(m);
  assert.strictEqual(m!.bracket, "[");
  assert.strictEqual(m!.sigil, "@");
  assert.strictEqual(m!.name, "greet");
});

test("findMatchingBrace respects strings", () => {
  const t = '{ "a}b": 1 }';
  assert.strictEqual(findMatchingBrace(t, 0), t.length - 1);
});

test("skipString and comment start", () => {
  assert.strictEqual(skipString('"ab\\"c"x', 0), 7);
  assert.ok(isFtlCommentStart("<#-- hi -->", 0));
  assert.ok(!isFtlCommentStart("<!-- html -->", 0));
});

test("scanDirectiveClose finds angle closer", () => {
  // Note: bare `>` in expressions ends the tag early (same as historical scanners).
  const t = "<#if x gt 1>";
  const head = matchDirectiveHead(t, 0)!;
  const close = scanDirectiveClose(t, head.length, ">");
  assert.strictEqual(close, t.length - 1);
});
