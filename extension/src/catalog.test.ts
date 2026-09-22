import * as assert from "assert";
import {
  buildCompletions,
  completionContext,
} from "./catalog";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

test("detects directive context after <#", () => {
  const ctx = completionContext('x\n<#imp');
  assert.deepStrictEqual(ctx, {
    type: "directive",
    prefix: "imp",
    trigger: "<#",
  });
});

test("detects builtin context after ?", () => {
  const ctx = completionContext("${x?ha");
  assert.deepStrictEqual(ctx, { type: "builtin", prefix: "ha" });
});

test("directive completions filter by prefix", () => {
  const items = buildCompletions(
    { type: "directive", prefix: "imp", trigger: "<#" },
    []
  );
  const labels = items.map((i) => i.label);
  assert.ok(labels.includes("import"));
  assert.ok(!labels.includes("include") || labels.includes("import"));
  assert.ok(labels.every((l) => l.startsWith("imp")));
});

test("builtin completions include c and has_content", () => {
  const items = buildCompletions({ type: "builtin", prefix: "" }, []);
  const labels = new Set(items.map((i) => i.label));
  assert.ok(labels.has("c"));
  assert.ok(labels.has("has_content"));
});

test("builtin completion includes Apache-style documentation", () => {
  const items = buildCompletions({ type: "builtin", prefix: "has_content" }, []);
  const hit = items.find((i) => i.label === "has_content");
  assert.ok(hit?.documentation?.includes("has_content"));
  assert.ok(hit?.detail);
});

test("general completions include file symbols", () => {
  const items = buildCompletions(
    { type: "general", prefix: "ban" },
    ["banner", "title"]
  );
  assert.ok(items.some((i) => i.label === "banner" && i.kind === "symbol"));
});

console.log("All catalog unit tests passed.");
