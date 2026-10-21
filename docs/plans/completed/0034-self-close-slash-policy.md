# 0034 - Self-close `/` policy: default-allow with precise denies

Status: **completed** 2026-10-21 (AC9 manual EDH smoke pending user)  
Started: 2026-10-21  
Repo: `vsix/` only. The `vim/` repo is **not** touched (parity is a follow-up, see Non-goals).

Related: plan-less fix in 0.2.1 (`6fc0dd6`, CHANGELOG `[0.2.1]`: "Self-close `/` → `>` allow-list only"), [`closeTag.ts`](../../../extension/src/closeTag.ts), [`autoClose.ts`](../../../extension/src/autoClose.ts).

---

## Goal

Typing `/` inside an open FTL tag should insert the closer by default (`/` → `/>`, or `/]` in square syntax), so `<#assign name /` becomes `<#assign name />`. Today the 0.2.1 allow-list only closes on an empty body or right after a closed string, so `<#assign name /` does nothing.

The new default must still never:

1. close a tag that is **already closed** (no `<#assign num = 3 /> />`, no `//>`);
2. close a directive that **needs a body** (`<#function name /`, `<#if x /`, ...);
3. close when `/` follows an **operand in an expression**, because that is division (`<#assign num = 3 /` → user is typing `3 / 4`).

A small companion fix: if the user types `>` right after our auto-inserted `/>`, drop the duplicate so the result is `/>`, not `/>>`.

---

## Inventory (current behavior, verified in code)

