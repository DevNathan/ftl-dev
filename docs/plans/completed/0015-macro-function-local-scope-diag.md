# 0015 - Macro/function nesting and #local scope diagnostics

Status: **completed**  
Started: 2026-10-20  
Completed: 2026-10-20  
Repo: `vsix/` only — never touch `vim/`.

Related: [0006-ftl-syntax-diagnostics.md](0006-ftl-syntax-diagnostics.md) (directive stack foundation), [0011-diagnostics-phase2.md](0011-diagnostics-phase2.md), [0021-context-analyzer.md](0021-context-analyzer.md) (Wave 2 — completion/hover context only; **does not** own syntax diagnostics).

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
- Do not move macro/function/`#local` scope rules into Wave 2 **Context Analyzer** (`extension/src/context/`); those modules probe cursor context for IDE features, not document-wide syntax validation.

## Current code checkpoint (2026-10-20)

- **`findDirectiveIssues`** in `extension/src/diagnostics.ts` scans `#`/`@` directive tokens via `scanDirectives`, maintains **`stack: DirTok[]`** for open block directives, and handles **`#else` / `#elseif`** against the `#if` stack (`findStackDir`).
- **`@` sigil tokens are skipped** in the main loop (user-macro calls do not affect the stack) — matches Rule A’s “ignore `<@…>`” requirement.
- Block opens are pushed after **`#list` `as` check** and the **`selfClose` / `empty` early-continue**; **`macro` / `function` are in `BLOCK_DIRECTIVES`**; **`local` is in `CAPTURE_ASSIGN_DIRECTIVES`** (capture `#local` can stack; short `#local` exits before push).
- **Shipped:** `macroFunctionDepth(stack)` plus nesting and `#local` scope checks in `findDirectiveIssues`; unit tests in `diagnostics.test.ts`.
- **`validateFtl`** aggregates `findDirectiveIssues` with other layer-A checks; implementation stays here (0021 does not replace this path).

## Approach

Extend the existing **`findDirectiveIssues` token loop** in `diagnostics.ts`, which already maintains a **`stack` of open block directives** and special cases **`#else` / `#elseif`** against the `#if` stack.

### Helper: macro/function definition depth

Count open stack entries whose `name` is `"macro"` or `"function"`. Use **only `#` directive tokens**; continue to **ignore `@` user-macro call tokens** so markup inside `<@banner>…</@banner>` does not count as a definition nest.

Suggested name: `macroFunctionDepth(stack)` (local function in `diagnostics.ts`).

### Rule A — nested `#macro` / `#function` definitions

When processing an open `#macro` or `#function` that will be pushed onto the stack: if depth is already `>= 1`, emit an error on the inner open token (message aligned with FreeMarker: macro/function definitions cannot nest).

Insertion point: after block-open eligibility is known, **before** `stack.push(tok)` (same region as `isBlockDirectiveOpen(tok)`).

### Rule B — `#local` outside macro/function body

When the directive name is `local` (any scanner form): if depth is `0`, emit an error. Run this check **before** the `selfClose` early-continue so short `<#local x=1 />` at top level are caught.

Capture-block `#local` at top level should also error (depth 0 at open time).

### Verification

- Extend `extension/src/diagnostics.test.ts` with one focused test (or small group) per AC below; assert **`severity: "error"`** and that the diagnostic **`offset`** spans the offending open directive token.

## Acceptance criteria (testable)

- [x] **AC1:** `<#macro a><#macro b></#macro></#macro>` — error on inner `<#macro b>` open; outer macro has no nesting error.
- [x] **AC2:** Nested `#function` and mixed `#macro` + `#function` (either order) — error on the **inner** definition open; same rule as AC1.
- [x] **AC3:** Top-level `<#macro m></#macro>` and `<#if true><#macro m></#macro></#if>` — **no** macro/function nesting error.
- [x] **AC4:** `<@wrap><#macro m></#macro></@wrap>` — **no** nesting error (user-macro call body is not a definition nest).
- [x] **AC5:** Top-level angle short form `<#local x = 1 />` — error on `#local` open.
- [x] **AC6:** Top-level square short form `[#local x = 1 /]` — error on `#local` open.
- [x] **AC7:** `<#macro m><#local x = 1 /></#macro>` and `<#function f()><#local x = 1 /></#function>` — **no** `#local` scope error.
- [x] **AC8:** `<#list items as i><#local x = 1 /></#list>` at template level — error on `#local`; `<#macro m><#list items as i><#local x = 1 /></#list></#macro>` — **no** `#local` scope error.
