import * as assert from "assert";
import * as path from "path";
import {
  buildSemanticTokenSpans,
  encodeSemanticTokenSpans,
  ftlCommentRanges,
  FTL_SEMANTIC_TOKEN_TYPES,
  semanticTokensForDocument,
} from "./semanticTokens";
import { FtlSymbol, indexFtl, lineCharacterToOffset, offsetToLineCharacter } from "./symbols";

function syncTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

const sample = `<#assign user = "Ada">
<#macro greet name>
  Hello \${name}
</#macro>
<#function add a b>
  <#return a + b>
</#function>
<#import "lib/tools.ftl" as tools>
\${user} <@greet name="x"/> \${add(1, 2)} \${tools.helper()}
`;

syncTest("legend exposes standard VS Code token types", () => {
  assert.deepStrictEqual([...FTL_SEMANTIC_TOKEN_TYPES], [
    "function",
    "variable",
    "namespace",
    "method",
  ]);
});

syncTest("declaration names get typed spans", () => {
  const spans = buildSemanticTokenSpans(sample);
  const byType = (t: string) =>
    spans.filter((s) => s.tokenType === t).map((s) => {
      // recover name via line/char from sample is awkward; check counts + positions
      return `${s.line}:${s.character}:${s.length}`;
    });

  const idx = indexFtl(sample);
  for (const sym of idx.symbols) {
    const pos = offsetToLineCharacter(sample, sym.nameOffset);
    const hit = spans.find(
      (s) =>
        s.line === pos.line &&
        s.character === pos.character &&
        s.length === sym.nameLength
    );
    assert.ok(hit, `missing decl span for ${sym.kind}:${sym.name}`);
    if (sym.kind === "macro") {
      assert.strictEqual(hit!.tokenType, "method");
    } else if (sym.kind === "function") {
      assert.strictEqual(hit!.tokenType, "function");
    } else {
      assert.strictEqual(hit!.tokenType, "variable");
    }
  }
  assert.ok(byType("method").length >= 1);
  assert.ok(byType("function").length >= 1);
  assert.ok(byType("variable").length >= 1);
  assert.ok(byType("namespace").length >= 1);
});

syncTest("in-file uses of local names are highlighted", () => {
  const spans = buildSemanticTokenSpans(sample);
  // `${user}` use on last content line
  const useIdx = sample.lastIndexOf("${user}") + 2; // start of user
  const pos = offsetToLineCharacter(sample, useIdx);
  const hit = spans.find(
    (s) =>
      s.line === pos.line &&
      s.character === pos.character &&
      s.length === 4 &&
      s.tokenType === "variable"
  );
  assert.ok(hit, "expected use of user as variable");

  const greetUse = sample.lastIndexOf("<@greet") + 2;
  const gpos = offsetToLineCharacter(sample, greetUse);
  const ghit = spans.find(
    (s) =>
      s.line === gpos.line &&
      s.character === gpos.character &&
      s.length === 5 &&
      s.tokenType === "method"
  );
  assert.ok(ghit, "expected use of greet as method");
});

syncTest("ns.member spans when importedByNs provided", () => {
  const remote: FtlSymbol[] = [
    {
      name: "helper",
      kind: "function",
      nameOffset: 0,
      nameLength: 6,
    },
  ];
  const spans = buildSemanticTokenSpans(sample, {
    importedByNs: new Map([["tools", remote]]),
  });
  const call = sample.lastIndexOf("tools.helper");
  const nsPos = offsetToLineCharacter(sample, call);
  const memPos = offsetToLineCharacter(sample, call + "tools.".length);

  const nsHit = spans.find(
    (s) =>
      s.line === nsPos.line &&
      s.character === nsPos.character &&
      s.length === 5 &&
      s.tokenType === "namespace"
  );
  const memHit = spans.find(
    (s) =>
      s.line === memPos.line &&
      s.character === memPos.character &&
      s.length === 6 &&
      s.tokenType === "function"
  );
  assert.ok(nsHit, "expected tools as namespace");
  assert.ok(memHit, "expected helper as function");
});

syncTest("identifiers inside FTL comments are not highlighted", () => {
  const text = `<#macro note msg>
  \${msg}
</#macro>
<#-- Tag.find()['test'] note -->
[#-- note also --]
\${note}
`;
  const spans = buildSemanticTokenSpans(text);
  const comments = ftlCommentRanges(text);
  const inComment = (offset: number) =>
    comments.some(([s, e]) => offset >= s && offset < e);

  for (const s of spans) {
    const off = lineCharacterToOffset(text, s.line, s.character);
    assert.ok(
      !inComment(off),
      `no semantic spans inside comments (got ${s.tokenType} at ${s.line}:${s.character})`
    );
  }

  const realUse = text.lastIndexOf("${note}") + 2;
  const usePos = offsetToLineCharacter(text, realUse);
  assert.ok(
    spans.some(
      (s) =>
        s.line === usePos.line &&
        s.character === usePos.character &&
        s.length === 4 &&
        s.tokenType === "method"
    ),
    "real use of note outside comments should still highlight"
  );
});

syncTest("ftlCommentRanges covers angle and square comments", () => {
  const text = `a<#-- x -->b[#-- y --]c`;
  assert.deepStrictEqual(ftlCommentRanges(text), [
    [1, 11],
    [12, 22],
  ]);
});

syncTest("ftlCommentRanges nests inner comments", () => {
  const text = `<#--\n<#-- inner -->\n<#assign x = 1>\n-->`;
  assert.deepStrictEqual(ftlCommentRanges(text), [[0, text.length]]);
});

