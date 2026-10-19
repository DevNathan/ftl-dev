# 0016 - ftldoc (JavaDoc-like docs in FTL comments)

Status: **completed**. QA: `npm test` exit 0 (from `extension/`). Repo: `vsix/` only — never touch `vim/`.

Feature lives **inside** the ftl-dev VS Code extension (`vsix/extension`), not as a separate marketplace extension.

**Important for 개발:** Ad-hoc code may already exist under `extension/src/ftldoc.ts`, `ftldoc.test.ts`, and related wiring in `symbols.ts` / `docs.ts` / hover. **개발 must re-implement (or rewrite/align) against this document** — replace or reshape existing files until they satisfy the acceptance criteria below. Do **not** rubber-stamp ad-hoc code as done.

Related: [0003-navigation-providers.md](0003-navigation-providers.md) (symbol index / definition), [0005-hover-import-completions.md](0005-hover-import-completions.md) (hover Markdown), [0010-symbols-outline-references.md](0010-symbols-outline-references.md).

## Goal

Support **ftldoc**: JavaDoc-like documentation written in the FTL comment immediately above a declaration, then surface it in Hover (Markdown) and keep Go-to-definition correct for `#local` static scope.

Product rules (fixed):

1. Only a **leading** FTL comment (`<#-- … -->` / `[#-- … --]`) with **whitespace-only** between comment end and the declaration attaches as documentation.
2. After trim, if the first token is `@ignore` (case-insensitive) → **no** documentation attached (for throwaway assigns such as `<#assign r = ob.log() />`).
3. Tags: free-text **summary** body, `@param name …`, `@return` / `@returns`, `@deprecated` (optional message).
4. Applies to: `#function`, `#macro`, `#assign`, `#local`, `#global`.
5. `#local` docs and name resolve only inside the enclosing `#function` / `#macro` body (static scope).
6. Behavior covered by unit tests.

## Scope paths (files likely touched)

- `extension/src/ftldoc.ts` — parse / extract / Markdown format (create or rewrite)
- `extension/src/ftldoc.test.ts` — unit tests for parser, attachment, ignore, local scope
- `extension/src/symbols.ts` — attach `doc` on indexed symbols; `#local` scope bounds; `findDefinitions(…, atOffset?)` respects local scope
- `extension/src/docs.ts` and/or `extension/src/hoverProvider.ts` — Hover shows Markdown from attached ftldoc
- `extension/src/providers.ts` — Definition provider passes offset into scoped lookup when needed
- `extension/src/comments.ts` — reuse existing FTL comment ranges / end detection (no parallel comment scanner unless required)
- `extension/package.json` — ensure `test:unit` includes `ftldoc.test.js` (if not already)
- `extension/CHANGELOG.md` — docs step when shipping (not required for 개발 green)

## Non-goals

- No changes under `vim/`.
- No separate VS Code marketplace extension or new package for ftldoc alone.
- No grammar / TextMate changes for ftldoc highlighting.
- No requirement to support HTML/`/* */` / line-`//` comments as documentation sources.
- No attachment when non-whitespace (code/HTML) sits between comment end and declaration.
- No full JavaDoc / FreeMarker doclet ecosystem (`@see`, `@throws`, multi-paragraph param continuation beyond line-oriented parsing, etc.) unless already trivial in the chosen parser — unknown `@` tags may be ignored.
- No runtime template evaluation.
- Outline / completion UX beyond “doc available on symbol for Hover” is optional; AC focuses on parse, attach, Hover Markdown, and scoped definition.

## Approach

### Parser (`ftldoc.ts`)

1. **Extract leading comment body** at a declaration offset:
   - Walk left over whitespace only; require an FTL comment range whose **end** equals that position (no intervening non-whitespace).
   - Strip `<#--`/`-->` or `[#--`/`--]` delimiters; support both syntaxes.
