# String interpolation highlighting (FTL quoted strings)

Status: **completed** (implemented). Repo: `vsix/` only — never touch `vim/`.

Related: grammar spike [completed/0002-extension-grammar-spike.md](completed/0002-extension-grammar-spike.md); comment-in-directive nesting [completed/0014-ftl-comment-mute-diag.md](completed/0014-ftl-comment-mute-diag.md).

## Goal

Inside FreeMarker **quoted string literals**, `${…}` interpolations must receive a **distinct TextMate scope** (and thus a different default theme color) from the surrounding string text — same idea as template-string interpolation in JS/TS.

User repro (entire token today is plain `string.quoted.*.freemarker` with no interpolation scopes on `${…}`):

```ftl
"${BASEDIR}/${TASKNAME}/pollkey.sql"
```

(Typically inside a directive, e.g. `<#assign p = "${BASEDIR}/${TASKNAME}/pollkey.sql">` or `<#include "…">`.)

## Scope paths (files likely touched)

| Path | Role |
|------|------|
| `vsix/extension/syntaxes/freemarker.tmLanguage.json` | Nest `#interpolation` inside `#string-double` / `#string-single` |
| `vsix/tests/grammar/string-interpolation.ftl` | **New** `vscode-tmgrammar-test` SYNTAX TEST fixture |
| `vsix/extension/CHANGELOG.md` | 문서 step only (not required for 개발 green) |

Optional / only if a regression forces it:

- `vsix/extension/package.json` — `unbalancedBracketScopes` / grammar contrib (prefer **no** change)
- `vsix/extension/src/commentMute.test.ts` — only if new scopes incorrectly leak into comments (should not)

## Non-goals

- No changes under `vim/`.
- No diagnostics / semantic-token / language-service changes for interpolations.
- No new theme / `tokenColorCustomizations` package — rely on standard scopes themes already style (`meta.interpolation` / punctuation).
- Not fixing FTL `${…}` **inside HTML attribute strings** (`text.html.basic` `string.quoted.*`) via injection — injection is already `L:text.html.basic - comment - string`. Top-level `${…}` next to HTML remains as today (`html-embed.ftl`).
- Not adding top-level bare `"…"` as FTL strings (strings are only matched inside directives / interpolations today).
- Not changing string begin/end delimiters, escape rules beyond what’s needed for `\${`, or directive/interpolation outer rules except via shared string repository includes.
- Not implementing raw-string / alternative FTL string forms beyond current `"` / `'` rules.

## Approach

### Current shape (root cause)

In `freemarker.tmLanguage.json`:

- Top-level / injection patterns include `#interpolation`.
- `#interpolation` (`meta.interpolation.freemarker`, begin `\${`, end `}`) already nests `#string-double` / `#string-single` / `#expression` / `#comment`.
- `#string-double` / `#string-single` set `string.quoted.double|single.freemarker` and only nest `constant.character.escape.freemarker` (`\\.`).
- **They do not include `#interpolation`**, so once a quote opens, `${…}` is consumed as ordinary string content.

Directives (angle + square, all variants) already `{ "include": "#string-double" }` / `#string-single`, so fixing the shared string repository fixes directive and nested-in-interpolation strings in one place.

### Change

In **both** `#string-double` and `#string-single` `patterns` arrays:

1. Keep escape first: `{ "name": "constant.character.escape.freemarker", "match": "\\\\." }` so `\${` / `\"` / `\'` stay escapes.
2. Add `{ "include": "#interpolation" }` so `${…}` can open inside the string.

Do **not** duplicate interpolation begin/end rules; reuse `#interpolation` so nesting stays consistent (punctuation + expression body scopes).

Expected scope stack on `${BASEDIR}` inside a double-quoted string (illustrative):

- outer: `… string.quoted.double.freemarker`
- on `${` / body / `}`: also `meta.interpolation.freemarker` (+ existing interpolation punctuation / expression scopes on inner tokens)

Surrounding `/pollkey.sql` remains string-only (no `meta.interpolation`).

### Edge cases

