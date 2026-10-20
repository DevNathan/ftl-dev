# 0024 - Directive named parameters (completion + optional highlight)

Status: **completed**  
Started: 2026-10-20  
Completed: 2026-10-20  
Repo: `vsix/` only — never touch `vim/`.

Related: [0004-completions.md](0004-completions.md), [0007-apache-reference-completions.md](0007-apache-reference-completions.md), [0020-completion-provider-split.md](0020-completion-provider-split.md), [0021-context-analyzer.md](0021-context-analyzer.md), [0002-extension-grammar-spike.md](0002-extension-grammar-spike.md).

Apache refs: [ftl](https://freemarker.apache.org/docs/ref_directive_ftl.html), [setting](https://freemarker.apache.org/docs/ref_directive_setting.html), [include](https://freemarker.apache.org/docs/ref_directive_include.html), [assign](https://freemarker.apache.org/docs/ref_directive_assign.html), [visit/recurse](https://freemarker.apache.org/docs/ref_directive_visit.html), [list](https://freemarker.apache.org/docs/ref_directive_list.html).

---

## Goal

Recognize **built-in FreeMarker directive named parameters / setting names** (and a small set of **fixed keyword clauses**) for:

1. **Completion** when the cursor is inside an open `#directive …` start tag (before `>` / `]`), and
2. **Optional (MVP-included if low-risk)** TextMate highlight of known `name=` attribute names as `entity.other.attribute-name.freemarker` (or equivalent).

Today, directive **names** are catalogued and completed right after `<#` / `[#`, but once inside e.g. `<#ftl ` or `<#setting `, context falls to **`general`** and identifiers are highlighted only as generic `variable.other` via `#expression`. There is **no** catalog of `#ftl` / `#setting` / `#include` params; Signature Help remains macro/function-only (unchanged).

---

## Inventory (verified against Apache manual + repo catalogs)

### A. True named parameters (`name=value`, fixed names)

| Directive | Known parameter / setting names | Notes |
|-----------|----------------------------------|-------|
| **`ftl`** | `encoding`, `strip_whitespace`, `strip_text`, `strict_syntax`, `attributes`, `ns_prefixes`, `auto_esc`, `output_format` | Values must be constants. CamelCase aliases (`outputFormat`, …) exist since 2.3.23 — **MVP = snake_case only**; camelCase stretch. |
| **`setting`** | `locale`, `number_format`, `boolean_format`, `date_format`, `time_format`, `datetime_format`, `time_zone`, `sql_date_and_time_time_zone`, `c_format`, `url_escaping_charset`, `output_encoding`, `classic_compatible` | Syntax is `<#setting name=value>` — the left-hand **name** is one of these setting ids (not an expression). |
| **`include`** | `parse`, `encoding`, `ignore_missing` | After positional path expression. |

### B. Fixed keyword clauses (not `name=value`, but known tokens)

| Directive(s) | Keyword | Role |
|--------------|---------|------|
| `list`, `items`, `import`, `escape` | `as` | Loop / import / escape binder |
| `assign`, `local`, `global` | `in` | Target namespace hash |
| `visit`, `recurse` | `using` | Handler namespace(s) |

These are **high-value, tiny lists** — include in MVP completion when the open directive is one of the above and the cursor is at a keyword-slot position (heuristic: after whitespace / expression, not after `=`).

### C. Out of MVP named-param catalog (document only)

| Directive | Why skipped / different |
|-----------|-------------------------|
| `macro` / `function` | User-defined parameter names — already covered by **Signature Help** + symbol index |
| User `@` calls | Named args from macro definition — Signature Help; do **not** invent a static catalog |
| `transform` | Transform + arbitrary named params (Java/user) — no fixed built-in list |
| `outputformat`, `stop`, `return`, `if` / `elseif` / `case` / `switch`, `nested` | Positional / expression bodies; no fixed `name=` catalog |
| Close tags `</#…>` | No parameters |

### D. Repo status (verified)

| Area | Today |
|------|--------|
| TextMate | `directive-angle` / `directive-square` begin captures directive **names**; body = comment + strings + `#expression` → identifiers = `variable.other.freemarker` |
| `DIRECTIVES` | Names only in [`catalogLists.ts`](../../extension/src/catalogLists.ts) |
| `completionContext` | `directive` only when cursor matches `([<\[]#)(name)?$` — **inside** `<#ftl enc` → **`general`** |
| Providers | Directive / builtin / special / ns / general — **no** param provider ([`defaultEngine.ts`](../../extension/src/completion/defaultEngine.ts)) |
| `freemarkerRef` | Directive hover blurb mentions params by example; **no** per-param catalog |
| Signature Help | Macro/function only — **non-goal** to extend |

---

## Non-goals

- Full FreeMarker parser / AST
- Java / Configuration enrichment of setting values
- Changing macro/function **Signature Help** or `@` call arg completion from definitions
- Completing **values** of params (charsets, locale ids, format patterns) beyond optional trivial boolean `true`/`false` stretch
- Permanent dual snake+camel enforcement or diagnostics for unknown param names
- **vim/** port
- Diagnostics for unknown `#ftl`/`#setting` names (stretch only if cheap after catalog exists)

---

## Recommended MVP scope

**Must ship:**

1. **Static catalog** of known names (tables A + B keywords), keyed by directive (or shared lists where appropriate — e.g. `ASSIGN_NS_KEYWORDS = ["in"]`).
2. **New completion context** when cursor is inside an **open** `#` start-tag (`<#name …` / `[#name …`) **before** the matching `>` / `]`, not inside a string/comment, and the identifier under construction is a **param/keyword candidate** (not value-after-`=`).
3. **Completion items** for that directive’s known names (Kind: Property or Keyword; detail like `ftl parameter` / `setting name` / `clause`).
4. Unit tests locking context detection + completion labels for `#ftl`, `#setting`, `#include`, plus at least one keyword clause (`as` / `in` / `using`).

**Include in MVP if low-risk (preferred):**

5. TextMate: before `#expression` inside built-in directive bodies, match `\b(knownNames)\b(?=\s*=)` with look-ahead that does **not** match `==`, scope `entity.other.attribute-name.freemarker`. Keep list in sync with catalog (generate comment or shared source of truth via build/copy — prefer **one TS catalog + grammar string updated in same PR**, or grammar regex derived in 개발 with a comment “keep sync with catalogLists”).

**Defer (phase 2 / stretch):**

- CamelCase aliases for `#ftl` / `#setting`
- Value completions (`true`/`false` after `strip_whitespace=`)
- Param hover / docs in `freemarkerRef`
- Unknown-param diagnostics
- Semantic-token overlay for attribute names

---

## Approach

### 1. Catalog module

Add to [`catalogLists.ts`](../../extension/src/catalogLists.ts) (or small sibling `directiveParams.ts` re-exported from `catalog.ts`):

```text
DIRECTIVE_NAMED_PARAMS: Readonly<Record<string, readonly string[]>>
  ftl: [...], setting: [...], include: [...]

DIRECTIVE_CLAUSE_KEYWORDS: Readonly<Record<string, readonly string[]>>
  list/items/import/escape: ["as"]
  assign/local/global: ["in"]
  visit/recurse: ["using"]

paramsForDirective(name: string): readonly string[]  // named ∪ clause, deduped
```

Keep snake_case as shipped in Apache synopsis tables. Document camelCase as stretch in CHANGELOG later if added.

### 2. Context detection

Extend [`completionContext.ts`](../../extension/src/context/completionContext.ts) (Wave 2 context module):

New discriminant, e.g.:

```text
{ type: "directiveParam"; directive: string; prefix: string; kind: "named" | "clause" }
```

**Detection sketch (pure, testable on `before` string):**

1. Find the nearest **unclosed** `#` start tag before cursor: last match of `<#name` / `[#name` (not `</#` / `[/#`) whose closing `>` / `]` has not yet appeared (string-aware skip of quotes — reuse or mirror existing comment/string skip patterns if present; keep heuristic documented).
2. If found and `name` is in `DIRECTIVES` (or at least has an entry in the param maps), and cursor is **not** immediately after `<#`/`[#` (that stays `type: "directive"`), classify as `directiveParam`.
3. **Prefix:** trailing identifier `[a-zA-Z_][\w]*` or empty.
4. **Slot heuristic:** if the last non-space before prefix is `=`, treat as **value** position → do **not** offer param names (fall through to `general` / existing); else offer named params + clause keywords for that directive.
5. Priority: keep existing builtin / special / ns / bare-directive-name checks **before** this; insert `directiveParam` **before** final `general`.

### 3. Completion provider

New `DirectiveParamCompletionProvider` registered in [`defaultEngine.ts`](../../extension/src/completion/defaultEngine.ts) **before** `GeneralSymbolCompletionProvider` so param names win over symbols when context matches.

Optional: short documentation string from a tiny map or one-liner pointing at Apache page (not required for AC).

### 4. TextMate (MVP-preferred)

In [`freemarker.tmLanguage.json`](../../extension/syntaxes/freemarker.tmLanguage.json), inside built-in `directive-angle` / `directive-square` patterns (the known-name begin rules only — **not** user `@` / unknown tag catch-alls):

- Insert pattern **before** `#expression`:
  - match known attribute names with `(?=\s*=)(?! =)`-style: `\b(?:encoding|…)\b(?=\s*=[^=])`
  - name: `entity.other.attribute-name.freemarker`
- Add / update a grammar fixture under `tests/grammar/` asserting scopes for `<#ftl encoding="UTF-8">` and `<#setting locale="en_US">`.
- Do **not** require highlighting for clause keywords `as`/`in`/`using` in MVP (operators already; avoid fighting expression rules) — completion-only for B is enough.

### 5. Docs

- `CHANGELOG.md` Unreleased note
- One line in [`requirements-status.md`](../product/requirements-status.md) gaps or Completions row
- Move this plan to `completed/` after 검증QA + 문서

---

## Acceptance criteria

**Catalog**

- [x] **AC1:** `DIRECTIVE_NAMED_PARAMS.ftl` contains at least: `encoding`, `strip_whitespace`, `strip_text`, `strict_syntax`, `attributes`, `ns_prefixes`, `auto_esc`, `output_format`.
- [x] **AC2:** `DIRECTIVE_NAMED_PARAMS.setting` contains at least: `locale`, `number_format`, `boolean_format`, `date_format`, `time_format`, `datetime_format`, `time_zone`, `url_escaping_charset`, `output_encoding`, `classic_compatible`, `sql_date_and_time_time_zone`, `c_format`.
- [x] **AC3:** `DIRECTIVE_NAMED_PARAMS.include` contains `parse`, `encoding`, `ignore_missing`.
- [x] **AC4:** Clause map covers `as` for `list`/`items`/`import`/`escape`; `in` for `assign`/`local`/`global`; `using` for `visit`/`recurse`.

**Context**

- [x] **AC5:** `completionContext('<#ftl ')` (or equivalent with trailing space / empty prefix) → `type: "directiveParam"`, `directive: "ftl"`.
- [x] **AC6:** `completionContext('<#ftl enc')` → `directiveParam` with `prefix: "enc"`; completions include `encoding`.
- [x] **AC7:** `completionContext('<#ftl')` (cursor still on bare directive name) remains `type: "directive"` (existing behavior).
- [x] **AC8:** Inside string: `completionContext('<#ftl encoding="UT')` does **not** claim param context for the string body (no false param items for charset typing), or falls to non-param context.
- [x] **AC9:** After `=`: e.g. `completionContext('<#setting locale=')` does **not** offer setting **names** again as if still in name slot (value slot → no param-name list).
- [x] **AC10:** Square syntax: `[#ftl ` → same `directiveParam` behavior.

**Completion**

- [x] **AC11:** `buildCompletions` for `#ftl` param context with prefix `strip_` includes `strip_whitespace` and `strip_text`.
- [x] **AC12:** `#setting` prefix `loc` → `locale`; prefix `number_` → `number_format`.
- [x] **AC13:** `#include` prefix `ign` → `ignore_missing`.
- [x] **AC14:** `#list xs ` (heuristic open-tag interior) offers `as` among clause completions (or when prefix `a`).
- [x] **AC15:** Param completions do **not** replace / break existing directive-name, `?builtin`, `.special`, or `ns.member` contexts (regression tests from `catalog.test.ts` still pass).

**Highlight (if shipped in same PR; else mark deferred with explicit note in plan status)**

- [x] **AC16:** Grammar fixture: in `<#ftl encoding="UTF-8">`, `encoding` has scope containing `entity.other.attribute-name` (or planned scope name).
- [x] **AC17:** Grammar fixture: `<#setting locale="en_US">` — `locale` same attribute-name scope; `==` comparisons in `#if` do **not** get attribute-name scope for the left identifier.

**Verification / docs**

- [x] **AC18:** `cd vsix/extension && npm test` exit **0**.
- [x] **AC19:** CHANGELOG Unreleased + requirements-status touch; plan moved to `docs/plans/completed/` in 문서 step.

---

## Scope paths (likely touched)

**Product / tests (개발):**

- [`extension/src/catalogLists.ts`](../../extension/src/catalogLists.ts) and/or new `directiveParams.ts`
- [`extension/src/catalog.ts`](../../extension/src/catalog.ts) — re-exports
- [`extension/src/context/completionContext.ts`](../../extension/src/context/completionContext.ts)
- [`extension/src/context/index.ts`](../../extension/src/context/index.ts)
- [`extension/src/completion/DirectiveParamCompletionProvider.ts`](../../extension/src/completion/DirectiveParamCompletionProvider.ts) (new)
- [`extension/src/completion/defaultEngine.ts`](../../extension/src/completion/defaultEngine.ts)
- [`extension/src/completion/CompletionProvider.ts`](../../extension/src/completion/CompletionProvider.ts) — type union if needed
- [`extension/syntaxes/freemarker.tmLanguage.json`](../../extension/syntaxes/freemarker.tmLanguage.json) — if AC16–17 included
- [`extension/src/catalog.test.ts`](../../extension/src/catalog.test.ts) and/or `directiveParams.test.ts` / `completionContext` tests
- Grammar fixtures under `extension/tests/grammar/` (if highlight)

**Docs (문서 step):**

- This plan → `docs/plans/completed/0024-directive-named-params.md`
- [`extension/CHANGELOG.md`](../../extension/CHANGELOG.md)
- [`docs/product/requirements-status.md`](../product/requirements-status.md)

**Explicitly out of scope:** `vim/**`, Signature Help, Java enrichment, unknown-param diagnostics (unless stretch), camelCase aliases (unless stretch).

---

## Implementation order (개발 가이드)

1. Add catalog constants + `paramsForDirective` + unit asserts (AC1–AC4).
2. Extend `completionContext` + tests (AC5–AC10).
3. `DirectiveParamCompletionProvider` + engine registration + completion tests (AC11–AC15).
4. Optional TextMate pattern + grammar fixtures (AC16–AC17); if risky mid-PR, ship completion-only and tick AC16–17 as deferred in status.
5. Full `npm test` (AC18).
6. 문서: CHANGELOG, requirements-status, move plan (AC19).

---

## Risks

| Risk | Mitigation |
|------|------------|
| Open-tag heuristic false positives inside expressions | Require known directive name; string/comment skip; value-after-`=` bail-out |
| TextMate attribute match steals `variable.other` or hits `==` | Use `(?=\s*=[^=])`; fixtures for `#if x == 1` |
| Catalog / grammar drift | Same-PR update; comment “sync with DIRECTIVE_NAMED_PARAMS”; prefer single list for completion, grammar union copy |
| Clause `as`/`in` offered mid-expression | Only when in `directiveParam` open-tag context; prefix filter; don’t offer in value slot |
| CamelCase templates | Document snake_case MVP; stretch aliases |

---

## Test plan

From `vsix/extension/`:

```bash
npm test
```

Manual (optional): open FTL, type `<#ftl ` → expect param list; `<#setting loc` → `locale`; `<#include "a.ftl" ign` → `ignore_missing`; confirm `<#` still completes directive names.

---

## Wave 1 one-liner

**Catalog built-in `#ftl` / `#setting` / `#include` named params (+ `as`/`in`/`using` clauses); detect open-tag `directiveParam` context; complete those names; optionally TextMate-highlight `name=` attributes — no parser, no Signature Help change, no vim.**
