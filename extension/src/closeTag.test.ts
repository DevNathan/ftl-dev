import * as assert from "assert";
import {
  applyCloseEdit,
  autoCloseAfterSlash,
  autoClosePairOnCloser,
  autoClosePairOnEnter,
  findUnclosedDirectiveName,
  findUnclosedDirectiveOpen,
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

test("no self-close when / is division after assign expression", () => {
  const text = "<#local idxCursor = startBit /";
  assert.strictEqual(autoCloseAfterSlash(text, text.length), undefined);
});

test("no self-close when / follows number in expression", () => {
  const text = "<#assign x = 10/";
  assert.strictEqual(autoCloseAfterSlash(text, text.length), undefined);
});

test("self-close still works after include string", () => {
  const text = '<#include "lib.ftl" /';
  const edit = autoCloseAfterSlash(text, text.length);
  assert.ok(edit);
  assert.strictEqual(applyCloseEdit(text, edit!), '<#include "lib.ftl" />');
});

test("no self-close when / is inside a string (path ./)", () => {
  const text = '<#assign whiteListSql = ob.loadText("./';
  assert.strictEqual(autoCloseAfterSlash(text, text.length), undefined);
});

test("no self-close when / is inside a string mid-path", () => {
  const text = '<#assign x = loadText("a/b/';
  assert.strictEqual(autoCloseAfterSlash(text, text.length), undefined);
});

test("no self-close for ../ outside string after =", () => {
  const text = "<#assign x = ../";
  assert.strictEqual(autoCloseAfterSlash(text, text.length), undefined);
});

test("no self-close inside unclosed paren call", () => {
  const text = "<#assign x = foo(/";
  assert.strictEqual(autoCloseAfterSlash(text, text.length), undefined);
});

test("no self-close after assign expression without closed-string trailer", () => {
  const text = "<#assign x = 1 /";
  assert.strictEqual(autoCloseAfterSlash(text, text.length), undefined);
});

test("self-close after assign to closed string", () => {
  const text = '<#assign x = "a" /';
  const edit = autoCloseAfterSlash(text, text.length);
  assert.ok(edit);
  assert.strictEqual(applyCloseEdit(text, edit!), '<#assign x = "a" />');
});

test("no self-close for URL-like string https://", () => {
  const text = '<#assign u = "https://';
  assert.strictEqual(autoCloseAfterSlash(text, text.length), undefined);
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

test("Enter after <#if> inserts </#if> on next line", () => {
  const text = "<#if x>\n  ";
  const edit = autoClosePairOnEnter(text, text.length);
  assert.ok(edit?.replace);
  assert.strictEqual(edit!.replace!.text, "  \n</#if>");
  const out = applyCloseEdit(text, edit!);
  assert.strictEqual(out, "<#if x>\n  \n</#if>");
  assert.strictEqual(edit!.cursorAt, "<#if x>\n  ".length);
});

test("Enter after bare <#assign> indents body and closes", () => {
  const text = "<#assign>\n";
  const edit = autoClosePairOnEnter(text, text.length, "  ");
  assert.ok(edit?.replace);
  assert.strictEqual(
    applyCloseEdit(text, edit!),
    "<#assign>\n  \n</#assign>"
  );
  assert.strictEqual(edit!.cursorAt, "<#assign>\n  ".length);
});

test("Enter after <@macro> inserts </@macro>", () => {
  const text = "<@banner text=\"Hi\">\n  ";
  const edit = autoClosePairOnEnter(text, text.length);
  assert.strictEqual(
    applyCloseEdit(text, edit!),
    "<@banner text=\"Hi\">\n  \n</@banner>"
  );
});

test("Enter after /> self-close does nothing", () => {
  const text = "<@banner text=\"Hi\"/>\n  ";
  assert.strictEqual(autoClosePairOnEnter(text, text.length), undefined);
});

test("Enter after <#else> does nothing", () => {
  const text = "<#if x>\n<#else>\n  ";
  assert.strictEqual(autoClosePairOnEnter(text, text.length), undefined);
});

test("Enter after short assign does nothing", () => {
  const text = '<#assign x = 1>\n  ';
  assert.strictEqual(autoClosePairOnEnter(text, text.length), undefined);
});

test("Enter after #include does nothing", () => {
  const text = '<#include "a.ftl">\n  ';
  assert.strictEqual(autoClosePairOnEnter(text, text.length), undefined);
});

test("Enter when close already on next line does nothing", () => {
  const text = "<#if x>\n  \n</#if>";
  const cursor = "<#if x>\n  ".length;
  assert.strictEqual(autoClosePairOnEnter(text, cursor), undefined);
});

test("Enter inside already-closed if with body does not double-close", () => {
  // Cursor on blank line between `<#if>` and body; `</#if>` already exists below.
  const text = "<#if>\n\t\n\t<#assign let=10/>\n</#if>";
  const cursor = "<#if>\n\t".length;
  assert.strictEqual(autoClosePairOnEnter(text, cursor, "\t"), undefined);
});

test("Enter after [#list] inserts [/#list]", () => {
  const text = "[#list xs as x]\n  ";
  const edit = autoClosePairOnEnter(text, text.length);
  assert.strictEqual(
    applyCloseEdit(text, edit!),
    "[#list xs as x]\n  \n[/#list]"
  );
});

test("Enter after capture <#assign name> inserts </#assign>", () => {
  const text = "<#assign note>\n  ";
  const edit = autoClosePairOnEnter(text, text.length);
  assert.strictEqual(
    applyCloseEdit(text, edit!),
    "<#assign note>\n  \n</#assign>"
  );
});

test("Enter uses tab indent unit when provided", () => {
  const text = "<#if x>\n";
  const edit = autoClosePairOnEnter(text, text.length, "\t");
  assert.strictEqual(applyCloseEdit(text, edit!), "<#if x>\n\t\n</#if>");
});

test("</ after #if/#else does not invent </#else>", () => {
  const text =
    "<#if test == \"test\">\n\n<#elseif test == \"test2\">\n\n<#else>\n  do nothing\n</#if>\n\n<html>\n</";
  const edit = autoCloseAfterSlash(text, text.length);
  assert.ok(edit?.replace);
  assert.strictEqual(edit!.replace!.text.trim(), "</html>");
  assert.ok(!applyCloseEdit(text, edit!).includes("</#else>"));
});

test("</ closes HTML tag", () => {
  const text = "<div class=\"x\">\n</";
  const edit = autoCloseAfterSlash(text, text.length);
  assert.strictEqual(applyCloseEdit(text, edit!), "<div class=\"x\">\n</div>");
});

test("Enter after <html> inserts </html> with indent", () => {
  const text = "<html>\n";
  const edit = autoClosePairOnEnter(text, text.length, "  ");
  assert.strictEqual(applyCloseEdit(text, edit!), "<html>\n  \n</html>");
});

test("Enter after <br> void does nothing", () => {
  const text = "<br>\n";
  assert.strictEqual(autoClosePairOnEnter(text, text.length), undefined);
});

test("findUnclosedOpen ignores mid-block else", () => {
  const before =
    "<#if x>\n<#else>\n  y\n</#if>\n<html>";
  const open = findUnclosedDirectiveOpen(before, "<");
  assert.ok(open);
  assert.strictEqual(open!.name, "html");
  assert.strictEqual(open!.kind, "html");
});

test("typing > on <#if> inserts </#if> after caret", () => {
  const text = "<#if x>";
  const edit = autoClosePairOnCloser(text, text.length);
  assert.ok(edit?.insertText);
  assert.strictEqual(edit!.insertText, "</#if>");
  assert.strictEqual(edit!.cursorAt, text.length);
  assert.strictEqual(applyCloseEdit(text, edit!), "<#if x></#if>");
});

test("typing > on <html> inserts </html> after caret", () => {
  const text = "<html>";
  const edit = autoClosePairOnCloser(text, text.length);
  assert.strictEqual(applyCloseEdit(text, edit!), "<html></html>");
});

test("typing > on <#else> does not pair", () => {
  const text = "<#if x></#if>\n<#else>";
  // mid-block alone
  assert.strictEqual(
    autoClosePairOnCloser("<#else>", "<#else>".length),
    undefined
  );
});

test("typing > on /> does not pair", () => {
  assert.strictEqual(
    autoClosePairOnCloser("<@banner/>", "<@banner/>".length),
    undefined
  );
});

test("typing > when already paired does nothing", () => {
  const text = "<#if x></#if>";
  // caret between — simulate completing open when close already there:
  const openOnly = "<#if x>";
  const withClose = openOnly + "</#if>";
  assert.strictEqual(
    autoClosePairOnCloser(withClose, openOnly.length),
    undefined
  );
});

test("typing > inside (x > y) does not pair early", () => {
  const text = "<#if (x >";
  assert.strictEqual(autoClosePairOnCloser(text, text.length), undefined);
});

test("</ after assign inside unclosed function closes assign not function", () => {
  const text = "<#function test cache\n\n  <#assign>\n</";
  const edit = autoCloseAfterSlash(text, text.length);
  assert.ok(edit);
  const out = applyCloseEdit(text, edit!);
  assert.ok(out.includes("</#assign>"), out);
  assert.ok(!out.includes("</#function>"), out);
});

test("</ after assign inside unclosed macro closes assign not macro", () => {
  const text = "<#macro m\n  <#assign>\n</";
  const edit = autoCloseAfterSlash(text, text.length);
  const out = applyCloseEdit(text, edit!);
  assert.ok(out.includes("</#assign>"), out);
  assert.ok(!out.includes("</#macro>"), out);
});

test("</ after local inside unclosed list closes local not list", () => {
  const text = "<#list items as i\n  <#local x>\n</";
  const edit = autoCloseAfterSlash(text, text.length);
  const out = applyCloseEdit(text, edit!);
  assert.ok(out.includes("</#local>"), out);
  assert.ok(!out.includes("</#list>"), out);
});

test("</ after span inside unclosed div closes span not div", () => {
  const text = "<div\n  <span>\n</";
  const edit = autoCloseAfterSlash(text, text.length);
  const out = applyCloseEdit(text, edit!);
  assert.ok(out.includes("</span>"), out);
  assert.ok(!out.includes("</div>"), out);
});

test("typing > on assign inside unclosed function does not insert </#function>", () => {
  const text = "<#function test cache\n\n  <#assign>";
  const edit = autoClosePairOnCloser(text, text.length);
  assert.ok(edit);
  const out = applyCloseEdit(text, edit!);
  assert.ok(out.includes("</#assign>"), out);
  assert.ok(!out.includes("</#function>"), out);
});

test("self-close / on nested assign does not close outer function", () => {
  const text = "<#function test cache\n\n  <#assign /";
  const edit = autoCloseAfterSlash(text, text.length);
  assert.ok(edit);
  assert.strictEqual(edit!.insertText, ">");
  const out = applyCloseEdit(text, edit!);
  assert.ok(out.endsWith("<#assign />"), out);
  assert.ok(!out.includes("function />"), out);
});

test("square: </ after assign inside unclosed function closes assign", () => {
  const text = "[#function test cache\n\n  [#assign]\n[/";
  const edit = autoCloseAfterSlash(text, text.length);
  assert.ok(edit);
  const out = applyCloseEdit(text, edit!);
  assert.ok(out.includes("[/#assign]"), out);
  assert.ok(!out.includes("[/#function]"), out);
});

test("multiline function without nested tags still pairs on >", () => {
  const text = "<#function test\n  a\n  b>";
  const edit = autoClosePairOnCloser(text, text.length);
  assert.ok(edit);
  assert.strictEqual(edit!.insertText, "</#function>");
});

test("<#if x < y> comparison does not abort tag scan", () => {
  const text = "<#if x < y>";
  const edit = autoClosePairOnCloser(text, text.length);
  assert.ok(edit);
  assert.strictEqual(edit!.insertText, "</#if>");
});

console.log("All closeTag unit tests passed.");
