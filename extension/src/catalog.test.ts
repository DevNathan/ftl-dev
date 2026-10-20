import * as assert from "assert";
import {
  buildCompletions,
  camelToSnakeParam,
  completionContext,
  DIRECTIVE_CLAUSE_KEYWORDS,
  DIRECTIVE_NAMED_PARAMS,
  DIRECTIVE_PARAM_DOCS,
  isBooleanDirectiveParam,
  isInRecoverBody,
  namedParamsWithAliases,
  paramDocumentation,
  paramsForDirective,
  snakeToCamel,
} from "./catalog";
import {
  CHARSET_VALUE_CATALOG,
  directiveParamValueCatalog,
  FORMAT_VALUE_CATALOG,
  LOCALE_VALUE_CATALOG,
  OUTPUT_FORMAT_VALUE_CATALOG,
} from "./directiveParams";


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

// --- Directive named params (AC1–AC15) ---

test("AC1: DIRECTIVE_NAMED_PARAMS.ftl has required names", () => {
  const ftl = new Set(DIRECTIVE_NAMED_PARAMS.ftl);
  for (const n of [
    "encoding",
    "strip_whitespace",
    "strip_text",
    "strict_syntax",
    "attributes",
    "ns_prefixes",
    "auto_esc",
    "output_format",
  ]) {
    assert.ok(ftl.has(n), `missing ftl param ${n}`);
  }
});

test("AC2: DIRECTIVE_NAMED_PARAMS.setting has required names", () => {
  const s = new Set(DIRECTIVE_NAMED_PARAMS.setting);
  for (const n of [
    "locale",
    "number_format",
    "boolean_format",
    "date_format",
    "time_format",
    "datetime_format",
    "time_zone",
    "url_escaping_charset",
    "output_encoding",
    "classic_compatible",
    "sql_date_and_time_time_zone",
    "c_format",
  ]) {
    assert.ok(s.has(n), `missing setting name ${n}`);
  }
});

test("AC3: DIRECTIVE_NAMED_PARAMS.include has parse/encoding/ignore_missing", () => {
  const inc = new Set(DIRECTIVE_NAMED_PARAMS.include);
  assert.ok(inc.has("parse"));
  assert.ok(inc.has("encoding"));
  assert.ok(inc.has("ignore_missing"));
});

test("AC4: clause keywords as/in/using mapped correctly", () => {
  for (const d of ["list", "items", "import", "escape"]) {
    assert.deepStrictEqual(DIRECTIVE_CLAUSE_KEYWORDS[d], ["as"]);
  }
  for (const d of ["assign", "local", "global"]) {
    assert.deepStrictEqual(DIRECTIVE_CLAUSE_KEYWORDS[d], ["in"]);
  }
  for (const d of ["visit", "recurse"]) {
    assert.deepStrictEqual(DIRECTIVE_CLAUSE_KEYWORDS[d], ["using"]);
  }
  assert.ok(paramsForDirective("ftl").includes("encoding"));
  assert.ok(paramsForDirective("list").includes("as"));
});

test("AC5: <#ftl  → directiveParam ftl", () => {
  const ctx = completionContext("<#ftl ");
  assert.strictEqual(ctx.type, "directiveParam");
  if (ctx.type === "directiveParam") {
    assert.strictEqual(ctx.directive, "ftl");
    assert.strictEqual(ctx.prefix, "");
  }
});

test("AC6: <#ftl enc → prefix enc; completions include encoding", () => {
  const ctx = completionContext("<#ftl enc");
  assert.strictEqual(ctx.type, "directiveParam");
  if (ctx.type === "directiveParam") {
    assert.strictEqual(ctx.prefix, "enc");
  }
  const items = buildCompletions(ctx);
  assert.ok(items.some((c) => c.label === "encoding"));
});

test("AC7: bare <#ftl remains directive context", () => {
  const ctx = completionContext("<#ftl");
  assert.deepStrictEqual(ctx, {
    type: "directive",
    prefix: "ftl",
    trigger: "<#",
  });
});

test("AC8: inside string does not claim directiveParam", () => {
  const ctx = completionContext('<#ftl encoding="UT');
  assert.notStrictEqual(ctx.type, "directiveParam");
});

