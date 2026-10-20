# 0027 - Directive param one-liner docs + unknown named-param diagnostics

Status: **completed**  
Started: 2026-10-20  
Completed: 2026-10-20  
Note: Closes **0026 AC13** (per-param completion one-liners). Hover-on-param still out of MVP.  
Repo: `vsix/` only — never touch `vim/`.

Related: [0026-directive-param-aliases-values.md](0026-directive-param-aliases-values.md) (aliases + boolean value slot; AC13 closed here), [0024-directive-named-params.md](0024-directive-named-params.md) (snake catalog + `directiveParam` + TextMate), [0011-diagnostics-phase2.md](0011-diagnostics-phase2.md) (unknown `#directive`), [0018-ftldoc-deprecated-usage-diag.md](0018-ftldoc-deprecated-usage-diag.md) (warning wiring via `validateFtl`).

Apache refs: [ftl](https://freemarker.apache.org/docs/ref_directive_ftl.html), [setting](https://freemarker.apache.org/docs/ref_directive_setting.html), [include](https://freemarker.apache.org/docs/ref_directive_include.html).

---

## Goal

Continue the directive-param track after 0024 + 0026. Ship two leftover / deferred items:

1. **AC13 from 0026 (now required):** tiny one-liner `documentation` on named-param (and optionally clause-keyword) completion items from a small map in/near [`directiveParams.ts`](../../extension/src/directiveParams.ts).
2. **Unknown named-param diagnostics** for `#ftl` / `#setting` / `#include` when a `name=` left-hand identifier is **not** in the snake ∪ camel catalog (heuristic, string-aware, comment-aware).

Non-goals stay out: semantic-token overlay, full charset/locale/format value catalogs, **vim/**, `strictVariables`, builtin Signature Help, LSP.

---

## Why this next

0026 shipped aliases + boolean value completions but explicitly deferred AC13. Completions still have only `detail` (`ftl parameter` / `setting name` / `clause`) — no per-param tip. Unknown `#directive` already exists ([`diagnostics.ts`](../../extension/src/diagnostics.ts) `KNOWN_DIRECTIVES`); unknown `encodingg=` / `local=` typos on `#ftl` / `#setting` / `#include` are silent. Catalog + `scanDirectives` → `DirTok.inner` already give enough for a layer-A heuristic without a parser.

---

## Inventory (repo today, post-0026)

| Area | State |
|------|--------|
| [`directiveParams.ts`](../../extension/src/directiveParams.ts) | Snake lists, `snakeToCamel`, `namedParamsWithAliases`, `paramsForDirective`, `isBooleanDirectiveParam`; **no** `DIRECTIVE_PARAM_DOCS` |
| [`DirectiveParamCompletionProvider.ts`](../../extension/src/completion/DirectiveParamCompletionProvider.ts) | Name / clause / value; sets `detail`; **no** `documentation` |
| Completion plumbing | [`catalog.ts`](../../extension/src/catalog.ts) `CompletionCandidate.documentation?`; [`completionProvider.ts`](../../extension/src/completionProvider.ts) maps to `MarkdownString` — ready |
| [`diagnostics.ts`](../../extension/src/diagnostics.ts) | `validateFtl` → `findDirectiveIssues` / unknown directive / structure; `scanDirectives` yields `inner` (string/comment-aware close scan) — **no** unknown-param pass |
| Clause keywords | `as` / `in` / `using` on list/assign/visit family — **not** `name=` params; must never be flagged as unknown named params |
| Hover / `freemarkerRef` | Directive-level blurbs only; per-param Hover **out of MVP** unless already trivial (prefer completion docs only) |

### Catalog names to document (snake keys; camel lookups normalize)

**ftl:** `encoding`, `strip_whitespace`, `strip_text`, `strict_syntax`, `attributes`, `ns_prefixes`, `auto_esc`, `output_format`  
**setting:** `locale`, `number_format`, `boolean_format`, `date_format`, `time_format`, `datetime_format`, `time_zone`, `sql_date_and_time_time_zone`, `c_format`, `url_escaping_charset`, `output_encoding`, `classic_compatible`  
**include:** `parse`, `encoding`, `ignore_missing`  

Optional clause one-liners (same map or tiny sibling): `as`, `in`, `using`.

---

## Non-goals

- Semantic-token overlay for attribute names
- Charset / locale / format-pattern / `output_format` **value** catalogs
- Per-template snake vs camel convention enforcement (still offer / accept both)
- Dedicated Hover-on-param-under-cursor (unless free via existing Hover path — default: completion `documentation` only)
- Expanding Signature Help to built-in directives / `@` named args
- Flagging unknown params on other directives (`transform`, user `@`, …)
- Flagging **values** (right of `=`), expressions, or positional `#include` path
- Flagging clause keywords `as` / `in` / `using` as unknown params
- **vim/**, LSP server, `strictVariables` / undeclared-name layer B
- Full FreeMarker parser / AST

---

## Recommended MVP scope

**Must ship:**

1. **`DIRECTIVE_PARAM_DOCS`** (name flexible): `Readonly<Record<string, string>>` keyed by **snake** param name (and optionally clause keywords), living in/near `directiveParams.ts`. One short English one-liner each — not Apache prose dumps.
2. Helper `paramDocumentation(name: string): string | undefined` that resolves camel → snake (match via existing `snakeToCamel` over catalog snakes, or a small reverse map) then looks up the docs map.
3. **`DirectiveParamCompletionProvider`:** for `kind === "named"` / `"clause"`, set `documentation` when a one-liner exists (keep existing `detail`). Value-slot `true`/`false` need no param docs.
4. **`findUnknownDirectiveParamIssues`** (name flexible) called from `validateFtl` (or from `findDirectiveIssues` for `#` opens of `ftl`|`setting`|`include` only):
   - Scan tag **inner** at nesting depth 0 (skip strings; skip FTL comments; do not match inside `()` / `{}` / `[]`) for `\b([A-Za-z_][\w]*)\s*=(?!=)`.
   - If LHS ∈ `namedParamsWithAliases(directive)` → OK.
   - If LHS is clause keyword `as`|`in`|`using` → **never** flag.
   - Else → diagnostic on the **identifier** span (offset/length in full document), severity **`warning`** (heuristic; matches 0018 style — not as hard as unknown directive `error`).
   - Message assertable, e.g. `Unknown parameter 'foo' for '#ftl'.` / `Unknown setting name 'foo'.` / `Unknown parameter 'foo' for '#include'.`
5. Unit tests for docs on at least one ftl param completion; unknown-param positive + negative cases (known snake, known camel, value not flagged, string interior not flagged, nested hash `=` not flagged, comments not flagged, clause keywords not flagged).

---

## Approach

### 1. Docs map (`directiveParams.ts`)

```text
DIRECTIVE_PARAM_DOCS: Readonly<Record<string, string>>
  // snake keys → one-liner
  // optional: as / in / using

camelToSnakeParam(name): string | undefined
  // if name is already snake in any DIRECTIVE_NAMED_PARAMS list → name
  // else find snake where snakeToCamel(snake) === name

paramDocumentation(name: string): string | undefined
  // lookup DIRECTIVE_PARAM_DOCS[camelToSnakeParam(name) ?? name]
```

Keep blurbs tiny (≤ ~80 chars). Example tone: `strip_whitespace` → `Strip whitespace around FTL tags when true.`; `locale` → `Default locale for number/date formatting.`; `ignore_missing` → `If true, missing include path is silent.`

Do **not** require editing `freemarkerRef.ts` for MVP.

### 2. Completion provider

In name/clause branch of `DirectiveParamCompletionProvider.provide`:

```text
documentation: paramDocumentation(label)  // omit / undefined if missing
```

Regression: value kind unchanged; AC12-style existing completion tests still pass.

### 3. Diagnostics

Prefer a dedicated pass (clearer tests) wired like deprecated usage:

```text
validateFtl → … → findUnknownDirectiveParamIssues(text)
```

Algorithm sketch:

1. `tokens = scanDirectives(text)` (already string/comment-aware for tag bounds).
2. For each `#` token with `name` in `{ftl, setting, include}` and `kind` open/empty (include self-close), take `inner` and absolute `innerStart` (may need a small extension of `DirTok` to expose `innerStart`, or re-derive from `tok.offset` + head length — 개발 picks the least invasive option; if `inner` alone is enough for relative spans, add `innerStart` once).
3. Walk `inner` with string skip + comment skip + depth for `(){}[]`:
   - At depth 0, on match of identifier + `=` (not `==`), record absolute offset of the identifier.
4. Classify with `namedParamsWithAliases` + clause deny-list.
5. Emit warnings; sort by offset.

**Square syntax:** `[#ftl …]` / `[#setting …]` / `[#include …]` same rules.

### 4. Docs (문서 step — not 개발)

- CHANGELOG Unreleased
- requirements-status Completions + Diagnostics rows / gaps
- Move this plan → `docs/plans/completed/` after 검증QA

---

## Acceptance criteria

**Completion docs (0026 AC13 → required)**

- [x] **AC1:** Name-slot completion for at least one `#ftl` boolean-like param (e.g. `strip_whitespace` or `stripWhitespace`) includes non-empty `documentation` from the catalog map.
- [x] **AC2:** Camel label resolves to the same one-liner as its snake twin (lookup normalize works).
- [x] **AC3:** At least one `#setting` name (e.g. `locale` or `number_format`) and one `#include` name (e.g. `ignore_missing`) carry non-empty `documentation` when completed.
- [x] **AC4 (optional but preferred):** Clause completions `as` / `in` / `using` include a short `documentation` one-liner when offered.
- [x] **AC5:** Value-slot `true`/`false` items do not require param docs; name-slot items keep existing `detail` strings.

**Unknown named-param diagnostics**

- [x] **AC6:** `validateFtl('<#ftl encodingg="UTF-8">')` (or equivalent typo) yields a **warning** whose message mentions the unknown name and `#ftl` (or “parameter”).
- [x] **AC7:** `validateFtl('<#setting local="en_US">')` (typo for `locale`) yields a warning for unknown setting name.
- [x] **AC8:** `validateFtl('<#include "a.ftl" parse_missing=true>')` (unknown LHS) yields a warning; known `ignore_missing=` / `ignoreMissing=` do **not**.
- [x] **AC9:** Known snake and camel LHSs do not warn: e.g. `strip_whitespace=` / `stripWhitespace=` / `numberFormat=` / `output_format=`.
- [x] **AC10:** Values are not flagged: content after `=` (including identifiers inside values) does not produce “unknown parameter” for those value tokens.
- [x] **AC11:** String-aware: an identifier that only appears inside a quoted string in the tag is not flagged as a param LHS.
- [x] **AC12:** Nested structure: `=` inside `{}` / `()` / `[]` at depth &gt; 0 (e.g. hash entries under `ns_prefixes=` / `attributes=`) does **not** produce unknown-param warnings for those inner keys.
- [x] **AC13:** FTL comment skip: param-like text only inside `<#-- … -->` is not flagged.
- [x] **AC14:** Clause keywords `as` / `in` / `using` are never reported as unknown named params (even if a synthetic `as=` appeared in a tested tag).
- [x] **AC15:** Square syntax `[#setting bogus=1]` warns similarly to angle form.
- [x] **AC16:** Severity for these diagnostics is `"warning"` (not `"error"`).

**Regression / verification / docs**

- [x] **AC17:** Existing unknown-directive / structure / deprecated-usage tests still pass; no new false positives on navigation fixture shapes already asserted clean (or extend fixture assert only if still green).
- [x] **AC18:** `cd vsix/extension && npm test` exit **0**.
- [x] **AC19:** CHANGELOG Unreleased + requirements-status touch; plan moved to `docs/plans/completed/` in 문서 step.

---

## Scope paths (likely touched)

**Product / tests (개발):**

- [`extension/src/directiveParams.ts`](../../extension/src/directiveParams.ts) — docs map + lookup helpers
- [`extension/src/completion/DirectiveParamCompletionProvider.ts`](../../extension/src/completion/DirectiveParamCompletionProvider.ts) — attach `documentation`
- [`extension/src/diagnostics.ts`](../../extension/src/diagnostics.ts) — unknown-param pass + `validateFtl` wire-up; possibly expose `innerStart` on `DirTok`
- [`extension/src/catalog.ts`](../../extension/src/catalog.ts) — re-export helpers if tests import via catalog
- [`extension/src/catalog.test.ts`](../../extension/src/catalog.test.ts) and/or focused provider / `directiveParams` tests — AC1–AC5
- [`extension/src/diagnostics.test.ts`](../../extension/src/diagnostics.test.ts) — AC6–AC17

**Docs (문서 step):**

- This plan → `docs/plans/completed/0027-directive-param-docs-diagnostics.md`
- [`extension/CHANGELOG.md`](../../extension/CHANGELOG.md)
- [`docs/product/requirements-status.md`](../../product/requirements-status.md)

**Explicitly out of scope:** `vim/**`, TextMate / semantic tokens, `freemarkerRef` expansion (unless 개발 finds a one-line re-export useful — not required), value catalogs, Signature Help, LSP.

---

## Implementation order (개발 가이드)

1. Add `DIRECTIVE_PARAM_DOCS` + normalize lookup + AC1–AC3 (AC4 if cheap) tests via provider/`buildCompletions`.
2. Wire provider `documentation` field (AC5).
3. Implement unknown-param scan on `ftl`/`setting`/`include` inners; unit tests AC6–AC16.
4. Regression AC17 + full `npm test` (AC18).
5. 문서: CHANGELOG, requirements-status, move plan (AC19).

---

## Risks

| Risk | Mitigation |
|------|------------|
| False positives on `=` inside hash/paren values | Depth-0 only; AC12 locks it |
| False positives inside strings / comments | Reuse string + FTL comment skip patterns from `scanDirectives` / comments helpers; AC11/AC13 |
| Camel vs snake mismatch in docs lookup | Normalize via `snakeToCamel` reverse; AC2 |
| Warning noise on exotic FreeMarker forms | Limit to three directives; warning not error; do not invent params for `@` / `transform` |
| `DirTok` lacks absolute inner offset | Add `innerStart` in same change or compute from head — keep spans accurate for squiggles |
| Docs map drift vs catalog | Key only snakes already in `DIRECTIVE_NAMED_PARAMS`; unit test that every snake has a docs entry **or** allow sparse map with AC only requiring subset — **prefer full coverage of Inventory snakes** so AC3 is trivial |

**Coverage preference:** every snake in `DIRECTIVE_NAMED_PARAMS.ftl|setting|include` should have a docs one-liner (small set — ~23 keys). Optional clauses separately.

---

## Test plan

From `vsix/extension/`:

```bash
npm test
```

Focused asserts:

- Completion: `buildCompletions` / provider for `<#ftl strip_` → item `strip_whitespace` has `documentation`; camel twin same text.
- Diagnostics: typo LHS warns; known snake/camel silent; nested `=` silent; strings/comments silent.

Manual (optional): hover completion docs for `locale`; type `<#ftl encodin` → complete with docs; `<#setting local=` → warning squiggle on `local`.

---

## Wave 1 one-liner

**Attach tiny per-param completion docs from a `directiveParams` map, and warn on unknown `name=` LHS for `#ftl` / `#setting` / `#include` (snake∪camel catalog, string/comment/depth-aware) — no vim, no value catalogs, no LSP.**
