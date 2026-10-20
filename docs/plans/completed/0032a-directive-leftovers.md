# 0032a - Directive leftovers (clause Hover + value catalogs)

Status: **completed**  
Started: 2026-10-20  
Completed: 2026-10-20  
Repo: `vsix/` only — never touch `vim/`.  
Stream: **A** (parallel). Parent consolidates CHANGELOG / requirements-status.

Related: [0030](0030-directive-param-hover.md) (AC10 skipped → shipped here), [0027](0027-directive-param-docs-diagnostics.md), [0026](0026-directive-param-aliases-values.md), [0024](0024-directive-named-params.md), [0032b](0032b-sighelp-datamodel.md), [0032c](0032c-lsp-vim-gaps.md), [requirements-status](../../product/requirements-status.md).

---

## Goal

Close requirements-status leftover #2 (directive) for the VS Code extension:

1. Clause-keyword Hover for `as` / `in` / `using` (0030 AC10).
2. Practical static value catalogs in named-param value slots: locales / charsets / common format strings (and a tiny `output_format` list).
3. Unknown-param diagnostics for any **other** directives with fixed `name=` catalogs — **none** exist beyond `#ftl` / `#setting` / `#include` (`DIRECTIVE_NAMED_PARAMS`); document and skip code.

---

## Non-goals

- Infinite / locale-DB / IANA charset lists
- Value Hover (only completion catalogs)
- Expanding unknown-param beyond the three named-param directives
- vim/, LSP, CHANGELOG / requirements-status (parent)

---

## Acceptance criteria

**Clause Hover**

- [x] **AC1:** Caret on `as` in `<#list xs as x>` → Hover text = `paramDocumentation("as")`.
- [x] **AC2:** At least one `in` (`#assign`/`#local`/`#global`) and one `using` (`#visit`/`#recurse`) show their one-liners.
- [x] **AC3:** Caret on directive name (`list`) still yields directive Hover probe (`directiveAt`), not clause.
- [x] **AC4:** `as` / `in` / `using` inside a quoted string in the tag → no clause Hover.

**Value catalogs**

- [x] **AC5:** `<#setting locale=` → `directiveParam` `kind: "value"`; completions include a small locale list (e.g. `en_US`).
- [x] **AC6:** `<#ftl encoding=` / charset settings → charset values (e.g. `UTF-8`).
- [x] **AC7:** A `*_format` setting (e.g. `number_format=`) → common format-pattern values; `output_format=` → small output-format names.
- [x] **AC8:** Boolean value slot unchanged (`true`/`false` still offered; not mixed with locale/charset lists).
- [x] **AC9:** Inside quoted string after `=` still not value context (0026 AC10 regression).

**Unknown-param (other directives)**

- [x] **AC10:** Documented: only `ftl` / `setting` / `include` have fixed `name=` catalogs; no new diagnostic code.

**Verification**

- [x] **AC11:** Unit tests for AC1–AC9 (+ AC10 note).
- [x] **AC12:** `cd vsix/extension && npm test` exit 0 (or failures only from foreign files, noted).

---

## Scope paths

- `extension/src/directiveParams.ts` — value catalogs + lookup helper
- `extension/src/context/hoverAtCursor.ts` / `hoverProvider.ts` — clause Hover
- `extension/src/context/completionContext.ts` — value-slot detection beyond boolean
- `extension/src/completion/DirectiveParamCompletionProvider.ts` — offer catalog values
- `extension/src/namedParamHover.test.ts` / `catalog.test.ts` — tests
- This plan

---

## Wave one-liner

**Ship clause Hover for as/in/using + small locale/charset/format value completions; no other-directive unknown-param (catalog empty beyond ftl/setting/include).**