| Piece | Where | Today |
|------|-------|-------|
| `autoCloseAfterSlash(text, offset)` | `closeTag.ts` | Case 2 (`</` / `[/`) rewrites to the matching close tag (out of scope). Case 1 (self-close): finds the innermost open via `matchInnermostOpenBeforeSlash`, denies if `before` ends with `/>` or `/]`, denies if **only the single char** at `offset` is `>`/`]`, then calls `isSelfCloseSlashIntent(inner minus trailing "/")`. |
| `matchInnermostOpenBeforeSlash(before)` | `closeTag.ts` | Regex `([<\[])([#@])([a-zA-Z_][\w.]*)\b` over `before`; the last match whose inner has no closer and no nested tag open wins. It does **not** skip FTL comments, so `<#-- <#assign /` currently self-closes. |
| `isSelfCloseSlashIntent(inner)` | `closeTag.ts` | Deny-first allow-list: deny when `scanTagInnerLexical` shows open string / paren / bracket; allow when the trimmed inner is empty; allow when the inner ends with a closed string literal; otherwise deny. It never looks at the directive name. |
| `scanTagInnerLexical(inner)` | `closeTag.ts` | Tracks string (with `\` escapes), `(` depth and `[` depth. No `{` depth, no comments. |
| `ALWAYS_BLOCK` / `MID_BLOCK` / `CAPTURE_ASSIGN` | `closeTag.ts` | Used for **pairing** (`shouldPairClose`, `isBlockOpenForClose`), not for self-close. `outputformat` and `noparse` are in neither set. |
| On-type wiring | `autoClose.ts` | `onDidChangeTextDocument`: single-change, zero-length-range inserts. `/` → `autoCloseAfterSlash`; `>`/`]` → `alignIndentAfterCloser`, then `autoClosePairOnCloser`. Edits are applied with `undoStopBefore/After: false`; an `applying` flag ignores our own change event. There is **no** state about a previous auto-insert. |
| Pair-on-`>` after `/>` | `closeTag.ts` `autoClosePairOnCloser` | Returns nothing when `text[offset-2] === "/"`. A typed `>` after our `/>` therefore just leaves `/>>`. |
| Tests | `closeTag.test.ts`, `closeTag.adversarial.test.ts` | Adversarial `slashCases` table (33 rows, `deny` / `allow>` / `allow]`) and a "already /> does not double" check. Both suites run in `npm test` via `test:unit`. |
| Other callers | grep | `autoCloseAfterSlash` is only used by `autoClose.ts`. `server/src` does not use `closeTag`. |

Examples of today's results for this plan's key cases: `<#assign name /` deny, `<@banner foo /` deny, `<#function /` **allow** (empty body), `<#if /` **allow**, `<#-- <#assign /` **allow**.

---

## Scope paths

- `vsix/extension/src/closeTag.ts` (self-close decision; new pure helpers for the forward scan and the duplicate-`>` guard)
- `vsix/extension/src/autoClose.ts` (duplicate-`>` state tracking only)
- `vsix/extension/src/closeTag.test.ts`
- `vsix/extension/src/closeTag.adversarial.test.ts`
- 문서 step: `vsix/extension/CHANGELOG.md` (`[Unreleased]` → `### Changed` / `### Fixed`), `vsix/docs/index.md` (active/completed plan pointer), this plan (moved to `docs/plans/completed/` when done)

Do **not** touch the uncommitted plan-0033 changes already in the working tree (`.gitignore`, `.gitattributes`, `docs/index.md` 0033 line, `extension/CHANGELOG.md` 0033 entries, `extension/package*.json`, `extension/src/commentMute.test.ts`, `docs/plans/completed/0033-*.md`) except to append to `CHANGELOG.md` / `docs/index.md` in the 문서 step.

---

## Non-goals

- Any change in the `vim/` repo (`ftl-dev.vim`). Vim parity for this policy is a **follow-up** plan; record it in `docs/product/vim-neovim-matrix.md` only if 문서 decides a row is needed (no runtime change).
- `</` / `[/` close-tag expansion, Enter pairing (`autoClosePairOnEnter`), `>` pairing (`autoClosePairOnCloser`) and indent alignment. Their behavior must not change, apart from the duplicate-`>` guard (AC9) which runs before them.
- HTML tags (`<div /`, `<br /`). The self-close path stays FTL-only (`<#`, `<@`, `[#`, `[@`).
- Changing `ALWAYS_BLOCK` / `MID_BLOCK` membership (that would change pairing). Self-close uses its own deny set (see AC4).
- A full FTL expression parser. The operand check is lexical on the text before the slash.
- Version bump, tag, commit, publish.

---

## Definitions

Let the slash be typed at `offset` (cursor is right after `/`). Let `tag` be the innermost open FTL tag before the slash, `name` its directive name (with sigil), and `inner` the tag text after the name up to (not including) the typed `/`. "Top level" means outside strings, outside `(…)`, `[…]` and `{…}`, and outside FTL comments.

- **Closer**: `>` for `<#`/`<@`, `]` for `[#`/`[@`.
- **New tag open** (angle): `<#` (not `<#--`), `<@`, `</`, or `<` followed by a letter. (square): `[#` (not `[#--`), `[@`, `[/`. FTL comments `<#-- … -->` / `[#-- … --]` are skipped, not treated as an open.
- **Expression context**: `inner` contains, at top level, an `=` (this covers `=`, `==`, `!=`, `<=`, `>=`), a compound assignment (`+=` `-=` `*=` `/=` `%=`), or `++` / `--`; **or** `name` is `#return` (its whole body is an expression).
- **Trailer**: `inner` trimmed on the right (spaces, tabs, newlines).
- **Operand end**: the trailer ends with a digit, an identifier char (`[A-Za-z0-9_$]`, which covers dotted paths, `?builtin`, and `x!default`), `.`, `)`, `]`, `}`, or a bare `!` (default operator with omitted default).
- **Closed string trailer**: the trailer ends with a complete `"…"` / `'…'` literal (raw `r"…"` included), with escapes respected.
- **Postfix trailer**: the trailer ends with `++` or `--` (`<#assign x++ />` is valid FTL and cannot be division).
- **SELF_CLOSE_DENY** (directive names that need a body): `ALWAYS_BLOCK` ∪ `MID_BLOCK` ∪ {`outputformat`, `noparse`}.
  - `outputformat` and `noparse` join because both only make sense with a body: `<#outputformat "HTML">…</#outputformat>` scopes the format of its body, and `<#noparse>…</#noparse>` exists only to emit its body literally. `<#noparse/>` / `<#outputformat "x"/>` are no-ops at best. They stay out of `ALWAYS_BLOCK` so pairing is unchanged (Non-goals).
  - `MID_BLOCK` (`else elseif recover case default sep`) is always part of an enclosing block. `<#else/>` is never what the user wants.
  - Applies to `#` directives only. User macros (`@`) are never in this set.

---

## Decision order

`autoCloseAfterSlash` Case 1 decides in this order. The first matching rule wins.

1. No innermost open FTL tag reaches the slash (including: slash after an existing `/>`, slash outside any tag, slash inside an FTL comment) → **deny**.
2. Lexical state at the slash is inside a string, paren, bracket or brace → **deny** (unchanged).
3. **Already closed** (forward scan, AC2) → **deny**.
4. `#name` ∈ SELF_CLOSE_DENY → **deny**.
5. Trailer is empty → **allow**.
6. Closed string trailer → **allow** (unchanged; covers `<#assign x = "a/b" /`).
7. Expression context:
   - postfix trailer → **allow**;
   - anything else (operand end, dangling operator, bare `=`) → **deny**.
8. `#include` / `#import` with the slash **glued** to the preceding token (no space/tab/newline between the last non-space char and `/`, and that char is an identifier char or `.`) → **deny**. FTL include/import paths are strings, so `<#include lib/` is a user typing an unquoted path, not a self-close.
9. Otherwise → **allow** (capture-name form `<#assign name /`, positional macro args `<@banner foo /`, `<#include tpl /`, `<#nested x /`, ...).

When allowed, the edit is unchanged from today: `insertAt: offset`, `insertText: ">"` or `"]"`, `cursorAt: offset + 1`.

---

## Acceptance criteria

- [x] **AC1 - Default allow.** Outside rules 1–8, `/` typed inside an open FTL tag inserts the closer with the cursor after it. All rows marked **allow** in the case table pass, including `<#assign name /`, `<#local name /`, `<#global name /`, `<@banner foo /`, `<#include tpl /`, `<#nested /`, `<#return /`, and `[#assign name /` → `]`.
- [x] **AC2 - Already-closed guard (forward scan).** A pure helper (e.g. `tagClosedAfter(text, offset, openBracket)`) scans forward from `offset`. It respects strings, FTL comments, and `(`/`[`/`{` depth, and it does not treat an unparenthesized `<` that is not a tag open as anything. If it reaches this tag's closer at depth 0 **before** a new tag open or EOF → deny. This subsumes today's single-char check, and it covers `/` typed before ` />`, before `/>` (no `//>`), before `\n>`, and before `foo="a">` (editing the middle of a finished tag). Rows in the "already closed" group pass.
- [x] **AC3 - Outside any tag.** `<#assign num = 3 /> /` and plain text `a / b` → deny (current behavior, now with explicit table rows).
- [x] **AC4 - Body-required directives.** `#` names in SELF_CLOSE_DENY never self-close, even with an empty body: `<#function name /`, `<#function /`, `<#macro m /`, `<#if x /`, `<#if /`, `<#list xs as x /`, `<#else /`, `<#items as x /`, `<#sep /`, `<#noparse /`, `<#outputformat "HTML" /`, and `[#if /`. The plan text above records why `outputformat` and `noparse` join. `ALWAYS_BLOCK` / `MID_BLOCK` are unchanged.
- [x] **AC5 - Division (operand in expression context).** Expression-context rows with an operand end deny: `<#assign num = 3 /`, `<#assign x = 10/`, `<#assign x = 10 /`, `<#assign x = 1 /`, `<#local i = startBit /`, `<#assign x = a.b /`, `<#assign x += y /`, `<#assign x = foo() /`, `<#assign x = ob.loadText("foo") /`, `<#assign x = xs[0] /`, `<#assign x = y?size /`, `<#assign x = y!0 /`, `<@box w=10/`, `<@box w=10 /`, `<#return total /`, and `<#assign x = /` (bare `=`, deny). In the same context, a closed string trailer (`<#assign x = "a" /`, `<#assign x = "a/b" /`, `<@box title="x" /`) and a postfix trailer (`<#assign x++ /`) allow.
- [x] **AC6 - Unchanged denies.** Every existing adversarial `deny` row keeps `deny` except the flipped rows listed below. In particular: open strings (`loadText("./`, `"https://`, `'./`, escaped quote), open paren (`foo(/`), open bracket (`[1,/`), unquoted path after `=` (`./`, `../`), `<#include lib/`, `<#include path/to/`, and the nested string in an unclosed `#function`.
- [x] **AC7 - Comments.** `/` inside an unterminated FTL comment (`<#-- <#assign /`, `[#-- [#assign /`) → deny. A finished comment before the tag (`<#-- c --> <#assign /`) does not block the allow.
- [x] **AC8 - Nested innermost.** `<#function f\n  <#assign /` closes the inner `#assign` only (result ends with `<#assign />`, no `function />`). `<#function f\n  <#assign name /` also allows. Both existing nested tests stay green.
- [x] **AC9 - Duplicate `>` guard.** After an auto-inserted `>`/`]` from the self-close path, if the very next document change is a single typed `>` (or `]` in square mode) at the position right after our closer, with no other edit in between (checked by document URI + version), it is removed, so the line reads `/>` (`/]`), and the cursor stays after the closer. The guard runs before `alignIndentAfterCloser` / `autoClosePairOnCloser`, is consumed after one use, and is cleared by any other change to that document. The decision is a pure function in `closeTag.ts` (e.g. `isDuplicateCloser(state, change)`), unit-tested; `autoClose.ts` only stores the state and applies the delete. Undo of the delete uses the same `undoStopBefore/After: false` as the other auto-edits.
- [x] **AC10 - Tests.** `closeTag.adversarial.test.ts` `slashCases` contains every row of the case table below (by text and expectation). Rows that need text after the cursor use a `cursor` marker (e.g. `|`) or an explicit offset; the harness is extended for that. `closeTag.test.ts` gains unit tests for the forward-scan helper and the duplicate-guard decision. The existing `closeTag.test.ts` self-close tests keep their expectations (none of them is flipped).
- [x] **AC11 - No collateral change.** `npm test` passes (grammar tests + all unit suites). `</`, Enter, and `>` pairing tests are unchanged. The `git diff` of this step touches only the Scope paths.
- [x] **AC12 - Docs.** The `isSelfCloseSlashIntent` doc comment (table) describes the new decision order. 문서 step: CHANGELOG `[Unreleased]` entry describing the new default and the duplicate-`>` guard, and listing the flipped cases; `docs/index.md` points at this plan.

### Case table

`|` marks the cursor right after the typed `/` when text follows it. Otherwise the cursor is at the end. "Today" is the current result; **bold** marks a change.

| # | Text | Expect | Today | Rule |
|---|------|--------|-------|------|
| A1 | `<#assign /` | allow `>` | allow | 5 |
| A2 | `<#local /` | allow `>` | allow | 5 |
| A3 | `<@banner /` | allow `>` | allow | 5 |
| A4 | `[#assign /` | allow `]` | allow | 5 |
| A5 | `<#assign name /` | allow `>` | **deny** | 9 |
| A6 | `<#local name /` | allow `>` | **deny** | 9 |
| A7 | `<#global name /` | allow `>` | **deny** | 9 |
| A8 | `[#assign name /` | allow `]` | **deny** | 9 |
| A9 | `<#include "lib.ftl" /` | allow `>` | allow | 6 |
| A10 | `<#include 'lib.ftl' /` | allow `>` | allow | 6 |
| A11 | `<#assign x = "a" /` | allow `>` | allow | 6 |
| A12 | `<#assign x = "" /` | allow `>` | allow | 6 |
| A13 | `<#assign x = "a/b" /` | allow `>` | allow | 6 |
| A14 | `[#include "lib.ftl" /` | allow `]` | allow | 6 |
| A15 | `<@box title="x" /` | allow `>` | allow | 6 |
| A16 | `<@banner foo /` | allow `>` | **deny** | 9 |
| A17 | `<#include tpl /` | allow `>` | **deny** | 9 |
| A18 | `<#nested /` | allow `>` | allow | 5 |
| A19 | `<#nested x /` | allow `>` | **deny** | 9 |
| A20 | `<#return /` | allow `>` | allow | 5 |
| A21 | `<#assign x++ /` | allow `>` | **deny** | 7 |
| A22 | `<#function f\n  <#assign /` | allow `>` | allow | 5 |
| A23 | `<#function f\n  <#assign name /` | allow `>` | **deny** | 9 |
| A24 | `<#-- c --> <#assign /` | allow `>` | allow | 5 |
| C1 | `<#assign num = 3 /\|>` | deny | deny | 3 |
| C2 | `<#assign num = 3 /\| />` | deny | deny (rule 7 today) | 3 |
| C3 | `<#assign x /\|\n>` | deny | deny | 3 |
| C4 | `<#assign x /\|/>` | deny (no `//>`) | deny | 3 |
| C5 | `<#assign x /\| y="a">` | deny | deny | 3 |
| C6 | `[#assign x /\| ]` | deny | deny | 3 |
| C7 | `<#assign  /\|>` | deny | deny | 3 |
| C8 | `<#assign x /\|\n<div>` | allow `>` | **deny** | 9 (scan stops at tag open) |
| O1 | `<#assign num = 3 /> /` | deny | deny | 1 |
| O2 | `a / b` | deny | deny | 1 |
| O3 | `<#-- <#assign /` | deny | **allow** | 1 |
| O4 | `[#-- [#assign /` | deny | **allow** | 1 |
| B1 | `<#function name /` | deny | deny | 4 |
| B2 | `<#function /` | deny | **allow** | 4 |
| B3 | `<#macro m /` | deny | deny | 4 |
| B4 | `<#if x /` | deny | deny | 4 |
| B5 | `<#if /` | deny | **allow** | 4 |
| B6 | `<#list xs as x /` | deny | deny | 4 |
| B7 | `<#else /` | deny | **allow** | 4 |
| B8 | `<#items as x /` | deny | deny | 4 |
| B9 | `<#sep /` | deny | **allow** | 4 |
| B10 | `<#noparse /` | deny | **allow** | 4 |
| B11 | `<#outputformat "HTML" /` | deny | **allow** | 4 |
| B12 | `[#if /` | deny | **allow** | 4 |
| D1 | `<#assign num = 3 /` | deny | deny | 7 |
| D2 | `<#assign x = 10/` | deny | deny | 7 |
| D3 | `<#assign x = 10 /` | deny | deny | 7 |
| D4 | `<#local i = startBit /` | deny | deny | 7 |
| D5 | `<#assign x = a.b /` | deny | deny | 7 |
| D6 | `<#assign x += y /` | deny | deny | 7 |
| D7 | `<#assign x = foo() /` | deny | deny | 7 |
| D8 | `<#assign x = ob.loadText("foo") /` | deny | deny | 7 |
| D9 | `<#assign x = xs[0] /` | deny | deny | 7 |
| D10 | `<#assign x = y?size /` | deny | deny | 7 |
| D11 | `<#assign x = y!0 /` | deny | deny | 7 |
| D12 | `<@box w=10/` | deny | deny | 7 |
| D13 | `<@box w=10 /` | deny | deny | 7 |
| D14 | `<#return total /` | deny | deny | 7 |
| D15 | `<#assign x = /` | deny | deny | 7 |
| D16 | `<#assign x = 1 /` | deny | deny | 7 |
| U1 | `<#assign whiteListSql = ob.loadText("./` | deny | deny | 2 |
| U2 | `<#assign x = loadText("a/b/` | deny | deny | 2 |
| U3 | `<#assign u = "https://` | deny | deny | 2 |
| U4 | `<#assign x = './` | deny | deny | 2 |
| U5 | `<#assign x = "a\"b/` | deny | deny | 2 |
| U6 | `<#assign x = "<!-- /` | deny | deny | 2 |
| U7 | `<#assign x = ../` | deny | deny | 7 |
| U8 | `<#assign x = ./` | deny | deny | 7 |
| U9 | `<#assign x = foo(/` | deny | deny | 2 |
| U10 | `<#assign x = [1,/` | deny | deny | 2 |
| U11 | `<@box title="./` | deny | deny | 2 |
| U12 | `<#function f\n  <#assign x = "./` | deny | deny | 2 |
| U13 | `<#include lib/` | deny | deny | 8 |
| U14 | `<#include path/to/` | deny | deny | 8 |
| U15 | `<#import lib/` | deny | deny | 8 |

### Flipped cases (vs current code)

Existing adversarial rows that flip:

- `<@banner foo /` (A16): deny → **allow**. No top-level `=`, so it is not an expression context. The slash after a positional argument is a tag trailer under the new default.

Existing adversarial rows that were candidates and do **not** flip:

- `<#include lib/` (U13) and `<#include path/to/` (U14): stay **deny** by rule 8. Include/import paths must be string expressions, so a slash glued to a bare identifier is an unquoted path being typed. With a space (`<#include tpl /`, A17) it is a variable name plus trailer and allows.
- `<@box w=10/` (D12), `<#assign x = ob.loadText("foo") /` (D8), the division rows, `./` / `../`: stay **deny** by rule 7.

Other behavior changes that have no existing row (new rows added):

- allow: A5–A8, A17, A19, A21, A23 (capture-name form, positional args, postfix `++`), C8.
- deny: O3–O4 (inside an FTL comment), B2, B5, B7, B9–B12 (empty-body block directives that self-close today).

Known, accepted false negatives (user types `>` manually):

- Forward scan is multi-line, so a stray `>` in later plain text before any tag open (`<#assign x /` then `\nHello > world`) denies.
- `<#ftl strip_whitespace=true /` and other named-param `=` with a bare value deny (rule 7). This is the same as `<@box w=10 /`.

---

## Approach

1. **closeTag.ts, decision.**
   - Replace `isSelfCloseSlashIntent(inner)` with a function that also gets `sigil`/`name` and the bracket. Have `matchInnermostOpenBeforeSlash` return the name (it already matches it) and skip FTL comments (`<#-- … -->`, `[#-- … --]`; reuse `skipFtlComment` from `./comments` or an equivalent square variant), so an open inside an unterminated comment is not a candidate.
   - Extend `scanTagInnerLexical` with `{`/`}` depth and a "top-level operator" summary (has top-level `=`, compound op, `++`/`--`) computed in the same pass, so strings and nesting are respected.
   - Implement rules 1–9 in the order above. Keep the edit shape unchanged.
2. **closeTag.ts, forward scan.** Add `tagClosedAfter(text, offset, openBracket)` (exported for tests). Walk from `offset`, track strings, FTL comments, `(`/`[`/`{` depth; return true on the closer at depth 0, false on a new tag open (definition above) or EOF. Replace the single-char `after === ">"` check with it. Keep the `/\/[>\]]$/` check on `before` (rule 1 covers it, but it is cheap).
3. **closeTag.ts, duplicate guard.** Add `type SelfCloseMark = { uri: string; version: number; offset: number; closer: ">" | "]" }` and a pure `isDuplicateCloser(mark, { uri, version, offset, text, rangeLength })` that returns true only when `uri` matches, `version === mark.version + 1`, `rangeLength === 0`, `text === mark.closer`, and the insert position equals `mark.offset` (right after our closer).
4. **autoClose.ts.** After a successful self-close edit (`insertText` `>`/`]`), store the mark with `doc.version` read **after** `editor.edit` resolves. On every change event for a FreeMarker doc: if a mark exists and `isDuplicateCloser` is true, delete the typed char (`builder.delete` on `[offset, offset+1)`, undo stops false), keep the cursor after our closer, clear the mark, and return before the `>`/`]` branch. Otherwise clear the mark for that document and continue as today.
5. **Tests.** Rewrite `slashCases` from the case table (add an optional cursor marker). Add `closeTag.test.ts` tests for `tagClosedAfter` (closer reached / tag open first / string containing `>` / `(a > b)` / FTL comment containing `>`) and `isDuplicateCloser` (match, wrong version, wrong offset, wrong char, other URI). Keep all existing non-slash tests untouched.
6. **Docs (문서 step).** CHANGELOG `[Unreleased]`: `### Changed` (default-allow policy + deny rules + flipped cases), `### Fixed` (no `/>>` after typing `>`; no self-close inside FTL comments; no `<#if />`-style self-close of block directives). `docs/index.md` active/completed pointer. Note the vim follow-up.

---

## QA environment

Same as plan 0033. The user's folder has uncommitted changes and deletion is not allowed there, so tests run in the Cowork cloud container:

1. Clone `https://github.com/DevNathan/ftl-dev` into the container.
2. Stage the user's `vsix/.git/objects` (packs + loose objects) into the clone's `.git/objects/` and `git checkout <local HEAD sha>` (`git -C vsix rev-parse HEAD` in the user's folder).
3. Overlay every changed/untracked working-tree file listed by `git -C vsix status --short` (this includes the plan-0033 files and this plan's code changes) from the user's folder.
4. Run the commands below there. Do not run npm in the user's folder.

## QA commands (검증QA)

```
cd ftl-dev/extension && npm ci && npm test         # exit 0: grammar tests + all unit suites
node out/closeTag.test.js                          # exit 0 (new forward-scan + duplicate-guard tests)
node out/closeTag.adversarial.test.js              # exit 0; every case-table row printed with ✓
grep -c "name:" src/closeTag.adversarial.test.ts   # row count >= case table rows
git -C <user vsix> diff --stat                     # read-only, user's folder: only Scope paths beyond 0033 files
```

Manual smoke (Extension Development Host, optional but recommended):

- Type `<#assign name /` → `<#assign name />`; then type `>` → still `<#assign name />`.
- Type `<#assign num = 3 /` → no insert; continue `4>` → `<#assign num = 3 /4>`.
- Type `<#function f /` → no insert.
- With `<#assign num = 3 />` present, put the cursor before ` />` and type `/` → no `>` inserted.

---

## Results

Completed 2026-10-21. Dev in `closeTag.ts` / `autoClose.ts` + tests; 검증QA in a clean cloud copy at local HEAD `ab41a94` with the user's working-tree files overlaid (same QA environment as 0033).

**QA summary (검증QA):** `npm ci` = 0; `npm test` = 0 (480 ✓, 0 failures; all 18 unit suites "All … passed"); rename / workspaceSymbols / symbolKindVscode tests = 0; server `npx tsc -p .` = 0. `closeTag.adversarial.test.ts` has 95 `name:` rows (≥ case table).

Direct smoke via `autoCloseAfterSlash`: `<#assign name /` → `<#assign name />`; `<#assign num = 3 /` → no edit; `<#function name /` → no edit; `<#macro m /` → no edit; `<#assign num = 3 /|>` and `<#assign num = 3 /| />` → no edit; `<#assign num = 3 /> /` → no edit; `<#include "lib.ftl" /` → `/>`; `<@banner /` → `/>`; `<#assign x = 10/` → no edit.

| AC | Result | Evidence |
|----|--------|----------|
| AC1 Default allow | ✓ | Adversarial A1–A24 rows (incl. A5–A8 capture-name, A16 `<@banner foo /`, A17, A19, A21 `x++`); smoke `<#assign name /` → `/>`, `<@banner /` → `/>` |
| AC2 Already-closed forward scan | ✓ | `tagClosedAfter` tests in `closeTag.test.ts` ("closer reached directly / after space / after newline", "EOF → not closed", "new tag open first → not closed", "> inside a string is skipped", "> inside (a > b) / [..] / {..} is skipped", "> inside an FTL comment is skipped", "bare < comparison is plain text", "square mode"); rows C1–C8; smoke `/|>`, `/| />` → no edit |
| AC3 Outside any tag | ✓ | Rows O1–O2; smoke `<#assign num = 3 /> /` → no edit |
| AC4 Body-required directives | ✓ | `SELF_CLOSE_DENY` (`ALWAYS_BLOCK` ∪ `MID_BLOCK` ∪ `outputformat`, `noparse`); rows B1–B12; smoke `#function` / `#macro` → no edit. `ALWAYS_BLOCK` / `MID_BLOCK` unchanged |
| AC5 Division | ✓ | Rows D1–D16, A11–A15 (closed string), A21 (postfix); existing tests "no self-close when / is division after assign expression", "… follows number in expression"; smoke `= 3 /`, `= 10/` → no edit |
| AC6 Unchanged denies | ✓ | Rows U1–U15; only flipped existing row is A16 |
| AC7 Comments | ✓ | Rows O3–O4 deny, A24 allow; `matchInnermostOpenBeforeSlash` skips FTL comments |
| AC8 Nested innermost | ✓ | "self-close / on nested assign does not close outer function", "self-close: nested capture-name assign closes inner only (A23)", rows A22–A23 |
| AC9 Duplicate `>` guard | ✓ unit / **manual pending** | `selfCloseMarkFor` tests ("offset is right after inserted closer", "version gap … → no mark", "non self-close edits → no mark"), `isDuplicateCloser` tests ("match", "no mark / wrong version / offset / char / uri / range", "square closer"). **Pending:** manual Extension Development Host smoke by the user (F5 "Run Extension (ftl-dev vsix)": type `<#assign name /` → `/>`, then `>` → still `/>`) |
| AC10 Tests | ✓ | `slashCases` covers the case table with `|` cursor marker; new helper tests above; existing self-close tests unchanged |
| AC11 No collateral change | ✓ | `npm test` = 0 (480 ✓); `</`, Enter, `>` pairing tests unchanged |
| AC12 Docs | ✓ | `isSelfCloseSlashIntent` doc comment describes the decision order; CHANGELOG `[Unreleased]` (plan 0034); `docs/index.md` completed pointer → 0034 |

### Accepted false negatives (user types `>` manually)

The operand-before-slash rule (rule 7) was chosen by the user: in expression context, a slash after an operand is treated as division. So these do **not** auto-close:

- `<#ftl strip_whitespace=true /`
- `<#assign flag = true /`
- `<#setting number_format=0 /`
- `<@box w=10 /`

### Known scan limits

- Forward scan (`tagClosedAfter`) tracks strings, so an apostrophe in following plain text (e.g. `<#assign x /` then `\nDon't > …`) can open a phantom string and change the result.
- `<!--` (HTML comment) is not treated as a tag open by the forward scan; only FTL comments are skipped, and `<` + letter / `<#` / `<@` / `</` count as new opens.
- Multi-line scan: a stray `>` in later plain text before any tag open denies (as noted under the case table).

### Follow-ups

- Vim parity for this policy (`vim/` not touched).

---

## Wave one-liner

**Self-close `/` now inserts `>`/`]` by default inside an open FTL tag, with denies for already-closed tags (forward scan), body-required directives, operands in expression context (division), unquoted include paths and FTL comments; typing `>` right after an auto `/>` no longer produces `/>>`.**
