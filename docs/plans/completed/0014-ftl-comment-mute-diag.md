# 0014 — FTL comment inside directive/hash: mute + false diagnostics

Status: completed (2026-10-15). Repo: `vsix/` only — never touch `vim/`.

## Goal

Fix two user-reported bugs where an FTL comment (`<#-- … -->` / `[#-- … --]`) *inside a directive tag expression* (e.g. `<#assign x = [ {…}, <#-- c -->, {…} ] />`) misbehaves:

1. Everything from a mid-list comment downward loses highlighting (looks gray / muted).
2. A `:` inside a comment between hash entries triggers a false `Missing comma between hash entries` diagnostic.

Comments must never take part in highlighting of surrounding code or in any syntax-error detection.

## Scope paths (files likely touched)

- `vsix/extension/syntaxes/freemarker.tmLanguage.json` (bug 1)
- `vsix/extension/src/diagnostics.ts` (bug 2: hash-literal comma checks; secondary: region walk)
- `vsix/extension/src/comments.ts` (only if a small shared helper is added, e.g. "skip comment/whitespace"; secondary: `findCommentDelimiterIssues`)
- `vsix/extension/src/diagnostics.test.ts` (new tests)
- `vsix/extension/src/comments.test.ts` (new tests if `comments.ts` changes)
- `vsix/tests/grammar/comment.ftl` (new grammar cases) — or a new `vsix/tests/grammar/comment-in-directive.ftl`
- `vsix/extension/CHANGELOG.md` (entry in docs/release step, not planning)

## Non-goals

- No change to `vim/`.
- No change to semantic-token logic (`semanticTokens.ts`, `symbols.ts`): both already skip comment ranges via `ftlCommentRanges`.
- Not fixing the general "first `>` / `]` ends a tag" limitation of the TextMate grammar (e.g. `a > b` in `<#if>`, or `[#assign x = [1,2]]` in square syntax) — only comment handling.
- No full FreeMarker parser; no new diagnostics rules.
- No change to nested-comment semantics (nesting stays supported).

## Approach / suspected root cause

### Bug 1 — "gray" from mid-list comment downward (CONFIRMED by tokenizing with vscode-textmate)

Root cause is NOT "comment scope never closes". In `freemarker.tmLanguage.json`, the `directive-angle` / `directive-square` rules (all 6 sub-rules: known directive, `@` user tag, generic `#name`) and `interpolation` only include `#string-double`, `#string-single`, `#expression` — **not `#comment`**. So inside `<#assign … = [ … ]/>`:

- `<#--` is tokenized as operators `<`, `#`, `-`, `-` (no comment scope).
- the comment text is unscoped.
- the `>` of `-->` matches the directive `end` pattern `(/?)>` and **closes the `<#assign` tag early**.
- Everything after (`{`, `"name": "COMP"`, `BI_COMP`, `}`, `] />`) is then top-level plain text with no scopes (default/uncolored foreground = "gray" vs the colored code above); the real closing `/>` is never matched as a tag end.

Repro tokens (confirmed): after the comment line, `"name": "COMP",` has scopes `` (empty) instead of `meta.directive.freemarker string.quoted…`.

Fix: add `{ "include": "#comment" }` as the **first** pattern in `patterns` of every directive-angle / directive-square rule and in `interpolation`, so `<#--` wins the tie against the `<` operator and the comment's own `-->` is consumed by the comment rule (never reaching the tag `end`). Keep `#comment` nested include / `applyEndPatternLast` as is. Also check that `#comment` inside the injection (`L:text.html.basic - comment - string`) is unaffected.

### Bug 2 — colon inside comment → false "Missing comma" (CONFIRMED via `validateFtl`)

`checkHashLiteralCommas` and its scanners in `diagnostics.ts` (`scanHashPart`, `scanHashValue`, `looksLikeHashKeyStart`, plus the `skipWs` in `checkHashLiteralCommas`) do **not skip FTL comments** (unlike `findMatchingBrace`, `scanDirectiveClose`, `ftlExpressionRegions`, which do). After `"name": "COMP",` the next "key" scan starts at `<#--`, `scanHashPart` finds the `:` inside the comment as the key/value separator, then `scanHashValue` runs through `-->` and sees `"idx"` that `looksLikeHashKeyStart`, so it emits "Missing comma between hash entries".

Confirmed repro (`validateFtl`): the issue's sample yields exactly one `Missing comma between hash entries`. Same blind spot also causes (found while investigating; fix together since same mechanism):

