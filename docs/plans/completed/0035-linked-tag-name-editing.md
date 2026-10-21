# 0035 - Linked editing of paired FTL tag names

Status: **completed** 2026-10-21 (AC11 manual EDH smoke pending user)  
Note: empty-name behavior superseded by plan [0036](0036-linked-editing-empty-name.md) (case `X12`, AC6 empty-name clause, `</@>` with an empty `@` open).  
Started: 2026-10-21  
Repo: `vsix/` only (VS Code / Open VSX extension). The `server/` LSP and the `vim/` repo are **not** touched (see Non-goals).

Related: [`closeTag.ts`](../../../extension/src/closeTag.ts) (open/close pairing sets), [`comments.ts`](../../../extension/src/comments.ts), [`docCache.ts`](../../../extension/src/docCache.ts), [`renameProvider.ts`](../../../extension/src/renameProvider.ts) (provider style), plan [0034](../completed/0034-self-close-slash-policy.md) (format).

---

## Goal

When the cursor is on the **name** of an FTL open tag or its matching close tag, typing edits both names at the same time, like HTML linked editing in VS Code:

```ftl
<#function name>
  dothis
</#function>

<#function name></#function>
```

Changing `function` to `macro` in either tag changes the other one too. This works for every FTL block directive and user-macro call with a closer, in angle (`<#` `</#` `<@` `</@`) and square (`[#` `[/#` `[@` `[/@`) syntax.

---

## Inventory (current behavior, verified in code)

