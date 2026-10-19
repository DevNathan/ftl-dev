# 0018 - Warn on uses of ftldoc `@deprecated` symbols

Status: **completed**. QA: `npm test` exit 0 (from `extension/`). Repo: `vsix/` only — never touch `vim/`.

Related: [0016-ftldoc.md](0016-ftldoc.md) (`doc.deprecated` on `indexFtl` symbols; `#local` scope), [0010-symbols-outline-references.md](0010-symbols-outline-references.md) (`findNameOccurrences` / references), [0006-ftl-syntax-diagnostics.md](0006-ftl-syntax-diagnostics.md) (`validateFtl` → collection).

## Goal

Emit a **warning** diagnostic when a symbol that carries ftldoc `@deprecated` (from 0016) is **used**, not when its declaration name is written.

Example:

```ftl
<#--
  @deprecated use sayHi
-->
<#function legacy(name)>
  <#return name>
</#function>

${legacy("old")}
```

→ warning on `legacy` in `${legacy("old")}` whose message cites the deprecation text (e.g. includes `use sayHi`). No warning on the `#function legacy` name span itself.

Product rules (fixed):

1. **vsix/extension only** — never `vim/`.
2. Reuse existing `indexFtl` symbols with `doc.deprecated` (0016); do not re-parse `@deprecated` in the diagnostic pass.
3. Severity: **warning** (`FtlDiagnostic.severity === "warning"` → already mapped in `diagnosticsProvider`).
4. Do **not** warn on the declaration name itself (`nameOffset`).
5. Respect `#local` scope: only warn for a local when that local would resolve at the use site (same idea as `findDefinitions(…, atOffset)`).
6. Prefer reusing `findNameOccurrences` / references patterns; skip FTL comments.
7. Wire through `validateFtl` → `diagnosticsProvider` (collection already shows warnings).
8. Unit tests in `diagnostics.test.ts` and/or `ftldoc.test.ts`.

## Scope paths (files likely touched)

- `extension/src/diagnostics.ts` — new deprecated-usage pass called from `validateFtl`
- `extension/src/diagnostics.test.ts` and/or `extension/src/ftldoc.test.ts` — unit coverage
- Possibly thin reuse of `extension/src/references.ts` (`findNameOccurrences`) and `extension/src/symbols.ts` (`indexFtl`, `findDefinitions`) — import only; no cross-repo edits
- `extension/CHANGELOG.md` — docs step when shipping (not required for 개발 green)

Do **not** implement until **개발**; this plan file is the 기획 deliverable.

## Non-goals

- No changes under `vim/`.
- No grammar / TextMate / semantic-token changes.
- No new Hover UX (0016 already shows Deprecated in Markdown).
- No cross-file / import-library resolution for deprecation (same-file `indexFtl` only; dotted `ns.sym` optional only if already trivial via existing occurrence helpers — not required).
- Do not warn merely because `@deprecated` appears in a comment; warn only on **identifier uses** of symbols that have attached `doc.deprecated`.
- Do not change declaration attachment / `@ignore` / parser rules from 0016.
- No runtime template evaluation; no full FreeMarker name-resolution (built-ins, `.vars`, etc.).
- Do not require silencing warnings inside string literals beyond whatever `findNameOccurrences` already does (best-effort parity with references).

## Approach

### Data source

1. `indexFtl(text)` — symbols may already have `doc` with `deprecated?: string` (`undefined` = not deprecated; `""` = deprecated with empty message still counts).
2. Occurrence scan: `findNameOccurrences(text, name, comments)` (skips FTL comments).
3. Resolve at each use: `findDefinitions(index, name, hit.startOffset)` so `#local` is included only inside `[scopeStart, scopeEnd)` and preferred over same-named assign/global when in scope.

### Pass: `findDeprecatedUsageIssues` (name flexible)

Called from `validateFtl` after existing checks (order among passes does not matter for AC).

Suggested algorithm:

