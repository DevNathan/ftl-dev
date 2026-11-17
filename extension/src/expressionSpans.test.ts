import * as assert from "assert";
import { findExpressionSpans } from "./expressionSpans";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

test("expression spans cover #if interior", () => {
  const text = `<#if x gte y>\n`;
  const spans = findExpressionSpans(text);
  assert.ok(spans.length >= 1);
  const slice = text.slice(spans[0]!.start, spans[0]!.end);
  assert.ok(slice.includes("gte"));
});