| Case | Expected |
|------|----------|
| Double-quoted user example with two `${…}` | Each `${…}` gets `meta.interpolation.freemarker`; `/` and literal segments stay string-only |
| Single-quoted `'${x}/y'` | Same nesting via `#string-single` |
| Escaped `\${not}` | `\$` = escape; `{not}` stays string text — **no** interpolation scopes |
| Nested: `"${f('${inner}')}"` or `"${f(\"${inner}\")}"` | Outer string → interpolation → inner string → inner interpolation (repository recursion already supported: interpolation includes strings) |
| String inside directive vs inside `${…}` expression | Both use same string rules — both get nesting |
| `}` inside a string that is inside `${…}` | String rule consumes `}` as content; must not close outer interpolation early (already true today when strings are nested under `#interpolation`) |
| Interpolation inside FTL comments | Comments do not include string/interpolation — `commentMute` / `comment-mute.ftl` stay green |
| HTML `"title"` attributes | Unchanged; out of scope |

### Risks

- Accidental early string close if interpolation patterns ever match unescaped `"`/`'` — expression rules should not; keep escape-first order.
- Over-eager `${` in strings is desired for FTL; only `\${` is the escape hatch.

## Acceptance criteria

- **AC1 (user example):** In `<#assign p = "${BASEDIR}/${TASKNAME}/pollkey.sql">` (or equivalent directive wrapping the same literal), the spans `${BASEDIR}` and `${TASKNAME}` each carry `meta.interpolation.freemarker` (and begin/end punctuation scopes on `${` / `}`), while the surrounding quote contents (`/`, `/pollkey.sql`) carry `string.quoted.double.freemarker` **without** `meta.interpolation.freemarker`.
- **AC2 (distinct scopes):** For a character inside an interpolation body (e.g. `BASEDIR`) vs a character of plain string text in the same literal, the scope lists differ: interpolation tokens include `meta.interpolation.freemarker`; plain string text does not.
- **AC3 (single quotes):** `'${x}/y'` inside a directive — `${x}` has interpolation scopes; `/y` is string-only.
- **AC4 (escape):** `"\${x}"` — no `meta.interpolation.freemarker` on `{x}`; escape scope on `\$` (or equivalent current escape tokenization).
- **AC5 (nested):** `"${outer('${inner}')}"` — both outer and inner `${…}` carry `meta.interpolation.freemarker`.
- **AC6 (regression):** Existing `vsix/tests/grammar/*.ftl` fixtures remain green without unjustified assertion rewrites (especially `comment-in-directive.ftl`, `comment-mute.ftl`, `html-embed.ftl`, `builtin.ftl`).
- **AC7:** From `vsix/extension/`: `npm run test:grammar` (or `npm test`) exit 0; no edits outside `vsix/`.

## Test plan

Harness: `vscode-tmgrammar-test` via `npm run test:grammar` in `vsix/extension` (see `package.json` — loads `freemarker.tmLanguage.json` + `syntaxes/test-support/text.html.basic.tmLanguage.json` against `../tests/grammar/*.ftl`).

| Coverage | Fixture / suite |
|----------|-----------------|
| AC1–AC5 | **New** `vsix/tests/grammar/string-interpolation.ftl` — SYNTAX TEST with `// ^` / `// ^^^` assertions: positive interpolation scopes on `${…}`, negative `- meta.interpolation.freemarker` on plain string segments; double + single; `\${`; nested |
| AC6 | Existing grammar fixtures unchanged expectations |
| Comment non-leak | `comment-mute.ftl` + `commentMute.test.ts` (unit tokenize) — still forbid code scopes inside comments |
| Full gate | `cd vsix/extension && npm test` |

Manual spot-check (optional during 개발): open an `.ftl` with the user literal in the Extension Host and confirm interpolation color ≠ string color under a default Dark+/Light+ theme.

## Out of scope reminder

`vim/` is out of scope. Ship notes go in `extension/CHANGELOG.md` at the **문서** step. This file is the 기획 deliverable only — **no grammar implementation in this step**.
