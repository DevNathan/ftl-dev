import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { validateFtl } from "./diagnostics";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

test("flags dangling ? in ${boo?}", () => {
  const diags = validateFtl("${boo?}");
  assert.ok(diags.some((d) => d.message.includes("built-in")));
  assert.ok(diags.some((d) => d.offset === "${boo".length));
});

test("flags dangling ? in ${[boo?]}", () => {
  const diags = validateFtl("${[boo?]}");
  assert.ok(diags.some((d) => d.message.includes("built-in")));
});

test("allows ?? existential", () => {
  const diags = validateFtl('<#assign x = user.name??>');
  assert.ok(!diags.some((d) => d.message.includes("built-in")));
});

test("allows normal builtins", () => {
  const diags = validateFtl('${x?has_content?then("a","b")}');
  assert.strictEqual(
    diags.filter((d) => d.message.includes("built-in")).length,
    0
  );
});

test("ignores ? inside strings", () => {
  const diags = validateFtl('${"boo?"}');
  assert.ok(!diags.some((d) => d.message.includes("built-in")));
});

test("flags unclosed interpolation", () => {
  const diags = validateFtl("${user.name");
  assert.ok(diags.some((d) => d.message.includes("Unclosed interpolation")));
});

test("flags unclosed comment", () => {
  const diags = validateFtl("<#-- oops");
  assert.ok(diags.some((d) => d.message.includes("Unclosed FreeMarker comment")));
});

test("flags unclosed directive tag <#assign", () => {
  const diags = validateFtl("<#assign \n\n<h1></h1>");
  assert.ok(diags.some((d) => d.message.includes("Unclosed directive tag")));
});

test("flags empty #elseif", () => {
  const diags = validateFtl("<#if x>\n<#elseif>\n</#if>");
  assert.ok(diags.some((d) => d.message.includes("#elseif") && d.message.includes("condition")));
});

test("flags unexpected </#if>", () => {
  const diags = validateFtl("</#if>");
  assert.ok(diags.some((d) => d.message.includes("Unexpected")));
});

test("flags unclosed #if block", () => {
  const diags = validateFtl("<#if x>\nhello");
  assert.ok(diags.some((d) => d.message.includes("Unclosed '#if'")));
});

test("HTML alone has no FTL directive errors", () => {
  const diags = validateFtl("<h1></h1>\n<div class='x'></div>");
  assert.strictEqual(diags.length, 0);
});

test("capture <#assign name>…</#assign> is valid", () => {
  const diags = validateFtl('<#assign note>\nHello\n</#assign>');
  assert.strictEqual(diags.length, 0);
});

test("short <#assign x = 1> does not need </#assign>", () => {
  const diags = validateFtl('<#assign note = "Text">\n${note}');
  assert.strictEqual(diags.length, 0);
});

test("multiline short assign is valid", () => {
  const diags = validateFtl('<#assign\n  note = "Text"\n>\n${note}');
  assert.strictEqual(diags.length, 0);
});

test("bare <#assign>…</#assign> pairs (capture-shaped)", () => {
  const diags = validateFtl("<#assign>\nplain\n</#assign>");
  assert.ok(!diags.some((d) => d.message.includes("Unexpected")));
});

test("flags empty interpolation ${}", () => {
  const diags = validateFtl("${}");
  assert.ok(diags.some((d) => d.message.includes("Empty interpolation")));
});

test("flags whitespace-only interpolation", () => {
  const diags = validateFtl("${   }");
  assert.ok(diags.some((d) => d.message.includes("Empty interpolation")));
});

test("allows non-empty interpolation", () => {
  const diags = validateFtl("${title}");
  assert.ok(!diags.some((d) => d.message.includes("Empty interpolation")));
});

test("flags duplicate #else in same #if", () => {
  const diags = validateFtl("<#if x>\na<#else>\nb<#else>\nc</#if>");
  assert.ok(diags.some((d) => d.message.includes("Duplicate '#else'")));
});

test("allows nested #if each with one #else", () => {
  const diags = validateFtl(
    "<#if a>\n<#if b>\nx<#else>\ny</#if>\n<#else>\nz</#if>"
  );
  assert.ok(!diags.some((d) => d.message.includes("Duplicate '#else'")));
});

test("flags unknown #directive name", () => {
  const diags = validateFtl("<#notARealDirective x>\n</#notARealDirective>");
  assert.ok(diags.some((d) => d.message.includes("Unknown directive")));
});

test("flags unknown [#directive] name", () => {
  const diags = validateFtl("[#bogus]\n[/#bogus]");
  assert.ok(diags.some((d) => d.message.includes("Unknown directive")));
});

test("does not flag user <@macro> as unknown directive", () => {
  const diags = validateFtl('<@banner text="Hello"/>');
  assert.ok(!diags.some((d) => d.message.includes("Unknown directive")));
});

test("flags #list classic form missing as", () => {
  const diags = validateFtl("<#list items>\n</#list>");
  assert.ok(diags.some((d) => d.message.includes("'#list'") && d.message.includes("as")));
});

test("allows #list with as", () => {
  const diags = validateFtl("<#list [1,2,3] as i>\n${i}\n</#list>");
  assert.ok(!diags.some((d) => d.message.includes("'#list'") && d.message.includes("as")));
});

test("navigation fixture shapes have no layer-A errors", () => {
  const fixture = path.join(
    __dirname,
    "..",
    "..",
    "tests",
    "fixtures",
    "navigation",
    "main.ftl"
  );
  const sample = fs.readFileSync(fixture, "utf8");
  const diags = validateFtl(sample);
  assert.strictEqual(diags.length, 0, diags.map((d) => d.message).join("; "));
});

console.log("All diagnostics unit tests passed.");
