import * as assert from "assert";
import {
  buildCompletions,
  completionContext,
  isInRecoverBody,
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

test("detects special variable context after bare .", () => {
  const ctx = completionContext('log("x" + .err');
  assert.deepStrictEqual(ctx, {
    type: "special",
    prefix: "err",
    inRecover: false,
  });
});

test("ns.member is not treated as special variable", () => {
  const ctx = completionContext("ob.load");
  assert.deepStrictEqual(ctx, { type: "ns", ns: "ob", prefix: "load" });
});

test("isInRecoverBody true inside #recover", () => {
  const before =
    '<#attempt>\n  x\n<#recover>\n  <#assign r = ob.log("e: " + .';
  assert.strictEqual(isInRecoverBody(before), true);
  const ctx = completionContext(before);
  assert.strictEqual(ctx.type, "special");
  if (ctx.type === "special") {
    assert.strictEqual(ctx.inRecover, true);
  }
});

test("isInRecoverBody false in #attempt before #recover", () => {
  const before = "<#attempt>\n  <#assign x = .";
  assert.strictEqual(isInRecoverBody(before), false);
});

test(".error offered in recover; hidden outside", () => {
  const inRec = buildCompletions({
    type: "special",
    prefix: "err",
    inRecover: true,
  });
  assert.ok(inRec.some((c) => c.label === "error"));

  const outRec = buildCompletions({
    type: "special",
    prefix: "err",
    inRecover: false,
  });
  assert.ok(!outRec.some((c) => c.label === "error"));
});

test("special .now always available", () => {
  const items = buildCompletions({
    type: "special",
    prefix: "no",
    inRecover: false,
  });
  assert.ok(items.some((c) => c.label === "now"));
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

test("function symbols insert name($0) snippet", () => {
  const items = buildCompletions(
    { type: "general", prefix: "twi" },
    [
      { name: "twice", asFunctionCall: true },
      { name: "title" },
    ]
  );
  const hit = items.find((i) => i.label === "twice");
  assert.ok(hit);
  assert.strictEqual(hit!.insertText, "twice($0)");
  assert.strictEqual(hit!.insertAsSnippet, true);

  const assignItems = buildCompletions(
    { type: "general", prefix: "tit" },
    [{ name: "title" }, { name: "twice", asFunctionCall: true }]
  );
  const title = assignItems.find((i) => i.label === "title");
  assert.ok(title);
  assert.ok(!title!.insertAsSnippet);
});

test("ns function member inserts helper($0)", () => {
  const items = buildCompletions(
    { type: "ns", ns: "lib", prefix: "hel" },
    [{ name: "lib.helper", asFunctionCall: true }]
  );
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0]!.insertText, "helper($0)");
  assert.strictEqual(items[0]!.insertAsSnippet, true);
});

console.log("All catalog unit tests passed.");
