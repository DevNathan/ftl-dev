import * as assert from "assert";
import {
  applyCloseEdit,
  autoCloseAfterSlash,
  findUnclosedDirectiveName,
} from "./closeTag";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

test("self-close: <#assign / → insert >", () => {
  const text = "<#assign /";
  const edit = autoCloseAfterSlash(text, text.length);
  assert.ok(edit);
  assert.strictEqual(edit!.insertText, ">");
  assert.strictEqual(applyCloseEdit(text, edit!), "<#assign />");
});

test("no auto >: when / typed before existing > in <#assign  >", () => {
  const text = "<#assign  />";
  const offset = "<#assign  /".length;
  const edit = autoCloseAfterSlash(text, offset);
  assert.strictEqual(edit, undefined);
});

test("no auto ]: when / typed before existing ]", () => {
  const text = "[#assign /]";
  const offset = "[#assign /".length;
  const edit = autoCloseAfterSlash(text, offset);
  assert.strictEqual(edit, undefined);
});

test("self-close: [#assign / → insert ]", () => {
  const text = "[#assign /";
  const edit = autoCloseAfterSlash(text, text.length);
  assert.ok(edit);
  assert.strictEqual(edit!.insertText, "]");
});

test("close tag: </ after <#assign> → </#assign>", () => {
  const text = "<#assign>\n</";
  const edit = autoCloseAfterSlash(text, text.length);
  assert.ok(edit?.replace);
  assert.strictEqual(edit!.replace!.text, "</#assign>");
  assert.strictEqual(applyCloseEdit(text, edit!), "<#assign>\n</#assign>");
});

test("close tag: nested uses innermost", () => {
  const text = "<#if x>\n<#list y as z>\n</";
  const edit = autoCloseAfterSlash(text, text.length);
  assert.strictEqual(applyCloseEdit(text, edit!), "<#if x>\n<#list y as z>\n</#list>");
});

test("close tag: self-closed assign not on stack", () => {
  const text = "<#assign x=1/>\n<#macro m>\n</";
  const edit = autoCloseAfterSlash(text, text.length);
  assert.strictEqual(
    applyCloseEdit(text, edit!),
    "<#assign x=1/>\n<#macro m>\n</#macro>"
  );
});

test("close tag: short <#assign x=1> not on stack", () => {
  const text = '<#assign x = 1>\n<#macro m>\n</';
  const edit = autoCloseAfterSlash(text, text.length);
  assert.strictEqual(
    applyCloseEdit(text, edit!),
    '<#assign x = 1>\n<#macro m>\n</#macro>'
  );
});

test("close tag: indent aligns with opener (no #if></)", () => {
  const text = "<#if x>\n  body\n    </";
  const edit = autoCloseAfterSlash(text, text.length);
  const out = applyCloseEdit(text, edit!);
  assert.strictEqual(out, "<#if x>\n  body\n</#if>");
  assert.ok(!out.includes("#if></"));
});

test("close tag: nested indent uses inner opener", () => {
  const text = "<#if a>\n  <#list xs as x>\n    item\n    </";
  const edit = autoCloseAfterSlash(text, text.length);
  assert.strictEqual(
    applyCloseEdit(text, edit!),
    "<#if a>\n  <#list xs as x>\n    item\n  </#list>"
  );
});

test("same-line <#if></ → <#if></#if>", () => {
  const text = "<#if x></";
  const edit = autoCloseAfterSlash(text, text.length);
  assert.strictEqual(applyCloseEdit(text, edit!), "<#if x></#if>");
});

test("findUnclosedDirectiveName", () => {
  assert.strictEqual(
    findUnclosedDirectiveName("<#if a><#assign b>", "<"),
    "#assign"
  );
  assert.strictEqual(
    findUnclosedDirectiveName("<#if a></#if>", "<"),
    undefined
  );
});

console.log("All closeTag unit tests passed.");
