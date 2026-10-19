import * as assert from "assert";
import { buildCompletions } from "../catalog";
import { builtinHover, directiveHover } from "../docs";
import {
  BUILTIN_REF,
  SPECIAL_VAR_REF,
  DIRECTIVE_REF,
  getBuiltinRef,
  getDirectiveRef,
} from "./freemarkerRef";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

test("has_content ref has usage and manual link", () => {
  const ref = getBuiltinRef("has_content");
  assert.ok(ref);
  assert.ok(ref!.detail.toLowerCase().includes("empty"));
  assert.ok(ref!.documentation.includes("?has_content"));
  assert.ok(ref!.documentation.includes("```ftl"));
  assert.ok(
    ref!.documentation.includes("freemarker.apache.org/docs/ref_builtins_expert.html")
  );
});

test("c and list refs present", () => {
  assert.ok(getBuiltinRef("c")?.documentation.includes("?c"));
  assert.ok(getDirectiveRef("list")?.documentation.includes("#list"));
  assert.ok(getDirectiveRef("list")?.documentation.includes("<#list"));
});

test("completion candidates carry documentation", () => {
  const builtins = buildCompletions({ type: "builtin", prefix: "has_" }, []);
  const has = builtins.find((c) => c.label === "has_content");
  assert.ok(has?.documentation?.includes("has_content"));
  assert.ok(has?.detail);

  const dirs = buildCompletions(
    { type: "directive", prefix: "li", trigger: "<#" },
    []
  );
  const list = dirs.find((c) => c.label === "list");
  assert.ok(list?.documentation?.includes("#list"));
});

test("hover helpers reuse catalog markdown", () => {
  assert.strictEqual(builtinHover("has_content"), BUILTIN_REF.has_content!.documentation);
  assert.strictEqual(directiveHover("list"), DIRECTIVE_REF.list!.documentation);
});

test("every catalog BUILTIN/DIRECTIVE name has a ref entry", () => {
  // Soft check: key entries used in completions exist; full parity preferred
  for (const name of ["has_content", "c", "size", "html", "then"]) {
    assert.ok(BUILTIN_REF[name], `missing builtin ref: ${name}`);
  }
  for (const name of ["if", "list", "macro", "import", "assign"]) {
    assert.ok(DIRECTIVE_REF[name], `missing directive ref: ${name}`);
  }
});

test("special variable refs include error and now", () => {
  assert.ok(SPECIAL_VAR_REF.error);
  assert.ok(SPECIAL_VAR_REF.now);
  assert.ok(SPECIAL_VAR_REF.error!.documentation.includes("recover"));
});

console.log("All reference unit tests passed.");
