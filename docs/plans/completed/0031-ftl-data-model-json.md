# 0031 - Project file `.ftl-data-model.json` (ADR 0002 stretch)

Status: **completed**  
Started: 2026-10-20  
Completed: 2026-10-20  
Repo: `vsix/` only — never touch `vim/`.

Related: [ADR 0002](../../decisions/0002-undeclared-vs-datamodel.md), [0029-strict-variables.md](0029-strict-variables.md) (setting allowlist; this plan adds project-file merge), [0032b-sighelp-datamodel.md](0032b-sighelp-datamodel.md) (`templates` path/prefix/glob), [requirements-status](../../product/requirements-status.md).

Apache Manual (policy only — no Java data-model typing): [Variables](https://freemarker.apache.org/docs/dgui_misc_var.html).

---

## Goal

When `ftl-dev.strictVariables` is on, merge the undeclared-root allowlist from workspace/user setting `ftl-dev.dataModel` **plus** roots listed in a project file **`.ftl-data-model.json`** discovered by a single clear rule.

Close the ADR 0002 / requirements stretch left open after plan **0029**. Do **not** invent Java bean / type checking, path/glob scoping, or default-on strict mode.

---

## Why this next

Plan **0029** shipped opt-in layer B with `ftl-dev.strictVariables` + `ftl-dev.dataModel`. Teams that keep host-injected names in-repo (not only in personal/workspace settings) still lack the project file ADR named as and/or. Requirements-status lists `.ftl-data-model.json` as the remaining data-model gap.

---

## ADR alignment

| ADR 0002 rule | This plan |
|---------------|-----------|
| Configured externals = settings **and/or** `.ftl-data-model.json` | **Merge** both into one allowlist when strict is on |
| “listing globals per path/glob” | **MVP:** flat root-name list only. Path/glob / per-folder maps = **non-goal** (document as future) |
| Heuristics alone must not silence names | Unchanged — file roots are **explicit** config, same as setting |
| Never require a Java language server | No Java / LSP enrichment |
| Layer B off by default | Unchanged — this plan does **not** flip `strictVariables` default |

**Caveats vs ADR wording:**

1. ADR’s “per path/glob” is **not** in MVP — one flat `roots` list for the whole workspace folder.
2. Discovery is **workspace-folder root only** (not walk-up from the open `.ftl` file) — see Discovery below.
3. Invalid / unreadable JSON must **not** crash the extension; treat file roots as empty and surface a non-fatal signal (Output channel).

---

## Inventory (repo today, post-0029)

| Area | State |
|------|--------|
| [`strictVariables.ts`](../../extension/src/strictVariables.ts) | Pure `findUndeclaredIdentifierIssues`; `dataModel?: readonly string[]` → `buildKnownGlobals` |
| [`diagnostics.ts`](../../extension/src/diagnostics.ts) | `ValidateFtlOptions.dataModel` passed through when strict on |
| [`diagnosticsProvider.ts`](../../extension/src/diagnosticsProvider.ts) | Reads `ftl-dev.strictVariables` / `ftl-dev.dataModel` only; refreshes on those config keys; **no** project-file load / watch |
| [`package.json`](../../extension/package.json) | Settings exist; no mention of `.ftl-data-model.json` |
| `.ftl-data-model.json` | **Does not exist** in repo (expected — consumer project file) |

---

## File format (normative)

**Only supported shape** (UTF-8 JSON object):

```json
{
  "roots": ["userService", "request", "ctx"]
}
```

| Rule | Detail |
|------|--------|
| Top level | Must be a JSON **object** with key `"roots"` |
| `roots` | Array of **strings**; each string is one top-level / root identifier (case-sensitive exact match, same as `ftl-dev.dataModel`) |
| Empty | `"roots": []` or missing file → no extra names from file |
| Rejected | Bare JSON array (`["a","b"]`), non-array `roots`, non-string elements, non-object top level, JSON parse errors |

**Rationale for object-only (not bare array):** one clear schema; room to add fields later (e.g. path/glob) without a second format war. Bare arrays are **invalid** in MVP → same handling as parse errors (no crash; empty file contribution + Output notice).

Duplicate names (within file, or overlapping settings) are fine — merged with `Set` semantics.

---

## Discovery rule (locked)

**Workspace-folder root only.**

1. For an open Freemarker document, resolve the VS Code **workspace folder** that contains `doc.uri` (`workspace.getWorkspaceFolder(uri)`).
2. Look for exactly:  
   `{workspaceFolder.uri.fsPath}/.ftl-data-model.json`  
   (fixed file name at the **folder root** — not nested, not walk-up).
3. Multi-root workspaces: each folder may have its own file; a document uses **only** the file of **its** containing folder.
4. Document **outside** any workspace folder (or no folders): **no** project file — settings allowlist only.
5. Do **not** walk parent directories from the `.ftl` path looking for nearer files.
6. Do **not** search nested package folders for alternate `.ftl-data-model.json` files in MVP.

**Why not walk-up:** one predictable location per workspace folder; avoids “which file wins?” when several ancestors exist; matches “project file” language. Nested / per-package files remain a possible follow-on with an explicit ADR amendment.

---

## Merge semantics

When `strictVariables` is **true**:

```text
effectiveDataModel = Set(ftl-dev.dataModel ∪ file.roots)
```

- Order does not matter (set union).
- When strict is **false**, do **not** require loading the file for diagnostics (may still watch for future refresh; loading only when needed is OK).
- Setting-only and file-only both work; either alone can silence roots.

---

## Non-goals

- Java bean enrichment, property/method graphs, class typing
- Path / glob / per-template allowlists inside the JSON
- Walk-up discovery or multiple nested `.ftl-data-model.json` files
- Changing `ftl-dev.strictVariables` default (stays **false**)
- Full FreeMarker type model / expression AST
- **`vim/**`** port
- LSP extraction / shared server
- Accepting bare JSON array as an alternate format (explicitly rejected)
- Schema contribution to VS Code JSON language service (nice-to-have stretch — do not block)

---

## Recommended MVP scope

**Must ship:**

1. **Pure parse helper** (no vscode), e.g. `parseFtlDataModelJson(text): { roots: string[] } | { error: string }`:
   - JSON.parse safely; validate object + `roots` string array; filter/reject bad elements with a clear error string.
2. **Loader + cache** in/near diagnostics provider (or small `dataModelFile.ts`):
   - Resolve workspace-folder path → read file (fs / `vscode.workspace.fs`).
   - Cache by folder URI + mtime / content version; invalidate on watch events.
   - On missing file → empty roots (not an error).
   - On invalid JSON / schema → empty roots + **Output channel** message (channel name e.g. `FTL Dev`); **never** throw into the diagnostic pipeline.
3. **Wire merge** in `diagnosticsProvider` before `validateFtl`:  
   `dataModel: [...settings, ...fileRoots]` (dedupe optional; `Set` inside `buildKnownGlobals` already handles dupes if passed as array with duplicates).
4. **File watcher**: `createFileSystemWatcher` for `.ftl-data-model.json` at each workspace folder root (or a narrow relative pattern). On create/change/delete → invalidate cache + `refreshVisible()` (same as config change).
5. **Workspace folder changes**: on `onDidChangeWorkspaceFolders`, rebind watchers / refresh.
6. **Unit tests** for parse helper (valid object, empty roots, bare array rejected, bad types, garbage JSON) and for merge behavior via existing `findUndeclaredIdentifierIssues` / `validateFtl` options (pass merged array — no vscode required for core ACs).
7. **Docs (문서 step):** CHANGELOG + requirements-status (note project file Done; path/glob still deferred) + move plan to `completed/`.

**Stretch (do not block 승인):**

- Contribute JSON schema / `jsonValidation` so editors get completions for `roots`
- Walk-up or nested discovery
- Path/glob entries inside the file
- Diagnostic attached to the JSON document itself when open (Output is enough for MVP)

---

## Approach

### 1. Parse (pure)

```text
parseFtlDataModelJson(raw):
  try JSON.parse
  if not object or Array.isArray → error
  if roots missing → treat as []
  if roots not array → error
  for each item: must be string; collect
  return { roots }
```

### 2. Provider merge

```text
const cfg = readStrictOptions()  // existing
const fileRoots = awaitOrSync loadRootsForDocument(doc)  // [] if none/invalid
validateFtl(text, {
  index,
  strictVariables: cfg.strictVariables,
  dataModel: [...cfg.dataModel, ...fileRoots],
})
```

Prefer **sync** read from cache so existing debounce path stays sync; warm/cache on watch + first use. If first read must be async, refresh again after load — avoid blocking UI; do not leave stale empty forever without a follow-up refresh.

### 3. Invalid file UX

| Condition | Behavior |
|-----------|----------|
| File absent | Silent; settings only |
| Unreadable (permissions) | Output warning; empty file roots |
| JSON parse / schema fail | Output warning with path + reason; empty file roots; settings still apply |
| Valid | Merge; no Output spam |

Do **not** add undeclared-style warnings on every `.ftl` line for a bad project file.

### 4. Watch / refresh

Mirror config-change behavior: any change to the relevant `.ftl-data-model.json` → refresh open Freemarker docs (at least those in that workspace folder; refreshing all visible Freemarker docs is acceptable MVP).

---

## Acceptance criteria

**Format / discovery**

- [x] **AC1:** Documented normative format is `{ "roots": string[] }` only; bare array is invalid.
- [x] **AC2:** Discovery is **workspace-folder root** `.ftl-data-model.json` only (no walk-up); outside-workspace docs get no file roots.
- [x] **AC3:** Multi-root: document in folder A uses only A’s file, not B’s.

**Merge / strict**

- [x] **AC4:** `strictVariables` false → still **zero** undeclared-identifier diags even if the project file lists roots (layer B stays gated).
- [x] **AC5:** strict on, empty setting, file `roots: ["hostOnly"]`, template `${hostOnly}` → **no** undeclared warning for `hostOnly`.
- [x] **AC6:** strict on, setting has `"fromSettings"`, file has `"fromFile"`, template uses both → neither root warns; unknown third root still warns.
- [x] **AC7:** strict on, no file, setting-only allowlist still works as in **0029** (regression).

**Errors / watch**

- [x] **AC8:** Invalid JSON or rejected schema → extension does not crash; file contributes **no** roots; Output channel records a warning (assertable in unit test via parse helper returning `error`; provider Output wiring covered by manual or light integration note).
- [x] **AC9:** After a valid file is created/updated/deleted on disk, open Freemarker diagnostics refresh to reflect new allowlist (watcher + cache invalidate).

**Verification / docs**

- [x] **AC10:** `cd vsix/extension && npm test` exit **0**.
- [x] **AC11:** CHANGELOG Unreleased + requirements-status updated (project-file stretch closed; path/glob still deferred); plan moved to `docs/plans/completed/` in 문서 step.

---

## Scope paths (likely touched)

**Product / tests (개발):**

- [`extension/src/diagnosticsProvider.ts`](../../extension/src/diagnosticsProvider.ts) — load/merge file roots; watch; refresh
- New helper e.g. [`extension/src/dataModelFile.ts`](../../extension/src/dataModelFile.ts) (parse + optional path resolve helpers; keep vscode I/O in provider if preferred)
- [`extension/src/dataModelFile.test.ts`](../../extension/src/dataModelFile.test.ts) (or extend `strictVariables.test.ts`) — AC1 parse cases + merge via options
- Optionally thin note in [`extension/package.json`](../../extension/package.json) setting description for `ftl-dev.dataModel` mentioning the project file (docs-only clarity; not required for ACs)

**Docs (문서 step — done):**

- This plan → [`docs/plans/completed/0031-ftl-data-model-json.md`](0031-ftl-data-model-json.md)
- [`extension/CHANGELOG.md`](../../extension/CHANGELOG.md)
- [`docs/product/requirements-status.md`](../../product/requirements-status.md)

**Explicitly out of scope:** `vim/**`, LSP, Java enrichment, path/glob JSON fields, walk-up discovery, default-on `strictVariables`, bare-array format.

---

## Implementation order (개발 가이드)

1. Pure `parseFtlDataModelJson` + unit tests (valid / reject / empty).
2. Cache + load-by-workspace-folder; wire merge in `diagnosticsProvider`.
3. FileSystemWatcher + folder-change + refresh.
4. Manual sanity: strict on, add/edit/delete `.ftl-data-model.json` at folder root.
5. Full `npm test` (AC10).
6. 문서: CHANGELOG, requirements-status, move plan (AC11).

---

## Risks

| Risk | Mitigation |
|------|------------|
| Async fs vs sync diagnostic path | Cache-first; refresh again after first load |
| Output spam on every keystroke in bad JSON | Log on load/watch only; throttle identical messages |
| Users expect walk-up / nested files | Document discovery rule in plan + CHANGELOG; reject expanding silently |
| Temptation to add path/glob in same PR | Non-goal; flat `roots` only |
| Multi-root wrong file | Always `getWorkspaceFolder(doc.uri)` |

---

## Test plan

From `vsix/extension/`:

```bash
npm test
```

Focused pure asserts:

- `{ "roots": ["a"] }` → roots `["a"]`
- `["a"]` / `{ "roots": [1] }` / `{ }` / garbage → error or empty per helper contract
- `findUndeclaredIdentifierIssues` with merged `dataModel` covering AC5–AC7

Manual: enable strictVariables; place `.ftl-data-model.json` at workspace root; confirm `${listed}` vs `${typo}`; break JSON and confirm Output + no crash; edit file and see Problems update.

---

## Wave 1 one-liner

Merge project `.ftl-data-model.json` (`{ "roots": [...] }` at workspace-folder root) into the opt-in strictVariables allowlist alongside `ftl-dev.dataModel`.
