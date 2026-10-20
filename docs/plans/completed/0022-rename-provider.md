# 0022 - Rename Provider (Wave 1)

Status: **completed**  
Started: 2026-10-20  
Completed: 2026-10-20  
Repo: `vsix/` only — never touch `vim/`.

Related: [0010-symbols-outline-references.md](0010-symbols-outline-references.md) (Rename was explicit follow-on), [0021-context-analyzer.md](0021-context-analyzer.md) (`identifierAt` in `extension/src/context/`).

---

## Goal

Ship **F2 / Rename Symbol** for FreeMarker user-defined identifiers in the **current document**, using the **same occurrence model** as Find All References (`findReferencesAt` / `findReferencesInText` / `findNameOccurrences` / `identifierAt`).

- Same-file renames for `#assign`, `#macro`, `#function`, `#local`, `#global` names and all in-file occurrences matched by references (including best-effort `ns.sym` parity with references when imports qualify a simple name).
- Thin VS Code `FtlRenameProvider` adapter; pure rename logic unit-tested without VS Code.

---

## Background

| Capability | Today | Notes |
|------------|-------|--------|
| Find references | `findReferencesAt` in [`references.ts`](../../extension/src/references.ts) | Same-file; comment-skipping; import `as ns` → also `ns.simple` |
| Host adapter | `FtlReferenceProvider` in [`outlineReferences.ts`](../../extension/src/outlineReferences.ts) | Uses `sharedDocCache`, `lineMapFor` |
| Registration | [`extension.ts`](../../extension/src/extension.ts) | No `registerRenameProvider` yet |
| Product gap | [`requirements-status.md`](../../product/requirements-status.md) | **RenameProvider** = next candidate #1 |

Plan **0010** deferred Rename; references tests and index outline are the foundation for rename edits.

---

## Approach

### Pure function (testable core)

Add **`renameSymbolAt`** (name may vary; keep exported and stable) in [`references.ts`](../../extension/src/references.ts) **or** new [`rename.ts`](../../extension/src/rename.ts) if file size warrants — prefer **`references.ts`** unless rename helpers grow large.

**Signature (conceptual):**

```text
renameSymbolAt(
  text: string,
  offset: number,
  newName: string,
  options?: { index?: FtlIndex; comments?: Array<[number, number]> }
): RenameEdit[] | undefined
```

Where `RenameEdit = { startOffset, endOffset, newText }` (or reuse a small shared type).

**Algorithm:**

1. **`identifierAt(text, offset)`** — if missing → `undefined` (AC4).
2. **Renameable gate** — allow rename only for symbols that references are meant to serve (same file):
   - Resolve **simple name** (trailing segment of dotted `id.text`).
   - Require at least one **declaration** in `index.symbols` for that simple name with kind `assign` | `macro` | `function` | `local` | `global`.
   - If cursor is on a **builtin** (`?…`), **directive** name, or other non-declared identifier with no matching declaration → `undefined` / no edits (no-op). Optional cheap checks: `builtinAt` / `directiveAt` from context when cursor is clearly not a user symbol.
3. **Validate `newName`** — non-empty; match FTL identifier rules (simple `[A-Za-z_][A-Za-z0-9_]*` or dotted `part(.part)*`); invalid → `undefined` or empty edits (document choice in impl; tests lock behavior).
4. **`findReferencesAt(text, offset, { includeDeclaration: true, index, comments })`** — same hit set as Shift+F12 with declaration.
5. **Per-hit replacement text** — preserve import namespace prefix on qualified hits (consistent with references matching `tools.helper` and `helper` together):
   - Hit text `helper` → replace span with `newName` (or simple segment of dotted `newName` if policy uses trailing segment only).
   - Hit text `tools.helper` → replace with `tools.<newSimple>` where `newSimple` is the last segment of `newName` (or full qualified rewrite if `newName` is dotted — document in tests; default: unqualified rename changes simple segment everywhere).
6. Return edits sorted **descending by `startOffset`** so host applies without offset shift bugs (or return ascending and document single-pass apply — prefer descending for VS Code `TextEdit` batching).

Do **not** re-scan with a different ruleset than references; rename occurrences **must** equal reference hits for the same cursor (minus any future explicit exclusions — none for Wave 1).

### VS Code adapter

**`FtlRenameProvider`** implements `vscode.RenameProvider`:

- `provideRenameEdits(document, position, newName)` → build `WorkspaceEdit` with one `TextEdit` per pure edit (same `document.uri`).
- Reuse **`sharedDocCache`**, **`lineMapFor`**, **`rangeFromOffsets`** (same as `FtlReferenceProvider`).
- Optional **`prepareRename`** returning range for identifier span — improves UX; in-scope if trivial (wrap `identifierAt`).

Place class in [`outlineReferences.ts`](../../extension/src/outlineReferences.ts) (alongside reference provider) **or** [`renameProvider.ts`](../../extension/src/renameProvider.ts) — prefer **separate file** if outlineReferences grows; either is fine if AC5 registration is clear.

### Registration

In [`extension.ts`](../../extension/src/extension.ts):

```text
vscode.languages.registerRenameProvider(FTL_SELECTOR, new FtlRenameProvider())
```

---

## In scope (Wave 1)

- Same-document rename for declared **assign / macro / function / local / global** names.
- All same-file occurrences found by **`findReferencesAt`** (including declaration name, macro call `<@name`, function call, `${name}`, and best-effort **`ns.sym`** occurrences when a simple name is imported as `ns`).
- Skipping occurrences **inside FTL comments** (already omitted from reference hits via `findNameOccurrences` + `ftlCommentRanges`).
- Unit tests on **`renameSymbolAt`**; provider smoke optional (thin delegate).