test("AC9: after = value slot does not offer param names", () => {
  // 0032a: locale= is a value catalog slot; still must not offer param names.
  const ctx = completionContext("<#setting locale=");
  assert.strictEqual(ctx.type, "directiveParam");
  if (ctx.type === "directiveParam") {
    assert.strictEqual(ctx.kind, "value");
  }
  const items = buildCompletions(ctx);
  assert.ok(!items.some((c) => c.label === "locale" && c.kind === "property"));
  assert.ok(items.some((c) => c.label === "en_US"));
});

test("AC10: square [#ftl  → directiveParam", () => {
  const ctx = completionContext("[#ftl ");
  assert.strictEqual(ctx.type, "directiveParam");
  if (ctx.type === "directiveParam") {
    assert.strictEqual(ctx.directive, "ftl");
  }
});

test("AC11: ftl prefix strip_ → strip_whitespace and strip_text", () => {
  const items = buildCompletions({
    type: "directiveParam",
    directive: "ftl",
    prefix: "strip_",
    kind: "named",
  });
  const labels = items.map((c) => c.label);
  assert.ok(labels.includes("strip_whitespace"));
  assert.ok(labels.includes("strip_text"));
});

test("AC12: setting loc → locale; number_ → number_format", () => {
  const loc = buildCompletions({
    type: "directiveParam",
    directive: "setting",
    prefix: "loc",
    kind: "named",
  });
  assert.ok(loc.some((c) => c.label === "locale"));
  const num = buildCompletions({
    type: "directiveParam",
    directive: "setting",
    prefix: "number_",
    kind: "named",
  });
  assert.ok(num.some((c) => c.label === "number_format"));
});

test("AC13: include ign → ignore_missing", () => {
  const items = buildCompletions({
    type: "directiveParam",
    directive: "include",
    prefix: "ign",
    kind: "named",
  });
  assert.ok(items.some((c) => c.label === "ignore_missing"));
});

test("AC14: #list xs  offers as clause", () => {
  const ctx = completionContext("<#list xs ");
  assert.strictEqual(ctx.type, "directiveParam");
  if (ctx.type === "directiveParam") {
    assert.strictEqual(ctx.directive, "list");
  }
  const items = buildCompletions(ctx);
  assert.ok(items.some((c) => c.label === "as"));
  const withA = buildCompletions({
    type: "directiveParam",
    directive: "list",
    prefix: "a",
    kind: "clause",
  });
  assert.ok(withA.some((c) => c.label === "as"));
});

test("AC15: existing directive/builtin/special/ns contexts unchanged", () => {
  assert.deepStrictEqual(completionContext("<#imp"), {
    type: "directive",
    prefix: "imp",
    trigger: "<#",
  });
  assert.deepStrictEqual(completionContext("${x?ha"), {
    type: "builtin",
    prefix: "ha",
  });
  assert.deepStrictEqual(completionContext('log("x" + .err'), {
    type: "special",
    prefix: "err",
    inRecover: false,
  });
  assert.deepStrictEqual(completionContext("ob.load"), {
    type: "ns",
    ns: "ob",
    prefix: "load",
  });
  const dirItems = buildCompletions(
    { type: "directive", prefix: "imp", trigger: "<#" },
    []
  );
  assert.ok(dirItems.some((c) => c.label === "import"));
});

// --- 0026 camelCase aliases + boolean value slot ---

test("0026 AC1: snake_ params have camel aliases in paramsForDirective", () => {
  for (const dir of ["ftl", "setting", "include"] as const) {
    const snakes = DIRECTIVE_NAMED_PARAMS[dir]!;
    const all = new Set(paramsForDirective(dir));
    for (const s of snakes) {
      if (!s.includes("_")) {
        continue;
      }
      const camel = snakeToCamel(s);
      assert.ok(all.has(s), `${dir}: missing snake ${s}`);
      assert.ok(all.has(camel), `${dir}: missing camel ${camel}`);
    }
  }
});

