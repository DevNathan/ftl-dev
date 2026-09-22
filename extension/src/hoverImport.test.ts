import * as assert from "assert";
import { buildCompletions, completionContext } from "./catalog";
import { builtinHover, directiveHover } from "./docs";
import { collectImportSymbols } from "./imports";
import { indexFtl } from "./symbols";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

test("ns context after lib.", () => {
  const ctx = completionContext("${lib.hel");
  assert.deepStrictEqual(ctx, { type: "ns", ns: "lib", prefix: "hel" });
});

test("ns completions filter imported members", () => {
  const items = buildCompletions(
    { type: "ns", ns: "lib", prefix: "he" },
    ["lib.helper", "lib.note", "title"]
  );
  assert.deepStrictEqual(
    items.map((i) => i.label),
    ["helper"]
  );
});

test("hover docs for builtin and directive", () => {
  assert.ok(builtinHover("c")?.includes("?c"));
  assert.ok(builtinHover("has_content")?.includes("Empty means"));
  assert.ok(directiveHover("import")?.includes("#import"));
  assert.ok(directiveHover("list")?.includes("<#list"));
});

async function main(): Promise<void> {
  const mainText = `<#import "lib.ftl" as lib>\n`;
  const lib = `<#function helper>\n<#return 1>\n</#function>\n`;
  const files: Record<string, string> = {
    "/proj/lib.ftl": lib,
  };
  const idx = indexFtl(mainText);
  const collected = await collectImportSymbols(
    "/proj/main.ftl",
    idx,
    async (p) => files[p]
  );
  assert.deepStrictEqual(collected.qualified, ["lib.helper"]);
  console.log("✓ collectImportSymbols from import as ns");
  console.log("All hover/import unit tests passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
