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

console.log("All diagnostics unit tests passed.");
