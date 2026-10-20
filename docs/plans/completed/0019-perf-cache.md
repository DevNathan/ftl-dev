# 0019 - Shared doc cache & listener gating

Status: **completed**. QA: `npm test` exit 0 (from `extension/`). Repo: `vsix/` only — never touch `vim/`.

Formerly: `PERF-CACHE-2026-10.md`.

## Goal

Hardening editor-host performance for the FTL-dev VS Code extension: stop thrashing the shared document index on every keystroke, reuse cached index/comment ranges across outline / references / diagnostics / semantic tokens, and attach comparison-operator decoration listeners only while the setting is on.

## Scope paths

Concrete files under `vsix/extension/` (verify / finish here):

- `extension/src/docCache.ts` — store `comments` on cache entry; version/text miss rebuilds
- `extension/src/diagnosticsProvider.ts` — no eager `sharedDocCache.delete` on text change; delete on close; pass cached index into `validateFtl`
- `extension/src/diagnostics.ts` — `validateFtl` / deprecated-use accept optional cached `index`
- `extension/src/outlineReferences.ts` — document symbols + references use `sharedDocCache.get`
- `extension/src/outline.ts` — `buildOutlineFromIndex` (reuse path; no re-index in provider)
- `extension/src/references.ts` — `FindReferencesOptions.index` / `.comments`
- `extension/src/semanticTokens.ts` — optional `comments`; skip empty identifier use-scan
- `extension/src/semanticTokensProvider.ts` — pass `cached.comments` (+ index/imports)
- `extension/src/comparisonDisplayProvider.ts` — attach/dispose live listeners with setting
- `extension/CHANGELOG.md` — `[Unreleased]` note

## Non-goals

- Version bump / release / git tag
- Cutting language features for speed
- Import mtime cache
- Fusing / coalescing diagnostic passes
- `.vscodeignore` packaging trim
- Any changes under `vim/`
- Grammar / TextMate / marketplace publish

## Acceptance criteria

- **AC1:** `onDidChangeTextDocument` must **not** call `sharedDocCache.delete`. Cache entry is removed on document **close** only. A version/text miss in `FtlDocCache.get` rebuilds index (+ comments).
- **AC2:** Document symbol provider builds outline from **cached** `index` (`buildOutlineFromIndex`), not a fresh `indexFtl` when the cache hits.
- **AC3:** Find-references provider passes cached `index` and `comments` into `findReferencesAt` / `findReferencesInText` (no redundant `indexFtl` / `ftlCommentRanges` on cache hit).
- **AC4:** Diagnostics `refreshNow` calls `validateFtl(text, { index: cached.index })` so deprecated-use (and any index-based pass) does not re-`indexFtl` when the shared cache already has that version.
- **AC5:** Semantic tokens use `buildSemanticTokenSpansFromIndex` with `comments: cached.comments`. Identifier use-scan (full-document ident regex) is **skipped** when there are no local symbols and no import namespaces to color.
- **AC6:** Comparison-operator presentation: editor/document listeners (and decoration types) are attached **only** when `ftl-dev.comparisonOperatorPresentation` is `true`; turning the setting off disposes those listeners and clears decorations. Configuration change toggles attach/detach without leaving orphan listeners.
- **AC7:** `extension/CHANGELOG.md` `[Unreleased]` documents the performance hardening (cache keep + reuse + gated comparison listeners).

## Approach (short)

1. Treat `sharedDocCache` as the single per-URI index/comment store keyed by version+text; invalidate by rebuild-on-miss and close-delete only.
2. Thread optional `index` / `comments` through pure helpers (`validateFtl`, references, semantic spans) so VS Code adapters never re-scan on a hit.
3. Gate comparison display: `attachLive` / `detachLive` driven by setting + `onDidChangeConfiguration`.
4. Keep behavior identical for users; this step is cost reduction only.

## Test plan

From `vsix/extension/`:

```bash
npm test
```

(`test` = grammar + unit). Existing unit suites for diagnostics, outline, references, semantic tokens, and comparison display must stay green. No new package version required for this step.

Manual smoke (optional for 검증QA): open an `.ftl`, type rapidly with outline/diagnostics visible; with comparison setting off, confirm no decoration churn; toggle setting on/off and confirm listeners/decorations follow.
