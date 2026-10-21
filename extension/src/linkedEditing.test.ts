import * as assert from "assert";
import { ftlCommentRanges } from "./comments";
import {
  FTL_TAG_NAME_WORD_PATTERN,
  linkedTagNameRanges,
} from "./linkedEditing";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

/** Strip `|` (cursor) and `«…»` (expected ranges) markers. */
function parseCase(src: string): {
  text: string;
  offset: number;
  expected: Array<[number, number]>;
} {
  let text = "";
  let offset = -1;
  const expected: Array<[number, number]> = [];
  let open = -1;
  for (const ch of src) {
    if (ch === "|") {
      offset = text.length;
    } else if (ch === "«") {
      open = text.length;
    } else if (ch === "»") {
      expected.push([open, text.length]);
      open = -1;
    } else {
      text += ch;
    }
  }
  assert.ok(offset >= 0, `no cursor in ${src}`);
  return { text, offset, expected };
}

function check(src: string): void {
  const { text, offset, expected } = parseCase(src);
  const got = linkedTagNameRanges(text, offset);
  if (expected.length === 0) {
    assert.strictEqual(got, undefined, `expected undefined, got ${JSON.stringify(got?.ranges)}`);
    return;
  }
  assert.ok(got, "expected ranges, got undefined");
  assert.deepStrictEqual(got!.ranges, expected);
  assert.strictEqual(got!.wordPattern, FTL_TAG_NAME_WORD_PATTERN);
  // Same result with precomputed comments (adapter path).
  const viaOpts = linkedTagNameRanges(text, offset, {
    comments: ftlCommentRanges(text),
  });
  assert.deepStrictEqual(viaOpts?.ranges, expected);
}

const CASES: Array<[string, string]> = [
  ["P1", "<#«func|tion» name>\n  dothis\n</#«function»>"],
  ["P2", "<#«function» name>\n  dothis\n</#«func|tion»>"],
  ["P3", "<#«function» name></#«|function»>"],
  ["P4", "<#«function|» name></#«function»>"],
  ["P5", "<#«|function» name></#«function»>"],
  ["P6", "<#«i|f» x>a<#else>b</#«if»>"],
  ["P7", "<#«l|ist» xs as x>${x}</#«list»>"],
  // Table marks list too; the expectation is the items pair only.
  ["P8", "<#list xs><#«it|ems» as x>${x}</#«items»></#list>"],
  ["P9", "<#«att|empt»>a<#recover>b</#«attempt»>"],
  ["P10", "<#«sw|itch» x><#case 1>a<#break></#«switch»>"],
  ["P11", "<#«ass|ign» x>body</#«assign»>"],
  ["P12", "<#«lo|cal» x>body</#«local»>"],
  ["P13", '<@«b|ox» title="x">body</@«box»>'],
  ["P14", "<@«ns.b|ox»>x</@«ns.box»>"],
  ["P15", "[#«func|tion» f]\n[/#«function»]"],
  ["P16", "[@«b|ox»]x[/@«box»]"],
  ["P17", "<#«compr|ess»>x</#«compress»>"],
  ["P18", '<#«outputf|ormat» "HTML">x</#«outputformat»>'],
  ["P19", "<#«mac|» m></#«mac»>"],
  ["N1", "<#«i|f» a><#if b></#if></#«if»>"],
  ["N2", "<#if a><#«i|f» b></#«if»></#if>"],
  ["N3", "<#if a><#«if» b></#«i|f»></#if>"],
  ["N4", "<#macro m><#if x><#ne|sted/></#if></#macro>"],
  ["N5", "<#«fun|ction» f><@box>x</@box></#«function»>"],
  ["N6", "<@«a|»><@a>x</@></@«a»>"],
  ["N7", "<@a><@a>x</@|></@a>"],
  ["N8", "<#list xs as x>${x}<#se|p>, </#sep></#list>"],
  ["X1", "<@b|ox/>"],
  ["X1b", "<@b|ox />"],
  ["X2", "<@b|ox /></@box>"],
  ["X3", "<#ass|ign x = 1></#assign>"],
  ["X4", "<#if x>a<#el|se>b</#if>"],
  ["X5", "<#if x>a<#else|if y>b</#if>"],
  ["X6", "<#fun|ction f>"],
  ["X7", "</#fun|ction>"],
  ["X8", "<#i|f x>a[/#if]"],
  ["X9", "<#i|f x>a</#list>"],
  ["X10", "<#if x|>a</#if>"],
  ["X10b", "<|#if x>a</#if>"],
  ["X10c", "<#if x>a|</#if>"],
  ["X11", "<di|v><#if x></#if></div>"],
  // superseded by plan 0036: empty `<#>` + `</#>` now link (was undefined).
  ["X12", "<#«|»>a</#«»>"],
  ["X13", "<#fun|ction f\n<#if x></#if>"],
  ["C1", "<#-- <#i|f x> -->a</#if>"],
  ["C2", "<#«i|f» x><#-- </#if> -->a</#«if»>"],
  ["C3", '<#«i|f» x == ">">a</#«if»>'],
  ["C4", '<#«i|f» x>${"</#if>"}</#«if»>'],
  ["C5", "<p>Don't</p><#«i|f» x>a</#«if»>"],
  ["C6", "<#«nopa|rse»><#if x></#«noparse»>"],
  ["C7", "<#noparse><#i|f x></#if></#noparse>"],
  ["C8", '<#«ass|ign» s>"</#«assign»>" is text</#assign>'],
  ["C9", "[#-- [#i|f x] --]a[/#if]"],
];