test("0026 AC2: names without _ appear once (no duplicate labels)", () => {
  for (const dir of ["ftl", "setting", "include"] as const) {
    const aliases = namedParamsWithAliases(dir);
    const counts = new Map<string, number>();
    for (const n of aliases) {
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    for (const s of DIRECTIVE_NAMED_PARAMS[dir]!) {
      if (s.includes("_")) {
        continue;
      }
      assert.strictEqual(counts.get(s), 1, `${dir}: ${s} should appear once`);
    }
  }
});

test("0026 AC3: locked camel fixtures for key names", () => {
  assert.strictEqual(snakeToCamel("strip_whitespace"), "stripWhitespace");
  assert.strictEqual(snakeToCamel("output_format"), "outputFormat");
  assert.strictEqual(snakeToCamel("auto_esc"), "autoEsc");
  assert.strictEqual(snakeToCamel("number_format"), "numberFormat");
  assert.strictEqual(snakeToCamel("classic_compatible"), "classicCompatible");
  assert.strictEqual(snakeToCamel("ignore_missing"), "ignoreMissing");
  assert.strictEqual(
    snakeToCamel("sql_date_and_time_time_zone"),
    "sqlDateAndTimeTimeZone"
  );
  const ftl = new Set(namedParamsWithAliases("ftl"));
  assert.ok(ftl.has("stripWhitespace"));
  assert.ok(ftl.has("outputFormat"));
  assert.ok(ftl.has("autoEsc"));
  const setting = new Set(namedParamsWithAliases("setting"));
  assert.ok(setting.has("numberFormat"));
  assert.ok(setting.has("classicCompatible"));
  assert.ok(setting.has("sqlDateAndTimeTimeZone"));
  const inc = new Set(namedParamsWithAliases("include"));
  assert.ok(inc.has("ignoreMissing"));
});

test("0026 AC5: <#ftl strip_whitespace= → value kind (snake)", () => {
  const ctx = completionContext("<#ftl strip_whitespace=");
  assert.strictEqual(ctx.type, "directiveParam");
  if (ctx.type === "directiveParam") {
    assert.strictEqual(ctx.kind, "value");
    assert.strictEqual(ctx.paramName, "strip_whitespace");
    assert.strictEqual(ctx.directive, "ftl");
  }
});

test("0026 AC6: <#ftl stripWhitespace= → value kind (camel)", () => {
  const ctx = completionContext("<#ftl stripWhitespace=");
  assert.strictEqual(ctx.type, "directiveParam");
  if (ctx.type === "directiveParam") {
    assert.strictEqual(ctx.kind, "value");
    assert.strictEqual(ctx.paramName, "stripWhitespace");
  }
});

test("0026 AC7: <#include parse= → value; completions true/false", () => {
  const ctx = completionContext('<#include "a.ftl" parse=');
  assert.strictEqual(ctx.type, "directiveParam");
  if (ctx.type === "directiveParam") {
    assert.strictEqual(ctx.kind, "value");
    assert.strictEqual(ctx.paramName, "parse");
  }
  const items = buildCompletions(ctx);
  const labels = items.map((c) => c.label);
  assert.ok(labels.includes("true"));
  assert.ok(labels.includes("false"));
  assert.ok(items.every((c) => c.kind === "constant"));
});

test("0026 AC8: <#setting locale= is not boolean value context", () => {
  // 0032a: locale= is a locale value catalog (not boolean true/false).
  const ctx = completionContext("<#setting locale=");
  assert.strictEqual(ctx.type, "directiveParam");
  if (ctx.type === "directiveParam") {
    assert.strictEqual(ctx.kind, "value");
    assert.strictEqual(ctx.paramName, "locale");
  }
  const items = buildCompletions(ctx);
  const labels = items.map((c) => c.label);
  assert.ok(labels.includes("en_US"));
  assert.ok(!labels.includes("true") && !labels.includes("false"));
  assert.ok(items.every((c) => c.detail === "locale"));
  assert.ok(!items.some((c) => c.label === "locale" && c.kind === "property"));
});

test("0026 AC9: strip_whitespace=t → value, prefix t → true only", () => {
  const ctx = completionContext("<#ftl strip_whitespace=t");
  assert.strictEqual(ctx.type, "directiveParam");
  if (ctx.type === "directiveParam") {
    assert.strictEqual(ctx.kind, "value");
    assert.strictEqual(ctx.prefix, "t");
  }
  const items = buildCompletions(ctx);
  const labels = items.map((c) => c.label);
  assert.ok(labels.includes("true"));
  assert.ok(!labels.includes("false"));
});

test("0026 AC10: inside string after = still not param/value context", () => {
  const ctx = completionContext('<#ftl encoding="UT');
  assert.notStrictEqual(ctx.type, "directiveParam");
});

test("0026 AC11: name-slot strip_ and stripW offer snake/camel", () => {
  const snake = buildCompletions({
    type: "directiveParam",
    directive: "ftl",
    prefix: "strip_",
    kind: "named",
  });
  const snakeLabels = snake.map((c) => c.label);
  assert.ok(snakeLabels.includes("strip_whitespace"));
  assert.ok(snakeLabels.includes("strip_text"));
  const camel = buildCompletions({
    type: "directiveParam",
    directive: "ftl",
    prefix: "stripW",
    kind: "named",
  });
  assert.ok(camel.some((c) => c.label === "stripWhitespace"));
  const ctx = completionContext("<#ftl ");
  assert.strictEqual(ctx.type, "directiveParam");
});

test("0026 AC12: isBooleanDirectiveParam covers both forms", () => {
  assert.ok(isBooleanDirectiveParam("ftl", "strip_whitespace"));
  assert.ok(isBooleanDirectiveParam("ftl", "stripWhitespace"));
  assert.ok(isBooleanDirectiveParam("include", "ignoreMissing"));
  assert.ok(!isBooleanDirectiveParam("setting", "locale"));
  assert.ok(!isBooleanDirectiveParam("ftl", "encoding"));
});

// --- 0027 directive param one-liner docs ---

test("0027 AC1: #ftl strip_whitespace name completion has documentation", () => {
  const items = buildCompletions({
    type: "directiveParam",
    directive: "ftl",
    prefix: "strip_",
    kind: "named",
  });
  const hit = items.find((c) => c.label === "strip_whitespace");
  assert.ok(hit, "expected strip_whitespace");
  assert.ok(
    hit!.documentation && hit!.documentation.length > 0,
    "expected non-empty documentation"
  );
  assert.strictEqual(hit!.documentation, DIRECTIVE_PARAM_DOCS.strip_whitespace);
  assert.strictEqual(hit!.detail, "ftl parameter");
});

test("0027 AC2: camel label resolves to same one-liner as snake twin", () => {
  const snakeDoc = paramDocumentation("strip_whitespace");
  const camelDoc = paramDocumentation("stripWhitespace");
  assert.ok(snakeDoc);
  assert.strictEqual(camelDoc, snakeDoc);
  assert.strictEqual(camelToSnakeParam("stripWhitespace"), "strip_whitespace");

  const camelItems = buildCompletions({
    type: "directiveParam",
    directive: "ftl",
    prefix: "stripW",
    kind: "named",
  });
  const camelHit = camelItems.find((c) => c.label === "stripWhitespace");
  assert.ok(camelHit);
  assert.strictEqual(camelHit!.documentation, snakeDoc);
});

test("0027 AC3: #setting locale and #include ignore_missing have docs", () => {
  const localeItems = buildCompletions({
    type: "directiveParam",
    directive: "setting",
    prefix: "loc",
    kind: "named",
  });
  const locale = localeItems.find((c) => c.label === "locale");
  assert.ok(locale?.documentation);
  assert.strictEqual(locale!.documentation, DIRECTIVE_PARAM_DOCS.locale);

  const incItems = buildCompletions({
    type: "directiveParam",
    directive: "include",
    prefix: "ign",
    kind: "named",
  });
  const ign = incItems.find((c) => c.label === "ignore_missing");
  assert.ok(ign?.documentation);
  assert.strictEqual(ign!.documentation, DIRECTIVE_PARAM_DOCS.ignore_missing);
});

test("0027 AC4: clause completions as/in/using include documentation", () => {
  const asItems = buildCompletions({
    type: "directiveParam",
    directive: "list",
    prefix: "a",
    kind: "clause",
  });
  const asHit = asItems.find((c) => c.label === "as");
  assert.ok(asHit?.documentation);
  assert.strictEqual(asHit!.documentation, DIRECTIVE_PARAM_DOCS.as);

  const inItems = buildCompletions({
    type: "directiveParam",
    directive: "assign",
    prefix: "i",
    kind: "clause",
  });
  assert.ok(inItems.find((c) => c.label === "in")?.documentation);

  const usingItems = buildCompletions({
    type: "directiveParam",
    directive: "visit",
    prefix: "u",
    kind: "clause",
  });
  assert.ok(usingItems.find((c) => c.label === "using")?.documentation);
});

test("0027 AC5: value-slot true/false have no param docs; name keeps detail", () => {
  const values = buildCompletions({
    type: "directiveParam",
    directive: "ftl",
    prefix: "",
    kind: "value",
    paramName: "strip_whitespace",
  });
  assert.ok(values.some((c) => c.label === "true"));
  assert.ok(values.every((c) => c.documentation === undefined));
  assert.ok(values.every((c) => c.detail === "boolean"));

  const named = buildCompletions({
    type: "directiveParam",
    directive: "ftl",
    prefix: "enc",
    kind: "named",
  });
  const enc = named.find((c) => c.label === "encoding");
  assert.ok(enc);
  assert.strictEqual(enc!.detail, "ftl parameter");
  assert.ok(enc!.documentation);
});

// --- 0032a practical value catalogs ---

test("0032a AC5: locale= offers locale catalog", () => {
  const ctx = completionContext("<#setting locale=");
  assert.strictEqual(ctx.type, "directiveParam");
  if (ctx.type === "directiveParam") {
    assert.strictEqual(ctx.kind, "value");
  }
  const items = buildCompletions(ctx);
  for (const loc of ["en_US", "ja_JP", "ko_KR"]) {
    assert.ok(items.some((c) => c.label === loc), `missing ${loc}`);
  }
  assert.ok(
    LOCALE_VALUE_CATALOG.length >= 8 && LOCALE_VALUE_CATALOG.length <= 32,
    "locale list should stay a small static set"
  );
});

test("0032a AC6: encoding= / charset settings offer charset catalog", () => {
  const enc = completionContext("<#ftl encoding=");
  assert.strictEqual(enc.type, "directiveParam");
  const encItems = buildCompletions(enc);
  assert.ok(encItems.some((c) => c.label === "UTF-8"));
  assert.ok(encItems.every((c) => c.detail === "charset"));

  const url = completionContext("<#setting url_escaping_charset=");
  assert.strictEqual(url.type, "directiveParam");
  const urlItems = buildCompletions(url);
  assert.ok(urlItems.some((c) => c.label === "UTF-8"));

  const camel = completionContext("<#ftl encoding=");
  assert.ok(directiveParamValueCatalog("ftl", "encoding"));
  assert.ok(directiveParamValueCatalog("include", "encoding"));
  assert.deepStrictEqual(
    directiveParamValueCatalog("ftl", "encoding")!.values,
    CHARSET_VALUE_CATALOG
  );
  void camel;
});

test("0032a AC7: *_format and output_format value catalogs", () => {
  const num = completionContext("<#setting number_format=");
  assert.strictEqual(num.type, "directiveParam");
  const numItems = buildCompletions(num);
  assert.ok(numItems.some((c) => c.label === "#,##0"));
  assert.ok(numItems.every((c) => c.detail === "format"));
  assert.deepStrictEqual(
    directiveParamValueCatalog("setting", "numberFormat")!.values,
    FORMAT_VALUE_CATALOG
  );

  const out = completionContext("<#ftl output_format=");
  assert.strictEqual(out.type, "directiveParam");
  const outItems = buildCompletions(out);
  assert.ok(outItems.some((c) => c.label === "HTML"));
  assert.ok(outItems.some((c) => c.label === "plainText"));
  assert.deepStrictEqual(
    directiveParamValueCatalog("ftl", "outputFormat")!.values,
    OUTPUT_FORMAT_VALUE_CATALOG
  );
});

test("0032a AC8: boolean value slot unchanged (not mixed with locale/charset)", () => {
  const ctx = completionContext("<#ftl strip_whitespace=");
  assert.strictEqual(ctx.type, "directiveParam");
  const items = buildCompletions(ctx);
  const labels = items.map((c) => c.label);
  assert.deepStrictEqual(labels.sort(), ["false", "true"]);
  assert.ok(items.every((c) => c.detail === "boolean"));
  assert.ok(!labels.includes("en_US"));
  assert.ok(!labels.includes("UTF-8"));
});

test("0032a AC9: inside quoted string after = still not value context", () => {
  assert.notStrictEqual(
    completionContext('<#ftl encoding="UT').type,
    "directiveParam"
  );
  assert.notStrictEqual(
    completionContext('<#setting locale="en').type,
    "directiveParam"
  );
});

test("0032a AC10: only ftl/setting/include have fixed name= catalogs", () => {
  const namedKeys = Object.keys(DIRECTIVE_NAMED_PARAMS).sort();
  assert.deepStrictEqual(namedKeys, ["ftl", "include", "setting"]);
  // No other-directive unknown-param diagnostics required.
});

console.log("All catalog unit tests passed.");