syncTest("unclosed comment range covers to EOF; no identifier spans inside", () => {
  const text = `<#--\n<#assign x = 1>`;
  assert.deepStrictEqual(ftlCommentRanges(text), [[0, text.length]]);
  const spans = buildSemanticTokenSpans(text);
  assert.ok(
    !spans.some((s) => s.tokenType === "variable"),
    "decls inside unclosed comment must not get variable tokens"
  );
});

syncTest("closed nested comment suppresses identifier semantic tokens", () => {
  const text = `<#--\n<#-- inner -->\n<#assign x = 1>\n-->`;
  const spans = buildSemanticTokenSpans(text);
  assert.ok(
    !spans.some((s) => s.tokenType === "variable"),
    "decls inside closed comment must not get variable tokens"
  );
});

syncTest("encodeSemanticTokenSpans is 5 uints per token, sorted", () => {
  const spans = buildSemanticTokenSpans(`<#assign x = 1>\${x}\n`);
  const data = encodeSemanticTokenSpans(spans);
  assert.strictEqual(data.length % 5, 0);
  assert.ok(data.length / 5 >= 2); // decl + use
  // First token deltaLine should be >= 0
  assert.ok(data[0]! >= 0);
});

function spansAt(
  text: string,
  spans: ReturnType<typeof buildSemanticTokenSpans>,
  offset: number,
  length: number
) {
  const pos = offsetToLineCharacter(text, offset);
  return spans.filter(
    (s) =>
      s.line === pos.line && s.character === pos.character && s.length === length
  );
}

syncTest("string keys equal to a local name get no span (plan 0039)", () => {
  const text = `<#function build>
  <#local header = {}>
  <#return {
      "header": header,
      "request": request
  } />
</#function>
`;
  const spans = buildSemanticTokenSpans(text);
  const key = text.indexOf('"header"') + 1;
  assert.strictEqual(spansAt(text, spans, key, 6).length, 0, "string key");
  const value = text.indexOf("header,");
  assert.strictEqual(
    spansAt(text, spans, value, 6)[0]?.tokenType,
    "variable",
    "value use stays variable"
  );
});

syncTest("${name} inside a string in a directive gets a span", () => {
  const text = `<#assign name = "x">
<#assign s = "hello \${name} and name">
`;
  const spans = buildSemanticTokenSpans(text);
  const use = text.indexOf("${name}") + 2;
  assert.strictEqual(spansAt(text, spans, use, 4)[0]?.tokenType, "variable");
  const plain = text.lastIndexOf("name\"");
  assert.strictEqual(spansAt(text, spans, plain, 4).length, 0, "string text");
});

syncTest("plain HTML text equal to a local name gets no span", () => {
  const text = `<#assign header = 1>
<h1>header</h1> <p title="header">\${header}</p>
`;
  const spans = buildSemanticTokenSpans(text);
  const html = text.indexOf("header</h1>");
  assert.strictEqual(spansAt(text, spans, html, 6).length, 0, "html text");
  const attr = text.indexOf('"header"') + 1;
  assert.strictEqual(spansAt(text, spans, attr, 6).length, 0, "html attr");
  const use = text.indexOf("${header}") + 2;
  assert.strictEqual(spansAt(text, spans, use, 6)[0]?.tokenType, "variable");
});

syncTest("raw string content gets no span", () => {
  const text = `<#assign name = 1>
<#assign s = r"\${name} name">
`;
  const spans = buildSemanticTokenSpans(text);
  const inRaw = text.indexOf("${name}") + 2;
  assert.strictEqual(spansAt(text, spans, inRaw, 4).length, 0);
  assert.strictEqual(spansAt(text, spans, text.lastIndexOf("name\""), 4).length, 0);
});

syncTest("noparse body gets no span", () => {
  const text = `<#assign name = 1>
<#noparse>\${name}</#noparse> \${name}
`;
  const spans = buildSemanticTokenSpans(text);
  const first = text.indexOf("${name}") + 2;
  assert.strictEqual(spansAt(text, spans, first, 4).length, 0);
  const second = text.lastIndexOf("${name}") + 2;
  assert.strictEqual(spansAt(text, spans, second, 4)[0]?.tokenType, "variable");
});

async function main(): Promise<void> {
  const mainText = `<#import "lib.ftl" as lib>
\${lib.helper()}
`;
  const lib = `<#function helper>
<#return 1>
</#function>
`;
  const files: Record<string, string> = {
    [path.normalize("/proj/lib.ftl")]: lib,
  };
  const data = await semanticTokensForDocument(
    mainText,
    path.normalize("/proj/main.ftl"),
    async (p) => files[p]
  );
  assert.ok(data.length >= 5 * 2, "namespace + member at least");
  // Decode: find a namespace token (type index 2) and function (0)
  let sawNs = false;
  let sawFn = false;
  for (let i = 0; i < data.length; i += 5) {
    const type = data[i + 3]!;
    if (type === FTL_SEMANTIC_TOKEN_TYPES.indexOf("namespace")) {
      sawNs = true;
    }
    if (type === FTL_SEMANTIC_TOKEN_TYPES.indexOf("function")) {
      sawFn = true;
    }
  }
  assert.ok(sawNs, "encoded namespace");
  assert.ok(sawFn, "encoded function");
  console.log("✓ semanticTokensForDocument resolves import ns.member");
  console.log("All semantic token unit tests passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
