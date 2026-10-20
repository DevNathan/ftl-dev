# 0030 - Directive named-param Hover-on-param

Status: **completed**  
Started: 2026-10-20  
Completed: 2026-10-20  
Note: **AC10** (optional clause-keyword Hover for `as` / `in` / `using`) was **skipped** here — shipped later in [0032a](0032a-directive-leftovers.md).  
Repo: `vsix/` only — never touch `vim/`.

Related: [0027-directive-param-docs-diagnostics.md](0027-directive-param-docs-diagnostics.md) (`DIRECTIVE_PARAM_DOCS` + `paramDocumentation`; Hover shipped here), [0026-directive-param-aliases-values.md](0026-directive-param-aliases-values.md), [0024-directive-named-params.md](0024-directive-named-params.md), [0005-hover-import-completions.md](0005-hover-import-completions.md) (builtin / directive / symbol Hover), [0032a-directive-leftovers.md](0032a-directive-leftovers.md) (clause Hover + value catalogs), [requirements-status](../../product/requirements-status.md).

Apache refs: [ftl](https://freemarker.apache.org/docs/ref_directive_ftl.html), [setting](https://freemarker.apache.org/docs/ref_directive_setting.html), [include](https://freemarker.apache.org/docs/ref_directive_include.html).

---

## Goal

When the caret is on a **known** `#ftl` / `#setting` / `#include` named-param LHS (snake or camel) inside an open directive tag, **Hover** shows the same one-liner already used by completions — reuse `paramDocumentation` / `DIRECTIVE_PARAM_DOCS` from [`directiveParams.ts`](../../extension/src/directiveParams.ts). Do **not** invent a second docs map.

Optionally (if trivial): same one-liner Hover for clause keywords `as` / `in` / `using` when the caret is on those tokens inside an open clause-catalog directive.

Preserve existing Hover precedence for builtins, directive names, and symbols.

---

## Why this next

Requirements gap #2 after 0029: completion one-liners shipped in **0027**; Hover-on-param was explicitly out of that MVP. Catalog + lookup helpers already exist — only the cursor probe + Hover wire-up remain.

---

## Inventory (repo today, post-0027 / 0029)

| Area | State |
|------|--------|
| [`directiveParams.ts`](../../extension/src/directiveParams.ts) | `DIRECTIVE_PARAM_DOCS`, `camelToSnakeParam`, `paramDocumentation` — **ready to reuse** |
| [`DirectiveParamCompletionProvider.ts`](../../extension/src/completion/DirectiveParamCompletionProvider.ts) | Already sets `documentation: paramDocumentation(label)` |
| [`hoverProvider.ts`](../../extension/src/hoverProvider.ts) | Order: `builtinAt` → `directiveAt` → `identifierAt` + symbol/import Hover — **no param path** |
| [`hoverTokens.ts`](../../extension/src/hoverTokens.ts) / [`context/hoverAtCursor.ts`](../../extension/src/context/hoverAtCursor.ts) | Pure `builtinAt` / `directiveAt` only (prefix `<#` / `[#` / close forms) — param name under caret never matches `directiveAt` |
| [`diagnostics.ts`](../../extension/src/diagnostics.ts) | `scanNamedParamLhs(inner)` (private) + `scanDirectives` with `inner` / `innerStart` — string/comment/depth-aware LHS scan for `#ftl`/`#setting`/`#include` |
| [`context/completionContext.ts`](../../extension/src/context/completionContext.ts) | `findNearestOpenDirective` + name/clause/value slot detection for **completion** (prefix-oriented; not a Hover probe) |
| Tests | [`hoverImport.test.ts`](../../extension/src/hoverImport.test.ts) covers builtin/directive markdown helpers — **no** param-Hover asserts yet |

**Directive name vs param:** caret on `ftl` in `<#ftl …>` → `directiveAt` wins (unchanged). Caret on `encoding` / `stripWhitespace` inside the tag body → neither builtin nor directive probe; today falls through to symbol Hover or nothing.

---

## Non-goals

- Locale / charset / format / `output_format` **value** catalogs (Hover or completion)
- Unknown-param diagnostics on directives other than `#ftl` / `#setting` / `#include`
- Expanding Hover docs beyond the existing one-liners (no Apache prose dumps; no `freemarkerRef` rewrite)
- Hover on param **values** (right of `=`)
- Semantic-token / TextMate changes
- **vim/** port, LSP server, `.ftl-data-model.json`
- Changing completion docs or 0027 diagnostic behavior

---

## Recommended MVP scope

**Must ship:**

1. **Pure probe** (name flexible), e.g. `namedParamAt(text, offset)` in/near `context/hoverAtCursor.ts` (re-export via `hoverTokens` / `context/index` as needed):
   - Resolve identifier under caret (same word rules as existing id helpers; **not** dotted `ns.sym`).
   - Confirm caret is inside an **open/empty** `#ftl` | `#setting` | `#include` tag body (angle or square), not in a string / FTL comment, and not on the directive name itself.
   - Confirm the identifier is a **named-param LHS**: depth-0 `ident` + optional space + `=` (not `==`) — align with 0027 `scanNamedParamLhs` semantics.
   - If `paramDocumentation(name)` is defined → return `{ name, start, end }` (or equivalent) for Hover.
   - Unknown LHS (no docs) → no param Hover (fall through; diagnostics already warn).

2. **Wire [`FtlHoverProvider`](../../extension/src/hoverProvider.ts):**
   ```text
   builtinAt → directiveAt → namedParamAt → identifierAt / symbol / import
   ```
   - Param Hover content: plain one-liner via `paramDocumentation` → `MarkdownString` (same text as completion docs; no extra heading required).
   - Must **not** steal Hover when caret is on `#directive` name or `?builtin`.

3. **Unit tests** for probe + (optionally) a thin pure helper used by the provider path without requiring a full VS Code `HoverProvider` host — assert one-liner equality with `DIRECTIVE_PARAM_DOCS` / `paramDocumentation`.

**Optional (ship if cheap):**

4. Clause-keyword Hover: caret on `as` / `in` / `using` inside an open directive that lists that keyword in `DIRECTIVE_CLAUSE_KEYWORDS`, reuse `paramDocumentation`. Skip if it needs a large new scanner — prefer extend the same open-tag + identifier check.

---

## Approach

### 1. Prefer reuse over a third scanner

개발 picks the least invasive of:

- **A (preferred):** Extract or share LHS hit detection with diagnostics (`scanNamedParamLhs` + `scanDirectives` / `innerStart`) so Hover and 0027 stay consistent on strings / comments / `(){}[]` depth.
- **B:** Lightweight cursor probe: nearest open `#ftl|setting|include` (pattern akin to `findNearestOpenDirective`) + “identifier under offset is followed by `\s*=(?!=)` at depth 0 in the tag body.”

Do **not** duplicate `DIRECTIVE_PARAM_DOCS`. Always call `paramDocumentation`.

### 2. Precedence (locked)

| Caret on | Hover |
|----------|--------|
| `?builtin` | builtin (unchanged) |
| `#name` / `[#name` directive identifier | directive (unchanged) |
| Known named-param LHS in `#ftl`/`#setting`/`#include` | **new** one-liner |
| Other identifier with symbol / import hit | symbol (unchanged) |
| Value after `=` / unknown param / outside tag | no param Hover |

If a local symbol happens to share a catalog param name, **inside** a matching open named-param tag on an LHS, param Hover wins (more specific context). Outside that context, symbol Hover unchanged.

### 3. Presentation

Keep blurbs identical to completion: e.g. `strip_whitespace` / `stripWhitespace` → `Strip whitespace around FTL tags when true.`

Optional detail line (not required): `` `#ftl` parameter `` — only if it stays one short Markdown block and tests still assert the one-liner body.

### 4. Docs (문서 step — not 개발)

- CHANGELOG Unreleased — done
- requirements-status Completions/Hover row + gap #2 wording — done
- Move this plan → `docs/plans/completed/` — done

---

## Acceptance criteria

**Core Hover**

- [x] **AC1:** In `<#ftl encoding="UTF-8">` (or equivalent), caret on `encoding` yields Hover whose markdown/text includes `paramDocumentation("encoding")` / `DIRECTIVE_PARAM_DOCS.encoding`.
- [x] **AC2:** Camel LHS: caret on `stripWhitespace` in `<#ftl stripWhitespace=true>` yields the same one-liner as `strip_whitespace`.
- [x] **AC3:** At least one `#setting` name (e.g. `locale`) and one `#include` name (e.g. `ignore_missing` or `ignoreMissing`) show the catalog one-liner on Hover over the LHS.
- [x] **AC4:** Square syntax `[#ftl encoding=…]` behaves like angle form for AC1-style assert.

**Precedence / non-interference**

- [x] **AC5:** Caret on the directive name `ftl` / `setting` / `include` still returns **directive** Hover (not the param one-liner).
- [x] **AC6:** Caret on a `?builtin` still returns builtin Hover when both patterns could theoretically compete (regression).
- [x] **AC7:** Caret on a param **value** (e.g. on `UTF-8` or on `true` after `=`) does **not** claim named-param Hover from this feature.
- [x] **AC8:** Identifier only inside a quoted string in the tag does not get param Hover.
- [x] **AC9:** Nested `=` keys inside `{}` / `()` / `[]` (e.g. under `ns_prefixes=`) do not get named-param Hover for those inner keys.

**Optional clause**

- [ ] **AC10 (optional):** Caret on `as` in `<#list xs as x>` (or `in` / `using` on their directives) shows `paramDocumentation("as")` (etc.) when implemented; if skipped, document in 개발 notes and leave unchecked. **Skipped** (non-trivial; see header Note + `namedParamHover.test.ts`).

**Regression / verification / docs**

- [x] **AC11:** Existing hover/import / completion-docs / unknown-param tests still pass.
- [x] **AC12:** `cd vsix/extension && npm test` exit **0**.
- [x] **AC13:** CHANGELOG Unreleased + requirements-status touch; plan moved to `docs/plans/completed/` in 문서 step.

---

## Scope paths (likely touched)

**Product / tests (개발):**

- [`extension/src/context/hoverAtCursor.ts`](../../extension/src/context/hoverAtCursor.ts) — and/or small sibling for `namedParamAt`
- [`extension/src/hoverTokens.ts`](../../extension/src/hoverTokens.ts) / [`extension/src/context/index.ts`](../../extension/src/context/index.ts) — re-exports
- [`extension/src/hoverProvider.ts`](../../extension/src/hoverProvider.ts) — insert param branch after directive, before symbol
- [`extension/src/diagnostics.ts`](../../extension/src/diagnostics.ts) — **only if** extracting/sharing `scanNamedParamLhs` (optional refactor; behavior-preserving)
- [`extension/src/directiveParams.ts`](../../extension/src/directiveParams.ts) — **read-only reuse** unless a tiny export tweak is needed (prefer no doc-map edits)
- [`extension/src/hoverImport.test.ts`](../../extension/src/hoverImport.test.ts) and/or focused `hoverAtCursor` / `namedParamAt` tests — AC1–AC9 (+ AC10 if shipped)

**Docs (문서 step):**

- This plan → `docs/plans/completed/0030-directive-param-hover.md`
- [`extension/CHANGELOG.md`](../../extension/CHANGELOG.md)
- [`docs/product/requirements-status.md`](../../product/requirements-status.md)

**Explicitly out of scope:** `vim/**`, value catalogs, other-directive unknown-param, LSP, `.ftl-data-model.json`, TextMate / semantic tokens, Signature Help.

---

## Implementation order (개발 가이드)

1. Add pure `namedParamAt` (or shared LHS-at-offset) + AC1–AC4 / AC7–AC9 unit tests.
2. Wire `FtlHoverProvider` precedence (AC5–AC6).
3. Optional AC10 clause Hover if a few lines.
4. Full `npm test` (AC11–AC12).
5. 문서: CHANGELOG, requirements-status, move plan (AC13).

---

## Risks

| Risk | Mitigation |
|------|------------|
| Stealing directive Hover on the name token | Probe only tag **body** LHS; AC5 |
| False Hover on values / nested hash keys | Require depth-0 `ident=` LHS; AC7–AC9 |
| Divergence from 0027 string/comment rules | Share scanner or copy the same skip rules; lock with AC8 |
| Symbol Hover clash on common names (`encoding`) | Param wins only on LHS inside open catalog directive; elsewhere unchanged |
| Over-building clause support | AC10 optional; skip if non-trivial |

---

## Test plan

From `vsix/extension/`:

```bash
npm test
```

Focused asserts:

- `namedParamAt('<#ftl encoding="UTF-8">', offsetOnEncoding)` → docs text matches `DIRECTIVE_PARAM_DOCS.encoding`.
- Camel twin same text; setting/include samples; square form.
- Offset on `ftl` → probe undefined (directive path still owns Hover).
- Value / string / nested key offsets → undefined.

Manual (optional): open a `.ftl`, hover `locale` in `<#setting locale="en_US">` and confirm the completion one-liner appears.

---

## Wave 1 one-liner

**Hover on `#ftl` / `#setting` / `#include` named-param LHS (snake∪camel) reuses `paramDocumentation` one-liners; keep builtin → directive → param → symbol order — no vim, no value catalogs, no LSP.**
