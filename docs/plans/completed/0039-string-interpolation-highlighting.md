# 0039 - String interpolation highlighting and semantic-token code regions

Status: **completed** 2026-10-22 (manual Extension Host color check pending user)  
Repo: `vsix/` only. `ftl-dev.vim` is a separate repo and is **not** touched.  
Baseline: `main` 6a45d32, `cd extension && npm test` = **638 ✓**.

Related: [0002 grammar spike](0002-extension-grammar-spike.md), [0014 comment mute](0014-ftl-comment-mute-diag.md), [0037](0037-scrub-in-house-identifiers.md) (forbidden-terms guard).

**Confidentiality.** Examples, tests and fixtures use only neutral names (`cfg.env["test"]`, `header`, `request`, `baseDir`, `name`, `data.sql`).

## Problem

1. **String keys painted as variables.** In

   ```ftl
   <#function build>
     <#local header = {}>
     <#return {
         "header": header,
         "request": request
     } />
   </#function>
   ```

   the key `"header"` showed the variable color. `buildSemanticTokenSpansFromIndex` steps 3 (`ns.member`) and 4 (identifier scan) painted every identifier equal to a local symbol / namespace name anywhere in the document (string literals and plain HTML text included); only FTL comments were skipped. Semantic tokens override TextMate, so the string color was lost.
2. **`${…}` inside quoted strings not highlighted.** In `"안녕 ${cfg.env["test"]} 입니다."` the whole literal was string-colored: `#string-double` / `#string-single` only contained the escape rule and never included `#interpolation`.

## What was done

### Grammar (`extension/syntaxes/freemarker.tmLanguage.json`)

- `#string-double` / `#string-single`: escape rule first, then `{ "include": "#interpolation" }` (so `\${` stays an escape).
- `#interpolation` now behaves like a JS template expression: name `meta.interpolation.freemarker meta.embedded.line.freemarker` (body resets from the string color), delimiters `punctuation.definition.interpolation.{begin,end}.freemarker punctuation.section.embedded.{begin,end}.freemarker` (themes give these the template-expression color). Existing scopes are kept.
- New `#string-raw`: FTL raw strings `r"…"` / `r'…'` as `string.quoted.double.raw.freemarker` / `string.quoted.single.raw.freemarker` (no escapes, no interpolation; `\br"` so identifiers ending in `r` are unaffected). Included before `#string-double` in every directive rule and in `#interpolation`.

### Semantic tokens (`extension/src/scan.ts`, `extension/src/semanticTokens.ts`)

- New pure helper `ftlCodeRanges(text)` → sorted, non-overlapping `[start, end)` ranges of FTL expression code: FTL tags `<#…>`, `</#…>`, `<@…>`, `</@…>` and the `[#…]` / `[@…]` forms (head via `matchDirectiveHead`; angle tags close with the same paren/brace/square depth rules as `scanDirectiveClose`, square tags additionally nest `[…]` so `[#if users[0]?? && x]` closes at the depth-0 `]`), plus `${…}` / `#{…}` bodies; minus string-literal contents except `${…}` inside non-raw strings (recursive, e.g. `"a ${f("b ${c}")}"`); minus FTL comments; `<#noparse>` bodies skipped. One linear pass; adjacent ranges are merged.
- `rangeCursor(ranges)` answers monotonic offset membership in amortized O(1).
- Steps 3 and 4 of `buildSemanticTokenSpansFromIndex` only consider identifiers whose start lies in a code range (optional `codeRanges` build option; `FtlDocCache` entries cache `codeRanges` next to `comments`, and `FtlSemanticTokensProvider` passes them). Steps 1–2 (declarations, `as ns`) are unchanged.

### Tests

- `tests/grammar/string-interpolation.ftl` (moved out of `_wip/`, now in the `test:grammar` glob): double / single quotes, `\${x}` escape, nested `"${outer('${inner}')}"`, `"안녕 ${cfg.env["test"]} 입니다."`, multi-line `<#return { "header": header } />`, raw strings, `for"x"` is not a raw string.
- `src/scan.test.ts`: `ftlCodeRanges` (tags vs HTML text, strings with nested interpolation, escapes and raw strings, multi-line hash keys, comments and `noparse`, unclosed input, ordering) and `rangeCursor`.
- `src/semanticTokens.test.ts`: string keys equal to a local name get no span; `${name}` inside a string in a directive does; plain HTML text / attribute text does not; raw string content does not; `noparse` body does not.

## Non-goals / known limits

- `${…}` inside HTML attribute strings keeps its existing top-level behavior (TextMate injection is `- string`); semantic tokens do treat it as code.
- `#{…}` inside quoted strings and the `[=…]` interpolation syntax are not handled.
- The tag end is found with FTL-style depth rules; an unparenthesized `>` comparison inside `<#if …>` ends the tag (same as the grammar and the existing scanners).
- Raw strings are not recognised by `findMatchingBrace` / `scanDirectiveClose` used by other features (a raw string ending in `\` may confuse them); unchanged here.

## Acceptance criteria

- [x] **AC1** `${baseDir}` / `${name}` in `"${baseDir}/${name}/data.sql"` carry `meta.interpolation.freemarker` + begin/end punctuation (incl. `punctuation.section.embedded.*`); `/` and `/data.sql` are string without `meta.interpolation`.
- [x] **AC2** User case: `안녕 ` is string only; `${` has `punctuation.section.embedded.begin.freemarker`; inner `"test"` is `string.quoted.double.freemarker` inside `meta.interpolation`.
- [x] **AC3** Single quotes behave the same.
- [x] **AC4** `"\${x}"`: escape on `\$`, `{x}` plain string.
- [x] **AC5** Nested `"${outer('${inner}')}"`: both interpolations scoped.
- [x] **AC6** Raw `r"${x}"` / `r'${y}'`: raw string scope, no `meta.interpolation`.
- [x] **AC7** Multi-line hash literal: key `"header"` is string; value `header` is `variable.other.freemarker` and is the only one that gets a semantic `variable` span.
- [x] **AC8** Semantic tokens: no spans in string contents, raw strings, plain HTML text or `noparse` bodies; `${…}` inside strings still colored.
- [x] **AC9** All existing grammar fixtures and unit tests green with no weakened assertions; `npm test` exit 0 (**644 ✓**); `check:terms` 0 hits.
