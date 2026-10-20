# 0026 - Directive param camelCase aliases + boolean value completions

Status: **completed**  
Started: 2026-10-20  
Completed: 2026-10-20  
Note: **AC13 (optional)** per-param one-liner `documentation` was deferred here; **closed via [0027](0027-directive-param-docs-diagnostics.md)** (completion docs shipped; Hover still out of MVP).  
Repo: `vsix/` only — never touch `vim/`.

Related: [0024-directive-named-params.md](0024-directive-named-params.md) (shipped snake_case catalog + `directiveParam` context + TextMate attribute names), [0027-directive-param-docs-diagnostics.md](0027-directive-param-docs-diagnostics.md) (param docs + unknown-param diagnostics), [0007-apache-reference-completions.md](0007-apache-reference-completions.md), [0021-context-analyzer.md](0021-context-analyzer.md).

Apache refs: [ftl](https://freemarker.apache.org/docs/ref_directive_ftl.html) (camelCase note since 2.3.23), [setting](https://freemarker.apache.org/docs/ref_directive_setting.html) + [2.3.23](https://freemarker.apache.org/docs/versions_2_3_23.html) (`<#setting numberFormat=…>`), [include](https://freemarker.apache.org/docs/ref_directive_include.html).

---

## Goal

Ship the highest-value **0024 deferred stretch**:

1. **CamelCase aliases** for built-in `#ftl` / `#setting` / `#include` named parameters — in **completion** and the TextMate `#directive-named-param` attribute-name list (keep in sync).
2. **Value-slot completions** of `true` / `false` when the cursor is after `=` for **boolean-like** named params (new context or extend `directiveParam` with a value kind).

Optional (only if AC stay small):

3. Tiny **param one-liner** on completion `documentation` (and/or Hover if already wired) — reuse a small catalog map; **not** full Apache prose.

Still deferred after 0026: unknown-param diagnostics, semantic-token overlay, full locale/charset/format value lists, **vim/**.

---

## Why this next

0024 already detects open-tag `directiveParam` and completes snake_case names; after `=` it **bails to `general`** (AC9). CamelCase templates (FreeMarker 2.3.23+) get no name completions / no attribute highlight. Boolean params (`strip_whitespace=`, `parse=`, …) get no `true`/`false` help. These two gaps are pure catalog + context extensions — no parser, no Signature Help change.

---

## Inventory (Apache-verified)

### A. CamelCase aliases (snake → camel)

Rule: split on `_`, lowercase first segment, Capitalize subsequent segments; identifiers with no `_` stay identical. Both forms are valid; FreeMarker enforces **one convention per template** for template-language identifiers (we still offer both in completion — same as IntelliJ-style dual lists; no template-wide convention detection in MVP).

| Directive | snake_case (0024) | camelCase alias |
|-----------|-------------------|-----------------|
| **ftl** | `encoding` | *(same)* |
| | `strip_whitespace` | `stripWhitespace` |
| | `strip_text` | `stripText` |
| | `strict_syntax` | `strictSyntax` |
| | `attributes` | *(same)* |
| | `ns_prefixes` | `nsPrefixes` |
| | `auto_esc` | `autoEsc` |
| | `output_format` | `outputFormat` |
| **setting** | `locale` | *(same)* |
| | `number_format` | `numberFormat` |
| | `boolean_format` | `booleanFormat` |
| | `date_format` | `dateFormat` |
| | `time_format` | `timeFormat` |
| | `datetime_format` | `datetimeFormat` |
| | `time_zone` | `timeZone` |
| | `sql_date_and_time_time_zone` | `sqlDateAndTimeTimeZone` |
| | `c_format` | `cFormat` |
| | `url_escaping_charset` | `urlEscapingCharset` |
| | `output_encoding` | `outputEncoding` |
| | `classic_compatible` | `classicCompatible` |
| **include** | `parse` | *(same)* |
| | `encoding` | *(same)* |
| | `ignore_missing` | `ignoreMissing` |

**Include:** Apache documents `ignore_missing` / `parse` / `encoding`; camelCase follows the same 2.3.23 template-language identifier rule (`ignoreMissing`). Include in MVP so all three named-param directives stay consistent.

**Not aliases:** clause keywords `as` / `in` / `using` (unchanged).

### B. Boolean-like named params (value-slot `true`/`false`)

Only params whose Apache docs specify boolean constants (or expression→boolean). Legacy string forms `"yes"`/`"no"` etc. are **out of MVP** value lists.

| Directive | Param (either naming) | Notes |
|-----------|----------------------|-------|
| **ftl** | `strip_whitespace` / `stripWhitespace` | boolean constants |
| | `strip_text` / `stripText` | boolean |
| | `strict_syntax` / `strictSyntax` | boolean |
| | `auto_esc` / `autoEsc` | boolean |
| **setting** | `classic_compatible` / `classicCompatible` | boolean-ish setting |
| **include** | `parse` | expression → boolean |
| | `ignore_missing` / `ignoreMissing` | expression → boolean |

**Not boolean (no value list in 0026):** `encoding`, `output_format`, `attributes`, `ns_prefixes`, `locale`, `*_format`, `time_zone`, `c_format`, `url_escaping_charset`, `output_encoding`, `sql_date_and_time_time_zone`, …

### C. Repo today (post-0024)

| Area | State |
|------|--------|
| [`directiveParams.ts`](../../extension/src/directiveParams.ts) | Snake_case only; comment says camelCase out of MVP |
| [`completionContext.ts`](../../extension/src/context/completionContext.ts) | `directiveParam` with `kind: "named" \| "clause"`; after `=` → `null` → `general` |
| [`DirectiveParamCompletionProvider.ts`](../../extension/src/completion/DirectiveParamCompletionProvider.ts) | Names only via `paramsForDirective` |
| TextMate `#directive-named-param` | Snake_case alternation only; sync comment points at `DIRECTIVE_NAMED_PARAMS` |
| `freemarkerRef` | Directive-level blurbs only — no per-param entries |
| requirements-status | Completions row mentions 0024; gaps list does not yet call out camelCase / value slot |

---

## Non-goals

- Unknown-param / unknown-setting **diagnostics**
- Semantic-token overlay for attribute names
- Completing charset / locale / format pattern / output-format **value** catalogs
- Detecting or enforcing per-template snake vs camel convention
- Completing legacy string booleans (`"yes"` / `"no"`)
- Changing Signature Help or `@` macro named args
- **vim/** port
- Full FreeMarker parser / AST

---

## Recommended MVP scope

**Must ship:**

1. Catalog exposes **both** snake and camel names for `ftl` / `setting` / `include` (helper `snakeToCamel` + derived list, or explicit dual lists — prefer **derive camel from snake** so drift is impossible; keep a unit test that locks the alias table above).
2. `paramsForDirective` (or successor used by the provider) returns the union for name-slot completion; TextMate `#directive-named-param` match alternation updated in the **same PR** with sync comment.
3. **Value-slot context** when inside an open `#ftl`/`#setting`/`#include` tag, not in a string, and the last non-space before the value prefix is `=`, and the param name immediately before that `=` is a known boolean-like name (snake or camel):
   - Prefer extending the existing discriminant, e.g.  
     `{ type: "directiveParam"; directive; prefix; kind: "named" \| "clause" \| "value"; paramName?: string }`  
     with `kind: "value"` only for boolean-like params; non-boolean after `=` still falls through to `general` (unchanged vs 0024 AC9 intent for name lists).
4. Provider offers `true` / `false` (Kind: Value / Constant; detail like `boolean`) filtered by prefix when `kind === "value"`.
5. Unit tests for alias completion labels + value-slot context + boolean completions; regression that name-slot still works and non-boolean `=` does not offer param **names**.

**Optional if cheap (same plan; tick or defer in status):**

6. Tiny `DIRECTIVE_PARAM_DOCS: Record<string, string>` (param base name → one-liner) attached as completion `documentation` for name-slot items. Dedicated Hover-on-param-under-cursor only if existing Hover path already resolves identifiers cheaply; otherwise **defer Hover** and ship completion docs only.

---

## Approach

### 1. Catalog (`directiveParams.ts`)

```text
// Keep snake as source of truth (Apache synopsis order).
DIRECTIVE_NAMED_PARAMS  // unchanged snake lists

snakeToCamel(name): string
namedParamsWithAliases(directive): readonly string[]  // snake ∪ camel, deduped
paramsForDirective(name)  // namedWithAliases ∪ clauses

BOOLEAN_DIRECTIVE_PARAMS: Readonly<Record<string, ReadonlySet<string>>>
  // or flat Set of canonical names accepting both forms via normalize

isBooleanDirectiveParam(directive, paramName): boolean
```

Update file header comment: camelCase **in** MVP for 0026.

### 2. Context (`completionContext.ts`)

In `detectDirectiveParam`, when `lastNonSpace.endsWith("=")`:

1. Parse `paramName` = trailing identifier before that `=` (allow whitespace around `=`).
2. If `isBooleanDirectiveParam(open.name, paramName)` → return  
   `{ type: "directiveParam", directive, prefix, kind: "value", paramName }`.
3. Else → `null` (value slot for strings/hashes → `general`, same as today).

Name/clause path unchanged when not after `=`.

Prefix for value: trailing `[a-zA-Z_][\w]*` or empty (`t` → `true`).

### 3. Provider

`DirectiveParamCompletionProvider`:

- `kind === "value"` → filter `["true", "false"]` by prefix; do not offer param names.
- `named` / `clause` → use `namedParamsWithAliases` ∪ clauses (via updated `paramsForDirective`).

Optional: attach one-liner `documentation` from `DIRECTIVE_PARAM_DOCS` keyed by snake form (normalize camel → snake for lookup).

### 4. TextMate

Extend `#directive-named-param` alternation with every camel alias that differs from snake. Keep `(?=\\s*=[^=])`. Update sync comment to “snake ∪ camel from directiveParams”. Optional grammar fixture line for `outputFormat=` / `ignoreMissing=` if fixtures are restored from `_wip/` (see 0025 note); otherwise unit/completion tests suffice for AC and a grammar fixture can land if `tests/grammar/directive-named-params.ftl` is already green in-tree.

### 5. Docs (문서 step)

- CHANGELOG Unreleased
- requirements-status Completions row + optional gaps note
- Move this plan → `docs/plans/completed/` after 검증QA — **done**

---

## Acceptance criteria

**Catalog / aliases**

- [x] **AC1:** For every snake name in `DIRECTIVE_NAMED_PARAMS.ftl|setting|include` that contains `_`, the derived camel alias from Inventory A is included in name-slot completions (via `paramsForDirective` or `namedParamsWithAliases`).
- [x] **AC2:** Names without `_` (`encoding`, `locale`, `parse`, …) appear once (no duplicate junk labels).
- [x] **AC3:** Unit table lock: at least `stripWhitespace`, `outputFormat`, `autoEsc`, `numberFormat`, `classicCompatible`, `ignoreMissing`, `sqlDateAndTimeTimeZone` are present for the correct directive.

**TextMate sync**

- [x] **AC4:** `#directive-named-param` match includes both snake and distinct camel forms for the Inventory A aliases; comment still points at `directiveParams.ts`.

**Value slot**

- [x] **AC5:** `completionContext('<#ftl strip_whitespace=')` → `directiveParam` with `kind: "value"` (and `paramName` recognizing snake form).
- [x] **AC6:** `completionContext('<#ftl stripWhitespace=')` → same value kind (camel form).
- [x] **AC7:** `completionContext('<#include "a.ftl" parse=')` → value kind; completions include `true` and `false`.
- [x] **AC8:** `completionContext('<#setting locale=')` → **not** value kind for boolean list (still no param-name list; falls to non-`directiveParam` or non-value — i.e. does **not** offer `true`/`false` as if boolean).
- [x] **AC9:** `completionContext('<#ftl strip_whitespace=t')` → value kind, prefix `t`; completion labels include `true` (not `false` if prefix filter excludes it, or both if filter is case-prefix — document: prefix `t` → `true` only).
- [x] **AC10:** Inside string after `=`: `completionContext('<#ftl encoding="UT')` still does not claim param/value context for the string body (0024 AC8 preserved).

**Name-slot regression**

- [x] **AC11:** `completionContext('<#ftl ')` / prefix `strip_` still offers `strip_whitespace` and `strip_text`; prefix `stripW` offers `stripWhitespace`.
- [x] **AC12:** Existing directive / builtin / special / ns completion tests still pass.

**Optional docs**

- [x] **AC13 (optional):** Name-slot completion one-liners — **deferred in 0026; closed via [0027](0027-directive-param-docs-diagnostics.md)** (`DIRECTIVE_PARAM_DOCS` + provider `documentation`).

**Verification / docs**

- [x] **AC14:** `cd vsix/extension && npm test` exit **0**.
- [x] **AC15:** CHANGELOG Unreleased + requirements-status touch; plan moved to `docs/plans/completed/` in 문서 step.

---

## Scope paths (likely touched)

**Product / tests (개발):**

- [`extension/src/directiveParams.ts`](../../extension/src/directiveParams.ts)
- [`extension/src/catalog.ts`](../../extension/src/catalog.ts) — re-exports if new helpers
- [`extension/src/context/completionContext.ts`](../../extension/src/context/completionContext.ts)
- [`extension/src/completion/DirectiveParamCompletionProvider.ts`](../../extension/src/completion/DirectiveParamCompletionProvider.ts)
- [`extension/src/completion/CompletionProvider.ts`](../../extension/src/completion/CompletionProvider.ts) / [`completionProvider.ts`](../../extension/src/completionProvider.ts) — type union / switch if `kind` widened
- [`extension/syntaxes/freemarker.tmLanguage.json`](../../extension/syntaxes/freemarker.tmLanguage.json) — `#directive-named-param`
- [`extension/src/catalog.test.ts`](../../extension/src/catalog.test.ts) and/or focused `directiveParams` / context tests
- Grammar fixture under `extension/tests/grammar/` **only if** restoring/updating named-param fixture is low-risk

**Optional:**

- [`extension/src/reference/freemarkerRef.ts`](../../extension/src/reference/freemarkerRef.ts) — only if Hover reuse is truly cheap; prefer docs map next to `directiveParams` instead

**Docs (문서 step):**

- This plan → `docs/plans/completed/0026-directive-param-aliases-values.md`
- [`extension/CHANGELOG.md`](../../extension/CHANGELOG.md)
- [`docs/product/requirements-status.md`](../product/requirements-status.md)

**Explicitly out of scope:** `vim/**`, diagnostics, semantic tokens, locale/charset value lists, Signature Help.

---

## Implementation order (개발 가이드)

1. `snakeToCamel` + alias union + `isBooleanDirectiveParam` + AC1–AC3 tests.
2. Extend `detectDirectiveParam` value branch + AC5–AC10.
3. Provider value branch + name-slot alias filtering + AC7/AC9/AC11–AC12.
4. TextMate alternation sync (AC4); optional grammar fixture.
5. Optional one-liner docs (AC13) or mark deferred.
6. `npm test` (AC14).
7. 문서: CHANGELOG, requirements-status, move plan (AC15).

---

## Risks

| Risk | Mitigation |
|------|------------|
| Dual snake+camel completion noise | Accept for MVP (matches FreeMarker dual validity); prefix filter keeps lists usable |
| Wrong camel for `datetime_format` / `sql_date_and_time_time_zone` | Lock Inventory A in unit tests; derive mechanically from snake |
| Value context false positive after `==` | Reuse existing “ends with `=`” on trimmed prefix-before; do not treat `==` as assignment (last non-space `=` only when single `=` — if before is `==`, `endsWith("=")` is true after second `=` — rare inside `#ftl`; document: require identifier immediately before `=` via parse, and prefer checking the char before `=` is not `=`) |
| TextMate / catalog drift | Same-PR update; derive camel in TS; grammar copy listed in AC4 |
| Grammar fixture still in `_wip/` | Do not block on grammar if suite excludes `_wip/`; completion tests carry AC |

---

## Test plan

From `vsix/extension/`:

```bash
npm test
```

Manual (optional): `<#ftl stripW` → `stripWhitespace`; `<#ftl stripWhitespace=` → `true`/`false`; `<#setting numberF` → `numberFormat`; `<#include "x.ftl" ignoreM` → `ignoreMissing`.

---

## Wave 1 one-liner

**Add camelCase aliases for `#ftl`/`#setting`/`#include` named params (completion + TextMate sync) and `true`/`false` completions in the boolean value slot after `=`; no diagnostics, no vim.**
