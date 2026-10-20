# 0029 - Optional `strictVariables` (ADR 0002 layer B)

Status: **completed**  
Started: 2026-10-20  
Completed: 2026-10-20  
Repo: `vsix/` only — never touch `vim/`.

Related: [ADR 0002](../../decisions/0002-undeclared-vs-datamodel.md), [requirements-status](../../product/requirements-status.md) (gap #1 closed — Done(opt-in)), [0031-ftl-data-model-json.md](0031-ftl-data-model-json.md) (project file `{ roots }` merge shipped), [0006-ftl-syntax-diagnostics.md](0006-ftl-syntax-diagnostics.md) (layer A first; B now MVP), [0011-diagnostics-phase2.md](0011-diagnostics-phase2.md), [0012-comparison-operator-presentation.md](0012-comparison-operator-presentation.md) (opt-in setting pattern), [0027-directive-param-docs-diagnostics.md](0027-directive-param-docs-diagnostics.md) (heuristic warning style).

Apache Manual (policy only — no Java data-model typing): [Variables](https://freemarker.apache.org/docs/dgui_misc_var.html), [Special variables](https://freemarker.apache.org/docs/ref_specvar.html).

---

## Goal

Ship **ADR 0002 layer B** as an **opt-in** diagnostic: when enabled, warn on **root** identifiers used in FTL expressions that are neither declared/imported in-file nor listed in a configured data-model allowlist.

Default remains **off** so typical Java-host templates stay clean. Do **not** invent Java bean / type checking.

---

## Why this next

Requirements gap #1 after Signature Help (0028): layer A syntax/structure is shipped; undeclared / data-model (B) is still **Deferred**. Teams that want “declare everything” need `ftl-dev.strictVariables` + an allowlist (`ftl-dev.dataModel`), per ADR.

---

## ADR alignment

| ADR 0002 rule | This plan |
|---------------|-----------|
| Layer A always on; layer B **off by default** | `ftl-dev.strictVariables` default **`false`**; when false, **no** undeclared-name diags |
| Known names = assign / local / global / macro / function / `#list` loop vars / `#import as ns` (+ `ns.*`) | Build known-set from `indexFtl` + loop-var scan + macro/function **params** in scope + import `as` namespaces; roots under an import ns count as known |
| Configured externals (`ftl-dev.dataModel` and/or `.ftl-data-model.json`) | **MVP:** workspace/user setting `ftl-dev.dataModel: string[]`. **Stretch:** project file `.ftl-data-model.json` (path/glob) |
| Heuristics alone must not be the only silence path | Roots must be declared, import-ns, or **explicit** allowlist — not “looks like `name.method(`” |
| Never require a Java language server | No LSP / Java enrichment |

**Caveat (thin slice):** ADR mentions `.ftl-data-model.json` as and/or. MVP ships the **setting only**; JSON file is stretch so teams can still turn on strict mode with `settings.json` / workspace settings.

---

## Inventory (repo today)

| Area | State |
|------|--------|
| [`diagnostics.ts`](../../extension/src/diagnostics.ts) | Layer A + deprecated-usage + unknown named-params (0027); **`ValidateFtlOptions` has only `index?`** — no strict / dataModel |
| [`diagnosticsProvider.ts`](../../extension/src/diagnosticsProvider.ts) | Always `validateFtl(text, { index })`; **no** `getConfiguration`; **no** `onDidChangeConfiguration` refresh |
| [`package.json`](../../extension/package.json) `contributes.configuration` | Only `ftl-dev.comparisonOperatorPresentation` (bool, default false) — **pattern to copy** |
| [`symbols.ts`](../../extension/src/symbols.ts) `indexFtl` | `assign` / `macro` / `function` / `local` / `global` + `pathRefs` (`import`/`include` + `asName`); **no** `#list` / `#items` loop vars; macro/function **params** on `FtlSymbol.params` but not as top-level symbols |
| [`comparisonDisplay.ts`](../../extension/src/comparisonDisplay.ts) `findExpressionSpans` | `${…}` interiors + open `#` / `[#` tag interiors (string/comment/HTML-aware) — **best reuse** for “where identifiers matter” |
| [`catalogLists.ts`](../../extension/src/catalogLists.ts) | `SPECIAL_VARS`, `BUILTINS`, directives — use for skip lists / `?` / `.` mitigations |
| `.ftl-data-model.json` | **Does not exist** anywhere in repo |

There is **no** undeclared-identifier diagnostic today (confirmed by requirements-status + diagnostics surface).

---

## Non-goals

- Full Java / FreeMarker **data-model type checking**, bean property graphs, or class enrichment
- Requiring a Java language server or LSP extraction
- Exhaustive FreeMarker expression AST / parser
- Flagging **every** dotted segment / method name (`user.name`, `svc.get()`) as undeclared — only **roots** (see Approach)
- Changing layer A severity or messages
- Enabling layer B by default
- **`vim/**`** port
- Cross-file resolution of import members beyond “`ns` is known ⇒ `ns.*` roots OK” (no mandatory import-file load for MVP)

---

## Recommended MVP scope (thinnest shippable)

**Must ship:**

1. **Settings** (mirror comparison-op pattern under `ftl-dev`):
   - `ftl-dev.strictVariables`: `boolean`, **default `false`**, description clarifies opt-in undeclared-root warnings.
   - `ftl-dev.dataModel`: `array` of `string`, **default `[]`**, description: host-injected top-level names (e.g. `userService`, `request`).
2. **`findUndeclaredIdentifierIssues(text, { index, dataModel })`** (name flexible) — pure function; returns `FtlDiagnostic[]` with severity **`warning`** (heuristic; same class as 0027 unknown-param).
3. Wire into **`validateFtl`**: when options say strict **off** (or omitted), **skip** this pass entirely. When on, merge results with existing layer A diags.
4. **`diagnosticsProvider`**: read both settings; pass into `validateFtl`; refresh on `onDidChangeConfiguration` affecting `ftl-dev.strictVariables` / `ftl-dev.dataModel` (and existing open docs).
5. **Known roots** (in-file + config):
   - `index.symbols` names (`assign` / `local` / `global` / `macro` / `function`), with `#local` / param **scope** respected when checking a use offset (reuse `findDefinitions` / scope fields where practical).
   - Macro / function **parameter** names when the use offset is inside that symbol’s body scope.
   - `#import … as ns` → `ns` is known; any root that is exactly an import namespace is known (members under `ns.` are not separately flagged — see dotted-path rule).
   - `#list` / `#items` **loop variables** (`as x`, `as k, v`) in the corresponding body range — **must** be collected even though `indexFtl` does not yet store them (lightweight scan OK; optional small helper next to symbols/diagnostics — do **not** require a full index redesign).
   - Every string in `dataModel` (case-sensitive exact match on root).
6. **Scan surface:** identifiers that appear as **roots** inside `findExpressionSpans` regions (reuse or extract shared helper if needed — prefer reuse from `comparisonDisplay` or move span finder to a neutral module only if duplication hurts).
7. **False-positive mitigations (required):**
   - Skip FTL comments, HTML comments, and string interiors (already largely handled by expression-span + string walk).
   - Skip HTML / plain text outside expression spans (do not scan the whole document with a bare `\bIdent\b`).
   - Skip identifiers immediately after `?` (builtin name): `x?string`, `?has_content`.
   - Skip identifiers that are FreeMarker **special variables** in `.name` form (no identifier immediately before `.`): `.now`, `.globals`, … — use `SPECIAL_VARS` (and do not flag the special-var token).
   - Skip **non-root** segments of dotted paths: for `a.b.c` only consider root `a`; do **not** report `b`/`c` as undeclared (avoids fake Java property checking). ADR: do **not** treat `name.method(` alone as proof that `name` is declared.
   - Skip directive **named-param LHS** on known catalogs for `#ftl` / `#setting` / `#include` (and clause keywords `as` / `in` / `using`) — same spirit as 0027; do not flag `encoding=` as an undeclared variable.
   - Skip declaration name spans themselves (`#assign foo`, `#macro m`, `#function f`, `#local x`, `#global g`, import `as ns`, loop var binding sites).
   - Skip boolean literals `true` / `false` and other tiny reserved tokens if they would otherwise match the identifier regex (document the deny list in code).
8. Unit tests covering on/off, known vs unknown, dataModel allowlist, and mitigations above.
9. Docs in **문서** step: CHANGELOG + requirements-status (close gap #1 / flip Deferred → Done for layer B MVP).

**Stretch (explicitly deferred — do not block 승인):**

- Project file `.ftl-data-model.json` (globals per path/glob) merging with `ftl-dev.dataModel`
- Loading imported `.ftl` to validate `ns.member` against remote symbols (semantic tokens already have optional `importedByNs`; layer B MVP does **not** require it)
- Configurable severity (`warning` vs `error`)
- Indexing loop vars into `FtlIndex` for reuse by outline/rename (nice follow-on; not required if diagnostics-local scan works)
- Vim port

---

## Approach

### 1. Settings (`package.json`)

```text
ftl-dev.strictVariables: boolean, default false
ftl-dev.dataModel: { type: array, items: { type: string }, default: [] }
```

Descriptions must state: off by default; enable only when the team maintains an allowlist / in-file declarations.

### 2. Options plumbing

```text
ValidateFtlOptions {
  index?: …
  strictVariables?: boolean   // default false
  dataModel?: readonly string[]
}
```

Provider:

```text
const cfg = vscode.workspace.getConfiguration("ftl-dev");
validateFtl(text, {
  index: cached.index,
  strictVariables: cfg.get("strictVariables", false),
  dataModel: cfg.get("dataModel", []),
})
```

On configuration change for those keys → refresh visible freemarker docs (same debounce pattern as today).

### 3. Known-set + scan

```text
findUndeclaredIdentifierIssues(text, opts):
  if !opts.strictVariables → []
  knownGlobals = Set(dataModel ∪ assign/global/macro/function names ∪ import asNames)
  loopVars = scanListLikeBindings(text)  // { name, scopeStart, scopeEnd }[]
  for each expression span:
    for each root identifier use in span (string-aware):
      if mitigation skip → continue
      if root in knownGlobals → OK
      if root is in-scope local / param / loop var at offset → OK
      else → warning on root span
        message e.g. "Undeclared identifier 'foo'."
```

**Root extraction (normative for AC):** walk identifiers in the span; if preceded by `.` that continues a previous identifier (property path), skip; if preceded by `?`, skip; else treat as root candidate.

### 4. Severity / UX

- Severity **`warning`** (not `error`) for MVP — layer A stays the hard gate; teams can still see Problems without red-error flood.
- Message must be assertable in unit tests (stable English substring / pattern).

### 5. Docs (문서 step — not 개발)

- CHANGELOG Unreleased — done
- requirements-status: Undeclared / data-model row → **Done (opt-in)**; gap #1 closed; stretch (`.ftl-data-model.json`) noted
- Plan moved to `docs/plans/completed/0029-strict-variables.md`

---

## Acceptance criteria

**Settings / default**

- [x] **AC1:** `ftl-dev.strictVariables` exists, type boolean, **default `false`**.
- [x] **AC2:** `ftl-dev.dataModel` exists, string array, **default `[]`**.
- [x] **AC3:** With strictVariables **false** (default), a template using only host names (e.g. `${userService.x}` with no assign) produces **zero** undeclared-identifier diagnostics (layer A may still fire on unrelated issues).

**Positive / allowlist**

- [x] **AC4:** strictVariables **true**, empty dataModel, `${undeclaredName}` → **warning** on `undeclaredName` (assertable message).
- [x] **AC5:** same as AC4 but `ftl-dev.dataModel` includes `"undeclaredName"` (or options `dataModel: ["undeclaredName"]` in unit test) → **no** undeclared warning for that root.
- [x] **AC6:** `#assign foo = 1` then `${foo}` with strict on → no undeclared warning for `foo`.
- [x] **AC7:** `#import "lib.ftl" as u` then `${u.bar}` with strict on → no undeclared warning for root `u` (member `bar` not flagged).
- [x] **AC8:** `<#list items as i>${i}</#list>` with strict on → no undeclared warning for loop var `i` (even if `items` itself is allowlisted or also flagged separately — if `items` not known, only `items` may warn).

**Scope / params**

- [x] **AC9:** Inside `#macro m(x)` / `#function f(x)` body, `${x}` with strict on → no undeclared warning for param `x`; outside that body, bare `${x}` still warns unless otherwise known.

**Mitigations**

- [x] **AC10:** Identifier only inside a quoted string in an expression → not flagged.
- [x] **AC11:** Identifier only inside FTL comment → not flagged.
- [x] **AC12:** Builtin name after `?` (e.g. `${x?string}`) → `string` not flagged as undeclared.
- [x] **AC13:** Special var `.now` (or another `SPECIAL_VARS` entry) → not flagged.
- [x] **AC14:** Dotted path `${known.prop.method}` where `known` is allowlisted/declared → **only** root policy: `prop` / `method` **not** flagged; do **not** invent property checking.
- [x] **AC15:** Named-param LHS on `#ftl` / `#setting` / `#include` (e.g. `encoding=`) and clause keywords `as`/`in`/`using` → not flagged as undeclared variables.
- [x] **AC16:** Plain HTML / text outside `${}` / directive expression spans → not scanned (e.g. `<div class="foo">` does not warn on `foo`).

**Verification / docs**

- [x] **AC17:** `cd vsix/extension && npm test` exit **0**.
- [x] **AC18:** CHANGELOG Unreleased + requirements-status updated; plan moved to `docs/plans/completed/` in 문서 step.

---

## Scope paths (likely touched)

**Product / tests (개발):**

- [`extension/package.json`](../../extension/package.json) — `contributes.configuration` properties
- [`extension/src/diagnostics.ts`](../../extension/src/diagnostics.ts) — `ValidateFtlOptions` + `findUndeclaredIdentifierIssues` (or sibling module imported here)
- [`extension/src/diagnosticsProvider.ts`](../../extension/src/diagnosticsProvider.ts) — read settings; config-change refresh
- Optionally [`extension/src/strictVariables.ts`](../../extension/src/strictVariables.ts) (or `undeclaredIdentifiers.ts`) — **new** pure helpers if `diagnostics.ts` would bloat
- Optionally share/extract [`findExpressionSpans`](../../extension/src/comparisonDisplay.ts) if needed without circular imports
- [`extension/src/diagnostics.test.ts`](../../extension/src/diagnostics.test.ts) — AC3–AC16 (or dedicated `strictVariables.test.ts` wired into `package.json` `test:unit`)
- [`extension/package.json`](../../extension/package.json) `scripts.test:unit` — only if a new test file is added

**Docs (문서 step):**

- This plan (`docs/plans/completed/0029-strict-variables.md`)
- [`extension/CHANGELOG.md`](../../extension/CHANGELOG.md)
- [`docs/product/requirements-status.md`](../../product/requirements-status.md)

**Explicitly out of scope:** `vim/**`, LSP, Java enrichment, `.ftl-data-model.json` (stretch), full expression AST, default-on behavior, property/method undeclared checks.

---

## Implementation order (개발 가이드)

1. Add package.json settings (`strictVariables`, `dataModel`).
2. Implement known-set + loop-var scan + `findUndeclaredIdentifierIssues`; gate on `strictVariables`.
3. Extend `ValidateFtlOptions` / `validateFtl`; unit tests AC3–AC16 (pure options — no vscode).
4. Wire `diagnosticsProvider` + configuration listener.
5. Full `npm test` (AC17).
6. 문서: CHANGELOG, requirements-status, move plan (AC18).

---

## Risks

| Risk | Mitigation |
|------|------------|
| False-positive flood on real apps | Default **off**; warning not error; require `dataModel` allowlist; root-only checks |
| Missing `#list` loop vars in `indexFtl` | Dedicated binding scan for MVP; document index promotion as stretch |
| Treating `foo.bar(` as “declared” silently | Explicitly forbidden by ADR — only allowlist / real decls silence roots |
| Scanning whole HTML file | Only `findExpressionSpans` regions |
| Scope bugs for `#local` / params | Reuse existing scope fields / `findDefinitions` patterns from 0015 / 0018 |
| Temptation to ship `.ftl-data-model.json` in same PR | Stretch only; setting is enough for ADR “configured externals” |

---

## Test plan

From `vsix/extension/`:

```bash
npm test
```

Focused asserts (options object — no vscode host required for core ACs):

- strict off → no undeclared diags on `${hostOnly}`
- strict on → warns on unknown root; silenced by `dataModel`
- assign / import ns / list `as` / macro param scope cases
- string / comment / `?builtin` / `.special` / dotted non-roots / HTML / named-param LHS

Manual (optional): enable `ftl-dev.strictVariables`, add `"request"` to `ftl-dev.dataModel`, open a template using `${request}` vs `${typo}`.

---

## Wave 1 one-liner

Opt-in undeclared-**root** warnings (ADR 0002 layer B) with `ftl-dev.strictVariables` + `ftl-dev.dataModel` allowlist — default off, no Java typing.
