# 0017 - ftldoc TextMate highlight inside FTL comments

Status: **completed**. QA: `npm test` exit 0 (from `extension/`). Repo: `vsix/` only — never touch `vim/`.

Related: [0016-ftldoc.md](0016-ftldoc.md) (parser / Hover shipped; Non-goal there: no grammar), [0014-ftl-comment-mute-diag.md](0014-ftl-comment-mute-diag.md) (nested `#comment` + `applyEndPatternLast`, comment-in-directive).

## Goal

Color **ftldoc** tags inside FTL block comments (`<#-- … -->` / `[#-- … --]`) the way JSDoc/JavaDoc tags stand out inside `/** … */` — without breaking nested-comment mute or comment-in-directive grammar behavior.

Product intent (fixed):

1. Inside `comment.block.freemarker`, highlight these tags **case-insensitively**: `@ignore`, `@param`, `@return` / `@returns`, `@deprecated`.
2. Optionally highlight the **param name** immediately after `@param`.
3. Nested comment mute (`applyEndPatternLast` + recursive `#comment`) and existing `tests/grammar/comment*.ftl` cases stay green.
4. New `vscode-tmgrammar-test` fixture under `tests/grammar/`.

## Scope paths (files likely touched)

- `extension/syntaxes/freemarker.tmLanguage.json` — `#comment` repository only (angle + square begin/end rules)
- `tests/grammar/ftldoc-comment.ftl` — new SYNTAX TEST fixture (name may vary; must live under `tests/grammar/`)
- `extension/CHANGELOG.md` — docs step when shipping (not required for 개발 green)

Do **not** edit grammar until **개발**; this plan file is the 기획 deliverable.

## Non-goals

- No changes under `vim/`.
- No changes to `ftldoc.ts` / Hover / symbols / diagnostics (0016 already shipped).
- No semantic-token provider for ftldoc tags (TextMate only).
- No requirement to highlight unknown `@…` tags, `@see`, `@throws`, HTML/`/* */`/`//` docs, or multi-line param continuations.
- No theme / color-customization package; use stable freemarker-scoped names that default themes can style (or inherit from common JSDoc-like scopes if chosen carefully).
- Do not remove nested-comment support or `applyEndPatternLast`.
- Do not change comment begin/end delimiters or injection rules outside `#comment` unless a regression forces a minimal fix (prefer not).

## Approach

### Current shape

In `freemarker.tmLanguage.json`, repository `#comment` has two begin/end rules (angle `<#--`…`-->`, square `[#--`…`--]`), each:

- `name`: `comment.block.freemarker`
- `applyEndPatternLast`: `true`
- `patterns`: only `[{ "include": "#comment" }]` for nesting

### Change

Add a small repository rule (e.g. `#ftldoc-tag`) and **include it from both** comment rules’ `patterns` arrays **after** the nested `#comment` include so openers still win first:

```text
patterns:
  1. { "include": "#comment" }          # keep first — nested mute
  2. { "include": "#ftldoc-tag" }       # new — tags in comment body
```

`#ftldoc-tag` patterns (suggested; 개발 may refine regex so long as AC holds):

1. **`@param` + name** (optional but preferred): one `match` with case-insensitive tag and a following identifier/token for the name, e.g. `(?i)(@param)\s+(\S+)` with captures:
   - tag → documentation/keyword scope under freemarker (e.g. `storage.type.ftldoc.freemarker` or `keyword.other.documentation.ftldoc.freemarker`)
   - name → `variable.parameter.ftldoc.freemarker` (or equivalent)
2. **Other tags**: `(?i)@(?:ignore|returns?|deprecated)\b` with the same tag scope as `@param`.

Order: more specific `@param … name` before the generic tag match so `@param` is not double-consumed without the name capture.

Keep tag matches as **match** rules inside the comment begin/end (not a nested begin/end that could steal `-->` / `--]`). Tags remain nested under `comment.block.freemarker` in the scope stack (extra scopes on the tag/name tokens only).

### Regression guards

- Do not drop `applyEndPatternLast` or the recursive `#comment` include.
- Existing fixtures `tests/grammar/comment.ftl` and `tests/grammar/comment-in-directive.ftl` must keep passing without assertion edits unless a deliberate, documented scope addition on *non*-ftldoc comment text is required (prefer zero edits to those files).
- Mid-body text that is not a listed tag stays ordinary comment scope (no false keyword scopes on e.g. `email@example.com` — prefer `@` + known tag word boundary, not bare `@`).

## Acceptance criteria (testable)

- **AC1:** In `<#-- @param name desc -->`, `@param` carries the chosen ftldoc tag scope and still sits under `comment.block.freemarker`; `name` carries the param-name scope when that optional highlight is implemented.
- **AC2:** `@ignore`, `@return`, `@returns`, `@deprecated` (and mixed case e.g. `@IGNORE`, `@Param`) get the tag scope inside angle comments.
- **AC3:** Same tag (and optional param-name) highlighting works inside `[#-- … --]` square comments.
- **AC4:** Nested mute unchanged: e.g. `<#-- outer <#-- inner --> still -->` — comment scopes still cover the span as in `comment.ftl` (no directive/keyword leakage from nested content).
- **AC5:** `tests/grammar/comment-in-directive.ftl` still passes (comment inside directive / interpolation not broken).
- **AC6:** New fixture under `tests/grammar/` (e.g. `ftldoc-comment.ftl`) covers AC1–AC3 with `vscode-tmgrammar-test` `// ^` / `// <---` assertions.
- **AC7:** From `extension/`: `npm run test:grammar` (or `npm test`) passes; no edits outside `vsix/`.

## Test plan

| Area | File / command |
|------|----------------|
| ftldoc tag scopes (angle + square, case variants, `@param` name) | `tests/grammar/ftldoc-comment.ftl` (new) |
| Nested comment mute regression | `tests/grammar/comment.ftl` (unchanged expectations) |
| Comment-in-directive / interpolation regression | `tests/grammar/comment-in-directive.ftl` |
| Run | `cd extension && npm run test:grammar` |

Minimal fixture cases (names flexible):

1. Single-line `<#-- @param foo description -->` — tag + param name scopes
2. Multi-line comment with `@ignore`, `@return`/`@returns`, `@deprecated`
3. Case fold: `@IGNORE` / `@Returns`
4. Square `[#-- @param x y --]`
5. Non-tag `@` text (e.g. `user@host`) must **not** get ftldoc tag scope (if easy to assert; otherwise document as best-effort)

## Out of scope reminder

`vim/` is out of scope. Ship notes go in `extension/CHANGELOG.md` at the **문서** step.
