/**
 * Assert FTL comment bodies never leak code scopes (brackets, tags, strings, …).
 * Complements grammar SYNTAX TEST fixtures; fails if TextMate emits code scopes
 * inside `<#--…-->` / `[#--…--]`.
 */
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

function test(name: string, fn: () => void | Promise<void>): void {
  const r = fn();
  if (r && typeof (r as Promise<void>).then === "function") {
    (r as Promise<void>).then(
      () => console.log(`✓ ${name}`),
      (e) => {
        console.error(`✖ ${name}`);
        throw e;
      }
    );
  } else {
    console.log(`✓ ${name}`);
  }
}

const FORBIDDEN = [
  "meta.directive",
  "keyword.control.directive",
  "punctuation.definition.tag",
  "meta.interpolation",
  "string.quoted",
  "entity.name.tag",
  "constant.numeric",
  "keyword.operator",
];

const ALLOWED_EXTRA = [
  "keyword.other.documentation.ftldoc",
  "variable.parameter.ftldoc",
  "entity.name.type.ftldoc",
  "punctuation.definition.comment",
];

function isForbiddenScope(scope: string): boolean {
  if (ALLOWED_EXTRA.some((a) => scope.includes(a))) {
    return false;
  }
  return FORBIDDEN.some((f) => scope.includes(f));
}

async function tokenizeLines(lines: string[]): Promise<
  { text: string; scopes: string[] }[][]
> {
  const vsctm = require("vscode-textmate");
  const oniguruma = require("vscode-oniguruma");
  const wasm = fs.readFileSync(
    require.resolve("vscode-oniguruma/release/onig.wasm")
  ).buffer;
  await oniguruma.loadWASM(wasm);
  const registry = new vsctm.Registry({
    onigLib: {
      createOnigScanner: (s: string[]) => new oniguruma.OnigScanner(s),
      createOnigString: (s: string) => new oniguruma.OnigString(s),
    },
    loadGrammar: async (scopeName: string) => {
      if (scopeName === "text.html.freemarker") {
        return vsctm.parseRawGrammar(
          fs.readFileSync(
            path.join(__dirname, "../syntaxes/freemarker.tmLanguage.json"),
            "utf8"
          ),
          "freemarker.tmLanguage.json"
        );
      }
      if (scopeName === "text.html.basic") {
        return vsctm.parseRawGrammar(
          fs.readFileSync(
            path.join(
              __dirname,
              "../syntaxes/test-support/text.html.basic.tmLanguage.json"
            ),
            "utf8"
          ),
          "text.html.basic.tmLanguage.json"
        );
      }
      return null;
    },
  });
  const grammar = await registry.loadGrammar("text.html.freemarker");
  let ruleStack = vsctm.INITIAL;
  const out: { text: string; scopes: string[] }[][] = [];
  for (const line of lines) {
    const r = grammar.tokenizeLine(line, ruleStack);
    ruleStack = r.ruleStack;
    out.push(
      r.tokens.map((t: { startIndex: number; endIndex: number; scopes: string[] }) => ({
        text: line.slice(t.startIndex, t.endIndex),
        scopes: t.scopes,
      }))
    );
  }
  return out;
}

function assertCommentBodyClean(
  tokens: { text: string; scopes: string[] }[],
  label: string
): void {
  for (const t of tokens) {
    const inComment = t.scopes.some((s) => s.includes("comment.block.freemarker"));
    if (!inComment) {
      continue;
    }
    for (const s of t.scopes) {
      assert.ok(
        !isForbiddenScope(s),
        `${label}: forbidden scope ${s} on ${JSON.stringify(t.text)} (${t.scopes.join(", ")})`
      );
    }
  }
}

void (async () => {
  const samples = [
    '<#-- Tag.find()["test"] {a:1} (x) ${y} <#if> [@m] == + / -->',
    "<#-- {{ }} [[ ]] (( )) -->",
    "<#-- <#assign x = [1,{a:2}]> ${y?string} -->",
    "[#-- square [1] {2} (3) ${z} [#list] --]",
    "<#--\nnested <#assign x = 1>\n-->",
    // Plan 0038: ftldoc tag shapes stay comment-only.
    '<#--\n@param {string} [label="a b"] x\n@return {hash} r\n * @custom {@link sym} <#if>\n-->',
  ];

  for (const sample of samples) {
    const lines = sample.split("\n");
    const rows = await tokenizeLines(lines);
    for (let i = 0; i < rows.length; i++) {
      assertCommentBodyClean(rows[i]!, `sample ${JSON.stringify(sample)} L${i}`);
    }
    // Every non-empty sample line that is only a comment must include comment scope
    for (let i = 0; i < rows.length; i++) {
      const line = lines[i]!;
      if (!line.includes("#--") && !line.includes("-->") && !line.includes("--]")) {
        // interior of multiline comment
        const hasComment = rows[i]!.some((t) =>
          t.scopes.some((s) => s.includes("comment.block.freemarker"))
        );
        assert.ok(hasComment, `interior line must be comment: ${JSON.stringify(line)}`);
      }
    }
  }

  console.log("✓ comment bodies have no leaked code scopes");
  console.log("All commentMute unit tests passed.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
