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

test("flags orphan comment closer", () => {
  const diags = validateFtl("hello --> world");
  assert.ok(diags.some((d) => d.message.includes("Unexpected '-->'")));
});

test("flags orphan square comment closer", () => {
  const diags = validateFtl("hello --] world");
  assert.ok(diags.some((d) => d.message.includes("Unexpected '--]'")));
});

test("HTML comment does not flag orphan FTL closer", () => {
  const diags = validateFtl("<!-- html -->");
  assert.ok(!diags.some((d) => d.message.includes("Unexpected '-->'")));
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

test("allows well-formed hash literals", () => {
  const diags = validateFtl(
    '<#assign h = {"name": "Ada", "age": 36}>\n${{"x": 1, "y": 2}}'
  );
  assert.ok(!diags.some((d) => d.message.includes("hash literal") || d.message.includes("hash entries")));
});

test("flags missing comma between hash entries", () => {
  const diags = validateFtl('<#assign h = {"a": 1 "b": 2}>');
  assert.ok(
    diags.some((d) => d.message.includes("Missing comma between hash entries")),
    diags.map((d) => d.message).join("; ")
  );
});

test("flags missing comma before identifier key", () => {
  const diags = validateFtl('<#assign h = {"a": 1 b: 2}>');
  assert.ok(
    diags.some((d) => d.message.includes("Missing comma between hash entries"))
  );
});

test("flags trailing comma in hash literal", () => {
  const diags = validateFtl('<#assign h = {"a": 1,}>');
  assert.ok(
    diags.some((d) => d.message.includes("Trailing comma in hash literal")),
    diags.map((d) => d.message).join("; ")
  );
});

test("flags trailing comma after last of multiple entries", () => {
  const diags = validateFtl('<#assign h = {"a": 1, "b": 2,}>');
  assert.ok(
    diags.some((d) => d.message.includes("Trailing comma in hash literal"))
  );
});

test("allows empty hash and single entry", () => {
  const diags = validateFtl("<#assign a = {}>\n<#assign b = {\"only\": 1}>");
  assert.ok(!diags.some((d) => d.message.toLowerCase().includes("comma")));
});

test("checks nested hash commas", () => {
  const diags = validateFtl('<#assign h = {"outer": {"a": 1 "b": 2}}>');
  assert.ok(
    diags.some((d) => d.message.includes("Missing comma between hash entries"))
  );
});

test("HTML braces are not treated as hash literals", () => {
  const diags = validateFtl("<style>body { color: red; }</style>");
  assert.ok(!diags.some((d) => d.message.toLowerCase().includes("hash")));
});

function hashMessages(text: string): string[] {
  return validateFtl(text)
    .filter(
      (d) =>
        d.message.includes("hash literal") ||
        d.message.includes("hash entries") ||
        d.message.toLowerCase().includes("comma")
    )
    .map((d) => d.message);
}

const COMMENT_BODIES = [
  ":",
  ",",
  "{",
  "}",
  "[",
  "]",
  "'",
  '"',
  "a: b, {c} ['d'] \"e\"",
];

test("comment containing colon between hash entries is ignored", () => {
  const text = [
    "<#assign x = [",
    "  {",
    '    "name": "COMP",',
    "    <#-- 이것도: 문제가 있음 -->",
    '    "idx": BI_COMP,',
    '    "description": "구분 비트"',
    "  }",
    "] />",
  ].join("\n");
  assert.deepStrictEqual(hashMessages(text), []);
});

test("comment bodies with hash punctuation are ignored at any hash position", () => {
  for (const body of COMMENT_BODIES) {
    for (const [open, close] of [
      ["<#--", "-->"],
      ["[#--", "--]"],
    ] as const) {
      const c = `${open} ${body} ${close}`;
      const variants = [
        `{ ${c} "a": 1, "b": 2 }`,
        `{ "a": 1, ${c} "b": 2 }`,
        `{ "a": 1 ${c}, "b": 2 }`,
        `{ "a": 1, "b": 2 ${c} }`,
        `{ "a": ${c} 1, "b": 2 }`,
        // trailing-comma + comment is covered separately (still an error)
        `{ "outer": { "a": 1, ${c} "b": 2 } }`,
      ];
      for (const hash of variants) {
        assert.deepStrictEqual(
          hashMessages(`<#assign h = ${hash}>`),
          [],
          `directive: ${hash}`
        );
        assert.deepStrictEqual(
          hashMessages(`\${${hash}}`),
          [],
          `interpolation: ${hash}`
        );
      }
    }
  }
});

test("missing comma still flagged with comment between entries", () => {
  const quoted = '<#assign h = {"a": 1 <#-- c --> "b": 2}>';
  const diags = validateFtl(quoted).filter((d) =>
    d.message.includes("Missing comma between hash entries")
  );
  assert.ok(diags.length >= 1, quoted);
  assert.strictEqual(diags[0]!.offset, quoted.indexOf('"b"'));

  const ident = "<#assign h = {a: 1 <#-- c --> b: 2}>";
  const identDiags = validateFtl(ident).filter((d) =>
    d.message.includes("Missing comma between hash entries")
  );
  assert.ok(identDiags.length >= 1, ident);
  assert.strictEqual(identDiags[0]!.offset, ident.indexOf("b:"));
});

test("trailing comma flagged when comment follows it", () => {
  const text = '<#assign h = {"a": 1, <#-- trailing -->}>';
  const diags = validateFtl(text).filter((d) =>
    d.message.includes("Trailing comma in hash literal")
  );
  assert.ok(diags.length >= 1, text);
  assert.strictEqual(diags[0]!.offset, text.indexOf(","));
});

test("braces and quotes inside comments do not create fake hashes", () => {
  const text =
    '<#assign h = {"a": 1 <#-- { "x": 1 "y": 2 } --> , "b": 2}>';
  assert.deepStrictEqual(hashMessages(text), []);
});

test("apostrophe inside FTL comment is not an unclosed string / comment", () => {
  assert.ok(
    !validateFtl("<#-- don't -->").some((d) =>
      d.message.includes("Unclosed FreeMarker comment")
    )
  );
  assert.ok(
    !validateFtl('<#assign x = 1 <#-- say "hi --> />').some((d) =>
      d.message.toLowerCase().includes("unclosed")
    )
  );
});

function deprecatedDiags(text: string) {
  return validateFtl(text).filter(
    (d) =>
      d.severity === "warning" &&
      (d.message.startsWith("Deprecated:") || d.message.includes("is deprecated"))
  );
}

// --- 0018 @deprecated usage warnings ---

test("deprecated function use warns with message; declaration name does not (AC1, AC3, AC7)", () => {
  const text = `<#--
  @deprecated use sayHi
-->
<#function legacy(name)>
  <#return name>
</#function>

\${legacy("old")}
`;
  const diags = deprecatedDiags(text);
  assert.strictEqual(diags.length, 1, diags.map((d) => d.message).join("; "));
  assert.strictEqual(diags[0]!.severity, "warning");
  assert.ok(diags[0]!.message.includes("use sayHi"));
  const useAt = text.indexOf('${legacy("old")}');
  assert.ok(useAt >= 0);
  assert.strictEqual(diags[0]!.offset, text.indexOf("legacy", useAt));
  const declName = text.indexOf("legacy", text.indexOf("<#function"));
  assert.ok(!diags.some((d) => d.offset === declName));
});

test("empty @deprecated still warns on use (AC2, AC7)", () => {
  const text = `<#--
  @deprecated
-->
<#assign legacy = "x">
\${legacy}
`;
  const diags = deprecatedDiags(text);
  assert.strictEqual(diags.length, 1);
  assert.strictEqual(diags[0]!.severity, "warning");
  assert.ok(diags[0]!.message.length > 0);
  assert.ok(diags[0]!.message.includes("deprecated"));
  assert.strictEqual(diags[0]!.offset, text.lastIndexOf("legacy"));
});

test("deprecated name inside FTL comment does not warn (AC4)", () => {
  const text = `<#--
  @deprecated gone
-->
<#function legacy()>
  <#return 1>
</#function>
<#-- legacy -->
`;
  assert.strictEqual(deprecatedDiags(text).length, 0);
});

test("deprecated #local warns in body only (AC5)", () => {
  const text = `<#function f>
  <#--
    @deprecated local-only
  -->
  <#local x = 1>
  \${x}
</#function>
\${x}
`;
  const diags = deprecatedDiags(text);
  assert.strictEqual(diags.length, 1, diags.map((d) => d.message).join("; "));
  assert.ok(diags[0]!.message.includes("local-only"));
  const bodyUse = text.indexOf("${x}");
  assert.strictEqual(diags[0]!.offset, bodyUse + 2);
  const outsideUse = text.lastIndexOf("${x}");
  assert.notStrictEqual(bodyUse, outsideUse);
  assert.ok(!diags.some((d) => d.offset === outsideUse + 2));
});

test("non-deprecated #local shadows deprecated outer (AC6)", () => {
  const text = `<#--
  @deprecated outer-x
-->
<#assign x = 0>
<#function f>
  <#local x = 1>
  \${x}
</#function>
\${x}
`;
  const diags = deprecatedDiags(text);
  assert.strictEqual(diags.length, 1, diags.map((d) => d.message).join("; "));
  assert.ok(diags[0]!.message.includes("outer-x"));
  const outsideUse = text.lastIndexOf("${x}");
  assert.strictEqual(diags[0]!.offset, outsideUse + 2);
  const bodyUse = text.indexOf("${x}");
  assert.ok(!diags.some((d) => d.offset === bodyUse + 2));
});

test("deprecated macro and global uses warn (AC1)", () => {
  const macroText = `<#--
  @deprecated use box2
-->
<#macro box>
</#macro>
<@box />
`;
  const macroDiags = deprecatedDiags(macroText);
  assert.strictEqual(macroDiags.length, 1);
  assert.ok(macroDiags[0]!.message.includes("use box2"));

  const globalText = `<#--
  @deprecated prefer y
-->
<#global g = 1>
\${g}
`;
  const globalDiags = deprecatedDiags(globalText);
  assert.strictEqual(globalDiags.length, 1);
  assert.ok(globalDiags[0]!.message.includes("prefer y"));
});

function nestingDiags(text: string) {
  return validateFtl(text).filter((d) =>
    d.message.includes("can't be nested")
  );
}

function localScopeDiags(text: string) {
  return validateFtl(text).filter((d) =>
    d.message.includes("only valid inside a '#macro'")
  );
}

function assertDiagOnToken(
  diags: ReturnType<typeof validateFtl>,
  text: string,
  needle: string
) {
  const offset = text.indexOf(needle);
  assert.ok(offset >= 0, `needle not found: ${needle}`);
  const hit = diags.find((d) => d.offset === offset && d.length === needle.length);
  assert.ok(hit, `expected diagnostic on ${JSON.stringify(needle)}`);
  assert.strictEqual(hit!.severity, "error");
  return hit!;
}

test("AC1: nested #macro — error on inner open only", () => {
  const text = "<#macro a><#macro b></#macro></#macro>";
  const diags = nestingDiags(text);
  assert.strictEqual(diags.length, 1);
  assertDiagOnToken(diags, text, "<#macro b>");
});

test("AC2: nested #function and mixed macro/function — error on inner open", () => {
  const fnFn = "<#function a()><#function b()></#function></#function>";
  assert.strictEqual(nestingDiags(fnFn).length, 1);
  assertDiagOnToken(nestingDiags(fnFn), fnFn, "<#function b()>");

  const macroFn = "<#macro a><#function b()></#function></#macro>";
  assert.strictEqual(nestingDiags(macroFn).length, 1);
  assertDiagOnToken(nestingDiags(macroFn), macroFn, "<#function b()>");

  const fnMacro = "<#function a()><#macro b></#macro></#function>";
  assert.strictEqual(nestingDiags(fnMacro).length, 1);
  assertDiagOnToken(nestingDiags(fnMacro), fnMacro, "<#macro b>");
});

test("AC3: top-level macro and macro inside #if — no nesting error", () => {
  assert.strictEqual(nestingDiags("<#macro m></#macro>").length, 0);
  assert.strictEqual(
    nestingDiags("<#if true><#macro m></#macro></#if>").length,
    0
  );
});

test("AC4: #macro inside user-macro call — no nesting error", () => {
  const text = "<@wrap><#macro m></#macro></@wrap>";
  assert.strictEqual(nestingDiags(text).length, 0);
});

test("AC5: top-level angle short #local — error on open", () => {
  const text = "<#local x = 1 />";
  const diags = localScopeDiags(text);
  assert.strictEqual(diags.length, 1);
  assertDiagOnToken(diags, text, "<#local x = 1 />");
});

test("AC6: top-level square short #local — error on open", () => {
  const text = "[#local x = 1 /]";
  const diags = localScopeDiags(text);
  assert.strictEqual(diags.length, 1);
  assertDiagOnToken(diags, text, "[#local x = 1 /]");
});

test("AC7: #local inside macro and function — no scope error", () => {
  assert.strictEqual(
    localScopeDiags("<#macro m><#local x = 1 /></#macro>").length,
    0
  );
  assert.strictEqual(
    localScopeDiags("<#function f()><#local x = 1 /></#function>").length,
    0
  );
});

test("AC8: #local in #list at template level errors; inside macro ok", () => {
  const top = "<#list items as i><#local x = 1 /></#list>";
  const topDiags = localScopeDiags(top);
  assert.strictEqual(topDiags.length, 1);
  assertDiagOnToken(topDiags, top, "<#local x = 1 />");

  const inMacro =
    "<#macro m><#list items as i><#local x = 1 /></#list></#macro>";
  assert.strictEqual(localScopeDiags(inMacro).length, 0);
});

// --- 0027 unknown named-param diagnostics ---

function unknownParamDiags(text: string) {
  return validateFtl(text).filter(
    (d) =>
      d.message.includes("Unknown parameter") ||
      d.message.includes("Unknown setting name")
  );
}

function assertWarnOnIdent(
  diags: ReturnType<typeof validateFtl>,
  text: string,
  needle: string
) {
  const offset = text.indexOf(needle);
  assert.ok(offset >= 0, `needle not found: ${needle}`);
  const hit = diags.find(
    (d) => d.offset === offset && d.length === needle.length
  );
  assert.ok(hit, `expected warning on ${JSON.stringify(needle)}`);
  assert.strictEqual(hit!.severity, "warning");
  return hit!;
}

test("0027 AC6: unknown #ftl param encodingg warns", () => {
  const text = '<#ftl encodingg="UTF-8">';
  const diags = unknownParamDiags(text);
  assert.strictEqual(diags.length, 1);
  const hit = assertWarnOnIdent(diags, text, "encodingg");
  assert.ok(hit.message.includes("encodingg"));
  assert.ok(hit.message.includes("#ftl") || hit.message.includes("parameter"));
});

test("0027 AC7: unknown #setting local (typo for locale) warns", () => {
  const text = '<#setting local="en_US">';
  const diags = unknownParamDiags(text);
  assert.strictEqual(diags.length, 1);
  const hit = assertWarnOnIdent(diags, text, "local");
  assert.ok(hit.message.includes("local"));
  assert.ok(hit.message.includes("setting"));
});

test("0027 AC8: unknown include parse_missing warns; ignore_missing/ignoreMissing ok", () => {
  const bad = '<#include "a.ftl" parse_missing=true>';
  const badDiags = unknownParamDiags(bad);
  assert.strictEqual(badDiags.length, 1);
  assertWarnOnIdent(badDiags, bad, "parse_missing");

  assert.strictEqual(
    unknownParamDiags('<#include "a.ftl" ignore_missing=true>').length,
    0
  );
  assert.strictEqual(
    unknownParamDiags('<#include "a.ftl" ignoreMissing=true>').length,
    0
  );
});

test("0027 AC9: known snake and camel LHSs do not warn", () => {
  assert.strictEqual(
    unknownParamDiags("<#ftl strip_whitespace=true>").length,
    0
  );
  assert.strictEqual(
    unknownParamDiags("<#ftl stripWhitespace=true>").length,
    0
  );
  assert.strictEqual(
    unknownParamDiags('<#setting numberFormat="0.0">').length,
    0
  );
  assert.strictEqual(
    unknownParamDiags('<#ftl output_format="HTML">').length,
    0
  );
});

test("0027 AC10: values after = are not flagged as unknown params", () => {
  const text = '<#ftl encoding="UTF-8" strip_whitespace=true>';
  assert.strictEqual(unknownParamDiags(text).length, 0);
  // Identifier-looking value without being a name= LHS
  const withExpr = "<#setting locale=bogusName>";
  assert.strictEqual(unknownParamDiags(withExpr).length, 0);
});

test("0027 AC11: identifier only inside quoted string is not flagged", () => {
  const text = '<#ftl encoding="bogus_param=1">';
  assert.strictEqual(unknownParamDiags(text).length, 0);
});

test("0027 AC12: nested = inside {} / () / [] not flagged", () => {
  assert.strictEqual(
    unknownParamDiags('<#ftl ns_prefixes={"x"=1}>').length,
    0
  );
  assert.strictEqual(
    unknownParamDiags("<#ftl attributes=(bogus=1)>").length,
    0
  );
  assert.strictEqual(
    unknownParamDiags("<#ftl attributes=[bogus=1]>").length,
    0
  );
});

test("0027 AC13: param-like text only inside FTL comment is not flagged", () => {
  const text = "<#ftl encoding=\"UTF-8\" <#-- encodingg=1 --> >";
  assert.strictEqual(unknownParamDiags(text).length, 0);
});

test("0027 AC14: clause keywords as/in/using never reported as unknown params", () => {
  // Synthetic as= on a named-param directive must still not warn (deny-list).
  assert.strictEqual(unknownParamDiags("<#ftl as=1>").length, 0);
  assert.strictEqual(unknownParamDiags("<#ftl in=1>").length, 0);
  assert.strictEqual(unknownParamDiags("<#ftl using=1>").length, 0);
});

test("0027 AC15: square syntax [#setting bogus=1] warns", () => {
  const text = "[#setting bogus=1]";
  const diags = unknownParamDiags(text);
  assert.strictEqual(diags.length, 1);
  assertWarnOnIdent(diags, text, "bogus");
});

test("0027 AC16: unknown-param severity is warning not error", () => {
  const diags = unknownParamDiags('<#ftl encodingg="UTF-8">');
  assert.ok(diags.length >= 1);
  assert.ok(diags.every((d) => d.severity === "warning"));
});

test("0027 AC17: unknown-directive and structure regressions still work", () => {
  const unknown = validateFtl("<#notARealDirective x>\n</#notARealDirective>");
  assert.ok(unknown.some((d) => d.message.includes("Unknown directive")));
  assert.ok(unknown.every((d) => !d.message.includes("Unknown parameter")));

  const unclosed = validateFtl("<#if x>\nhello");
  assert.ok(unclosed.some((d) => d.message.includes("Unclosed")));

  // Clean fixture shapes stay free of unknown-param noise
  assert.strictEqual(
    unknownParamDiags('<#ftl encoding="UTF-8">').length,
    0
  );
  assert.strictEqual(
    unknownParamDiags('<#include "a.ftl">').length,
    0
  );
});

// --- Plan 0038: ftldoc @param diagnostics (D7) and multi-line @deprecated ---

function infoDiags(text: string, opts?: Parameters<typeof validateFtl>[1]) {
  return validateFtl(text, opts).filter((d) => d.severity === "information");
}

test("T29 unknown @param name → Information on the name (0038 AC12)", () => {
  const text = "<#--\n@param missing x\n-->\n<#function f a>\n</#function>\n";
  const d = infoDiags(text);
  assert.strictEqual(d.length, 1);
  assert.strictEqual(
    d[0]!.message,
    "ftldoc @param 'missing' does not match a parameter of 'f'"
  );
  assert.strictEqual(d[0]!.offset, text.indexOf("missing"));
  assert.strictEqual(d[0]!.length, "missing".length);
});

test("T30 duplicate @param → Information on the second (0038 AC12)", () => {
  const text = "<#--\n@param a x\n@param a y\n-->\n<#function f a>\n</#function>\n";
  const d = infoDiags(text);
  assert.strictEqual(d.length, 1);
  assert.strictEqual(d[0]!.message, "Duplicate ftldoc @param 'a'");
  assert.strictEqual(d[0]!.offset, text.indexOf("@param a y") + "@param ".length);
});

test("T31 dotted / optional / catch-all / non-function → none (0038 AC12)", () => {
  const text =
    "<#--\n@param opts.key k\n@param [opts] o\n@param args rest\n-->\n" +
    "<#macro m opts args...>\n</#macro>\n" +
    "<#-- @param z nope -->\n<#assign v = 1>\n";
  assert.strictEqual(validateFtl(text).length, 0);
});

test("T32 ftldocParams: false suppresses (0038 AC12)", () => {
  const text = "<#--\n@param missing x\n-->\n<#function f a>\n</#function>\n";
  assert.strictEqual(validateFtl(text, { ftldocParams: false }).length, 0);
});

test("T33 multi-line @deprecated message collapses whitespace (0038 AC13)", () => {
  const text =
    "<#--\n@deprecated\n  use a\n  then b\n-->\n<#function old>\n</#function>\n${old()}\n";
  const d = validateFtl(text).filter((x) => x.severity === "warning");
  assert.strictEqual(d.length, 1);
  assert.strictEqual(d[0]!.message, "Deprecated: use a then b");
});

console.log("All diagnostics unit tests passed.");
