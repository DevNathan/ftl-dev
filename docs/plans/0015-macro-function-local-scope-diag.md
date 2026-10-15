# 0015 - Macro/function nesting and #local scope diagnostics

Status: **planned — not implemented**. Repo: `vsix/` only — never touch `vim/`.

An implementation briefly appeared in the working tree and was removed before ship. Do not treat this plan as completed until code lands again under a future pipeline run.

Related: [0006-ftl-syntax-diagnostics.md](0006-ftl-syntax-diagnostics.md) (directive stack foundation), [0011-diagnostics-phase2.md](0011-diagnostics-phase2.md).

## Goal

Answer two FreeMarker 2.3 scope rules with **layer-A syntax errors** in the VS Code extension (no runtime required to discover mistakes):

1. **`#function` / `#macro` definitions cannot nest** inside another `#function` or `#macro` definition body (runtime: *"Macro or function definitions can't be nested into each other."*).
2. **`#local` is only valid inside a `#macro` or `#function` definition body** — not at template (global) scope, not inside `#if` / `#list` / capture `#assign` alone, etc.

Definitions at top level or inside non-macro/function blocks (e.g. `#if`) remain **valid**. Content inside a user **`<@macro>` call** is caller/template context (not a nested definition) and must **not** trigger nesting errors.

## Scope paths (files likely touched)

- `extension/src/diagnostics.ts` (`findDirectiveIssues`)
- `extension/src/diagnostics.test.ts`
- `extension/CHANGELOG.md` (docs step when shipping)

## Non-goals

- No changes under `vim/`.
- No grammar / TextMate changes (`freemarker.tmLanguage.json`).
- No semantic tokens, symbols, outline, or completion behavior changes.
- Do not diagnose `#global` placement (only `#local` per this plan).
- Do not model full FreeMarker parse trees, `#nested` / `<@…>` bodies as definition scopes, or import/library loading.
- Do not add runtime execution or template evaluation.

## Approach

Extend the existing **`findDirectiveIssues` token loop** in `diagnostics.ts`, which already maintains a **`stack` of open block directives** and special cases **`#else` / `#elseif`** against the `#if` stack.

### Helper: macro/function definition depth

Count open stack entries whose `name` is `"macro"` or `"function"`. Use **only `#` directive tokens**; continue to **ignore `@` user-macro call tokens** so markup inside `<@banner>…</@banner>` does not count as a definition nest.

### Rule A — nested `#macro` / `#function` definitions

When processing an open `#macro` or `#function` that will be pushed onto the stack: if depth is already `>= 1`, emit an error on the inner open token.

### Rule B — `#local` outside macro/function body

When the directive name is `local` (any scanner form): if depth is `0`, emit an error. Run this check before the `selfClose` early-continue so short locals at top level are caught.

## Acceptance criteria (testable)

- **AC1:** `<#macro a><#macro b></#macro></#macro>` flags the inner `<#macro b>`.
- **AC2:** Nested `#function` / mixed `#macro`+`#function` flag the inner open the same way.
- **AC3:** Top-level and `#if`-wrapped macros produce no nesting error.
- **AC4:** `<@wrap><#macro m></#macro></@wrap>` produces no nesting error.
- **AC5–AC6:** Top-level angle/square `#local` is flagged.
- **AC7:** `#local` inside `#macro` / `#function` is allowed.
- **AC8:** `#local` in `#list` at template level is flagged; ok when the `#list` is inside `#macro`.
