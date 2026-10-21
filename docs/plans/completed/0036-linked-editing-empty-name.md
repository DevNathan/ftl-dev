# 0036 - Linked editing keeps the pair while the tag name is empty

Status: **completed** 2026-10-21 (AC11 manual EDH smoke pending user)  
Supersedes: plan 0035 case `X12` (`<#>`/`</#>` now link) and partly 0035 AC6 (the "empty name (`<#>`) → undefined" clause; also `</@>` with an **empty** `@` open now links).  
Started: 2026-10-21  
Repo: `vsix/` only (VS Code / Open VSX extension). The `server/` LSP and the `vim/` repo are **not** touched.

Related: plan [0035](../completed/0035-linked-tag-name-editing.md) (linked editing; this plan amends its empty-name rule), [`linkedEditing.ts`](../../../extension/src/linkedEditing.ts), [`linkedEditingProvider.ts`](../../../extension/src/linkedEditingProvider.ts), [`comments.ts`](../../../extension/src/comments.ts).

---

## Goal

User bug report. Start from

```ftl
<#function name>

</#function>
```

and delete the whole directive name with linked editing on. Both tags mirror the delete and the text becomes

```ftl
<# name>

</#>
```

After that the open and close are no longer paired: typing a new name (e.g. `if`) into either tag does not mirror into the other. Expected (same as HTML linked editing in VS Code): the pair stays linked while the name is empty, so the user can type the new name into either side and both change.

---

## Inventory / root cause (verified in code)

| Piece | Where | Today |
|------|-------|-------|
| Name lexing | `linkedEditing.ts` `scanTags` | After the sigil, the name is read only if the next char matches `NAME_START` (`[A-Za-z_]`), then `NAME_CHAR` (`[\w.]`). So `<# name>` and `</#>` give `name === ""`. |
| Empty-name skip | `linkedEditing.ts` `scanTags` | `if (name === "" && !(close && sigil === "@")) { i = nameEnd; continue; }`. Every empty-name open (`<#`, `[#`, `<@`, `[@`) and every empty `#` close (`</#>`, `[/#]`) is **not a tag**: nothing is pushed. |
| Nameless `@` close | `linkedEditing.ts` `scanTags` / `matchTags` | `</@>` / `[/@]` with blank inner becomes `kind: "namelessClose"`, never pairs; in `matchTags` it removes the topmost `@` stack entry of the same bracket (any name). |
| Hit lookup | `linkedEditing.ts` `linkedTagNameRanges` | Hit is `nameStart <= offset <= nameEnd`; a zero-length name range at `nameStart === nameEnd` already hits when `offset === nameStart`. A hit tag without a partner → `undefined`. |
| 0035 tests | `linkedEditing.test.ts` | `X12 "<#\|>a</#>"` asserts `undefined` (0035 AC6 "empty name (`<#>`)"). `N6 "<@«a\|»><@a>x</@></@«a»>"`, `N7 "<@a><@a>x</@\|></@a>"` pin the nameless `</@>` rule. |
| Harness | `linkedEditing.test.ts` `parseCase` | `«|»` yields a zero-length expected range `[k, k]` with the cursor at `k`; no harness change needed. |
| Adapter | `linkedEditingProvider.ts` | Maps each `[start, end]` with `rangeFromOffsets(text, start, end - start, map)`; length 0 gives an empty `vscode.Range`. No change needed. |
| Comment start | `comments.ts` | `<#--` / `[#--` start an FTL comment (`ftlCommentRanges`, `skipFtlComment`); `scanTags` checks `isCommentStart` before any tag head, so `<#--` never reaches the name lexer. |
| Word pattern | `linkedEditing.ts` | `FTL_TAG_NAME_WORD_PATTERN = /[A-Za-z_][\w.]*/`. VS Code checks each linked range's text: `match ? match[0].length : 0` must equal the text length. Empty text → no match → 0 === 0 → the session is **kept**. So the word pattern is not the cause. |

