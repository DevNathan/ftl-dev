import * as assert from "assert";
import * as path from "path";
import { validateFtl } from "./diagnostics";
import {
  DataModelRootsCache,
  dataModelFileFsPath,
  FTL_DATA_MODEL_FILENAME,
  loadFileRootsFromRead,
  mergeDataModelAllowlist,
  parseFtlDataModelJson,
  rootsForTemplatePath,
  templatePathMatches,
} from "./dataModelFile";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✖ ${name}`);
    throw e;
  }
}

function undeclared(
  text: string,
  opts: {
    strictVariables?: boolean;
    dataModel?: readonly string[];
  } = {}
) {
  return validateFtl(text, {
    strictVariables: opts.strictVariables ?? true,
    dataModel: opts.dataModel,
  }).filter((d) => d.message.includes("Undeclared identifier"));
}

// --- AC1: format ---

test('AC1: { "roots": ["a"] } → roots ["a"]', () => {
  const r = parseFtlDataModelJson('{ "roots": ["a"] }');
  assert.ok(!("error" in r));
  assert.deepStrictEqual((r as { roots: string[] }).roots, ["a"]);
});

test("AC1: bare JSON array is invalid", () => {
  const r = parseFtlDataModelJson('["a","b"]');
  assert.ok("error" in r);
  assert.ok((r as { error: string }).error.length > 0);
});

test("AC1: missing roots → empty list (not error)", () => {
  const r = parseFtlDataModelJson("{}");
  assert.ok(!("error" in r));
  assert.deepStrictEqual((r as { roots: string[] }).roots, []);
});

test('AC1: empty roots array → []', () => {
  const r = parseFtlDataModelJson('{ "roots": [] }');
  assert.ok(!("error" in r));
  assert.deepStrictEqual((r as { roots: string[] }).roots, []);
});

test("AC1: non-string roots elements rejected", () => {
  const r = parseFtlDataModelJson('{ "roots": [1] }');
  assert.ok("error" in r);
});

test("AC1: non-array roots rejected", () => {
  const r = parseFtlDataModelJson('{ "roots": "x" }');
  assert.ok("error" in r);
});

test("AC1: garbage JSON → error", () => {
  const r = parseFtlDataModelJson("{ not json");
  assert.ok("error" in r);
});

test("AC1: duplicate roots accepted", () => {
  const r = parseFtlDataModelJson('{ "roots": ["a","a"] }');
  assert.ok(!("error" in r));
  assert.deepStrictEqual((r as { roots: string[] }).roots, ["a", "a"]);
});

// --- AC2 / AC3: discovery ---

test("AC2: discovery path is workspace-folder root only", () => {
  const folder = path.join("workspace", "proj");
  const p = dataModelFileFsPath(folder);
  assert.strictEqual(p, path.join(folder, FTL_DATA_MODEL_FILENAME));
  assert.strictEqual(path.basename(p!), FTL_DATA_MODEL_FILENAME);
  // No walk-up: nested file path is not produced by helper
  assert.ok(!p!.includes(path.join("nested", FTL_DATA_MODEL_FILENAME)));
});

test("AC2: outside workspace → no file path", () => {
  assert.strictEqual(dataModelFileFsPath(undefined), undefined);
});

test("AC3: multi-root — folder A path ≠ folder B path", () => {
  const a = dataModelFileFsPath(path.join("ws", "A"));
  const b = dataModelFileFsPath(path.join("ws", "B"));
  assert.notStrictEqual(a, b);
  assert.ok(a!.endsWith(path.join("A", FTL_DATA_MODEL_FILENAME)));
  assert.ok(b!.endsWith(path.join("B", FTL_DATA_MODEL_FILENAME)));
});

test("AC3: cache stores models per folder key independently", () => {
  const cache = new DataModelRootsCache();
  cache.set("file:///A", { roots: ["fromA"], templates: {} });
  cache.set("file:///B", { roots: ["fromB"], templates: {} });
  assert.deepStrictEqual(cache.get("file:///A")!.roots, ["fromA"]);
  assert.deepStrictEqual(cache.get("file:///B")!.roots, ["fromB"]);
  // Document in A must not see B's roots via that key
  assert.ok(!cache.get("file:///A")!.roots.includes("fromB"));
});

// --- AC4–AC7: merge / strict ---

test("AC4: strictVariables false → zero undeclared even with file roots merged", () => {
  const merged = mergeDataModelAllowlist([], ["hostOnly"]);
  const diags = undeclared("${hostOnly}${typo}", {
    strictVariables: false,
    dataModel: merged,
  });
  assert.strictEqual(diags.length, 0);
});

test("AC5: strict on, empty setting, file roots hostOnly → no warning", () => {
  const merged = mergeDataModelAllowlist([], ["hostOnly"]);
  const diags = undeclared("${hostOnly}", {
    strictVariables: true,
    dataModel: merged,
  });
  assert.strictEqual(diags.length, 0);
});

test("AC6: setting + file merge; unknown third still warns", () => {
  const merged = mergeDataModelAllowlist(["fromSettings"], ["fromFile"]);
  const text = "${fromSettings}${fromFile}${unknownThird}";
  const diags = undeclared(text, {
    strictVariables: true,
    dataModel: merged,
  });
  assert.ok(!diags.some((d) => d.message.includes("'fromSettings'")));
  assert.ok(!diags.some((d) => d.message.includes("'fromFile'")));
  assert.ok(diags.some((d) => d.message.includes("'unknownThird'")));
});

test("AC7: strict on, no file, setting-only allowlist still works", () => {
  const merged = mergeDataModelAllowlist(["fromSettings"], []);
  assert.strictEqual(
    undeclared("${fromSettings}", {
      strictVariables: true,
      dataModel: merged,
    }).length,
    0
  );
  assert.ok(
    undeclared("${other}", {
      strictVariables: true,
      dataModel: merged,
    }).some((d) => d.message.includes("'other'"))
  );
});

// --- AC8: invalid → empty contribution + error surface ---

test("AC8: invalid JSON → empty roots + warn; no throw", () => {
  const warnings: string[] = [];
  const roots = loadFileRootsFromRead(
    { kind: "ok", text: "{ broken" },
    (reason) => warnings.push(reason)
  );
  assert.deepStrictEqual(roots, []);
  assert.strictEqual(warnings.length, 1);
  assert.ok(warnings[0]!.length > 0);
});

test("AC8: rejected schema (bare array) → empty + warn", () => {
  const warnings: string[] = [];
  const roots = loadFileRootsFromRead(
    { kind: "ok", text: '["a"]' },
    (reason) => warnings.push(reason)
  );
  assert.deepStrictEqual(roots, []);
  assert.strictEqual(warnings.length, 1);
});

test("AC8: unreadable → empty + warn", () => {
  const warnings: string[] = [];
  const roots = loadFileRootsFromRead(
    { kind: "unreadable", reason: "EACCES" },
    (reason) => warnings.push(reason)
  );
  assert.deepStrictEqual(roots, []);
  assert.deepStrictEqual(warnings, ["EACCES"]);
});

test("AC8: missing file → silent empty", () => {
  const warnings: string[] = [];
  const roots = loadFileRootsFromRead(
    { kind: "missing" },
    (reason) => warnings.push(reason)
  );
  assert.deepStrictEqual(roots, []);
  assert.strictEqual(warnings.length, 0);
});

// --- AC9: watch / cache invalidate smoke ---

test("AC9: invalidate + reload reflects create/update/delete", () => {
  const cache = new DataModelRootsCache();
  const folder = "file:///ws";
  let disk: string | undefined;

  const read = () => {
    if (disk === undefined) {
      return { kind: "missing" as const };
    }
    return { kind: "ok" as const, text: disk };
  };

  // absent
  assert.deepStrictEqual(cache.getOrLoad(folder, read).roots, []);

  // create
  disk = '{ "roots": ["created"] }';
  cache.invalidate(folder);
  assert.deepStrictEqual(cache.getOrLoad(folder, read).roots, ["created"]);

  // update (cached stale until invalidate)
  disk = '{ "roots": ["updated"] }';
  assert.deepStrictEqual(cache.getOrLoad(folder, read).roots, ["created"]);
  cache.invalidate(folder);
  assert.deepStrictEqual(cache.getOrLoad(folder, read).roots, ["updated"]);

  // delete
  disk = undefined;
  cache.invalidate(folder);
  assert.deepStrictEqual(cache.getOrLoad(folder, read).roots, []);
});

// --- 0032b AC6–AC11: templates path / glob ---

test("0032b AC6: roots + templates prefix → both for matching path", () => {
  const r = parseFtlDataModelJson(
    '{ "roots": ["g"], "templates": { "views/": ["v"] } }'
  );
  assert.ok(!("error" in r));
  const model = r as { roots: string[]; templates: Record<string, string[]> };
  const merged = rootsForTemplatePath(model, "views/x.ftl");
  assert.ok(merged.includes("g"));
  assert.ok(merged.includes("v"));
});

test("0032b AC7: non-matching path → roots only", () => {
  const model = {
    roots: ["g"],
    templates: { "views/": ["v"] },
  };
  assert.deepStrictEqual(rootsForTemplatePath(model, "other/x.ftl"), ["g"]);
});

test("0032b AC8: admin/** glob matches nested; not sibling prefix", () => {
  assert.ok(templatePathMatches("admin/a/b.ftl", "admin/**"));
  assert.ok(!templatePathMatches("x/admin/a.ftl", "admin/**"));
  const model = {
    roots: [] as string[],
    templates: { "admin/**": ["adminCtx"] },
  };
  assert.ok(
    rootsForTemplatePath(model, "admin/a/b.ftl").includes("adminCtx")
  );
  assert.ok(
    !rootsForTemplatePath(model, "x/admin/a.ftl").includes("adminCtx")
  );
});

test("0032b AC9: invalid templates → error / empty contribution", () => {
  const bad = parseFtlDataModelJson('{ "roots": [], "templates": [] }');
  assert.ok("error" in bad);

  const warnings: string[] = [];
  const roots = loadFileRootsFromRead(
    { kind: "ok", text: '{ "templates": { "a/": [1] } }' },
    (reason) => warnings.push(reason)
  );
  assert.deepStrictEqual(roots, []);
  assert.strictEqual(warnings.length, 1);
});

test("0032b AC10: missing templates → roots-only like 0031", () => {
  const r = parseFtlDataModelJson('{ "roots": ["a"] }');
  assert.ok(!("error" in r));
  const model = r as { roots: string[]; templates: Record<string, string[]> };
  assert.deepStrictEqual(model.templates, {});
  assert.deepStrictEqual(rootsForTemplatePath(model, "any/path.ftl"), ["a"]);
});

test("0032b AC11: exact file key + backslash normalize", () => {
  const model = {
    roots: ["g"],
    templates: { "mail/order.ftl": ["orderMail"] },
  };
  assert.ok(
    rootsForTemplatePath(model, "mail\\order.ftl").includes("orderMail")
  );
  assert.ok(
    !rootsForTemplatePath(model, "mail/other.ftl").includes("orderMail")
  );
});

console.log("\ndataModelFile.test.ts: all passed");
