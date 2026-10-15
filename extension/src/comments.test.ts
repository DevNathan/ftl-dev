import * as assert from "assert";
import {
  findCommentDelimiterIssues,
  findFtlCommentEnd,
  findUnclosedCommentOpens,
  ftlCommentRanges,
  skipFtlComment,
} from "./comments";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

test("simple comment end", () => {
  const text = "<#-- hi -->code";
  assert.strictEqual(findFtlCommentEnd(text, 0), "<#-- hi -->".length);
});

test("nested angle comments", () => {
  const text = "<#--\n<#-- inner -->\n<#assign x = 1>\n-->";
  const end = findFtlCommentEnd(text, 0);
  assert.strictEqual(end, text.length);
  assert.deepStrictEqual(ftlCommentRanges(text), [[0, text.length]]);
});

test("nested square comments", () => {
  const text = "[#-- outer [#-- inner --] still --]";
  assert.strictEqual(findFtlCommentEnd(text, 0), text.length);
});

test("unclosed comment runs to EOF for skip/ranges", () => {
  const text = "<#-- oops\n<#assign x = 1>";
  assert.strictEqual(findFtlCommentEnd(text, 0), -1);
  assert.strictEqual(skipFtlComment(text, 0), text.length);
  assert.deepStrictEqual(ftlCommentRanges(text), [[0, text.length]]);
  assert.deepStrictEqual(findUnclosedCommentOpens(text), [0]);
});

test("orphan closer is reported", () => {
  const text = "hello --> world";
  const issues = findCommentDelimiterIssues(text);
  assert.deepStrictEqual(issues, [
    { offset: text.indexOf("-->"), angle: true, kind: "orphan-close" },
  ]);
});

test("orphan square closer is reported", () => {
  const text = "x --] y";
  const issues = findCommentDelimiterIssues(text);
  assert.deepStrictEqual(issues, [
    { offset: text.indexOf("--]"), angle: false, kind: "orphan-close" },
  ]);
});

test("HTML comment closer is not an FTL orphan", () => {
  const text = "<!-- html -->";
  assert.deepStrictEqual(findCommentDelimiterIssues(text), []);
});

test("matched nested comment has no delimiter issues", () => {
  const text = "<#--\n<#-- inner -->\n-->";
  assert.deepStrictEqual(findCommentDelimiterIssues(text), []);
});

test("sequential comments are separate ranges", () => {
  const text = "<#-- a --><#-- b -->";
  const ranges = ftlCommentRanges(text);
  assert.strictEqual(ranges.length, 2);
  assert.strictEqual(text.slice(ranges[0]![0], ranges[0]![1]), "<#-- a -->");
  assert.strictEqual(text.slice(ranges[1]![0], ranges[1]![1]), "<#-- b -->");
});

test("apostrophe / quote inside FTL comment does not desync delimiter scan", () => {
  for (const text of [
    "<#-- don't -->",
    '<#-- say "hi -->',
    "[#-- don't --]",
    "<#assign x = 1 <#-- it's --> />\n<p>after</p>",
    "<#-- it's --> \"s\" <#-- 'x' -->",
  ]) {
    assert.deepStrictEqual(findCommentDelimiterIssues(text), [], text);
  }
});

test("unclosed and orphan are still reported around quote-bearing comments", () => {
  const unclosed = "<#-- don't";
  assert.deepStrictEqual(findCommentDelimiterIssues(unclosed), [
    { offset: 0, angle: true, kind: "unclosed-open" },
  ]);
  const text = "<#-- don't --> -->";
  assert.deepStrictEqual(findCommentDelimiterIssues(text), [
    { offset: text.lastIndexOf("-->"), angle: true, kind: "orphan-close" },
  ]);
  const sq = "x [#-- it's";
  assert.deepStrictEqual(findCommentDelimiterIssues(sq), [
    { offset: 2, angle: false, kind: "unclosed-open" },
  ]);
});

console.log("All comments unit tests passed.");
