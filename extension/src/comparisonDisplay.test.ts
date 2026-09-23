import * as assert from "assert";
import { findComparisonOps, findExpressionSpans } from "./comparisonDisplay";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

test("gte inside #if displays as >=", () => {
  const text = `<#if x gte y>\n</#if>\n`;
  const ops = findComparisonOps(text);
  assert.strictEqual(ops.length, 1);
  assert.strictEqual(ops[0]!.token, "gte");
  assert.strictEqual(ops[0]!.display, ">=");
  assert.strictEqual(text.slice(ops[0]!.offset, ops[0]!.offset + ops[0]!.length), "gte");
});

test("lt lte gt gte all map correctly", () => {
  const text = `<#if a lt b || a lte b || a gt b || a gte b>\n</#if>\n`;
  const ops = findComparisonOps(text);
  assert.deepStrictEqual(
    ops.map((o) => o.display),
    ["<", "<=", ">", ">="]
  );
});

test("ops inside ${} are found", () => {
  const text = `\${x gte 1}\n`;
  const ops = findComparisonOps(text);
  assert.strictEqual(ops.length, 1);
  assert.strictEqual(ops[0]!.display, ">=");
});

test("square-bracket #if finds gt", () => {
  const text = `[#if x gt y]\n[/#if]\n`;
  const ops = findComparisonOps(text);
  assert.strictEqual(ops.length, 1);
  assert.strictEqual(ops[0]!.token, "gt");
});

test("<#lt> whitespace directive is not a comparison", () => {
  const text = `<#lt>\n`;
  assert.deepStrictEqual(findComparisonOps(text), []);
});

test("[#lt] whitespace directive is not a comparison", () => {
  const text = `[#lt]\n`;
  assert.deepStrictEqual(findComparisonOps(text), []);
});

test("ops inside strings are ignored", () => {
  const text = `<#if s == "gte lt gt">\n</#if>\n`;
  assert.deepStrictEqual(findComparisonOps(text), []);
});

test("ops inside FTL comments are ignored", () => {
  const text = `<#-- x gte y -->\n<#if true>\n</#if>\n`;
  assert.deepStrictEqual(findComparisonOps(text), []);
});

test("plain HTML text outside FTL is ignored", () => {
  const text = `<p>gte lt</p>\n`;
  assert.deepStrictEqual(findComparisonOps(text), []);
});

test("expression spans cover #if interior", () => {
  const text = `<#if x gte y>\n`;
  const spans = findExpressionSpans(text);
  assert.ok(spans.length >= 1);
  const slice = text.slice(spans[0]!.start, spans[0]!.end);
  assert.ok(slice.includes("gte"));
});

console.log("All comparisonDisplay unit tests passed.");