for (const [id, src] of CASES) {
  test(`${id}: ${JSON.stringify(src)}`, () => check(src));
}

// Extra coverage for AC4 / AC6 / AC7.
const EXTRA: Array<[string, string]> = [
  ["E1 global capture", "<#«glo|bal» g>x</#«global»>"],
  ["E2 square nested names", "[#«i|f» a][#if b][/#if][/#«if»]"],
  ["E3 self-closed assign", "<#ass|ign x /></#assign>"],
  ["E4 tag text in assign string", '<#«ass|ign» y><#assign s = "</#assign>"></#«assign»>'],
  ["E5 #recover", "<#attempt>a<#rec|over>b</#attempt>"],
  ["E6 #case/#default", "<#switch x><#ca|se 1>a<#default>b</#switch>"],
  ["E7 </#sep>", "<#list xs as x>${x}<#sep>, </#se|p></#list>"],
  ["E8 open closed by </@>", "<@a>x</@><@b|ox></@box2>"],
  ["E9 nameless close target", "<@a|>x</@>"],
  ["E10 interleave lenient", "<#«i|f» x><#list xs></#«if»></#list>"],
  ["E11 cursor in comment between pair", "<#if x><#-- c|c -->a</#if>"],
  ["E12 square noparse", "[#«nopa|rse»][#if x][/#«noparse»]"],
  ["E13 paren > in tag", "<#«i|f» (a > b)>x</#«if»>"],
  ["E14 interp in text", "<#«i|f» x>${a > b}</#«if»>"],
  ["E15 #items/#sep in list", "<#«l|ist» xs><#items as x>${x}<#sep>,</#items></#«list»>"],
  ["E16 multi-line macro", "<#«mac|ro» m a b>\n  <#if a>x</#if>\n</#«macro»>"],
];
for (const [id, src] of EXTRA) {
  test(`${id}: ${JSON.stringify(src)}`, () => check(src));
}

