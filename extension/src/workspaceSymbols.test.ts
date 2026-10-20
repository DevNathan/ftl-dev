import * as assert from "assert";
import { indexFtl } from "./symbols";
import {
  mergeWorkspaceDocs,
  searchWorkspaceSymbols,
  selectDiskDocsForMerge,
  WORKSPACE_SYMBOL_FIND_FILES_EXCLUDE,
  WORKSPACE_SYMBOL_FIND_FILES_GLOB,
  WORKSPACE_SYMBOL_FIND_FILES_MAX,
} from "./workspaceSymbols";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

const docA = `<#assign user = "Ada">
<#macro greet name>
  Hello
</#macro>
<#function add a b>
  <#return a + b>
</#function>
`;

const docB = `<#macro tagreet x></#macro>`;

test("AC1: substring search gre matches greet with index-aligned offsets", () => {
  const docs = [{ uri: "file:///a.ftl", text: docA }];
  const hits = searchWorkspaceSymbols("gre", docs);
  const names = hits.map((h) => h.name);
  assert.ok(names.includes("greet"));

  const greetHit = hits.find((h) => h.name === "greet")!;
  const index = indexFtl(docA);
  const sym = index.symbols.find((s) => s.name === "greet")!;
  assert.strictEqual(greetHit.kind, sym.kind);
  assert.strictEqual(greetHit.uri, "file:///a.ftl");
  assert.strictEqual(greetHit.nameOffset, sym.nameOffset);
  assert.strictEqual(greetHit.nameLength, sym.nameLength);
});

test("AC2: empty query returns all symbols in doc order", () => {
  const docs = [
    { uri: "file:///a.ftl", text: docA },
    { uri: "file:///b.ftl", text: docB },
  ];
  const all = searchWorkspaceSymbols("", docs);
  const expectedKinds = [
    ...indexFtl(docA).symbols.map((s) => s.name),
    ...indexFtl(docB).symbols.map((s) => s.name),
  ];
  assert.deepStrictEqual(all.map((h) => h.name), expectedKinds);
});

test("AC2: whitespace-only query same as empty", () => {
  const docs = [{ uri: "file:///a.ftl", text: docA }];
  const empty = searchWorkspaceSymbols("", docs);
  const ws = searchWorkspaceSymbols("   \t  ", docs);
  assert.deepStrictEqual(
    ws.map((h) => h.name),
    empty.map((h) => h.name)
  );
});

test("AC3: maxResults cap", () => {
  const lines: string[] = [];
  for (let i = 0; i < 50; i++) {
    lines.push(`<#assign v${i} = 1>`);
  }
  const text = lines.join("\n");
  const hits = searchWorkspaceSymbols("", [{ uri: "file:///many.ftl", text }], {
    maxResults: 10,
  });
  assert.strictEqual(hits.length, 10);
});

test("AC4: prefix match gr matches greet not tagreet", () => {
  const docs = [
    { uri: "file:///a.ftl", text: docA },
    { uri: "file:///b.ftl", text: docB },
  ];
  const hits = searchWorkspaceSymbols("gr", docs, { match: "prefix" });
  assert.deepStrictEqual(
    hits.map((h) => h.name),
    ["greet"]
  );
});

test("AC5: mergeWorkspaceDocs prefers open text and order", () => {
  const open = [{ uri: "file:///open.ftl", text: "open-buffer" }];
  const disk = [
    { uri: "file:///open.ftl", text: "disk-stale" },
    { uri: "file:///disk-only.ftl", text: "disk-only" },
  ];
  const merged = mergeWorkspaceDocs(open, disk);
  assert.strictEqual(merged.length, 2);
  assert.strictEqual(merged[0]!.uri, "file:///open.ftl");
  assert.strictEqual(merged[0]!.text, "open-buffer");
  assert.strictEqual(merged[1]!.uri, "file:///disk-only.ftl");
});

test("AC6: selectDiskDocsForMerge caps and skips open set", () => {
  const openSet = new Set(["file:///open.ftl"]);
  const diskList: string[] = ["file:///open.ftl"];
  for (let i = 0; i < 250; i++) {
    diskList.push(`file:///f${i}.ftl`);
  }
  const selected = selectDiskDocsForMerge(openSet, diskList, 200);
  assert.strictEqual(selected.length, 200);
  for (const u of selected) {
    assert.ok(!openSet.has(u));
  }
  assert.strictEqual(selected[0], "file:///f0.ftl");
  assert.strictEqual(selected[199], "file:///f199.ftl");
});

test("AC7: findFiles constants", () => {
  assert.strictEqual(
    WORKSPACE_SYMBOL_FIND_FILES_GLOB,
    "**/*.{ftl,ftlh,ftlx}"
  );
  assert.strictEqual(
    WORKSPACE_SYMBOL_FIND_FILES_EXCLUDE,
    "**/{node_modules,.git,out,dist,build,target}/**"
  );
  assert.strictEqual(WORKSPACE_SYMBOL_FIND_FILES_MAX, 200);
});

test("AC8: isCancelled returns partial hits mid-symbol loop", () => {
  const docs = [{ uri: "file:///a.ftl", text: docA }];
  const full = searchWorkspaceSymbols("", docs);
  let seen = 0;
  const cancelAfter = 2;
  const partial = searchWorkspaceSymbols("", docs, {
    isCancelled: () => {
      seen += 1;
      return seen > cancelAfter;
    },
  });
  assert.ok(partial.length < full.length);
  assert.ok(partial.length >= 1);
});

test("AC8: isCancelled at doc boundary", () => {
  const docs = [
    { uri: "file:///first.ftl", text: docA },
    { uri: "file:///second.ftl", text: docB },
  ];
  const firstDocSyms = indexFtl(docA).symbols.length;
  let checks = 0;
  const partial = searchWorkspaceSymbols("", docs, {
    isCancelled: () => {
      checks += 1;
      return checks > 1 + firstDocSyms;
    },
  });
  assert.strictEqual(partial.length, firstDocSyms);
});
