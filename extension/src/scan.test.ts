import * as assert from "assert";
import { test } from "node:test";
import {
  findMatchingBrace,
  ftlCodeRanges,
  isFtlCommentStart,
  matchDirectiveHead,
  rangeCursor,
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

function codeText(t: string): string[] {
  return ftlCodeRanges(t).map(([a, b]) => t.slice(a, b));
}

test("ftlCodeRanges: tags and interpolations are code, HTML text is not", () => {
  assert.deepStrictEqual(codeText("a <#if x>b</#if> ${y} #{z} [@m q/] c"), [
    "<#if x>",
    "</#if>",
    "${y}",
    "#{z}",
    "[@m q/]",
  ]);
});

test("ftlCodeRanges: string contents excluded, ${} inside strings is code", () => {
  const t = `<#assign s = "a \${b("c \${d}")} e" + 'f'>`;
  assert.deepStrictEqual(codeText(t), [
    "<#assign s = ",
    "${b(",
    "${d}",
    ")}",
    " + ",
    ">",
  ]);
});

test("ftlCodeRanges: escaped \\${ and raw strings stay string", () => {
  assert.deepStrictEqual(codeText(`<#assign s = "\\\${x}">`), [
    "<#assign s = ",
    ">",
  ]);
  assert.deepStrictEqual(codeText(`<#assign s = r"\${x}" + rr>`), [
    "<#assign s = ",
    " + rr>",
  ]);
});

test("ftlCodeRanges: multi-line hash literal keys are not code", () => {
  const t = `<#return {\n  "header": header\n} />`;
  assert.deepStrictEqual(codeText(t), ["<#return {\n  ", ": header\n} />"]);
});

test("ftlCodeRanges: comments and noparse bodies are skipped", () => {
  assert.deepStrictEqual(
    codeText("<#if a <#-- b --> c>x</#if>"),
    ["<#if a ", " c>", "</#if>"]
  );
  assert.deepStrictEqual(
    codeText("<#-- ${x} --><#noparse>${y}<#if z></#noparse>${w}"),
    // Adjacent code ranges are merged.
    ["<#noparse>", "</#noparse>${w}"]
  );
});

test("ftlCodeRanges: unclosed regions run to EOF and ranges are sorted", () => {
  const t = `x \${a "b`;
  assert.deepStrictEqual(codeText(t), ["${a "]);
  const r = ftlCodeRanges(`<#if a>\${b}<@c d="\${e}"/>`);
  for (let i = 1; i < r.length; i++) {
    assert.ok(r[i - 1]![1] <= r[i]![0], "sorted, non-overlapping");
  }
});

test("rangeCursor answers monotonic membership queries", () => {
  const inR = rangeCursor([
    [2, 4],
    [6, 7],
  ]);
  assert.deepStrictEqual(
    [0, 2, 3, 4, 6, 7, 9].map((o) => inR(o)),
    [false, true, true, false, true, false, false]
  );
  assert.strictEqual(inR(3), true, "backwards query resets");
});

test("ftlCodeRanges: square tag closes at the depth-0 ]", () => {
  assert.deepStrictEqual(codeText("[#if users[0]?? && x]y[/#if] z"), [
    "[#if users[0]?? && x]",
    "[/#if]",
  ]);
});

test("ftlCodeRanges: > inside parentheses keeps the angle tag open", () => {
  assert.deepStrictEqual(codeText("<#if (a > b) && c>t</#if>"), [
    "<#if (a > b) && c>",
    "</#if>",
  ]);
});

test("ftlCodeRanges: ${} inside a string inside ${} is code", () => {
  const t = `\${f("x \${y}")}`;
  assert.deepStrictEqual(codeText(t), ["${f(", "${y}", ")}"]);
  const y = t.indexOf("y}");
  assert.ok(rangeCursor(ftlCodeRanges(t))(y), "y is code");
});
