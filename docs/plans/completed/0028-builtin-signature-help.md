# 0028 - Builtin / `?built_in(…)` Signature Help

Status: **completed**  
Started: 2026-10-20  
Completed: 2026-10-20  
Repo: `vsix/` only — never touch `vim/`.

Related: [requirements-status](../../product/requirements-status.md) (gap #2 closed — practical subset), [0021-context-analyzer.md](0021-context-analyzer.md) (shared cursor helpers; Signature Help still call-site local), [0027-directive-param-docs-diagnostics.md](0027-directive-param-docs-diagnostics.md) (explicitly deferred builtin Signature Help), [0007-apache-reference-completions.md](0007-apache-reference-completions.md) (`BUILTIN_REF` / catalog).

Apache Manual (paraphrase only — no Java signature dump): [Built-ins](https://freemarker.apache.org/docs/ref_builtins.html).

---

## Goal

Extend existing Signature Help so that when the caret is inside a **built-in call** `?name(…)` argument list, VS Code shows a signature label + active parameter index — same UX class as `#function` / `#macro` Signature Help already shipped in [`signatureHelp.ts`](../../extension/src/signatureHelp.ts).

MVP is a **practical subset** of common arg-taking built-ins with paraphrased parameter labels (not exhaustive FreeMarker coverage).

---

## Why this next

Requirements gap #2 after macro/function Signature Help: users typing `?replace(`, `?substring(`, `?then(`, etc. get no parameter hints. Hover/`BUILTIN_REF` already document *what* a built-in does (prose + sample usage line) but **do not** expose structured parameter lists. Completions after `?` list names only. Reusing the existing paren / comma heuristics from `findFunctionCall` + `countCommaArgs` is the smallest path.

---

## Inventory (repo today)

| Area | State |
|------|--------|
| [`signatureHelp.ts`](../../extension/src/signatureHelp.ts) | `signatureHelpAt` → `functionCallHelp` \| `macroCallHelp` only; `findFunctionCall` uses `identifierAt` + enclosing `(`; **no** `?` gate |
| [`signatureHelpProvider.ts`](../../extension/src/signatureHelpProvider.ts) | Comment gate → `signatureHelpAt` + import index; no builtin branch |
| [`signatureHelp.test.ts`](../../extension/src/signatureHelp.test.ts) | Function/macro/comma/string nesting; **no** `?builtin(` cases |
| [`freemarkerRef.ts`](../../extension/src/reference/freemarkerRef.ts) `BUILTIN_REF` | `RefDoc { detail, documentation }`; optional **usage** string in markdown (e.g. `s?replace("a", "b")`) — **no** `parameters[]` / labels |
| [`catalogLists.ts`](../../extension/src/catalogLists.ts) `BUILTINS` | ~110 common names (explicitly non-exhaustive); many take **zero** args |
| [`context/hoverAtCursor.ts`](../../extension/src/context/hoverAtCursor.ts) `builtinAt` | Name under cursor when preceded by `?`; **not** call-site / arg-list aware |
| [`context/completionContext.ts`](../../extension/src/context/completionContext.ts) | `type: "builtin"` only when typing the name after `?`, not inside `(…)` |

### Exhaustive vs subset (document clearly)

| Layer | Coverage |
|-------|----------|
| Name completion / hover | Catalog `BUILTINS` + `BUILTIN_REF` (practical, not every FreeMarker built-in) |
| **Signature Help params (this plan)** | **Subset only** — builtins that commonly take parenthesized arguments; see MVP table below |
| Zero-arg builtins (`?size`, `?trim`, `?has_content`, …) | **No** Signature Help when user opens `()` (or omit empty `()` help — prefer silence over fake params) |
| Builtins not in MVP table | Silence even if `?foo(` appears (no invented Java overloads) |

---

## MVP param catalog (required inventory)

Structured labels are **paraphrases** for Signature Help UI (`label` + `parameters[].label`). Optional/default args may use `name?` or `name=default` style consistent with existing `formatParamLabel` conventions where natural. Do **not** require overloads; one primary shape per name is enough.

| Builtin | Suggested parameter labels (MVP) | Notes |
|---------|----------------------------------|--------|
| `contains` | `substring` | string/seq forms; one positional is enough |
| `date` | `pattern?` | often used without args; optional format |
| `datetime` | `pattern?` | same |
| `time` | `pattern?` | same |
| `default` | `fallback` | |
| `ends_with` | `suffix` | |
| `ensure_ends_with` | `suffix` | |
| `ensure_starts_with` | `prefix` | |
| `filter` | `condition` | lambda / nested — label only |
| `index_of` | `substring`, `start?` | |
| `join` | `separator` | ignore rare multi-arg forms in MVP |
| `keep_after` | `separator` | |
| `keep_after_last` | `separator` | |
| `keep_before` | `separator` | |
| `keep_before_last` | `separator` | |
| `last_index_of` | `substring`, `start?` | |
| `left_pad` | `width`, `filling?` | |
| `map` | `mapper` | lambda — label only |
| `matches` | `pattern`, `flags?` | |
| `max` | `others…` | varargs-ish; one catch-all style label OK |
| `min` | `others…` | same |
| `number` | *(empty or omit from map)* | usually `?number` with **no** args — **prefer omit** from Signature map |
| `remove_beginning` | `prefix` | |
| `remove_ending` | `suffix` | |
| `replace` | `string`, `replacement`, `flags?` | |
| `right_pad` | `width`, `filling?` | |
| `seq_contains` | `value` | |
| `seq_index_of` | `value`, `start?` | |
| `seq_last_index_of` | `value`, `start?` | |
| `sort_by` | `key` | key name or sequence of names — one label |
| `split` | `separator`, `flags?` | |
| `starts_with` | `prefix` | |
| `string` | `format?` | type-dependent format |
| `substring` | `from`, `toExclusive?` | deprecated vs slicing; still common |
| `switch` | `case1`, `result1`, `…`, `default?` | paraphrased; activeParameter may clamp — OK |
| `then` | `whenTrue`, `whenFalse` | |
| `truncate` | `maxLength`, `terminator?` | ignore truncate_* variants as separate names unless already in `BUILTINS` |
| `url` | `charset?` | |

**Count:** ~35 names with params — intentional **subset** of `BUILTINS`. Names in `BUILTINS` but absent from this table → no builtin Signature Help.

개발 may tighten label wording (e.g. `to` vs `toExclusive?`) as long as ACs still pass and docs stay paraphrased.

---

## Non-goals

- Full Java FreeMarker / Apache signature dump or overload sets
- Exhaustive coverage of every built-in / every optional flag form
- Changing `#function` / `#macro` / `<@…>` Signature Help behavior or resolution order for non-`?` calls
- LSP extraction, Java bean enrichment, **vim/** port
- `strictVariables` / undeclared-name layer B
- New completion items or changing `builtin` completion context
- Requiring Hover/`BUILTIN_REF` to grow structured `parameters` (optional reuse of `detail` for Signature `documentation` only)
- Diagnostics for wrong arity / unknown built-in args
- Parser / AST

---

## Recommended MVP scope

**Must ship:**

1. **Detect** caret inside `?name(…)` argument list (same enclosing-paren + comma heuristics as function calls).
2. **Catalog** `BUILTIN_SIGNATURES` (name flexible) mapping snake_case builtin name → ordered param labels (+ optional short doc string or reuse `BUILTIN_REF[name].detail`).
3. **`signatureHelpAt`** returns help for cataloged builtins; silence for unknown / zero-arg / uncataloged names.
4. **Unit tests** for call detection, active parameter, at least several cataloged builtins, and regression that function/macro help still works.
5. Provider stays thin — no VS Code API changes beyond consuming the same `SignatureHelpResult`.

---

## Approach

### 1. Call-site: `findBuiltinCall` (name flexible)

Mirror `findFunctionCall`:

1. `findEnclosingParen(text, offset)` — reuse.
2. Skip whitespace left of `(`.
3. Resolve identifier ending at that point (`identifierAt`).
4. **Require** `text[id.start - 1] === '?'` (and identifier is not empty).
5. `activeParameter = countCommaArgs(text, openParen + 1, offset)` — reuse.
6. Return `{ name, activeParameter }`.

Do **not** treat `<#function` / `<#macro` definitions specially beyond the existing function-call skip (builtin path never matches those).

**Precedence in `signatureHelpAt`:** try **builtin** help when `?name(` matches **before** or **instead of** resolving `name` as a user `#function`. Rationale: `x?replace(` is never a user function call; a local `#function replace` must not steal `?replace(`. Preferred order:

```text
builtinCallHelp(text, offset)
  ?? functionCallHelp(text, offset, lookup)
  ?? macroCallHelp(text, offset, lookup)
```

If builtin name is not in the param catalog → return `undefined` from builtin branch (fall through is harmless for `?foo(` because `functionCallHelp` would look up `foo` without `?` — **must not** fall through into function resolution for a `?` callee). Implementation rule: when `?name(` is detected, **only** builtin catalog applies (hit or silence); do not then resolve `name` as `#function`.

### 2. Param catalog module

Prefer a small dedicated map near Signature Help or reference, e.g.:

- `extension/src/builtinSignatures.ts` (preferred — keeps `freemarkerRef` prose-only), **or**
- extend `freemarkerRef.ts` with optional `parameters?: string[]` on a parallel structure (only if 개발 finds co-location cleaner).

Shape sketch:

```text
BUILTIN_SIGNATURES: Readonly<Record<string, { parameters: string[]; documentation?: string }>>
// keys = snake_case builtin names from MVP table
// parameters = label strings for ParameterInformation
```

`buildBuiltinHelp(name, activeParameter)` → `SignatureHelpResult` with `label` like `replace(string, replacement, flags?)` (format helper OK; need not reuse `formatSignatureLabel` if that API is tied to `FtlParam`).

Optional: `documentation` = `BUILTIN_REF[name]?.detail` or a one-liner — not required for every entry if label is clear.

### 3. Provider

[`signatureHelpProvider.ts`](../../extension/src/signatureHelpProvider.ts) unchanged aside from picking up new `signatureHelpAt` behavior (import index still unused for builtins). Comment gate remains.

### 4. Context analyzer

No mandatory move of `findBuiltinCall` into `context/` for this plan (0021 left call-site scanners in `signatureHelp.ts`). Optional later unify; out of MVP unless trivial re-export.

### 5. Docs (문서 step — not 개발)

- CHANGELOG Unreleased
- requirements-status: Signature Help row + remove/close gap #2
- Move this plan → `docs/plans/completed/` after 검증QA

---

## Acceptance criteria

**Detection / precedence**

- [x] **AC1:** Caret inside `${x?replace("a", |)}` (or equivalent) yields Signature Help whose label mentions `replace` and lists at least `string` and `replacement` (flags optional in label).
- [x] **AC2:** Active parameter advances with commas: after first comma → parameter index `1` for `replace`.
- [x] **AC3:** When `?name(` is detected for a cataloged builtin, a same-file `#function name` does **not** override builtin Signature Help.
- [x] **AC4:** Caret inside a normal `${fn(…)}` / `<@macro …>` call still behaves as today (regression asserts in existing tests remain green; add one if needed).

**Catalog / silence**

- [x] **AC5:** At least these cataloged builtins produce help with expected param **count** (labels paraphrased OK): `replace` (≥2), `substring` (≥1), `then` (2), `default` (1), `join` (1), `split` (≥1), `contains` (1), `index_of` (≥1), `string` (≥0 with optional format), `switch` (≥1).
- [x] **AC6:** Uncataloged or zero-arg-style `?size(` / `?trim(` / unknown `?not_in_mvp_table(` → **no** Signature Help (undefined), not an empty fake signature.
- [x] **AC7:** Caret on `?replace` **name** (not inside `(…)`) → no Signature Help from this feature (Hover remains separate).

**Heuristics**

- [x] **AC8:** Commas inside strings / nested parens do not skew `activeParameter` (reuse / assert via `countCommaArgs` behavior).
- [x] **AC9:** Inside FTL comments → provider still returns undefined (`isInFtlComment` gate unchanged).

**Verification / docs**

- [x] **AC10:** `cd vsix/extension && npm test` exit **0**.
- [x] **AC11:** CHANGELOG Unreleased + requirements-status updated; plan moved to `docs/plans/completed/` in 문서 step.

---

## Scope paths (likely touched)

**Product / tests (개발):**

- [`extension/src/signatureHelp.ts`](../../extension/src/signatureHelp.ts) — `findBuiltinCall` + wire `signatureHelpAt` precedence
- [`extension/src/builtinSignatures.ts`](../../extension/src/builtinSignatures.ts) — **new** (or equivalent) MVP param catalog
- [`extension/src/signatureHelpProvider.ts`](../../extension/src/signatureHelpProvider.ts) — only if plumbing needs a tweak (prefer none)
- [`extension/src/signatureHelp.test.ts`](../../extension/src/signatureHelp.test.ts) — AC1–AC8 cases
- Optionally [`extension/src/reference/freemarkerRef.ts`](../../extension/src/reference/freemarkerRef.ts) — **only** if 개발 chooses co-located params (not required; prefer separate catalog)

**Docs (문서 step):**

- This plan → `docs/plans/completed/0028-builtin-signature-help.md`
- [`extension/CHANGELOG.md`](../../extension/CHANGELOG.md)
- [`docs/product/requirements-status.md`](../../product/requirements-status.md)

**Explicitly out of scope:** `vim/**`, LSP, `strictVariables`, macro/function Signature Help redesign, full FreeMarker builtin dump, completion/`builtinAt` changes, arity diagnostics.

---

## Implementation order (개발 가이드)

1. Add `BUILTIN_SIGNATURES` map for MVP inventory table.
2. Implement `findBuiltinCall` + `builtinCallHelp`; wire precedence in `signatureHelpAt` (AC3 silence rule).
3. Unit tests AC1–AC2, AC5–AC8; confirm AC4 regression + AC6/AC7 silence.
4. Full `npm test` (AC10).
5. 문서: CHANGELOG, requirements-status, move plan (AC11).

---

## Risks

| Risk | Mitigation |
|------|------------|
| `findFunctionCall` steals `?replace(` via bare identifier | Builtin branch first; on `?` detect, never fall through to function resolve |
| Overload / optional-arg mismatch vs Apache | Single paraphrased shape; optional `?` suffixes; no arity diagnostics |
| `switch` / `max` / `min` varargs awkward UI | Clamp `activeParameter`; catch-all / ellipsis labels OK |
| Catalog drift vs `BUILTINS` | Signature map ⊆ names that exist in catalog/ref; no requirement that every `BUILTINS` entry has signatures |
| Temptation to parse Java FreeMarker sources | Explicit non-goal; paraphrase from Manual usage only |

---

## Test plan

From `vsix/extension/`:

```bash
npm test
```

Focused asserts in `signatureHelp.test.ts`:

- `x?replace("a", |)` → label + `activeParameter === 1`
- `flag?then("y", |)` → second param
- `xs?join("|")` with caret in args → `join` help
- `?size(` → undefined
- Local `#function replace` + `?replace(` → builtin, not function
- Existing function/macro tests unchanged

Manual (optional): open `.ftl`, type `${name?replace(}`, trigger Signature Help (usually automatic on `(` / `,`).

---

## Wave 1 one-liner

**Signature Help inside `?builtin(…)` for a practical param-label subset (replace/substring/then/…); reuse paren/comma heuristics; silence uncataloged/zero-arg; do not change macro/function help, vim, or LSP.**