- A comment containing `,` / `}` / `]` / `'` / `"` inside a hash can end the value early or desync string state (scanners treat comment text as code). The outer region walk in `findHashLiteralCommaIssues` also lacks a comment skip, so `{`/quotes in comments mis-sync.
- A comment between the last `,` and `}` hides the "Trailing comma" diagnostic (key scan finds no `:`, returns quietly).
- `findCommentDelimiterIssues` in `comments.ts` tracks quote state *outside* comments, so `<#-- don't -->` (apostrophe) yields a false `Unclosed FreeMarker comment` (confirmed via `validateFtl`). In-scope as secondary: it is "comments participating in syntax-error detection".

Fix: in every hash scanner loop (and `skipWs`, and `findHashLiteralCommaIssues` outer loop), when not in a string and `text.startsWith("<#--"|"[#--", i)`, jump with `skipFtlComment` (bounded by `closeBrace`/`end`; if comment extends beyond limit, stop scanning). Treat a comment as whitespace for `sawValue`, `prevNonWs`, and trailing-comma detection (so a comment after the last `,` before `}` still yields "Trailing comma"). In `findCommentDelimiterIssues`, skip a closed FTL comment (and unclosed → record `unclosed-open` then stop) before string tracking, keeping HTML `<!-- -->` skip and orphan-closer logic.

## Acceptance criteria (testable)

AC1 (grammar): In `<#assign x = [ {"a":1}, <#-- 테스트코드 -->\n {"b":2} ] />`, the comment tokens (`<#--`, text, `-->`) carry `comment.block.freemarker`, the directive stays open across the comment (following lines carry `meta.directive.freemarker`, strings carry `string.quoted.double.freemarker`), and the final `/>` carries `punctuation.definition.tag.end.freemarker`.
AC2 (grammar): Same for square syntax `[#assign x = [ … [#-- c --] … ]]`-style where applicable, for `<@macro … <#-- c --> />` user tag, for `<#list … <#-- c --> as x>`, and for comment inside `${ … <#-- c --> … }`.
AC3 (grammar): Text after the closing tag (e.g. `<p>`) is tokenized as before (no scope leakage, no comment scope past `-->`).
AC4 (diagnostics): The issue's hash snippet (comment containing `:` between `"name": "COMP",` and `"idx": BI_COMP,`, followed by `"description": "구분 비트"` and `}`) produces **no** diagnostics from `validateFtl`.
AC5 (diagnostics): A comment between entries containing any of `: , { } [ ] ' "` produces no hash-related and no comment-related diagnostics; comment before the first key, after the last value, and between a value and its following `,` also OK.
AC6 (diagnostics, regression): Real errors are still reported with correct offsets when comments are present: missing comma between entries (with a comment in between), trailing comma (even when a comment sits between the `,` and `}`).
AC7 (diagnostics): `<#-- don't -->` / `<#-- say "hi -->` inside or outside a directive does not produce `Unclosed FreeMarker comment`; truly unclosed `<#--` and orphan `-->` are still reported (existing `comments.test.ts` stays green).
AC8: `npm test` in `vsix/extension` (`test:grammar` + `test:unit`) passes; no changes outside `vsix/`.

## Test plan hints

Grammar (`vsix/tests/grammar/*.ftl`, run via `vscode-tmgrammar-test`, see `npm run test:grammar`):
- Add to `comment.ftl` (or new `comment-in-directive.ftl`) a multi-line `<#assign x = [` … mid-list `<#-- 테스트코드 -->` … `] />` case. Assert (`// ^^^ scope`) comment scope on the comment line, `meta.directive.freemarker` on lines after it, and `punctuation.definition.tag.end.freemarker` on final `/>`.
- Add cases for `[#-- --]` in square directive, in `<@user>` tags, and in `${…}`.
- Note: the SYNTAX TEST header line uses `//`; every assertion line must be a `//` line — beware that non-assert lines starting with `//` in the fixture are read as assertions.
- Handy manual check: tokenize with `vscode-textmate` using the two grammar files (freemarker + `test-support/text.html.basic.tmLanguage.json`) and print scopes per token (done during investigation).

Unit (`out/diagnostics.test.js` via `npm run test:unit`; tests live in `diagnostics.test.ts`, helper `test(name, fn)` style):
- `"comment containing colon between hash entries is ignored"` — exact issue snippet inside `<#assign … = [ … ] />`; assert `validateFtl(text).length === 0`.
- Parametrize over comment bodies `: , { } [ ] ' "` and over positions (before first key, between entries, after last value, between value and comma, `[#-- --]` variant, nested comment).
- `"missing comma still flagged with comment between entries"`; `"trailing comma flagged when comment follows it"`.
- `"apostrophe inside FTL comment is not an unclosed string / unclosed comment"` (in `comments.test.ts` for `findCommentDelimiterIssues` and in `diagnostics.test.ts` end-to-end).
- Keep existing hash tests (`diagnostics.test.ts` ~L182–233) green.

Run (from `vsix/extension`): `npm run test:grammar`, `npm run test:unit` (or `npm test`).
