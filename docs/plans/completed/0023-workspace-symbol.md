# 0023 - Workspace Symbol (Ctrl+T / Go to Symbol in Workspace)

Status: **completed**  
Started: 2026-10-20  
Completed: 2026-10-20  
Repo: `vsix/` only — never touch `vim/`.

Related: [0010-symbols-outline-references.md](0010-symbols-outline-references.md) (`indexFtl`, outline, `FtlDocumentSymbolProvider`), [0019-perf-cache.md](0019-perf-cache.md) (`sharedDocCache`), [0022-rename-provider.md](0022-rename-provider.md) (prior gap #1 — completed).

---

## Goal

Ship **Workspace Symbol** search (VS Code **Go to Symbol in Workspace**, typically **Ctrl+T**) for FreeMarker: list `#assign` / `#macro` / `#function` / `#local` / `#global` declarations across **open FTL buffers** plus a **bounded** scan of workspace `*.ftl` / `*.ftlh` / `*.ftlx` files.

- **Pure** search over `{ uri, text }[]` using existing **`indexFtl`** symbol list (same names/kinds as document outline).
- **Thin** `FtlWorkspaceSymbolProvider` adapter + **`registerWorkspaceSymbolProvider`** in [`extension.ts`](../../extension/src/extension.ts).
- Reuse **`SymbolKind`** → **`vscode.SymbolKind`** mapping already used by [`FtlDocumentSymbolProvider`](../../extension/src/outlineReferences.ts).

Closes product gap **#1** in [`requirements-status.md`](../product/requirements-status.md) after Rename (0022).

---

## Background

| Capability | Today | Notes |
|------------|-------|--------|
| Document outline | `buildOutlineFromIndex` in [`outline.ts`](../../extension/src/outline.ts) | Flat list; no nesting |
| Per-doc symbols | `FtlDocumentSymbolProvider` in [`outlineReferences.ts`](../../extension/src/outlineReferences.ts) | `symbolKindToVscode`, `sharedDocCache` |
| Index | `indexFtl` in [`symbols.ts`](../../extension/src/symbols.ts) | Declarations only; comment-skipped |
| File read | [`readUri`](../../extension/src/vscodeIo.ts) / [`readFsPath`](../../extension/src/vscodeIo.ts) | Used by definition / imports |
| Open FTL docs | [`diagnosticsProvider.ts`](../../extension/src/diagnosticsProvider.ts) | Iterates `vscode.workspace.textDocuments` |
| Workspace symbol | `FtlWorkspaceSymbolProvider` | Shipped (plan 0023) |

Plan **0010** scoped document outline + same-file references; workspace-wide symbol index was explicitly out of scope.

---

## Approach

### Pure function (testable core)

Add **`searchWorkspaceSymbols`** (name stable once exported) in a dedicated module, e.g. [`workspaceSymbols.ts`](../../extension/src/workspaceSymbols.ts), or alongside [`outline.ts`](../../extension/src/outline.ts) if kept tiny — prefer **separate file** for provider + tests.

**Signature (conceptual):**

```text
export interface FtlDocInput {
  /** Stable id for tests; host passes `uri.toString()`. */
  uri: string;
  text: string;
}

export interface WorkspaceSymbolHit {
  name: string;
  kind: SymbolKind;
  uri: string;
  nameOffset: number;
  nameLength: number;
}

searchWorkspaceSymbols(
  query: string,
  docs: FtlDocInput[],
  options?: {
    maxResults?: number;
    /** default: substring match on lowercased name */
    match?: "substring" | "prefix";
    /** When true mid-loop, return hits collected so far (host maps token → this). */
    isCancelled?: () => boolean;
  }
): WorkspaceSymbolHit[]
```

**Algorithm:**

1. Normalize `query` → trim; **empty query** → no name filter (see policy below).
2. For each doc in `docs` (order preserved: **open first**, then disk — see **`mergeWorkspaceDocs`**):
   - If **`options.isCancelled?.()`** → return hits collected so far.
   - `index = indexFtl(text)`.
   - For each `sym` in `index.symbols`:
     - If **`isCancelled?.()`** → return partial hits.
     - If query non-empty: case-insensitive **substring** match on `sym.name` (default). Optional **`prefix`** mode: `name.toLowerCase().startsWith(q)`.
     - Push hit `{ name, kind: sym.kind, uri, nameOffset, nameLength }`.
     - Stop when **`maxResults`** reached (default e.g. **500** — document in impl/tests).
3. Return hits in **document order**, then **source order** within file (same as outline).

**Empty-query policy (locked by tests):**

- **Empty / whitespace query** → return **all** symbols from the supplied `docs` array, subject to **`maxResults`** cap (not “zero results”).
- **Same doc set** for empty and non-empty queries in Wave 1; only the name filter differs inside **`searchWorkspaceSymbols`**.

### Pure gather helpers (testable without VS Code)

Export from the same module (or [`workspaceSymbolGather.ts`](../../extension/src/workspaceSymbolGather.ts) if split):

**Constants** (provider imports these; unit tests assert values):

```text
WORKSPACE_SYMBOL_FIND_FILES_GLOB = "**/*.{ftl,ftlh,ftlx}"
WORKSPACE_SYMBOL_FIND_FILES_EXCLUDE =
  "**/{node_modules,.git,out,dist,build,target}/**"
WORKSPACE_SYMBOL_FIND_FILES_MAX = 200
```

**`mergeWorkspaceDocs(openDocs, diskDocs): FtlDocInput[]`**

1. Output order: all **`openDocs`** in input order, then disk entries whose **`uri`** is not in the open set.
2. **Dedupe by `uri` string:** if the same URI appears in both lists, **open buffer wins** (keep open **`text`**; drop disk row).

**`selectDiskDocsForMerge(openUriSet, diskUriList, maxDisk = WORKSPACE_SYMBOL_FIND_FILES_MAX): string[]`**

- From **`diskUriList`** (URIs already returned by host `findFiles` with VS Code’s own cap), take at most **`maxDisk`** URIs **not** in **`openUriSet`**, preserving list order. Pure fn does not call VS Code; tests feed synthetic URI lists to lock **200** behavior and ordering.

Host flow: open docs → **`openUriSet`** → **`findFiles(..., WORKSPACE_SYMBOL_FIND_FILES_MAX)`** → read text for selected disk URIs → **`mergeWorkspaceDocs(open, disk)`** → **`searchWorkspaceSymbols(..., { isCancelled: () => token.isCancellationRequested })`**.

### VS Code adapter

**`FtlWorkspaceSymbolProvider`** implements `vscode.WorkspaceSymbolProvider`:

**`provideWorkspaceSymbols(query, token)`:**

1. **Gather documents** (delegate to pure helpers + constants above):
   - **Open:** all `vscode.workspace.textDocuments` with `languageId === "freemarker"` → `{ uri: uri.toString(), text: doc.getText() }`.
   - **Workspace (bounded):** `vscode.workspace.findFiles(
       WORKSPACE_SYMBOL_FIND_FILES_GLOB,
       WORKSPACE_SYMBOL_FIND_FILES_EXCLUDE,
       WORKSPACE_SYMBOL_FIND_FILES_MAX
     )` → map to URI strings → **`selectDiskDocsForMerge(openUriSet, …)`** → read each via **`readUri`** (skip missing).
   - **`mergeWorkspaceDocs(openDocs, diskDocs)`** → single list for search.
2. **Cancellation:** after each **`readUri`** and inside **`searchWorkspaceSymbols`** via **`isCancelled: () => token.isCancellationRequested`** → return partial symbol list (VS Code: stop promptly).
3. **Search:** `searchWorkspaceSymbols(query, mergedDocs, { maxResults, isCancelled })`.
4. **Map to `vscode.SymbolInformation`:**
   - Reuse **`symbolKindToVscode`** (extract from [`outlineReferences.ts`](../../extension/src/outlineReferences.ts) to e.g. [`symbolKindVscode.ts`](../../extension/src/symbolKindVscode.ts) or export shared helper — avoid copy-paste).
   - Build `Location` with **`lineMapFor(text)`** + **`rangeFromOffsets`** / **`locationFromOffsets`** ([`vscodeRanges.ts`](../../extension/src/vscodeRanges.ts)) on **name** span (parity with document symbol selection range).
   - `containerName`: optional basename of file (nice UX); Wave 1 optional if trivial (`path.basename(uri.fsPath)`).

Place class in [`workspaceSymbolProvider.ts`](../../extension/src/workspaceSymbolProvider.ts) or [`outlineReferences.ts`](../../extension/src/outlineReferences.ts) if file count stays small — prefer **separate provider file** + keep outlineReferences for document symbols only.

### Registration

In [`extension.ts`](../../extension/src/extension.ts):

```text
vscode.languages.registerWorkspaceSymbolProvider(
  new FtlWorkspaceSymbolProvider()
)
```

Note: VS Code **`registerWorkspaceSymbolProvider`** is **provider-only** (no `DocumentSelector` / **`FTL_SELECTOR`**); the provider gathers open `freemarker` buffers and bounded workspace `*.ftl` paths itself.

---

## In scope (Wave 1)

- Workspace symbol search for **declaration names** from **`indexFtl`** (assign / macro / function / local / global).
- **Case-insensitive** filter: non-empty query matches **substring** of symbol name (prefix is a subset; optional `match: "prefix"` in pure API for tests).
- Sources: **all open** FreeMarker documents + up to **`WORKSPACE_SYMBOL_FIND_FILES_MAX` (200)** workspace paths via **`findFiles`** (exclude glob from constants).
- Pure **`mergeWorkspaceDocs`** / **`selectDiskDocsForMerge`** + **`searchWorkspaceSymbols`** **`isCancelled`** — unit-tested without VS Code.
- **`FtlWorkspaceSymbolProvider`**: thin wiring (gather → merge → search → map); registration in **`extension.ts`**.
- Docs: CHANGELOG + [`requirements-status.md`](../product/requirements-status.md) row (may land in **문서** step after dev AC).

---

## Out of scope (Non-goals)

| Item | Notes |
|------|--------|
| **`vim/`** | Separate repo / plans |
| **Full project index / daemon** | No background indexer, no persistent cross-session cache |
| **Cross-repo / multi-root special cases** | Use VS Code workspace APIs as-is; no custom root merging |
| **AST nesting / container hierarchy** | Flat symbol list only (same as document outline) |
| **References, call sites, `${}` locals** | Declarations only — not occurrence search |
| **Import graph expansion** | Do not auto-index imported files beyond `findFiles` + open docs |
| **LSP required** | Extension host is source of truth for Wave 1 |
| **Java / data-model symbols** | FTL directives only |
| **Undeclared / strictVariables** | ADR 0002 deferred |

### Optional stretch (not required for AC)

- **`server/src/server.ts`**: `workspace/symbol` handler mirroring pure `searchWorkspaceSymbols` if trivial re-export (same pattern as other scaffold endpoints).
- **Fuzzy scoring** (VS Code-style out-of-order match) — defer; substring is enough for Wave 1.
- **Configuration** for `findFiles` limit / exclude globs — defer unless needed after dogfood.

---

## Acceptance criteria (testable)

**Search (pure)**

- [x] **AC1:** **`searchWorkspaceSymbols("gre", docs)`** returns hits whose **`name`** contains `gre` case-insensitively (e.g. `greet`), with correct **`kind`**, **`uri`**, **`nameOffset`**, **`nameLength`** aligned with **`indexFtl`** on the same text.
- [x] **AC2:** **`searchWorkspaceSymbols("", docs)`** (or whitespace-only query) returns **all** declaration symbols from `docs` until **`maxResults`**; order stable (doc order, then source order).
- [x] **AC3:** **`maxResults`** cap: fixture with many symbols + low cap → length ≤ cap; no throw.
- [x] **AC4:** **`match: "prefix"`** test: `"gr"` matches `greet`, does not match `tagreet`; default **`substring`** behavior covered by AC1.

**Gather / merge (pure — no VS Code in tests)**

- [x] **AC5:** **`mergeWorkspaceDocs(open, disk)`** — same **`uri`** in both lists → result contains **one** entry with **open** **`text`** (disk text discarded); open docs appear before disk-only URIs.
- [x] **AC6:** **`selectDiskDocsForMerge(openSet, diskUriList, maxDisk)`** — returns at most **`maxDisk`** URIs not in **`openSet`**, preserving **`diskUriList`** order; with **`maxDisk === 200`** and 250 eligible URIs, length **200** and none overlap open set.
- [x] **AC7:** **`WORKSPACE_SYMBOL_FIND_FILES_*`** constants equal plan values (glob, exclude, **200**); provider **`findFiles`** call uses those exports (grep or re-export test).

**Cancellation (pure)**

- [x] **AC8:** **`searchWorkspaceSymbols`** with **`isCancelled`** that flips **true** after *N* symbols — returns **partial** hits (fewer than a full uncancelled run), no throw; early exit on doc boundary also covered if cheap.

**Symbol kind mapping (shared helper)**

- [x] **AC9:** **`symbolKindToVscode`** (extracted shared module) — table-driven unit test for every **`SymbolKind`**: `macro` → Method, `function` → Function, `assign` | `local` | `global` → Variable; **`FtlDocumentSymbolProvider`** imports same helper (no duplicate switch).

**Host wiring**

- [x] **AC10:** **`registerWorkspaceSymbolProvider(new FtlWorkspaceSymbolProvider())`** in [`extension.ts`](../../extension/src/extension.ts) (provider-only; no **`FTL_SELECTOR`**).
- [x] **AC11:** **`FtlWorkspaceSymbolProvider`** maps **`WorkspaceSymbolHit`** → **`vscode.SymbolInformation`** using **`symbolKindToVscode(hit.kind)`** and name-span **`Location`** (integration optional; AC9 + registration satisfy mapping contract).

**Verification / docs**

- [x] **AC12:** `cd vsix/extension && npm test` exit **0** (grammar + unit), covering AC1–AC9 at minimum.
- [x] **AC13:** **[Unreleased]** in [`extension/CHANGELOG.md`](../../extension/CHANGELOG.md) and [`requirements-status.md`](../product/requirements-status.md) workspace symbol row → **Done** (may close in **문서** pipeline step after AC12).

---

## Scope paths (likely touched)

**Product / tests (개발):**

- [`extension/src/workspaceSymbols.ts`](../../extension/src/workspaceSymbols.ts) — **`searchWorkspaceSymbols`**, **`mergeWorkspaceDocs`**, **`selectDiskDocsForMerge`**, gather **constants**, types
- [`extension/src/workspaceSymbolProvider.ts`](../../extension/src/workspaceSymbolProvider.ts) — **`FtlWorkspaceSymbolProvider`**
- [`extension/src/symbolKindVscode.ts`](../../extension/src/symbolKindVscode.ts) — shared **`symbolKindToVscode`** (extract from outlineReferences) *or* export from outlineReferences without new file if minimal
- [`extension/src/outlineReferences.ts`](../../extension/src/outlineReferences.ts) — use shared kind mapper; no behavior change to document symbols
- [`extension/src/extension.ts`](../../extension/src/extension.ts) — **`registerWorkspaceSymbolProvider`**
- [`extension/src/vscodeIo.ts`](../../extension/src/vscodeIo.ts) — read-only reuse of **`readUri`**
- [`extension/src/symbols.ts`](../../extension/src/symbols.ts) — read-only **`indexFtl`** / **`SymbolKind`**
- [`extension/src/outline.ts`](../../extension/src/outline.ts) — read-only parity reference
- [`extension/src/docCache.ts`](../../extension/src/docCache.ts) — optional cache reuse in provider
- [`extension/src/workspaceSymbols.test.ts`](../../extension/src/workspaceSymbols.test.ts) — AC1–AC8
- [`extension/src/symbolKindVscode.test.ts`](../../extension/src/symbolKindVscode.test.ts) — AC9 (or table in workspaceSymbols.test.ts)
- [`server/src/server.ts`](../../server/src/server.ts) — stretch only

**Docs (문서 step or same PR):**

- [`docs/plans/completed/0023-workspace-symbol.md`](completed/0023-workspace-symbol.md) (this plan)
- [`extension/CHANGELOG.md`](../../extension/CHANGELOG.md) (AC13)
- [`docs/product/requirements-status.md`](../product/requirements-status.md) (AC13)
- Optional: [`vsix/ARCHITECTURE.md`](../../ARCHITECTURE.md) — one line under workspace navigation

**Explicitly out of scope:** `vim/**`, grammar-only changes unless tests require fixtures, semantic tokens, diagnostics rule changes, rename/references behavior.

---

## Implementation order (개발 가이드)

1. Extract **`symbolKindToVscode`** + table test (AC9); export gather **constants**.
2. Implement **`mergeWorkspaceDocs`**, **`selectDiskDocsForMerge`**, **`searchWorkspaceSymbols`** (+ **`isCancelled`**) + unit tests (AC1–AC8).
3. Implement **`FtlWorkspaceSymbolProvider`** (constants → `findFiles` → `readUri` → merge → search → map) (AC11).
4. Register in **`extension.ts`** (AC10).
5. Full **`npm test`** (AC12).
6. 문서 step: CHANGELOG + requirements-status (AC13); move plan to **`docs/plans/completed/`**.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Large workspaces hang UI | **`findFiles` max 200**; **`maxResults`** on symbol list; check **`CancellationToken`** per file |
| Duplicate URIs (open + disk) | Dedupe by `uri.toString()`; prefer open doc text |
| Reading huge files | Same as today’s definition provider; skip unreadable; no change to read helper |
| Empty query floods picker | Cap **`maxResults`** on search; same merged doc set as filtered query (bounded by **`findFiles` max**) |
| Language id not `freemarker` for `.ftl` on disk | Rely on extension’s `files.associations` in workspace; open docs always filtered by `languageId` |

---

## Test plan

From `vsix/extension/`:

```bash
npm test
```

Manual (optional): multi-file workspace, **Ctrl+T** → type macro prefix → jump to definition file; cancel mid-search on huge folder; verify outline (Ctrl+Shift+O) unchanged for single file.

---

## Wave 1 one-liner

**Pure `searchWorkspaceSymbols` filters `indexFtl` declarations across a bounded `{uri,text}` set; `FtlWorkspaceSymbolProvider` gathers open FTL + ≤200 workspace files, maps to `SymbolInformation`, registers in extension — no daemon, no vim, no AST nesting.**