2. **`parseFtlDoc(body)`**:
   - Trim; if empty → `undefined`.
   - If first token is `@ignore` (case-insensitive word boundary) → `undefined` (entire doc discarded).
   - Otherwise collect summary lines until `@` tags begin; parse `@param name rest`, `@return`/`@returns`, `@deprecated` (optional text; empty may still mark deprecated).
   - Mid-body `@ignore` is **not** the leading-ignore rule (ignore that tag line or treat as unknown — must not wipe a doc that did not start with `@ignore`).
3. **`formatFtlDocMarkdown(name, kind, doc)`** — stable Markdown for Hover: symbol header, optional Deprecated, summary, Parameters list, Returns.

### Index attachment (`symbols.ts`)

On each indexed declaration (`assign` | `macro` | `function` | `local` | `global`), call leading extract+parse and set optional `doc` on the symbol. Skip when `@ignore` or no leading comment.

For `#macro` / `#function`, record half-open body `[scopeStart, scopeEnd)`. For each `#local`, attach the enclosing definition body’s scope (static; not call-site / `<@macro>` content). Locals without an enclosing definition body get no usable resolve scope (consistent with “only inside enclosing body”).

### Hover / definition

- Hover: when resolving an identifier to a symbol that has `doc`, render via `formatFtlDocMarkdown` (Markdown hover).
- `findDefinitions(index, name, atOffset?)`: when `atOffset` is provided, `#local` hits are included only if `atOffset` is inside that local’s `[scopeStart, scopeEnd)`. Without offset, keep existing same-file name lookup behavior for non-local kinds; locals must not leak outside their scope when offset is supplied (Definition / Hover paths must pass offset).

### Re-implement note

If current `ftldoc.ts` / wiring diverges from AC, **rewrite to match this plan** rather than documenting the ad-hoc shape as truth. Tests in `ftldoc.test.ts` are the contract.

## Acceptance criteria (testable)

- **AC1:** A `<#-- … -->` (or `[#-- … --]`) immediately above `#function` / `#macro` / `#assign` / `#local` / `#global` (whitespace-only between) attaches parsed documentation to that symbol.
- **AC2:** Non-whitespace between comment end and declaration → no `doc` attached.
- **AC3:** After trim, leading `@ignore` / `@IGNORE` → `doc` is absent (including throwaway `<#assign r = … />`).
- **AC4:** Summary body plus `@param name …`, `@return` / `@returns`, and optional `@deprecated` parse into structured fields.
- **AC5:** `formatFtlDocMarkdown` includes summary, Parameters, Returns, and Deprecated when present.
- **AC6:** Hover path surfaces that Markdown for a documented symbol (unit-level via formatter + index/`doc` attachment is sufficient if provider is thin).
- **AC7:** `#local` with leading ftldoc keeps `doc` on the local symbol; `findDefinitions` with an offset **inside** the enclosing `#function`/`#macro` body can resolve that local; an offset **outside** that body does not.
- **AC8:** Angle and square FTL comment syntaxes both attach (at least one documented declaration each).
- **AC9:** Unit tests in `extension/src/ftldoc.test.ts` cover AC1–AC8; `npm run test:unit` runs them (via `package.json`).

## Test plan

| Area | File / command |
|------|----------------|
| Parser, `@ignore`, leading attach, Markdown, square comments, local scope + `findDefinitions` | `extension/src/ftldoc.test.ts` |
| Regression: symbol index / definition still green | `extension/src/symbols.test.ts` (no breakage) |
| Run | `npm run test:unit` from `extension/` (must include `out/ftldoc.test.js`) |

Minimal cases the 개발 suite should include (names flexible):

1. `parseFtlDoc` summary + `@param` + `@return` + `@deprecated`
2. Leading `@ignore` → `undefined`
3. Leading comment on `#function` → `indexFtl(…).symbols[].doc`
4. `@ignore` above `#assign` → symbol exists, `doc` undefined
5. `#assign` without ignore keeps summary
6. `#local` scoped resolve in/out of enclosing `#function`
7. `formatFtlDocMarkdown` sections
8. Square-bracket leading comment on `#function`

## Out of scope reminder

`vim/` is out of scope for this plan. Ship notes go in `extension/CHANGELOG.md` at the **문서** step.