1. Build `index = indexFtl(text)` and comment ranges once.
2. Collect candidate symbols where `doc?.deprecated !== undefined`. If none, return `[]`.
3. For each distinct simple name among candidates (or per symbol — 개발 may optimize), gather `findNameOccurrences` hits.
4. For each hit:
   - **Skip declaration:** if `hit.startOffset` equals that symbol’s `nameOffset` (or any declaration `nameOffset` for the same simple name when using resolve-first), do not emit.
   - **Resolve:** `defs = findDefinitions(index, name, hit.startOffset)`; take the preferred definition (first entry — locals win in scope, matching 0016).
   - If preferred def has `doc.deprecated !== undefined`, emit a warning on the hit range.
5. **Message:** cite the deprecation text when non-empty after trim (e.g. `Deprecated: use sayHi` or include the symbol name); when empty, a stable flag-only message (e.g. `Deprecated` / `'name' is deprecated`). Message must be assertable in unit tests.
6. Deduplicate overlapping identical ranges if multiple symbols could double-fire (prefer one diagnostic per use span).

### Wiring

- `validateFtl`: `out.push(...findDeprecatedUsageIssues(text))`.
- `diagnosticsProvider`: no change expected — already maps `"warning"` → `DiagnosticSeverity.Warning` and publishes the collection.

### Local-scope examples (must hold)

| Site | Deprecated local `x` in `#function` | Deprecated assign `x` at top level | Expect |
|------|-------------------------------------|------------------------------------|--------|
| Use of `x` inside that function body | yes | either | warn for **local** (if local is preferred and deprecated) |
| Use of `x` outside that body | n/a (local not visible) | yes | warn for **assign** only if assign is deprecated |
| Use outside; only local was deprecated | local not in scope | no | **no** warn |

### Declaration skip

`${legacy(...)}` warns; `<#function legacy …>` / `<#assign legacy = …>` / `<#local legacy = …>` name tokens do **not**.

## Acceptance criteria (testable)

- **AC1:** A `#function` / `#macro` / `#assign` / `#global` with leading `@deprecated` (optional message) produces a **warning** on a same-file **use** of that name (e.g. `${legacy("old")}` or equivalent identifier use), and the diagnostic message includes the deprecation message when non-empty.
- **AC2:** Empty `@deprecated` (flag only) still yields a warning on use, with a stable non-empty diagnostic message.
- **AC3:** No diagnostic on the **declaration name** span itself for a deprecated symbol.
- **AC4:** Identifier mentions of a deprecated name **inside FTL comments** do not produce a usage warning.
- **AC5:** `#local` with `@deprecated`: use **inside** the enclosing `#function` / `#macro` body warns; the same name **outside** that body does **not** warn for that local.
- **AC6:** When a non-deprecated `#local` shadows a deprecated outer symbol inside the body, uses inside the body do **not** warn (resolve to local); uses outside still warn for the outer deprecated symbol if present.
- **AC7:** Severity is `"warning"` (not `"error"`) on these diagnostics from `validateFtl`.
- **AC8:** Unit tests in `extension/src/diagnostics.test.ts` and/or `extension/src/ftldoc.test.ts` cover AC1–AC7; `npm run test:unit` from `extension/` passes; no edits outside `vsix/`.

## Test plan

| Area | File / command |
|------|----------------|
| Deprecated use warning, declaration skip, empty `@deprecated`, comment skip | `diagnostics.test.ts` and/or `ftldoc.test.ts` |
| `#local` in-scope / out-of-scope / shadow | same |
| Severity `"warning"` | assert `severity === "warning"` on matching diags |
| Regression: existing syntax diagnostics still green | existing `diagnostics.test.ts` cases |
| Run | `cd extension && npm run test:unit` |

Minimal cases (names flexible):

1. Deprecated `#function legacy` + `${legacy("old")}` → one warning citing message; no warn on declaration name.
2. `@deprecated` with empty message → still warns on use.
3. Name mentioned only inside `<#-- legacy -->` → no usage warning.
4. Deprecated `#local` inside `#function`: warn on use in body; no warn outside body.
5. Non-deprecated `#local` shadowing deprecated `#assign`: no warn in body; warn outside on assign use.
6. Filter `validateFtl` results: matching diags have `severity: "warning"`.

## Out of scope reminder

`vim/` is out of scope. Ship notes go in `extension/CHANGELOG.md` at the **문서** step.