**Root cause.** Once the name is empty, `scanTags` drops both tags. VS Code re-asks the provider for the linked ranges (cursor move, content change, or Start Linked Editing again) and gets `undefined`, so the linked session ends. When the user then types `i`, `<#i name>` + `</#>` have different keys, so nothing links even after a re-query. The half-deleted states (`<#functio name>` + `</#functio>`, …) already work through the 0035 key rule (P19-style).

---

## Scope paths

- `vsix/extension/src/linkedEditing.ts` (empty-name open/close heads + `matchTags` rule for empty `</@>`)
- `vsix/extension/src/linkedEditing.test.ts` (new rows below; `X12` expectation changes from `undefined` to both zero-length ranges)
- 문서 step: `vsix/extension/CHANGELOG.md` (extend the existing `[Unreleased]` linked-editing `### Added` line, or a `### Fixed` line if masterAI prefers), `vsix/docs/index.md` (plan pointer), this plan (moved to `docs/plans/completed/` when done)

`linkedEditingProvider.ts`, `extension.ts`, `package.json` (no new test file; `linkedEditing.test.js` is already in `test:unit`), `closeTag.ts`, `autoClose.ts`, `diagnostics.ts`, `comments.ts`, `server/` are **not** edited. Plan 0035 (`docs/plans/completed/0035-*.md`) is not edited; this plan records that its AC6 "empty name (`<#>`)" row and case `X12` are superseded.

Do **not** touch the other uncommitted plan-0033/0034/0035 changes in the working tree (see `git -C vsix status --short`) except the Scope paths above.

---

## Non-goals

- LSP `textDocument/linkedEditingRange` and Vim / Neovim (0035 follow-up, unchanged).
- HTML tags.
- Diagnostics for empty names. Diagnostics may still flag `<# name>` / `</#>` as an unknown / malformed directive while the user is retyping; leave it.
- Changing `FTL_TAG_NAME_WORD_PATTERN` or the provider.
- Any other 0035 rule: self-close, mid-block (`#else`, `#sep`, …), capture-assign, `#noparse`, comments, strings, interpolations, mixed brackets, mismatched names, the nameless `</@>` behavior for **non-empty** `@` opens.
- Auto-inserting a name, or repairing `<#if name>` + `</#>` (mismatch: not linked).
- Version bump, tag, commit, publish.

---

## Definitions (delta to 0035)

- **Empty open head**: `<#`, `[#`, `<@`, `[@` (not preceded by `/`) where the char right after the sigil is whitespace, `>` (angle) / `]` (square), or `/`. Its name range is `[p, p]` with `p` = offset right after the sigil; key = `bracket + sigil` (e.g. `<#`). Never:
  - `<#--` / `[#--` (FTL comment; already consumed by `isCommentStart` before the head check, keep that order);
  - `<#-`, `[#-` or any other non-name char after the sigil (`<#-x`, `<#1`, `<#$`) → not a tag (unchanged);
  - EOF right after the sigil, or a new tag head before the closer → incomplete → ignored (unchanged `scanTagEnd` rule; so "end" never pairs).
- **Empty `#` close**: `</#` / `[/#` followed by optional whitespace and the closer (`</#>`, `</# >`, `[/#]`). Inner must be blank; `</# x>` is not a tag (same as the nameless `@` close today). Kind `close`, name `""`, name range `[p, p]` right after `#`, key `<#` / `[#`.
- **Empty `@` close** (`</@>`, `[/@]`, blank inner): still `namelessClose`, name range `[p, p]` right after `@`.
- **Pairable empty open**: same `isPairableOpen` as any other name: self-closed (`<#/>`, `<# />`, `<@/>`, `[@ /]`) → not pairable; `""` is not in `MID_BLOCK` / `CAPTURE_ASSIGN`, so every non-self-closed empty open is pairable.
- **Hit**: unchanged (`nameStart <= offset <= nameEnd`); for an empty name this means `offset === nameStart`, i.e. the caret right after the sigil. `<# |name>` (after the space) is not a hit.

## Matching rule (delta to 0035 Scan step 3)