// Plan 0036: empty tag name keeps the pair (Z-prefixed; distinct from 0035 ids).
const ZCASES: Array<[string, string]> = [
  ["ZS1", "<#«functio|» name>\n\n</#«functio»>"],
  ["ZS1c", "<#«functio» name>\n\n</#«functio|»>"],
  ["ZS2", "<#«f|» name>\n\n</#«f»>"],
  ["ZS2c", "<#«f» name>\n\n</#«f|»>"],
  ["ZS3", "<#«|» name>\n\n</#«»>"],
  ["ZS4", "<#«» name>\n\n</#«|»>"],
  ["ZS5", "<#«i|» name>\n\n</#«i»>"],
  ["ZS6", "<#«if|» name>\n\n</#«if»>"],
  ["ZS6c", "<#«if» name>\n\n</#«if|»>"],
  ["ZS7", "<#«i» name>\n\n</#«i|»>"],
  ["ZS8", "<#«|»>a</#«»>"],
  ["ZS9", "<#«|»\n  x>a</#«»>"],
  ["ZQ1", "[#«|» f]\n[/#«»]"],
  ["ZQ2", '<@«|» title="x">body</@«»>'],
  ["ZQ3", "[@«|»]x[/@«»]"],
  ["ZQ4", "<#«» a></#«|» >"],
  ["ZM1", "<#if a><#«|» b></#«»></#if>"],
  ["ZM2", "<#«|» a><#if b></#if></#«»>"],
  ["ZM3", "<#«|» a><# b></#></#«»>"],
  ["ZM4", "<# a><#«|» b></#«»></#>"],
  ["ZM5", "<#«|» a><#if b></#«»>"],
  ["ZM6", "<@«|»><@a>x</@></@«»>"],
  ["ZM7", "<@«a|»><@>x</@></@«a»>"],
  ["ZM8", "<@a><@«|»>x</@«»></@a>"],
  ["ZM9", "<@ x><@a>y</@|>"],
  ["ZX1", "<#i|f name>\n\n</#>"],
  ["ZX2", "<#| name>\n\n</#if>"],
  ["ZX3", "<@b|ox>x</@>"],
  ["ZX4", "<#|>a</@>"],
  ["ZX5", "<@|>a</#>"],
  ["ZX6", "<#|>a[/#]"],
  ["ZX7", "<#|/>a</#>"],
  ["ZX8", "<#| />a</#>"],
  ["ZX9", "<@|/>a</@>"],
  ["ZX10", "<# |name>\n\n</#>"],
  ["ZX11", "<#|>a</# x>"],
  ["ZX12", "<#| a>"],
  ["ZX13", "</#|>"],
  ["ZE1", "<#-- | -->a</#>"],
  ["ZE2", "<#«|» a><#-- </#> -->b</#«»>"],
  ["ZE3", "[#-- [#| a] --][/#]"],
  ["ZE4", "<#-|x>a</#>"],
  ["ZE5", "<#|1>a</#>"],
  ["ZE6", "<#|"],
  ["ZE7", "<#| a\n<#if x></#if></#>"],
  ["ZE8", '<#«|» a>${"</#>"}</#«»>'],
  ["ZL1", "1 <#«» 2> text </#«|»>"],
  ["ZL2", "a <#| b"],
  ["ZL3", "x <# y <#«i|f» z>a</#«if»>"],
  ["ZL4", "1 <# 2> <#«i|f» x>a</#«if»>"],
  ["ZR1", "<@«a|»><@a>x</@></@«a»>"],
  ["ZR2", "<@a><@a>x</@|></@a>"],
];
for (const [id, src] of ZCASES) {
  test(`${id}: ${JSON.stringify(src)}`, () => check(src));
}

test("ZAC8 empty name passes VS Code full-match check", () => {
  const w = "";
  const m = w.match(FTL_TAG_NAME_WORD_PATTERN);
  assert.strictEqual(m ? m[0].length : 0, w.length);
});

test("AC8 word pattern matches names", () => {
  for (const w of ["function", "ns.box", "_x1"]) {
    const m = w.match(FTL_TAG_NAME_WORD_PATTERN);
    assert.ok(m && m[0] === w, w);
  }
});

test("AC8 word pattern full-match fails for non-names", () => {
  for (const w of ["function name", "if>", "1x"]) {
    const m = w.match(FTL_TAG_NAME_WORD_PATTERN);
    assert.ok(!m || m[0] !== w || m.index !== 0, w);
  }
});

test("opts.comments path is used (fake comment range hides cursor)", () => {
  const { text, offset } = parseCase("<#i|f x>a</#if>");
  assert.ok(linkedTagNameRanges(text, offset));
  assert.strictEqual(
    linkedTagNameRanges(text, offset, { comments: [[0, 6]] }),
    undefined
  );
});

test("AC3 ranges cover name only", () => {
  const { text, offset } = parseCase("<#func|tion name>\n</#function>");
  const r = linkedTagNameRanges(text, offset)!;
  assert.deepStrictEqual(
    r.ranges.map(([s, e]) => text.slice(s, e)),
    ["function", "function"]
  );
});
