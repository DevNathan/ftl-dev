import * as assert from "assert";
import {
  buildSemanticTokenSpans,
  encodeSemanticTokenSpans,
  FTL_SEMANTIC_TOKEN_TYPES,
  semanticTokensForDocument,
} from "./semanticTokens";
import { FtlSymbol, indexFtl, offsetToLineCharacter } from "./symbols";

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

syncTest("encodeSemanticTokenSpans is 5 uints per token, sorted", () => {
  const spans = buildSemanticTokenSpans(`<#assign x = 1>\${x}\n`);
  const data = encodeSemanticTokenSpans(spans);
  assert.strictEqual(data.length % 5, 0);
  assert.ok(data.length / 5 >= 2); // decl + use
  // First token deltaLine should be >= 0
  assert.ok(data[0]! >= 0);
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
    "/proj/lib.ftl": lib,
  };
  const data = await semanticTokensForDocument(
    mainText,
    "/proj/main.ftl",
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