- Empty `#` open + empty `#` close: ordinary key match (`<#` === `<#`), searched from the stack top with the 0035 lenient rule (entries above it stay unmatched). A non-empty `#` open never has key `<#`, so it never pairs with `</#>`; `</#>` with no empty `#` open on the stack is an orphan.
- Empty `@` close (`namelessClose`): find the topmost stack entry with `sigil === "@"` and the same bracket (exactly the 0035 search). If that entry is an **empty** `@` open → remove it and **record the pair**. Otherwise → remove it, no pair (0035 behavior, N6/N7 unchanged). It never skips a non-empty `@` open to reach a deeper empty one.
- Non-empty `<@box>` + `</@>` stays NOT linked.
- Plain-text `<# ` (or `<@ `) that is a complete tag but has no matching empty close stays on the stack unmatched → no ranges and no effect on named pairs (keys differ). Only when a matching empty close exists does it link (documented limit, case L1).

---

## Acceptance criteria

- [x] **AC1 - Empty open head.** `scanTags` emits an `open` tag with `name === ""`, zero-length name range right after the sigil, key `bracket + sigil`, for `<#` `[#` `<@` `[@` followed by whitespace, the bracket's closer, or `/`, when `scanTagEnd` finds a closer. `<#--` / `[#--` stay comments; `<#-…`, `<#1…`, other non-name chars, EOF and incomplete heads stay non-tags (cases E1–E8).
- [x] **AC2 - Empty `#` close.** `</#>` / `[/#]` (blank inner, whitespace allowed) emit a `close` tag with `name === ""`, zero-length name range right after `#`, key `<#` / `[#`. `</# x>` is not a tag.
- [x] **AC3 - Pairing.** Empty open pairs only with an empty close of the same sigil and bracket, nesting-aware with the existing stack (Matching rule). Empty `</@>` pairs with the topmost same-bracket `@` entry only if that entry is empty; otherwise 0035 popping is unchanged. Non-empty opens never pair with an empty close and vice versa.
- [x] **AC4 - Ranges.** For a paired empty name with the cursor at `nameStart`, `linkedTagNameRanges` returns both zero-length ranges `[[p1, p1], [p2, p2]]` in document order with `FTL_TAG_NAME_WORD_PATTERN`. Same result via `opts.comments`.
- [x] **AC5 - Rename sequence.** Every intermediate state of `function` → (delete char by char) → `""` → `i` → `if`, from the open and from the close, returns both ranges (cases S1–S9).
- [x] **AC6 - Unchanged rules.** All 0035 case-table rows except `X12` keep their expectation (incl. N6, N7, X1–X11, X13, C1–C9). Self-closed empty opens give no ranges. `X12` now expects both zero-length ranges (`<#«|»>a</#«»>`); the 0035 AC6 "empty name (`<#>`) → undefined" clause is superseded and this is stated in the 문서 step.
- [x] **AC7 - No spurious ranges.** A plain-text `<# ` / `<@ ` with no matching empty close returns `undefined` and does not change named pairs (cases L1–L4).
- [x] **AC8 - Word pattern.** `FTL_TAG_NAME_WORD_PATTERN` unchanged; a unit test asserts the empty string passes the VS Code full-match check (`(m ? m[0].length : 0) === "".length`), and a code comment next to the pattern says VS Code keeps the session for zero-length ranges.
- [x] **AC9 - Tests.** `linkedEditing.test.ts` has one test per row of the case table below (IDs prefixed `Z` in code to avoid clashing with the 0035 `E*` rows, e.g. `ZS1`, `ZE1`), plus AC8. `npm test` exit 0, all existing suites green.
- [x] **AC10 - No collateral change.** Only the Scope paths change in this plan's diff beyond the pre-existing uncommitted files; `linkedEditingProvider.ts`, `closeTag.ts`, `autoClose.ts`, `diagnostics.ts`, `comments.ts`, `server/` untouched.
- [ ] **AC11 - Manual smoke (EDH, user).** F5: in `<#function name>\n\n</#function>` delete `function` from the open tag (Backspace) → both become empty; type `if` → both become `if`; repeat deleting from the close tag; repeat in square syntax and with `<@box>…</@box>`; move the cursor away and back to `<#|` while empty, type a char → both change. If VS Code still ends the session on delete, record the observed behavior.
- [x] **AC12 - Docs.** 문서 step: CHANGELOG `[Unreleased]` notes that the pair stays linked while the name is empty (and that `<#>`/`</#>` now link); `docs/index.md` pointer; this plan's Results.