| Piece | Where | Today |
|------|-------|-------|
| Linked editing | anywhere | **None.** No `LinkedEditingRangeProvider` in `extension/src`; `extension.ts` registers Definition, DocumentLink, Completion, Hover, SignatureHelp, DocumentSymbol, WorkspaceSymbol, Reference, Rename, SemanticTokens, plus `registerAutoClose` / `registerDiagnostics` / `registerComparisonDisplay`. |
| `editor.linkedEditing` | VS Code | Off by default. HTML linked editing does not run for language id `freemarker` (it is the HTML language feature's provider). |
| `contributes.configurationDefaults` | `extension/package.json` | Exists: `{ "[freemarker]": { "editor.autoIndent": "full" } }`. A language-scoped key can be added there. |
| `engines.vscode` | `extension/package.json` | `^1.85.0`. `languages.registerLinkedEditingRangeProvider` / `LinkedEditingRanges(ranges, wordPattern?)` exist in `@types/vscode` (stable since 1.44). |
| Pairing sets | `closeTag.ts` | `ALWAYS_BLOCK` (`if list macro function attempt compress escape noescape autoesc noautoesc transform switch items`), `MID_BLOCK` (`else elseif recover case default sep`), `CAPTURE_ASSIGN` (`assign local global`, block only when the inner has no `=` / `++` / `--` / compound op). Not exported. `applyFtlTag` pops a close by searching the stack from the top for the same `sigil+name` (lenient). `findUnclosedOpen` only scans text **before** a cursor (it answers "innermost open"), so it cannot find a forward partner. |
| Tag scanners | `closeTag.ts` `pushAngleTags` / `scanAngleTagEnd`, `diagnostics.ts` `scanDirectives` (not exported) | Name lexing is `[a-zA-Z_][\w.]*` after the sigil. `scanDirectives` also tracks `"`/`'` **outside** tags, so an apostrophe in template text (`Don't`) opens a phantom string; not suitable to reuse here. |
| FTL comments | `comments.ts` | `ftlCommentRanges(text)` (top-level, nested-aware, unclosed → EOF), `offsetInFtlComment` (binary search), `skipFtlComment`. |
| Doc cache | `docCache.ts` | `sharedDocCache.get(uri, version, text)` returns `{ index, comments }` per document version (computes `indexFtl` on a miss). |
| Provider style | `renameProvider.ts` | Thin class: `document.getText()`, `offsetAt`, pure helper, `lineMapFor` + `rangeFromOffsets` from `vscodeRanges.ts`. |
| On-type auto edits | `autoClose.ts` | Reacts only to typed `/`, `>`, `]`, Enter (and the 0034 duplicate-`>` mark, cleared by any other change). Typing letters inside a name is ignored, so mirrored edits do not trigger it. |
| LSP server | `server/src/server.ts` | Capabilities: completion, hover, definition, references, documentSymbol, signatureHelp, documentLink. No `linkedEditingRangeProvider`. |

---

## Scope paths

- `vsix/extension/src/linkedEditing.ts` (new; pure, no `vscode` import)
- `vsix/extension/src/linkedEditingProvider.ts` (new; thin `vscode.LinkedEditingRangeProvider` adapter)
- `vsix/extension/src/linkedEditing.test.ts` (new)
- `vsix/extension/src/extension.ts` (one registration)
- `vsix/extension/package.json` (`configurationDefaults` key + `test:unit` entry only)
- 문서 step: `vsix/extension/CHANGELOG.md` (`[Unreleased]` → `### Added`), `vsix/ARCHITECTURE.md` (Editor integration row), `vsix/docs/product/requirements-status.md` (one row), `vsix/docs/product/vim-neovim-matrix.md` (one row: not in LSP / Vim), `vsix/docs/index.md` (plan pointer), this plan (moved to `docs/plans/completed/` when done)

`closeTag.ts`, `diagnostics.ts` and `autoClose.ts` are **not** edited (they carry uncommitted plan-0034 changes). `linkedEditing.ts` keeps its own copies of the two name sets it needs (`MID_BLOCK`, `CAPTURE_ASSIGN`) with a comment pointing at `closeTag.ts`.

Do **not** touch the uncommitted plan-0033/0034 changes in the working tree (`.gitignore`, `.gitattributes`, `docs/index.md`, `extension/CHANGELOG.md`, `extension/package*.json`, `extension/src/autoClose.ts`, `extension/src/closeTag*.ts`, `extension/src/commentMute.test.ts`, `docs/plans/completed/0033-*.md`, `0034-*.md`, `tests/grammar/_wip/`) except to add this plan's lines to `package.json` / `CHANGELOG.md` / `docs/index.md`.

---

## Non-goals

- LSP `textDocument/linkedEditingRange` in `server/` and any Vim / Neovim support. Follow-up plan; 문서 records it in the Vim/Neovim matrix.
- HTML tags (`<div>…</div>`). VS Code's HTML linked editing does not run in `freemarker` mode and this plan does not re-implement it. Cursor on an HTML tag name returns no ranges.
- Linking mid-block tags (`#else`, `#elseif`, `#recover`, `#case`, `#default`, `#sep`) to their block, and renaming a block together with its mid-block tags.
- `<#sep>…</#sep>`: `sep` is in `MID_BLOCK`, so neither tag links (documented limit, see Case table N8).
- Repairing already-mismatched pairs (`<#if>…</#list>`), or diagnostics for them (existing diagnostics own that).
- Treating directive aliases as the same name (`<#noparse>` vs `</#noParse>`), or FTL identifier chars beyond `[A-Za-z0-9_.]` (`$`, `\-` escapes, Unicode letters). Same name lexing as `closeTag.ts`.
- Square interpolation syntax (`[=…]`).
- An automated VS Code integration test (Extension Host). Unit tests cover the pure function; the editor behavior is a manual smoke.
- Version bump, tag, commit, publish.

---

## Definitions

- **Tag**: an FTL directive or user-macro tag found by the scan below: an open `<#name` / `<@name` (`[#name` / `[@name`) or a close `</#name` / `</@name` (`[/#name` / `[/@name`), up to its closer (`>` / `]`) at depth 0.
- **Name range**: the half-open offsets `[nameStart, nameEnd)` of `name` only. The sigil (`#`/`@`), `<`, `[`, `/`, `>`, `]` are never part of it.
- **Name token**: `[A-Za-z_][\w.]*` (same as `closeTag.ts` / `diagnostics.ts` lexing). Dotted names (`ns.box`) are one token.
- **Key**: `bracket + sigil + name`, e.g. `<#if`, `[@ns.box`. Pairs only form between tags with the same key, so `<#if>` never pairs with `[/#if]`.
- **Hit**: cursor offset `c` with `nameStart <= c <= nameEnd` (both ends inclusive, so the caret right after `<#` and right after the last name char both count).
- **Pairable open**: an open tag that is not self-closed (inner does not end with `/` before the closer, spaces allowed) and is not excluded:
  - `#` + `MID_BLOCK` name → excluded;
  - `#` + `CAPTURE_ASSIGN` name whose inner has a top-level `=`, `++`, `--` or compound op → excluded (`<#assign x = 1>` is not a block);
  - every other `#` name is pairable, **including unknown names** (`<#mac>`), so a half-finished rename (`function` → `mac…`) still links when the cursor comes back. A known non-block directive (`<#include "x">`) is harmless: it has no `</#include>` and stays unmatched;
  - every `@` open that is not self-closed is pairable.
- **Nameless close**: `</@>` / `[/@]`. It closes the innermost open `@` entry of the same bracket (any name) and never links.

---

## Scan (pure, linear)

`linkedTagNameRanges(text, offset, opts?) => { ranges: [start, end][]; wordPattern: RegExp } | undefined`

1. Comment ranges: `opts.comments` if given (the adapter passes `sharedDocCache` comments), else `ftlCommentRanges(text)`. If `offset` is inside a comment → `undefined`.
2. Walk the text once, left to right:
   - skip FTL comments (`<#--` / `[#--`, nested-aware via `comments.ts`);
   - skip `${ … }` / `#{ … }` interpolations (brace depth, strings inside respected), so `${"</#if>"}` is not a tag;
   - on a tag head, read the name token and scan the inner to the closer at depth 0, respecting `"…"` / `'…'` (with `\` escapes, raw `r"…"`), `(`, `[`, `{` depth and FTL comments; a new tag head before the closer (same rule as `scanAngleTagEnd` / `looksLikeAngleTagOpen`) or EOF means the tag is **incomplete** → it is ignored (no pairing, no hit);
   - strings are tracked **only inside tags and interpolations**, never in template text (no phantom strings from `Don't`);
   - after a complete pairable `#noparse` open, jump to the next `</#noparse` (same bracket) without scanning the body; that close is then processed normally.
3. Stack matching (same as `applyFtlTag`): pairable open → push `{key, nameStart, nameEnd}`; close with name → search the stack from the top for the same key, remove it and record the pair (entries above it stay unmatched); nameless close → remove the topmost `@` entry of that bracket, no pair; close with no matching entry → unmatched.
4. Find the tag whose name range is a hit for `offset`. If it is part of a recorded pair → return both name ranges in document order with the word pattern. Otherwise → `undefined`.
5. `wordPattern` = `/[A-Za-z_][\w.]*/`. VS Code ends the linked session when the edited range text is not fully matched by it, so typing a space, `>` or `/` at the end of a name stops mirroring instead of copying it into the partner (e.g. `<#function` → `<#function name` does not touch `</#function>`). An empty name keeps the session alive while the user retypes it.

Complexity: one O(n) pass per request plus O(log k) comment lookups; no cap. No result cache in this plan (VS Code requests on cursor move, debounced; same cost class as the other per-request providers). If profiling shows a need, a per-version cache can be added later.

---

## Acceptance criteria

- [x] **AC1 - Provider.** `linkedEditingProvider.ts` implements `vscode.LinkedEditingRangeProvider`: reads `document.getText()`, `offsetAt(position)`, `sharedDocCache.get(uri, version, text).comments`, calls `linkedTagNameRanges`, and maps offsets with `lineMapFor` + `rangeFromOffsets`; returns `new vscode.LinkedEditingRanges(ranges, wordPattern)` or `undefined`. `extension.ts` registers it with `vscode.languages.registerLinkedEditingRangeProvider(FTL_SELECTOR, …)` inside the existing `context.subscriptions.push(…)`.
- [x] **AC2 - Enabled by default for FreeMarker.** `package.json` `contributes.configurationDefaults["[freemarker]"]` gains `"editor.linkedEditing": true` next to the existing `"editor.autoIndent": "full"` (`editor.linkedEditing` is a language-overridable editor setting). 문서 step states how to turn it off: `"[freemarker]": { "editor.linkedEditing": false }` (a language-scoped default wins over a plain global `editor.linkedEditing: false`), and that `Ctrl+Shift+F2` (Start Linked Editing) still works when it is off.
- [x] **AC3 - Name ranges only.** Returned ranges cover exactly the name token in both tags, never the sigil or brackets. Hit is inclusive at both ends of the name (caret right after `<#`, and right after the last char).
- [x] **AC4 - Block directives and macros.** Multi-line and same-line pairs link for `#function`, `#macro`, `#if`, `#list`, `#items`, `#attempt`, `#switch`, `#compress`, `#noparse`, `#outputformat`, capture `#assign` / `#local` / `#global` (`<#assign x>…</#assign>`), user macros (`<@box>…</@box>`, dotted `<@ns.box>…</@ns.box>`), and the same in square syntax.
- [x] **AC5 - Nesting.** Same-name nesting links the correct pairs (`<#if a><#if b></#if></#if>`: outer with outer, inner with inner). Different names interleave by the lenient stack rule (Scan step 3).
- [x] **AC6 - No partner → no ranges.** `undefined` for: self-closed opens (`<@box/>`, `<@box />`, `<#assign x />`), non-block assign (`<#assign x = 1>`), mid-block tags (`#else`, `#elseif`, `#recover`, `#case`, `#default`, `#sep`, and `</#sep>`), nameless close `</@>` (and the open it closes), unmatched open, orphan close, incomplete tags, mixed brackets (`<#if>…[/#if]`), mismatched names (`<#if>…</#list>`, e.g. after an edit with linked editing off), cursor not on a name (on `<`, `#`, `/`, `>`, params, body text), cursor on an HTML tag name, empty name (`<#>`).
- [x] **AC7 - Comments, strings, interpolations, noparse.** Tags inside FTL comments are ignored and a cursor inside a comment returns `undefined`; a commented-out tag between a pair does not break it. A `>` / tag text inside a string in a tag (`<#if x == ">">`, `<#assign s = "</#if>">`) and inside `${…}` does not create or end a tag. An apostrophe in template text does not hide later tags. Tags inside a `<#noparse>` body are not tags; the `noparse` pair itself links.
- [x] **AC8 - Word pattern.** The result carries `wordPattern` `/[A-Za-z_][\w.]*/` (unit-tested: matches `function`, `ns.box`, `_x1`; full-match fails for `function name`, `if>`, `1x`).
- [x] **AC9 - Tests.** `linkedEditing.test.ts` covers every row of the case table (marker harness below) plus the word pattern and the `opts.comments` path; it is added to `test:unit` in `package.json` (`node out/linkedEditing.test.js`). All existing suites stay green.
- [x] **AC10 - No collateral change.** `npm test` passes. The `git diff` of this step touches only the Scope paths; `closeTag.ts`, `autoClose.ts`, `diagnostics.ts`, `server/` are unchanged.
- [ ] **AC11 - Manual smoke (EDH, user).** In the Extension Development Host (F5): rename `function` → `macro` from the open tag and from the close tag of both sample snippets in the Goal; typing a space after the open name does not change the close tag; `<#if a><#if b></#if></#if>` renames the right pair; with `"[freemarker]": { "editor.linkedEditing": false }` nothing mirrors; accepting a completion item while the cursor is in a linked name does not corrupt the partner (if it does, record it as a known limit).
- [x] **AC12 - Docs.** 문서 step: CHANGELOG `[Unreleased]` `### Added` (linked editing, default on, how to disable, LSP/Vim not covered); `ARCHITECTURE.md` Editor integration row (`LinkedEditingRangeProvider`, `linkedEditing.ts`); `requirements-status.md` row; `vim-neovim-matrix.md` row (not implemented in LSP / Vim); `docs/index.md` pointer.

### Case table

Harness notation: `|` (written `\|` inside the table) is the cursor (removed before the call); `«…»` marks each expected linked range (markers removed; expected ranges are their offsets in the cleaned text). A row with no `«»` expects `undefined`. `\n` is a newline.

| # | Text | Expect |
|---|------|--------|
| P1 | `<#«func\|tion» name>\n  dothis\n</#«function»>` | both |
| P2 | `<#«function» name>\n  dothis\n</#«func\|tion»>` | both (from close) |
| P3 | `<#«function» name></#«\|function»>` | both (caret at name start, close) |
| P4 | `<#«function\|» name></#«function»>` | both (caret after last char) |
| P5 | `<#«\|function» name></#«function»>` | both (caret right after `<#`) |
| P6 | `<#«i\|f» x>a<#else>b</#«if»>` | both (`#else` ignored) |
| P7 | `<#«l\|ist» xs as x>${x}</#«list»>` | both |
| P8 | `<#«list» xs><#«it\|ems» as x>${x}</#«items»></#«list»>` | items pair only: `«items»` ×2 |
| P9 | `<#«att\|empt»>a<#recover>b</#«attempt»>` | both |
| P10 | `<#«sw\|itch» x><#case 1>a<#break></#«switch»>` | both |
| P11 | `<#«ass\|ign» x>body</#«assign»>` | both (capture) |
| P12 | `<#«lo\|cal» x>body</#«local»>` | both |
| P13 | `<@«b\|ox» title="x">body</@«box»>` | both |
| P14 | `<@«ns.b\|ox»>x</@«ns.box»>` | both (dotted) |
| P15 | `[#«func\|tion» f]\n[/#«function»]` | both (square) |
| P16 | `[@«b\|ox»]x[/@«box»]` | both (square macro) |
| P17 | `<#«compr\|ess»>x</#«compress»>` | both |
| P18 | `<#«outputf\|ormat» "HTML">x</#«outputformat»>` | both |
| P19 | `<#«mac\|» m></#«mac»>` | both (unknown name, mid-rename) |
| N1 | `<#«i\|f» a><#if b></#if></#«if»>` | outer pair |
| N2 | `<#if a><#«i\|f» b></#«if»></#if>` | inner pair |
| N3 | `<#if a><#«if» b></#«i\|f»></#if>` | inner pair (from close) |
| N4 | `<#macro m><#if x><#ne\|sted/></#if></#macro>` | `undefined` (self-closed `#nested` inside a pair) |
| N5 | `<#«fun\|ction» f><@box>x</@box></#«function»>` | both (other tags inside) |
| N6 | `<@«a\|»><@a>x</@></@«a»>` | outer pair (inner `@a` closed by `</@>`) |
| N7 | `<@a><@a>x</@\|></@a>` | `undefined` (cursor on nameless close) |
| N8 | `<#list xs as x>${x}<#se\|p>, </#sep></#list>` | `undefined` (`sep` limit) |
| X1 | `<@b\|ox/>` | `undefined` (self-close) |
| X1b | `<@b\|ox />` | `undefined` (self-close with space) |
| X2 | `<@b\|ox /></@box>` | `undefined` (self-close; close is orphan) |
| X3 | `<#ass\|ign x = 1></#assign>` | `undefined` (non-block assign) |
| X4 | `<#if x>a<#el\|se>b</#if>` | `undefined` |
| X5 | `<#if x>a<#else\|if y>b</#if>` | `undefined` |
| X6 | `<#fun\|ction f>` | `undefined` (no close) |
| X7 | `</#fun\|ction>` | `undefined` (orphan close) |
| X8 | `<#i\|f x>a[/#if]` | `undefined` (mixed brackets) |
| X9 | `<#i\|f x>a</#list>` | `undefined` (mismatch) |
| X10 | `<#if x\|>a</#if>` | `undefined` (on params) |
| X10b | `<\|#if x>a</#if>` | `undefined` (before sigil) |
| X10c | `<#if x>a\|</#if>` | `undefined` (body text, before `</`) |
| X11 | `<di\|v><#if x></#if></div>` | `undefined` (HTML) |
| X12 | `<#\|>a</#>` | `undefined` (empty name) |
| X13 | `<#fun\|ction f\n<#if x></#if>` | `undefined` (incomplete open: next tag starts first) |
| C1 | `<#-- <#i\|f x> -->a</#if>` | `undefined` (cursor in comment) |
| C2 | `<#«i\|f» x><#-- </#if> -->a</#«if»>` | both (commented close ignored) |
| C3 | `<#«i\|f» x == ">">a</#«if»>` | both (`>` in string) |
| C4 | `<#«i\|f» x>${"</#if>"}</#«if»>` | both (tag text in interpolation) |
| C5 | `<p>Don't</p><#«i\|f» x>a</#«if»>` | both (apostrophe in text) |
| C6 | `<#«nopa\|rse»><#if x></#«noparse»>` | both (body not scanned) |
| C7 | `<#noparse><#i\|f x></#if></#noparse>` | `undefined` (inside noparse body) |
| C8 | `<#«ass\|ign» s>"</#«assign»>" is text</#assign>` | first `</#assign>` closes (a `"` in body text is not a string) |
| C9 | `[#-- [#i\|f x] --]a[/#if]` | `undefined` |

---

## Approach

1. **`linkedEditing.ts`** (pure): `export function linkedTagNameRanges(text, offset, opts?: { comments?: Array<[number, number]> })` and `export const FTL_TAG_NAME_WORD_PATTERN = /[A-Za-z_][\w.]*/`. One scanner function collecting tags `{ key, kind: "open" | "close" | "namelessClose", nameStart, nameEnd, pairable }`, then the stack pass, then the hit lookup. Local `MID_BLOCK` / `CAPTURE_ASSIGN` copies + the capture-operator regex from `shouldPairClose`, with a comment that they mirror `closeTag.ts`. Imports from `./comments` only.
2. **`linkedEditingProvider.ts`**: `FtlLinkedEditingRangeProvider` in the `renameProvider.ts` style (AC1).
3. **`extension.ts`**: import + `registerLinkedEditingRangeProvider(FTL_SELECTOR, new FtlLinkedEditingRangeProvider())`.
4. **`package.json`**: `"editor.linkedEditing": true` under the existing `"[freemarker]"` default; append `&& node out/linkedEditing.test.js` to `test:unit`.
5. **`linkedEditing.test.ts`**: same `test(name, fn)` helper as `closeTag.test.ts`; a `parseCase(src)` that strips `|` and `«»` and returns `{ text, offset, expected }`; one test per case-table row; word-pattern tests; a test passing precomputed `ftlCommentRanges` gives the same result.
6. **Docs (문서 step)**: AC12.

---

## QA environment

Same as plans 0033 / 0034. The user's folder has uncommitted changes and deletion is not allowed there, so tests run in the Cowork cloud container:

1. Clone `https://github.com/DevNathan/ftl-dev` into the container.
2. Stage the user's `vsix/.git/objects` (packs + loose objects) into the clone's `.git/objects/` and `git checkout 0579b27` (confirm with `git -C vsix rev-parse HEAD` in the user's folder).
3. Overlay every changed/untracked file listed by `git -C vsix status --short` (plan 0033/0034 files and this plan's changes) from the user's folder.
4. Run the commands below there. Do not run npm in the user's folder.

## QA commands (검증QA)

```
cd ftl-dev/extension && npm ci && npm test           # exit 0: grammar tests + all unit suites incl. linkedEditing
node out/linkedEditing.test.js                       # exit 0; every case-table row printed with ✓
node -e "const p=require('./package.json');process.exit(p.contributes.configurationDefaults['[freemarker]']['editor.linkedEditing']===true?0:1)"   # exit 0
grep -n "registerLinkedEditingRangeProvider" src/extension.ts                            # 1 hit
cd ../server && npx tsc -p .                         # exit 0 (server untouched, still builds)
git -C <user vsix> diff --stat; git -C <user vsix> status --short   # read-only: only Scope paths beyond 0033/0034 files
```

Manual smoke: AC11 (Extension Development Host, pending user).

---

## Results

Completed 2026-10-21. Dev in `linkedEditing.ts` (pure scanner) / `linkedEditingProvider.ts` (adapter) / `extension.ts` (one registration) / `package.json` (`[freemarker]` default + `test:unit` entry) + `linkedEditing.test.ts`; 검증QA in a clean cloud copy at local HEAD `0579b27` with all uncommitted user files overlaid (same QA environment as 0033 / 0034).

**QA summary (검증QA):** `npm ci` = 0; `npm test` = 0 (552 ✓, 0 failures; `linkedEditing.test.js` runs inside `test:unit`); rename / workspaceSymbols / symbolKindVscode tests = 0; server `npx tsc -p .` = 0. An automated VS Code host test was attempted but the VS Code download (`update.code.visualstudio.com`) is blocked by the sandbox egress proxy, so AC11 stays a manual smoke.

`linkedEditing.test.ts` has one test per case-table row (52 rows: P1–P19, N1–N8, X1–X13 incl. X1b / X10b / X10c, C1–C9) plus extra rows E1–E16 and four named tests.

| AC | Result | Evidence |
|----|--------|----------|
| AC1 Provider | ✓ | `FtlLinkedEditingRangeProvider` (`linkedEditingProvider.ts`, `sharedDocCache` comments + `lineMapFor` / `rangeFromOffsets`); `registerLinkedEditingRangeProvider(FTL_SELECTOR, …)` in `extension.ts` (1 hit) |
| AC2 Default on | ✓ | `contributes.configurationDefaults["[freemarker]"]["editor.linkedEditing"] === true` (QA `node -e` check); disable / `Ctrl+Shift+F2` documented in CHANGELOG |
| AC3 Name ranges only | ✓ | "AC3 ranges cover name only"; P3–P5 (caret at name start, after last char, right after `<#`); X10b |
| AC4 Block directives / macros | ✓ | P1–P19, E1 (`#global`), E12 (square `noparse`), E15, E16 (multi-line macro) |
| AC5 Nesting | ✓ | N1–N3, N5, N6; E2 (square nested); E10 (lenient interleave) |
| AC6 No partner | ✓ | X1–X13, N4, N7, N8, E3, E5–E9 |
| AC7 Comments / strings / interpolations / noparse | ✓ | C1–C9, E4, E11, E13, E14 |
| AC8 Word pattern | ✓ | "AC8 word pattern matches names", "AC8 word pattern full-match fails for non-names" |
| AC9 Tests | ✓ | `linkedEditing.test.ts` in `test:unit` (`node out/linkedEditing.test.js`); "opts.comments path is used (fake comment range hides cursor)"; all existing suites green |
| AC10 No collateral change | ✓ | `npm test` = 0 (552 ✓); server `tsc` = 0; `closeTag.ts` / `autoClose.ts` / `diagnostics.ts` / `server/` not edited by this plan |
| AC11 Manual smoke | **pending user** | F5 "Run Extension (ftl-dev vsix)", open an `.ftl`: type both Goal snippets and rename `function` → `macro` from the open tag and from the close tag; a space after the open name does not touch the close; `<#if a><#if b></#if></#if>` renames the right pair; check `editor.linkedEditing` is on by default for freemarker and that `"[freemarker]": { "editor.linkedEditing": false }` stops mirroring; accept a completion item mid-rename (record as a limit if it corrupts the partner) |
| AC12 Docs | ✓ | CHANGELOG `[Unreleased]` `### Added`; `ARCHITECTURE.md` Editor integration row; `requirements-status.md` row; `vim-neovim-matrix.md` row (VS Code only); `docs/index.md` completed pointer → 0035; `extension/README.md` features line |

### Known limits

- Empty-name behavior superseded by plan [0036](0036-linked-editing-empty-name.md): `<#>` / `</#>` and empty `<@ …>` / `</@>` now link.
- `<#sep>…</#sep>` never links (`sep` is a mid-block name; N8, E7).
- `<#if a<b>` (bare `<` + letter inside a tag) is treated as a new tag head, so the open is incomplete and does not link (same rule as `scanAngleTagEnd`).
- An unclosed `<#noparse>` swallows the rest of the document: no tags after it link.
- No per-version result cache: one O(n) scan per request (add a cache only if profiling shows a need).
- Names are `[A-Za-z_][\w.]*`: no `-`, `$`, `\-` escapes or Unicode letters; aliases (`noparse` / `noParse`) are not unified.
- HTML tags (`<div>…</div>`) are not linked in `freemarker` mode (VS Code's HTML linked editing does not run there).

### Follow-ups

- LSP `textDocument/linkedEditingRange` in `server/` and Vim / Neovim support (VS Code only for now; recorded in the Vim/Neovim matrix).

---

## Wave one-liner

**Typing in the name of an FTL open or close tag (`<#function>`/`</#function>`, `<@m>`/`</@m>`, square syntax) now edits its partner too, on by default for FreeMarker via `editor.linkedEditing`.**
