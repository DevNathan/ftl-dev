import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import {
  DECREASE_INDENT_PATTERN,
  INCREASE_INDENT_PATTERN,
  lineDecreasesIndent,
  lineIncreasesIndent,
} from "./indentRules";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

test("if increases; body close decreases", () => {
  assert.ok(lineIncreasesIndent("<#if x>"));
  assert.ok(lineIncreasesIndent("  <#if flag>"));
  assert.ok(lineDecreasesIndent("</#if>"));
  assert.ok(lineDecreasesIndent("  </#if>"));
});

test("elseif/else decrease themselves and increase for body", () => {
  assert.ok(lineDecreasesIndent("<#elseif y>"));
  assert.ok(lineDecreasesIndent("<#else>"));
  assert.ok(lineIncreasesIndent("<#elseif y>"));
  assert.ok(lineIncreasesIndent("<#else>"));
});

test("short assign does not change indent", () => {
  assert.ok(!lineIncreasesIndent('<#assign note = "Text">'));
  assert.ok(!lineIncreasesIndent("<#assign x = 1>"));
  assert.ok(!lineDecreasesIndent('<#assign note = "Text">'));
});

test("capture assign increases; close decreases", () => {
  assert.ok(lineIncreasesIndent("<#assign note>"));
  assert.ok(lineDecreasesIndent("</#assign>"));
});

test("include/return/break do not increase", () => {
  assert.ok(!lineIncreasesIndent('<#include "x.ftl">'));
  assert.ok(!lineIncreasesIndent("<#return 1>"));
  assert.ok(!lineIncreasesIndent("<#break>"));
});

test("list/macro/function increase", () => {
  assert.ok(lineIncreasesIndent("<#list xs as x>"));
  assert.ok(lineIncreasesIndent("<#macro m>"));
  assert.ok(lineIncreasesIndent("<#function f>"));
});

test("user macro open increases; self-close does not", () => {
  assert.ok(lineIncreasesIndent("<@banner text=\"Hi\">"));
  assert.ok(!lineIncreasesIndent('<@banner text="Hi"/>'));
  assert.ok(lineDecreasesIndent("</@banner>"));
});

test("square-bracket forms", () => {
  assert.ok(lineIncreasesIndent("[#if x]"));
  assert.ok(lineDecreasesIndent("[#else]"));
  assert.ok(lineIncreasesIndent("[#else]"));
  assert.ok(lineDecreasesIndent("[/#if]"));
});

test("language-configuration.json stays in sync", () => {
  const cfgPath = path.join(__dirname, "..", "language-configuration.json");
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8")) as {
    indentationRules: {
      increaseIndentPattern: string;
      decreaseIndentPattern: string;
    };
  };
  assert.strictEqual(
    cfg.indentationRules.increaseIndentPattern,
    INCREASE_INDENT_PATTERN
  );
  assert.strictEqual(
    cfg.indentationRules.decreaseIndentPattern,
    DECREASE_INDENT_PATTERN
  );
});

console.log("All indentRules unit tests passed.");