### Case table

Same harness as 0035: `|` = cursor; `«…»` = expected range (`«|»` / `«»` = zero-length); no `«»` → `undefined`; `\n` = newline.

| # | Text | Expect |
|---|------|--------|
| S1 | `<#«functio\|» name>\n\n</#«functio»>` | both (half deleted) |
| S2 | `<#«f\|» name>\n\n</#«f»>` | both (one char left) |
| S3 | `<#«\|» name>\n\n</#«»>` | both zero-length (bug report, from open) |
| S4 | `<#«» name>\n\n</#«\|»>` | both zero-length (from close) |
| S5 | `<#«i\|» name>\n\n</#«i»>` | both (first char typed) |
| S6 | `<#«if\|» name>\n\n</#«if»>` | both |
| S7 | `<#«i» name>\n\n</#«i\|»>` | both (typed into close) |
| S8 | `<#«\|»>a</#«»>` | both zero-length (`X12` changed) |
| S9 | `<#«\|»\n  x>a</#«»>` | both (newline after sigil) |
| Q1 | `[#«\|» f]\n[/#«»]` | both (square) |
| Q2 | `<@«\|» title="x">body</@«»>` | both (empty macro + nameless close) |
| Q3 | `[@«\|»]x[/@«»]` | both (square macro) |
| Q4 | `<#«» a></#«\|» >` | both (empty close with inner space) |
| M1 | `<#if a><#«\|» b></#«»></#if>` | inner empty pair |
| M2 | `<#«\|» a><#if b></#if></#«»>` | outer empty pair |
| M3 | `<#«\|» a><# b></#></#«»>` | outer pair (two empties nest) |
| M4 | `<# a><#«\|» b></#«»></#>` | inner pair |
| M5 | `<#«\|» a><#if b></#«»>` | empty pair (lenient: `<#if` left unmatched) |
| M6 | `<@«\|»><@a>x</@></@«»>` | outer empty `@` pair (inner `</@>` pops `<@a>`) |
| M7 | `<@«a\|»><@>x</@></@«a»>` | named pair (inner `</@>` pairs with empty `<@>`) |
| M8 | `<@a><@«\|»>x</@«»></@a>` | inner empty `@` pair |
| M9 | `<@ x><@a>y</@\|>` | `undefined` (this `</@>` pops the non-empty `<@a>`; the empty `<@ x>` stays unmatched) |
| X1 | `<#i\|f name>\n\n</#>` | `undefined` (named open, empty close) |
| X2 | `<#\| name>\n\n</#if>` | `undefined` (empty open, named close) |
| X3 | `<@b\|ox>x</@>` | `undefined` (0035 nameless rule) |
| X4 | `<#\|>a</@>` | `undefined` (sigil mismatch) |
| X5 | `<@\|>a</#>` | `undefined` (sigil mismatch) |
| X6 | `<#\|>a[/#]` | `undefined` (bracket mismatch) |
| X7 | `<#\|/>a</#>` | `undefined` (self-closed) |
| X8 | `<#\| />a</#>` | `undefined` (self-closed with space) |
| X9 | `<@\|/>a</@>` | `undefined` (self-closed macro) |
| X10 | `<# \|name>\n\n</#>` | `undefined` (cursor after the space, not on the name) |
| X11 | `<#\|>a</# x>` | `undefined` (`</# x>` not a tag) |
| X12 | `<#\| a>` | `undefined` (no close) |
| X13 | `</#\|>` | `undefined` (orphan empty close) |
| E1 | `<#-- \| -->a</#>` | `undefined` (cursor in comment) |
| E2 | `<#«\|» a><#-- </#> -->b</#«»>` | both (commented close ignored) |
| E3 | `[#-- [#\| a] --][/#]` | `undefined` (square comment) |
| E4 | `<#-\|x>a</#>` | `undefined` (`<#-` is not an empty head) |
| E5 | `<#\|1>a</#>` | `undefined` (digit after sigil) |
| E6 | `<#\|` | `undefined` (EOF after sigil) |
| E7 | `<#\| a\n<#if x></#if></#>` | `undefined` (incomplete: next tag head first) |
| E8 | `<#«\|» a>${"</#>"}</#«»>` | both (close text in interpolation ignored) |
| L1 | `1 <#«» 2> text </#«\|»>` | both (documented limit: plain text that forms a complete empty pair links) |
| L2 | `a <#\| b` | `undefined` (incomplete, no close) |
| L3 | `x <# y <#«i\|f» z>a</#«if»>` | named pair unaffected |
| L4 | `1 <# 2> <#«i\|f» x>a</#«if»>` | named pair unaffected (unmatched empty open on stack) |
| R1 | `<@«a\|»><@a>x</@></@«a»>` | unchanged 0035 N6 |
| R2 | `<@a><@a>x</@\|></@a>` | unchanged 0035 N7 |