---

## Out of scope (Non-goals)

| Item | Notes |
|------|--------|
| **`vim/`** | Separate repo / plans |
| **Cross-file rename** | Renaming a macro in `lib.ftl` and all importers — **not Wave 1**. Do not follow import graph or open editors. |
| **Cross-file stretch** | Even “trivial import” multi-file edit is **optional stretch only**; prefer documenting as non-goal unless zero extra logic (unlikely). |
| **Workspace symbols** | Separate plan |
| **AST / tree-sitter** | Text + index model only |
| **HTML / XML tag rename** | Out of scope |
| **Rename inside comments** | Reference model already skips; no extra work |
| **LSP host switch** | Extension remains host; server scaffold unchanged unless stretch |
| **Builtins, directives, keywords** | No rename (no-op / undefined) |
| **Undeclared / free identifiers** | No rename unless a same-file declaration exists for the simple name |

---

## Optional stretch (not required for AC)

- **`server/src/server.ts`**: wire `textDocument/rename` to the same pure `renameSymbolAt` if trivial re-export — only if no new behavior and tests cover pure fn.

---

## Acceptance criteria (testable)

- [x] **AC1:** **`renameSymbolAt`** on a **declaration** (`#assign user`, `#macro greet`, etc.) produces edits for **every** same-file occurrence matched by `findReferencesAt` at that position, and each edit replaces the matched substring with the expected new text (declaration + uses).
- [x] **AC2:** Rename invoked from a **use site** (e.g. `${user}`, `<@greet`) updates the **declaration** and all other uses (same edit set as AC1 from declaration).
- [x] **AC3:** Sample text with identifier-like text **inside `<#-- … -->` / `<#--` block comments** — those spans are **not** in the edit list (parity with references tests).
- [x] **AC4:** Cursor on non-identifier (e.g. `<` of `<#assign`) or non-renameable token → **`undefined`** or empty edits; **`provideRenameEdits`** yields no workspace change.
- [x] **AC5:** **`FtlRenameProvider`** registered in [`extension.ts`](../../extension/src/extension.ts) for `FTL_SELECTOR`.
- [x] **AC6:** `cd vsix/extension && npm test` exit 0 (grammar + unit), including new **`rename.test.ts`** or extended **`references.test.ts`**.
- [x] **AC7:** **[Unreleased]** in [`extension/CHANGELOG.md`](../../extension/CHANGELOG.md) and row update in [`docs/product/requirements-status.md`](../../product/requirements-status.md) — may close in **문서** pipeline step after dev AC6.

---

## Scope paths (likely touched)

**Product / tests (개발):**

- [`extension/src/references.ts`](../../extension/src/references.ts) — `renameSymbolAt` (+ small helper for qualified hit → new text), or
- [`extension/src/rename.ts`](../../extension/src/rename.ts) — pure rename (if split from references)
- [`extension/src/outlineReferences.ts`](../../extension/src/outlineReferences.ts) and/or [`extension/src/renameProvider.ts`](../../extension/src/renameProvider.ts) — `FtlRenameProvider`
- [`extension/src/extension.ts`](../../extension/src/extension.ts) — `registerRenameProvider`
- [`extension/src/rename.test.ts`](../../extension/src/rename.test.ts) or [`extension/src/references.test.ts`](../../extension/src/references.test.ts) — AC1–AC4
- [`extension/src/context/`](../../extension/src/context/) — **read-only** unless rename gate reuses `builtinAt` / `directiveAt`
- [`extension/src/symbols.ts`](../../extension/src/symbols.ts) — index / symbol kinds (read-only or minor helper export)
- [`server/src/server.ts`](../../server/src/server.ts) — stretch only

**Docs (문서 step or same PR):**

- [`docs/plans/completed/0022-rename-provider.md`](0022-rename-provider.md) (this plan)
- [`extension/CHANGELOG.md`](../../extension/CHANGELOG.md) (AC7)
- [`docs/product/requirements-status.md`](../../product/requirements-status.md) (AC7)
- Optional: [`vsix/ARCHITECTURE.md`](../../ARCHITECTURE.md) — one line under language service providers

**Explicitly out of scope:** `vim/**`, grammar `tests/grammar/`, semantic tokens, diagnostics behavior changes.

---

## Implementation order (개발 가이드)

1. Implement **`renameSymbolAt`** with declaration gate + `findReferencesAt` reuse; add unit tests (AC1–AC4) using fixtures aligned with [`references.test.ts`](../../extension/src/references.test.ts) `sample` text.
2. Add **`FtlRenameProvider`** mapping edits → `vscode.WorkspaceEdit`.
3. Register in **`extension.ts`** (AC5).
4. Full **`npm test`** (AC6).
5. 문서 step: CHANGELOG + requirements-status (AC7); mark plan completed.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Qualified vs simple hit replacement inconsistent | Table-driven tests: `helper` + `tools.helper` → same new simple name |
| Rename allowed on non-declared id | Gate on `index.symbols` declaration for simple name |
| Overlapping edits | One edit per reference hit; hits are non-overlapping by construction |
| User expects cross-file rename | Document non-goal; same as references scope |

---

## Test plan

From `vsix/extension/`:

```bash
npm test
```

Manual (optional): open FTL fixture, F2 on `#assign user` → rename → verify outline + references + diagnostics still consistent.

---

## Wave 1 one-liner

**Pure `renameSymbolAt` reuses Find All References hits to build same-file text edits; thin `FtlRenameProvider` + extension registration; no cross-file, no vim, no AST.**