Note M9: `<@ x>` (empty `@`) is pushed, then `<@a>`; `</@>` finds the topmost `@` = `<@a>` (non-empty) → pops it, no pair (it never skips to the deeper empty open).

---

## Approach

1. **`scanTags`** (`linkedEditing.ts`): after reading the name, replace the `name === ""` skip with:
   - open (`!close`): accept `""` only when `text[nameEnd]` is whitespace, the bracket's closer, or `/`; otherwise keep `i = nameEnd; continue`;
   - close `#`: accept `""` only when the inner up to the closer is blank (checked after `scanTagEnd`), else skip as today;
   - close `@`: unchanged (`namelessClose`).
   Keep `isCommentStart` before the head check so `<#--` / `[#--` never reach this path. Empty opens go through `isPairableOpen` (self-close → not pairable).
2. **`matchTags`**: in the `namelessClose` branch, after finding the topmost same-bracket `@` entry, if its name is empty (`nameStart === nameEnd`) set both `partner`s before removing it.
3. **Hit lookup**: no change (zero-length hit already works); verify with S3/S4.
4. **Comment** next to `FTL_TAG_NAME_WORD_PATTERN`: empty text passes VS Code's full-match check, so a zero-length session stays alive (AC8).
5. **Tests**: add the rows above (prefixed `Z`), change `X12` to `<#«|»>a</#«»>`, add the AC8 empty-string test.
6. **Docs** (문서): AC12.

---

## QA environment

Same as plans 0033–0035. The user's folder has uncommitted changes and deletion is not allowed there, so tests run in the Cowork cloud container:

1. Clone `https://github.com/DevNathan/ftl-dev` into the container.
2. Stage the user's `vsix/.git/objects` (packs + loose objects) into the clone's `.git/objects/` and `git checkout ab41a94` (confirm with `git -C vsix rev-parse --short HEAD` in the user's folder = `ab41a94`).
3. Overlay every changed/untracked file listed by `git -C vsix status --short` (0033–0035 files and this plan's changes) from the user's folder.
4. Run the commands below there. Do not run npm in the user's folder.

## QA commands (검증QA)

```
cd ftl-dev/extension && npm ci && npm test        # exit 0: grammar tests + all unit suites incl. linkedEditing
node out/linkedEditing.test.js                    # exit 0; every 0035 row + every Z* row printed with ✓
grep -n '"X12"' src/linkedEditing.test.ts         # 1 hit, expectation <#«|»>a</#«»>
cd ../server && npx tsc -p .                      # exit 0 (server untouched)
git -C <user vsix> status --short                 # read-only: only Scope paths beyond the 0033–0035 files
```

Manual smoke: AC11 (Extension Development Host, pending user).

---

## Results

Completed 2026-10-21. Dev in `linkedEditing.ts` (`scanTags` empty open / empty `#` close heads, `matchTags` empty `@` pairing, word-pattern comment) + `linkedEditing.test.ts`; 검증QA in a clean cloud copy at local HEAD `ab41a94` with all uncommitted user files overlaid (same QA environment as 0033–0035).

**QA summary (검증QA):** `npm ci` = 0; `npm test` = 0 (605 ✓, 0 failures; linkedEditing suite 125 ✓); rename / workspaceSymbols / symbolKindVscode tests = 0; server `npx tsc -p .` = 0. Direct probe of `linkedTagNameRanges`: `<# name>\n\n</#>` with the cursor after `<#` → `[[2,2],[13,13]]`, after `</#` → same; `<#function name>…</#function>` from open / close → both name ranges; `<@box>x</@>` → none; `<# a>` alone → none; `<#-- c --></#>` → none. The VS Code host download is blocked by the sandbox egress proxy, so AC11 stays a manual smoke.

**Supersedes:** plan 0035 case `X12` (now `<#«|»>a</#«»>`) and the 0035 AC6 clause "empty name (`<#>`) → undefined". The 0035 nameless `</@>` rule is also narrowed: `</@>` now links when the topmost same-bracket `@` open is **empty** (`<@ …>` / `</@>`); with a non-empty `@` open (`<@box>x</@>`) it still does not link (N6/N7 = ZR1/ZR2 unchanged).

| AC | Result | Evidence |
|----|--------|----------|
| AC1 Empty open head | ✓ | ZS3, ZS8, ZS9, ZQ1–ZQ3; non-tags ZE1, ZE3–ZE7, ZL2 |
| AC2 Empty `#` close | ✓ | ZS4, ZQ1, ZQ4 (`</# >`); ZX11 (`</# x>` not a tag); ZX13 (orphan) |
| AC3 Pairing | ✓ | ZM1–ZM9, ZQ2, ZQ3; mismatches ZX1–ZX6; ZX3 (`<@box>` + `</@>` not linked) |
| AC4 Ranges | ✓ | ZS3 / ZS4 / ZS8 zero-length pairs in document order; probe `[[2,2],[13,13]]`; comments via shared `opts.comments` path ("opts.comments path is used …", ZE1, ZE2) |
| AC5 Rename sequence | ✓ | ZS1–ZS9 (open and close side); probe from open and close |
| AC6 Unchanged rules | ✓ | all 0035 rows green except `X12`, now `<#«|»>a</#«»>`; self-closed ZX7–ZX9; ZR1 / ZR2 (= 0035 N6 / N7) |
| AC7 No spurious ranges | ✓ | ZL1 (documented limit), ZL2–ZL4, ZX12; probe `<# a>` alone → none |
| AC8 Word pattern | ✓ | "ZAC8 empty name passes VS Code full-match check"; pattern unchanged, comment added next to `FTL_TAG_NAME_WORD_PATTERN` |
| AC9 Tests | ✓ | 49 `Z*` rows (ZS1–ZS9, ZQ1–ZQ4, ZM1–ZM9, ZX1–ZX13, ZE1–ZE8, ZL1–ZL4, ZR1–ZR2) + ZAC8; `npm test` = 0 (605 ✓) |
| AC10 No collateral change | ✓ | only `linkedEditing.ts` / `linkedEditing.test.ts` + 문서 files; server `tsc` = 0; provider / `closeTag.ts` / `autoClose.ts` / `diagnostics.ts` / `comments.ts` / `server/` not edited |
| AC11 Manual smoke | **pending user** | F5: in `<#function name>\n\n</#function>` delete `function` from the open tag → both empty; type `if` → both `if`; repeat from the close tag, in square syntax and with `<@box>…</@box>`; move the cursor away and back to `<#|` while empty and type → both change. If VS Code still ends the session on delete, record it here |
| AC12 Docs | ✓ | CHANGELOG `[Unreleased]` 0035 linked-editing `### Added` line extended (plan 0036); `docs/index.md` completed pointer → 0036; note in plan 0035 header + Known limits |

### Known limits

- Plain text that happens to form a complete empty pair (`1 <# 2> text </#>`) links (ZL1).
- Diagnostics may still flag `<# name>` / `</#>` while the name is being retyped (non-goal).
