# 0038 - ftldoc: Javadoc / JSDoc parity (multi-line tags, custom tags, types, inline tags, Signature Help, LSP)

Status: **completed** 2026-10-22 (manual Extension Host / LSP stdio smoke + `validateParams` toggle pending user — VS Code download blocked in sandbox)  
Started: 2026-10-22  
Repo: `vsix/` only. `ftl-dev.vim` is a separate repo and is **not** touched (follow-up noted under Non-goals).  
Baseline: `main` 99218f9, `cd extension && npm test` = **605 ✓**.

Related: [0016-ftldoc](../completed/0016-ftldoc.md) (parser, attachment, Hover), [0017-ftldoc-comment-highlight](../completed/0017-ftldoc-comment-highlight.md) (TextMate `#ftldoc-tag`), [0018-ftldoc-deprecated-usage-diag](../completed/0018-ftldoc-deprecated-usage-diag.md) (deprecated-use warning), [0025-ftldoc-rename-ignore](../completed/0025-ftldoc-rename-ignore.md) (`@nodoc`), [0028-builtin-signature-help](../completed/0028-builtin-signature-help.md), [0032b-sighelp-datamodel](../completed/0032b-sighelp-datamodel.md), [0032c-lsp-vim-gaps](../completed/0032c-lsp-vim-gaps.md), [0037](../completed/0037-scrub-in-house-identifiers.md) (forbidden-terms guard).

**Confidentiality.** The user's original report used in-house field names. This plan, its tests and fixtures use only neutral names (`payload`, `header`, `request`, `status`, `items`, `parseRequest`). Never copy the user's field names into the repo. `npm run check:terms` must stay green.

---

## Problem (user report, neutralized)

A doc comment written in the natural "tag line, then indented body" style:

```ftl
<#--
    Parses the request payload and its header.
    Some fields may be empty hashes depending on the header.

@param payload
    raw request data
@param header
    mapped header data; may contain a route key,
    then a target key depending on routing

@return {
    status: ...,
    items: ...,
    ...
}

@processing
    1. read the header
    2. map the payload

@note
    remark text
-->
<#function parseRequest payload header>
```

renders in Hover as:

```md
`parseRequest` — function

Parses the request payload and its header.
    Some fields may be empty hashes depending on the header.

**Parameters**

- `payload`
- `header`

**Returns** — {
```

i.e. summary collapses into one paragraph, parameter descriptions are lost, Returns shows only `{`, and `@processing` / `@note` vanish.

### Root cause (confirmed 2026-10-22 by compiling `src/ftldoc.ts` and running `parseFtlDoc` on the sample above)

`parseFtlDoc` returned `{ summary: "Parses …header.\n    Some fields …", params: [{name:"payload",description:""},{name:"header",description:""}], returns: "{" }`:

1. **Tags are single-line.** Each `@tag` line is parsed on its own; once `inTags` is set, every non-tag line is discarded (`if (!inTags) summaryParts.push(line)`), so continuation lines and next-line descriptions are dropped.
2. **Unknown tags are dropped** (`// Unknown @tags: ignore`), so `@processing`, `@note`, `@example`, `@author`, … never reach the model.
3. **No dedent.** Only the whole body is `trim()`med, so the first summary line loses its indent and the second keeps 4 spaces. Markdown treats the single newline as a soft break → one paragraph. A second paragraph after a blank line would keep its 4-space indent and render as an **indented code block** (latent bug).
4. **`*` prefix stripping is unconditional** (`/^\s*\*\s?/` on every line): a Markdown bullet `* item` in prose loses its bullet.
5. **`@param {type} name` / `@param [name]`** fail the `^([a-zA-Z_]\w*)` name regex → the param is **silently dropped**.
6. Formatter (`formatFtlDocMarkdown`) emits `**Returns** — <one line>` and `- \`name\` — <one line>`; it has no notion of multi-line blocks, code blocks, or extra tags.

Further gaps found while reading the code (not in the report):

7. **LSP server Hover has no ftldoc at all**: `server/src/server.ts` `onHover` returns `**${kind}** \`${name}\`` from `findDefinitions(index, simpleName)` (no offset → `#local` scope ignored, no `#import` namespace lookup). VS Code Hover uses `symbolHover(…, hit.doc)`.
8. **Signature Help ignores ftldoc**: `buildHelp` in `signatureHelp.ts` sets `documentation = "<name> takes N parameters."`; parameters carry only `label`. Server passes that string as plain text.
9. **Completion items for user symbols carry no documentation** (`symbolCandidate` in `completion/helpers.ts`; `SymbolCompletionEntry` has only `name` / `asFunctionCall`), in both VS Code (`completionProvider.ts`) and the server.
10. **TextMate** `#ftldoc-tag` highlights a fixed list only, and `(@param)\s+(\S+)` would paint `{type}` as the parameter name.
11. `FtlDiagnostic.severity` is `"error" | "warning"` only; there is no Information level yet (needed for AC12).

---

## Goal

Make ftldoc behave like Javadoc / JSDoc for everything that makes sense in FTL, so that the comment above shows **all** of its content, faithfully, in Hover, Signature Help and completion, in VS Code and through the LSP server, and is highlighted in the editor. Keep every existing ftldoc behavior unless a row below explicitly changes it.

---

## Gap analysis

Legend: **now** = this plan; **later** = worthwhile, separate plan; **non-goal** = deliberately not doing; **keep** = already at parity, behavior retained.

| # | Feature | Javadoc | JSDoc | ftldoc today | Decision |
|---|---------|---------|-------|--------------|----------|
| G1 | Block tag body continues on following lines until the next tag | yes | yes | no — continuation dropped | **now** |
| G2 | Tag description may start on the next line (`@param name` ⏎ indented text) | yes | yes | no — description empty | **now** |
| G3 | Common-indentation removal of description text | yes (leading ws/`*` stripped) | yes (` * ` stripped) | no — only whole-body `trim()` | **now** |
| G4 | Leading `*` gutter (`/** … * … */` style) | yes | yes | stripped on **every** line, eating Markdown `* bullets` | **now** — strip only when every non-blank body line has the gutter |
| G5 | Blank line = paragraph break | yes (`<p>`) | yes (Markdown) | summary only; indented 2nd paragraph becomes a code block | **now** |
| G6 | Line breaks inside a paragraph | reflowed (HTML) | reflowed (Markdown soft break) | reflowed | **now** — preserve as Markdown hard breaks (deliberately beyond parity: FTL docs are written line-oriented; see D3) |
| G7 | Numbered / bulleted lists | HTML `<ol>/<ul>` | Markdown | summary only, if not indented | **now** (summary and every tag body) |
| G8 | Accidental indented-code blocks from leftover indentation | n/a (HTML) | Markdown pitfall | yes (bug) | **now** — indentation guard (D4) |
| G9 | `@param name desc` | yes | yes | yes (single line) | **keep** + multi-line |
| G10 | `@param {type} name` | no (types from signature) | yes | param dropped | **now** |
| G11 | Optional `[name]`, default `[name=value]` | no | yes | param dropped | **now** |
| G12 | Nested property `@param opts.key` | no | yes | mangled (`opts` + `.key …`) | **now** (parsed; rendered as sub-items) |
| G13 | `@return` / `@returns desc` | `@return` | both | yes (single line) | **keep** + multi-line |
| G14 | `@return {type} desc` | no | yes | type kept as text | **now** |
| G15 | Multi-line `@return` incl. `{ … }` shape block | multi-line yes, no shape notion | multi-line yes; `{…}` on one line = type | only `{` | **now** — shape block rendered as code block (D2) |
| G16 | `@deprecated` (multi-line) | yes | yes | single line | **now** (generic continuation; diagnostics collapse whitespace) |
| G17 | `@see` | yes (ref, `"text"`, `<a>`) | yes (+`{@link}`) | yes (single line, free text) | **keep** + multi-line + inline tags; clickable symbol target **later** (G33) |
| G18 | `@since` | yes | yes | yes | **keep** + multi-line |
| G19 | `@throws` / `@exception` | yes | yes | no; FTL has `@stop` (for `#stop`) | **non-goal** as semantics (FTL cannot throw); written `@throws` still renders as a generic tag via G22 |
| G20 | `@example` | no (`{@snippet}` / `<pre>`) | yes | dropped | **now** — fenced ` ```ftl ` block, verbatim |
| G21 | `@author`, `@version`, `@todo`, `@note`, `@remarks` | author/version yes | author/version/todo yes; note/remarks via TSDoc | dropped | **now** — friendly headings |
| G22 | Custom / unknown block tags (e.g. `@processing`) | custom via `-tag`; unknown = doclint warning | kept (`allowUnknownTags`); TS hover shows `@tag — text` | silently dropped | **now** — rendered as `**@tag**` sections in source order |
| G23 | Inline `{@link target}` / `{@link target label}` / `{@link target\|label}` / `{@linkplain}` | link, linkplain | link, linkcode, linkplain | literal text | **now** — rendered as code span / label text / Markdown link for URLs |
| G24 | Inline `{@code x}` / `{@linkcode x}` | `@code` | `@linkcode` | literal text | **now** — code span |
| G25 | Inline `{@literal x}` | yes | no | literal text | **now** — Markdown-escaped plain text (also the escape hatch for a literal leading `@`) |
| G26 | `{@inheritDoc}`, `{@value}`, `{@docRoot}`, `{@index}` | yes | `@inheritdoc` | n/a | **non-goal** (no inheritance / constants / HTML site in FTL); left as literal text |
| G27 | `{@summary}` / first-sentence summary for lists | yes | no | no | **later** (completion `detail` one-liner) |
| G28 | `@typedef` / `@property` / `@callback` (named hash shapes) | no | yes | dropped | **later** (data-model docs); renders as generic tags now via G22 |
| G29 | Visibility tags `@private` / `@internal` / `@hidden` hiding symbols from completion | `@hidden` | `@private` etc. | no | **later** |
| G30 | Hover shows docs | IDE | IDE/TS | yes (VS Code only) | **keep**; LSP server **now** (G35) |
| G31 | Signature Help: function summary + per-parameter docs | IDE | TS: yes | generic "takes N parameters" | **now** |
| G32 | Completion item documentation for user symbols | IDE | TS: yes | none | **now** (same renderer) |
| G33 | Go to definition / clickable `{@link sym}` and `@see sym` | IDE | TS: yes | no | **later** (needs command URIs + cross-file resolution) |
| G34 | Rename parameter also renames `@param` name | IDE | TS: yes | no | **later** |
| G35 | LSP server parity (Hover / Signature Help / completion docs) | n/a | n/a | server Hover shows `**kind** \`name\`` only; no sig/completion docs | **now** — shared pure helpers |
| G36 | `@param` name not in the declaration's parameter list | doclint warning | TS checkJs error; eslint-plugin-jsdoc warning | no | **now** — Information, setting (D7) |
| G37 | Duplicate `@param` | doclint | TS / eslint | no | **now** — Information, same setting |
| G38 | Declared parameter without `@param` | doclint (`-Xdoclint:missing`) | eslint `require-param` | no | **later** (noisy for partially documented code; opt-in candidate) |
| G39 | Highlight any `@tag` + `{@inline}` + `{type}` in comments | IDE | yes | fixed tag list; `{type}` mis-scoped as name | **now** |
| G40 | Doc-site generation (`javadoc` / `jsdoc` HTML) | yes | yes | no | **non-goal** |
| G41 | Type checking of `{type}` against usage | n/a | TS | no | **non-goal** |
| G42 | Raw HTML in docs | HTML | allowed | `supportHtml = false` | **non-goal** (Markdown only; HTML stays escaped/literal) |
| G43 | Suppress tag | `@hidden` | `@ignore` | `@nodoc` (leading) | **keep** (0025); a leading `@ignore` stays an ordinary tag (see Changed expectations) |
| G44 | `@example <caption>` | n/a | yes | n/a | **later** |
| G45 | FTL-specific `@nested` (macro body content) heading | n/a | n/a | dropped | **later** dedicated heading; renders as generic tag **now** via G22 |
| G46 | Vim / Neovim syntax for new tag shapes | n/a | n/a | `ftl-dev.vim` separate | **non-goal** here; follow-up in `ftl-dev.vim` (LSP users get G35 automatically) |

Counts (46 rows): **now 26** (G1–G8, G10–G12, G14–G16, G20–G25, G31, G32, G35–G37, G39), **keep 6** (G9, G13, G17, G18, G30, G43 — the first five also get the multi-line / LSP extensions of this plan), **later 8** (G27–G29, G33, G34, G38, G44, G45), **non-goal 6** (G19, G26, G40, G41, G42, G46).

---

## Decisions (justified)

- **D1 - Block model.** A *tag line* is a line whose first non-gutter character is `@` followed by `[A-Za-z][\w-]*` (case-insensitive name, original spelling kept for display). Everything from a tag line up to the next tag line (or end of body) is that tag's body: the rest of the tag line ("head") plus all following lines ("continuation"), **blank lines included**. Text before the first tag line is the summary. Continuation lines are dedented by their common leading whitespace (blank lines ignored for the minimum); the head is trimmed. Leading/trailing blank lines of a body are dropped; inner blank lines stay (paragraph breaks). Mid-line `@word` is prose (as in JSDoc). A mid-body `@nodoc` line is still skipped, and its continuation is dropped (keeps 0025's "mid-body nodoc is a no-op").
- **D2 - `{` after `@return`.** A JSDoc type is recognized only when the head starts with `{`, the matching `}` is **on the same line**, and the inner text is non-empty (`{hash}`, `{string|number}`, `{a: 1}` → type; `{`, `{}`, `{ ` + newline → not a type). Otherwise, if the body's first non-space char is `{` and the body spans more than one line, the body is a **shape block** and is rendered verbatim (relative indentation kept) in a fenced code block with no language. Rationale: faithful, no reflow, no guessing a language (the shape is pseudo-syntax, not FTL). The same type/shape rules apply to `@param` bodies (after the name) and to generic tags (shape only).
- **D3 - Line breaks.** Rendered Markdown preserves the author's line structure: inside a paragraph every line except the last ends with a Markdown hard break (two trailing spaces). No hard break before a blank line, at the end of a block, inside fenced code, or when the next line starts a list item. A list item line that directly follows a paragraph line gets a blank line inserted before it, so lists always render (CommonMark only lets `-`/`*`/`+`/`1.` interrupt a paragraph). Rationale: FTL authors (the report) write line-oriented docs; reflow loses meaning in numbered steps and shapes. Javadoc/JSDoc reflow, so this is a deliberate deviation; authors who want reflow can join lines.
- **D4 - Indentation guard.** After dedent, a run of non-blank lines indented ≥ 4 spaces that would start a CommonMark indented code block (preceded by a blank line or block start) and is **not** inside a list item is emitted as a fenced code block (no language) with its relative indentation, instead of relying on indented-code semantics. Inside list items, indentation is left to Markdown (nested lists). Authors' own ` ``` ` fences pass through verbatim (no hard breaks, no inline-tag processing inside).
- **D5 - Known tag headings** (case-insensitive): `@deprecated` → **Deprecated**, `@param` → **Parameters**, `@return`/`@returns` → **Returns**, `@stop` → **Stop**, `@example` → **Example** (fenced ` ```ftl `, verbatim, fence lengthened if the body contains ```` ``` ````), `@note` → **Note**, `@remarks` → **Remarks**, `@todo` → **TODO**, `@author` → **Author**, `@version` → **Version**, `@see` → **See**, `@since` → **Since**. Any other tag → **`**@<tag as written>**`**. Section order: header, Deprecated, summary, Parameters, Returns, Stop, then every other block tag (Example/Note/Remarks/TODO/unknown) in **source order**, then See, Since, Author, Version (metadata last, like Javadoc). Repeated tags of the same name each render (source order).
- **D6 - Inline tags** (outside code spans/fences, in every rendered body): `{@code x}` / `{@linkcode x}` → `` `x` `` (longer backtick fence if `x` contains a backtick); `{@link t}` → `` `t` ``; `{@link t label}` / `{@link t|label}` / `{@linkplain t label}` → `label` (plain); a `t` that is an `http(s)://` URL → `[label or t](t)`; `{@literal x}` → `x` with Markdown metacharacters escaped. Unknown `{@foo …}` stays literal. Clickable symbol links are **later** (G33).
- **D7 - Param diagnostics.** On `#function` / `#macro` symbols with a doc: `@param` whose root name (before the first `.`; `[...]` stripped) is not a declared parameter (catch-all `args...` counts as `args`) → `ftldoc @param 'x' does not match a parameter of 'f'`; second and later `@param` with the same full name → `Duplicate ftldoc @param 'x'`. Range = the name inside the comment. **Severity Information, on by default**, setting `ftl-dev.ftldoc.validateParams` (boolean, default `true`). Justification: false-positive rate is near zero (the parameter list is exact, dotted/optional/catch-all forms handled), it catches real doc rot after renames, but it is not a template bug, so it must not look like one (no Warning/yellow); Information shows in Problems and is easy to switch off. `#assign`/`#local`/`#global` docs are not checked. Hint was rejected: invisible in Problems and in most LSP clients. The LSP server has no settings plumbing today, so it always runs with the default (`true`).
- **D8 - Signature Help content.** Signature documentation (Markdown) = Deprecated line (if any) + summary + Returns section, rendered by the same module as Hover. Each parameter's documentation (Markdown) = `` `{type}` `` + `(optional, default: \`v\`)` + description (+ nested `name.key` entries as a sub-list), matched to the declaration's parameter by name. The parameter **label** stays the declaration's (`name=default`, `name...`), the declaration wins over `[name=default]`. Without a doc (or without any parameter doc), keep today's fallback string `"<name> takes N parameter(s)."` so existing behavior is unchanged.
- **D9 - One renderer.** Hover, Signature Help, completion item documentation, VS Code and LSP server all go through `formatFtlDocMarkdown` and its section helpers in one pure module; no surface formats ftldoc on its own.
- **D10 - Model compatibility.** `FtlDoc` stays a superset: `summary: string`, `params: FtlDocParam[]`, `returns?: string`, `deprecated?`, `see?`, `since?`, `stops?` keep their meaning (now possibly multi-line, dedented, without the `{type}`); new optional fields only. A leading `@ignore` remains an ordinary (generic) tag — 0025 deliberately removed it as a suppress alias.

---

## Scope paths

- `extension/src/ftldoc.ts` — model, extraction (+ body offset), block parser (D1–D2, D10). May be split: parsing stays here, rendering moves to `extension/src/ftldocMarkdown.ts` (new; `formatFtlDocMarkdown` re-exported from `ftldoc.ts` so existing imports keep working).
- `extension/src/ftldoc.test.ts` — new cases (test table below); one changed assertion (see Changed expectations).
- `extension/src/symbols.ts` — pass the comment-body offset into the parser (param name offsets for D7). No attachment-rule changes.
- `extension/src/docs.ts` — `symbolHover` unchanged signature; new pure `symbolHoverAt(text, offset, index, importByNs)` shared by VS Code and server (G35).
- `extension/src/hoverProvider.ts` — use `symbolHoverAt`.
- `extension/src/signatureHelp.ts`, `extension/src/signatureHelpProvider.ts`, `extension/src/signatureHelp.test.ts` — D8.
- `extension/src/catalog.ts` (`SymbolCompletionEntry.documentation?`), `extension/src/completion/helpers.ts`, `extension/src/completion/GeneralSymbolCompletionProvider.ts`, `extension/src/completion/NsCompletionProvider.ts`, `extension/src/completionProvider.ts`, `extension/src/catalog.test.ts` — G32.
- `extension/src/diagnostics.ts` (new pass + `severity` union gains `"information"`; deprecated message whitespace-collapsed), `extension/src/diagnosticsProvider.ts` (severity mapping; read `ftl-dev.ftldoc.validateParams` into `validateFtl` options; extend the existing `onDidChangeConfiguration` handler so `e.affectsConfiguration("ftl-dev.ftldoc.validateParams")` also calls `refreshVisible()`, next to `ftl-dev.strictVariables` / `ftl-dev.dataModel`), `extension/src/diagnostics.test.ts` — D7.
- `extension/package.json` — setting `ftl-dev.ftldoc.validateParams`; `tokenTypes` entries for new scopes.
- `extension/syntaxes/freemarker.tmLanguage.json` (`#ftldoc-tag` only), `tests/grammar/ftldoc-comment.ftl` (extend), `extension/src/commentMute.test.ts` (`ALLOWED_EXTRA` for new scopes).
- `server/src/server.ts` — Hover via `symbolHoverAt` (async, imports), Signature Help as `MarkupContent` (signature + parameters), completion `documentation`, diagnostic severity mapping. `server/tsconfig.json` — add `../extension/src/ftldoc.ts` (+ `ftldocMarkdown.ts` if split) to `include` explicitly.
- 문서 step (not 개발): `tests/fixtures/ftldoc/demo.ftl` + `README.md` (new neutral example + checklist rows), `extension/CHANGELOG.md`, `extension/README.md` ftldoc section if present, `docs/product/requirements-status.md`, `docs/index.md` (completed pointer), `ARCHITECTURE.md` (Hover / Signature Help rows), this plan's Results.

Not touched: `extension/src/semanticTokens.ts` (it never paints inside FTL comments; verified: comment ranges are excluded from use-scans), attachment rules (whitespace-only gap, `@nodoc`), `#local` scoping, `ftl-dev.vim`.

---

## Non-goals

- HTML doc-site generation (javadoc/jsdoc tool equivalent).
- `@throws` / `@exception` semantics (FTL has no throw; `@stop` documents `#stop`). A written `@throws` renders only as a generic tag.
- Type checking or validating `{type}` expressions; types are display text.
- Raw HTML rendering in docs (`supportHtml` stays false).
- `{@inheritDoc}`, `{@value}`, `{@docRoot}`, `{@index}`.
- Clickable `{@link}` / `@see` navigation, rename of `@param` names, missing-`@param` diagnostics, `@typedef` shapes, visibility tags, `@example <caption>`, first-sentence summaries (all **later**, see table).
- Vim / Neovim runtime (`ftl-dev.vim`, separate repo): follow-up there to highlight generic `@tag`, `{@inline}` and `{type}` in comments. LSP users get Hover/Signature Help/completion parity through the server.
- Changing attachment rules, `@nodoc`, or `#local` scope semantics.

---

## Acceptance criteria

- [x] **AC1 - Block continuation.** Lines after a tag line belong to that tag until the next tag line; a description may start on the next line (`@param name` ⏎ indented text); this holds for `@param`, `@return(s)`, `@deprecated`, `@see`, `@since`, `@stop` and every other tag.
- [x] **AC2 - Dedent, paragraphs, gutter.** Summary and each tag body are dedented by their common indentation; inner blank lines are kept; leading `*` gutters are stripped only when every non-blank body line has one (Markdown `* item` bullets survive otherwise).
- [x] **AC3 - Return shapes and types.** `@return {type} desc` (one-line `{…}`) parses `returnsType`; a multi-line body starting with `{` (`@return {` ⏎ … ⏎ `}`) is a shape block rendered verbatim in a fenced code block; `{}` and an unclosed `{` are never types.
- [x] **AC4 - JSDoc param forms.** `@param {type} name desc`, `@param [name] desc`, `@param [name=default] desc`, `@param {type} [name="a b"] desc`, `@param opts.key desc` parse into `name`, `type?`, `optional?`, `defaultValue?`; none is dropped.
- [x] **AC5 - All tags render.** Known extra tags get friendly headings (D5); unknown tags render as `**@tag**` sections in source order; `@example` renders as a ` ```ftl ` fenced block, verbatim; repeated tags all render; section order follows D5.
- [x] **AC6 - Inline tags.** `{@link}`, `{@linkplain}`, `{@linkcode}`, `{@code}`, `{@literal}` render per D6 in summary and tag bodies, not inside code spans or fences; unknown inline tags stay literal.
- [x] **AC7 - Markdown fidelity.** Line breaks preserved as hard breaks (D3); numbered and bulleted lists render as lists (incl. a list directly after a paragraph line and a list not starting at 1); multi-line parameter descriptions stay inside their list item (continuation indented under the item); no accidental indented code blocks (D4).
- [x] **AC8 - Report regression.** The neutral sample in *Problem* renders exactly the expected Markdown in test T21 (summary as two lines, both parameter descriptions, Returns code block, `**@processing**` with a 2-item ordered list, **Note** with its text). The exact string is fixed under *T21 expected Markdown* below.
- [x] **AC9 - Signature Help.** For a documented `#function`/`#macro`, `signatureHelpAt` returns Markdown signature documentation (summary + Returns, D8) and per-parameter Markdown documentation matched by name; undocumented symbols keep `"<name> takes N parameter(s)."`; builtin help unchanged. VS Code provider uses `MarkdownString` for ftldoc content; server sends `MarkupContent` (markdown) for both.
- [x] **AC10 - Completion docs.** General and namespace (`ns.`) symbol completion candidates for documented symbols carry `documentation` = `formatFtlDocMarkdown(...)` output; undocumented ones stay without documentation; VS Code and server both surface it.
- [x] **AC11 - LSP Hover parity.** `symbolHoverAt` (pure) is used by both `FtlHoverProvider` and server `onHover`; for the same text/offset both produce identical Markdown, including `#local` scope (offset-aware) and `#import … as ns` symbols.
- [x] **AC12 - Param diagnostics.** D7: unknown `@param` root name and duplicate `@param` produce Information diagnostics on the name span inside the comment; none for matching, dotted (`opts.key` with declared `opts`), optional (`[opts]`), catch-all (`args` for `args...`) names or for non-function/macro symbols; `validateFtl(text, { ftldocParams: false })` and the VS Code setting `ftl-dev.ftldoc.validateParams: false` suppress them; severity maps to Information in VS Code and LSP. Changing `ftl-dev.ftldoc.validateParams` re-validates open FreeMarker documents immediately (the `diagnosticsProvider.ts` `onDidChangeConfiguration` handler checks `e.affectsConfiguration("ftl-dev.ftldoc.validateParams")` and calls `refreshVisible()`), without editing the document.
- [x] **AC13 - Deprecated diagnostics.** A multi-line `@deprecated` message appears in the 0018 warning with whitespace runs collapsed to single spaces (`Deprecated: use a then b`); single-line behavior unchanged.
- [x] **AC14 - TextMate.** Inside angle and square FTL comments: any `@word` tag at line start (after optional whitespace / `*` gutter) or right after the comment opener gets `keyword.other.documentation.ftldoc.freemarker`; known tags keep matching anywhere as today; `@param {type} [name=x]` scopes type as `entity.name.type.ftldoc.freemarker` and name as `variable.parameter.ftldoc.freemarker`; `{@link …}` inline tag name gets the tag scope; `user@host` and mid-line unknown `@word` stay plain comment; all new scopes are mapped to `comment` in `package.json` `tokenTypes` (no bracket-pair colorization inside comments); nested comment mute unchanged.
- [x] **AC15 - Backward compatibility.** All existing tests pass unchanged except the rows in *Changed expectations*; grammar fixtures `comment*.ftl` untouched.
- [x] **AC16 - QA green.** `cd extension && npm test` all ✓ (605 baseline + new), `cd server && npx tsc -p .` exit 0, `npm run check:terms` exit 0 with `FTL_DEV_FORBIDDEN_TERMS_FILE` set to the out-of-repo list.

### Test cases

Parser tests use `parseFtlDoc`; render tests use `formatFtlDocMarkdown`. "md" = rendered Markdown.

| ID | AC | Input (body, abbreviated) | Expected |
|----|----|---------------------------|----------|
| T1 | AC1 | `@param payload` ⏎ `    raw request data` | `params[0]` = `{name:"payload", description:"raw request data"}` |
| T2 | AC1 | `@param header first line` ⏎ `    second line` | description `"first line\nsecond line"` |
| T3 | AC1 | `@deprecated` ⏎ `  use a` ⏎ `  then b` / `@since` ⏎ `  2.0` / `@stop` ⏎ `  if empty` | `deprecated` `"use a\nthen b"`, `since` `"2.0"`, `stops` `["if empty"]` |
| T4 | AC1 | `@see one` ⏎ `  more` ⏎ `@see two` | `see` `["one\nmore","two"]` |
| T5 | AC2 | `    Line one.` ⏎ `    Line two.` ⏎ ⏎ `    Para two.` | `summary` `"Line one.\nLine two.\n\nPara two."`; md contains `Line one.  \nLine two.` and `\n\nPara two.` with no leading spaces |
| T6 | AC2 | ` * Sum.` ⏎ ` * @param a x` (all lines gutter) | summary `"Sum."`, param `a` |
| T7 | AC2 | `Intro` ⏎ `* first` ⏎ `* second` (mixed lines) | summary keeps `* first` / `* second`; md renders a bullet list |
| T8 | AC3 | `@return {hash} the result` | `returnsType` `"hash"`, `returns` `"the result"`; md `**Returns** \`{hash}\` — the result` |
| T9 | AC3 | `@return {` ⏎ `    status: ...,` ⏎ `    items: ...` ⏎ `}` | no `returnsType`; md has `**Returns**` followed by a fenced block containing exactly `{\n    status: ...,\n    items: ...\n}` |
| T10 | AC3 | `@return {}` / `@return {` (single line, unclosed) / `@returns {hash}` ⏎ `  more` | `{}` → no type, `returns` `"{}"`; `{` → no type, `returns` `"{"`, rendered as text (one line, not a shape); third → `returnsType` `"hash"`, `returns` `"more"` |
| T11 | AC4 | `@param {string} name the name` | `{name:"name", type:"string", description:"the name"}` |
| T12 | AC4 | `@param [request] optional` / `@param [request=null] opt` / `@param {string} [label="a b"] x` | `optional:true`; `defaultValue:"null"`; `type:"string", defaultValue:"\"a b\""` |
| T13 | AC4 | `@param payload data` ⏎ `@param payload.items list` | two params; md nests `payload.items` under `payload` |
| T14 | AC5 | `@processing` ⏎ `  1. a` ⏎ `  2. b` ⏎ `@note` ⏎ `  text` | `tags` `[{tag:"processing",…},{tag:"note",…}]`; md `**@processing**` then `1. a\n2. b`, then `**Note**` then `text` |
| T15 | AC5 | `@example` ⏎ `  <#assign x = parseRequest(p, h)>` | md contains ```` ```ftl\n<#assign x = parseRequest(p, h)>\n``` ```` (no hard breaks) |
| T16 | AC5 | `@author A` `@version 1` `@todo t` `@remarks r` `@Custom c` `@custom d` | headings **Author**, **Version**, **TODO**, **Remarks**, `**@Custom**`, `**@custom**`; Author/Version after Since; others in source order |
| T17 | AC6 | `See {@link parseRequest} and {@link parseRequest the parser}, {@code a < b}, {@linkcode x}, {@link https://example.com docs}, {@literal @param}, {@foo bar}` | `` `parseRequest` ``, `the parser`, `` `a < b` ``, `` `x` ``, `[docs](https://example.com)`, `\@param` (escaped, not a tag), `{@foo bar}` literal |
| T18 | AC6 | `` `{@code x}` `` inside a code span and inside an `@example` | unchanged |
| T19 | AC7 | `Intro line` ⏎ `3. three` ⏎ `4. four` | md inserts a blank line before `3. three`; no hard break after `Intro line` |
| T20 | AC7 | `@param header line one` ⏎ `  line two` ⏎ ⏎ `  para two` | md item `- \`header\` — line one  \n  line two\n\n  para two` |
| T21 | AC7, AC8 | Full neutral sample from *Problem* | `assert.strictEqual(formatFtlDocMarkdown("parseRequest", "function", leadingFtlDoc(text, declOffset)), EXPECTED_T21)` where `EXPECTED_T21` is exactly the string under *T21 expected Markdown* |
| T22 | AC7 | `Text` ⏎ ⏎ `        deep indented` ⏎ ⏎ `Text` (not in a list) | indented run emitted as a fenced block, not an indented code block |
| T23 | AC9 | `@param payload raw` ⏎ `@param header` ⏎ `  mapped` above `<#function parseRequest payload header>`; caret in `parseRequest(x, |` | `parameters[1].documentation` contains `mapped`; signature documentation contains summary; label `parseRequest(payload, header)` unchanged |
| T24 | AC9 | Undocumented function / builtin `?then(` | documentation `"f takes 2 parameters."`; builtin result unchanged |
| T25 | AC9 | `@param {string} [label="x"] d` with decl `label="y"` | label `label="y"` (declaration wins); param doc shows `` `{string}` `` and `optional, default: \`"x"\`` |
| T26 | AC10 | `buildCompletions` general ctx with a documented `#function` and an undocumented `#assign` | documented candidate `documentation` contains the summary and `**Parameters**`; undocumented has none |
| T27 | AC10 | ns completion `lib.` with imported documented symbol | `documentation` present (via `importByNs` symbols' `doc`) |
| T28 | AC11 | Text with documented `#function`, a documented `#local` inside a macro, and an `#import "lib.ftl" as lib` symbol | `symbolHoverAt` output equals `symbolHover(...)` for the resolved symbol in each case; local outside scope → undefined |
| T29 | AC12 | `@param missing x` above `<#function f a>` | 1 Information diagnostic, message `ftldoc @param 'missing' does not match a parameter of 'f'`, range = `missing` inside the comment |
| T30 | AC12 | `@param a x` ⏎ `@param a y` | 1 Information `Duplicate ftldoc @param 'a'` on the second `a` |
| T31 | AC12 | `@param opts.key`, `@param [opts]`, `@param args` with decl `opts args...`; `@param z` above `#assign` | 0 diagnostics |
| T32 | AC12 | T29 with `{ ftldocParams: false }` | 0 diagnostics |
| T33 | AC13 | `@deprecated` ⏎ `  use a` ⏎ `  then b` + a use | warning message `Deprecated: use a then b` |
| T34 | AC14 | Grammar fixture lines: `<#-- @processing x -->`, `  @note y`, ` * @custom z`, `@param {string} [name=x] d`, `{@link sym}`, `text @mid not a tag`, `user@host` | scopes per AC14; `@mid` and `@host` have no tag scope |
| T35 | AC15 | Existing `ftldoc.test.ts`, `diagnostics.test.ts`, `signatureHelp.test.ts`, `catalog.test.ts`, `hoverImport.test.ts`, `commentMute.test.ts`, grammar fixtures | pass (except listed changes) |

### T21 expected Markdown

Derived from D1–D5 and the existing formatter conventions (sections joined by one blank line, `—` = U+2014, no trailing newline). `␠` marks one literal space; each `␠␠` is the two-space Markdown hard break at the end of that line (D3). No other line has trailing spaces. The block below is the string verbatim (outer `~~~` fence is not part of it):

~~~text
`parseRequest` — function

Parses the request payload and its header.␠␠
Some fields may be empty hashes depending on the header.

**Parameters**

- `payload` — raw request data
- `header` — mapped header data; may contain a route key,␠␠
  then a target key depending on routing

**Returns**

```
{
    status: ...,
    items: ...,
    ...
}
```

**@processing**

1. read the header
2. map the payload

**Note**

remark text
~~~

Derivation notes:
- No Deprecated section (no `@deprecated`); the summary is dedented by its common 4 spaces; its first line gets a hard break, its last line none (D3).
- `payload` has a one-line description → no hard break. `header`'s continuation line is dedented, then indented 2 spaces under the list item; the line before it gets a hard break.
- `@return {` is not a type (`}` not on the same line, D2) and spans several lines starting with `{` → shape block: head `{` + continuation dedented by their common indent (0, because `}` is at column 0), trailing blank line dropped, fenced with no language, no hard breaks inside the fence.
- No Stop / See / Since / Author / Version sections. `@processing` (unknown → `**@processing**`) and `@note` (→ **Note**) follow Returns in source order (D5). The ordered-list lines get no hard break (the next line is a list item / end of block).

Same string as a JS literal for the test:

```ts
const EXPECTED_T21 =
  "`parseRequest` — function\n\n" +
  "Parses the request payload and its header.  \n" +
  "Some fields may be empty hashes depending on the header.\n\n" +
  "**Parameters**\n\n" +
  "- `payload` — raw request data\n" +
  "- `header` — mapped header data; may contain a route key,  \n" +
  "  then a target key depending on routing\n\n" +
  "**Returns**\n\n" +
  "```\n{\n    status: ...,\n    items: ...,\n    ...\n}\n```\n\n" +
  "**@processing**\n\n" +
  "1. read the header\n2. map the payload\n\n" +
  "**Note**\n\n" +
  "remark text";
```

### Changed expectations

| Test | Before | After | Why |
|------|--------|-------|-----|
| `ftldoc.test.ts` "leading @ignore is not the nodoc short-circuit (AC3)": `parseFtlDoc("@ignore\nside effect")` | `undefined` | doc with `tags: [{ tag: "ignore", text: "side effect" }]` (still **not** the `@nodoc` short-circuit) | D1/D10: continuation lines now belong to the tag and unknown tags are kept. The test's intent (leading `@ignore` ≠ `@nodoc`) is preserved; the assertion is updated. |
| `tests/grammar/ftldoc-comment.ftl` | — | extended only (new lines); existing assertions unchanged | AC14 |
| Server Hover output for user symbols (no tests) | `**function** \`name\`` | `symbolHover` Markdown (`` `name` — function `` + doc) | AC11 parity |

No other existing assertion changes. Summary text is now dedented (e.g. `"A\nB"` instead of `"A\n    B"`); existing tests only use `includes`, so they stay green.

---

## Approach

### 1. Model (`ftldoc.ts`)

```ts
export type FtlDocParam = {
  name: string;            // may be dotted: "payload.items"
  description: string;     // dedented, may be multi-line
  type?: string;           // from {type}
  optional?: boolean;      // [name] / [name=…]
  defaultValue?: string;   // [name=…] raw text
  nameOffset?: number;     // absolute offset of name in source (set by leadingFtlDoc)
};
export type FtlDocTag = { tag: string; text: string };   // tag as written (no "@")
export type FtlDoc = {
  summary: string; params: FtlDocParam[];
  returns?: string; returnsType?: string;
  deprecated?: string; see?: string[]; since?: string; stops?: string[];
  /** Every other block tag (example, note, author, unknown…), source order. */
  tags?: FtlDocTag[];
};
```

`parseFtlDoc(body, baseOffset = 0)`; `extractLeadingCommentBody` gains a sibling returning `{ body, bodyOffset }` used by `leadingFtlDoc` so `nameOffset` is absolute. "Empty doc → `undefined`" also considers `tags`.

### 2. Parser

1. Normalize CRLF; split lines; detect gutter (every non-blank line matches `^\s*\*(\s|$)`) → strip `^\s*\*\s?` from all lines (offsets tracked).
2. `@nodoc` leading short-circuit unchanged (checked on the trimmed body before anything else).
3. Group into blocks: summary lines, then `{ tag, head, continuation[] }` per D1.
4. Body text = head + `"\n"` + dedent(continuation) with leading/trailing blank lines dropped (if head empty, body = dedent(continuation)).
5. Per tag: `param` → parse `{type}` (D2 one-line rule) then name (`[ … ]` with balanced quotes for default, or `[A-Za-z_][\w]*(\.[A-Za-z_]\w*)*`), rest = description; `return(s)` → optional `{type}` then text (shape detection is a render concern, raw text kept); known scalars as today; `nodoc` mid-body skipped; everything else → `tags`.

### 3. Renderer (`ftldocMarkdown.ts`, pure)

- `renderDocText(text)`: fences pass-through → inline tags (D6) outside code → shape/indent guard (D2/D4) → lists and hard breaks (D3). Used for summary and every body.
- Sections per D5. Param list: `- \`name\`` + `` ` \`{type}\`` `` + ` (optional, default: \`v\`)` + ` — ` + first line, continuation lines indented 2 spaces; dotted names grouped as nested items under their root (root without its own `@param` gets a bare item).
- Returns: single-line, no shape → `**Returns** — text` (unchanged format), with type → `**Returns** \`{type}\` — text`; multi-line or shape → `**Returns**` (+ type) then a blank line and the rendered block.
- Exports for reuse: `formatFtlDocMarkdown` (unchanged signature), `formatSignatureDocMarkdown(doc)`, `formatParamDocMarkdown(param, nested)`.

### 4. Surfaces

- **Hover**: `symbolHoverAt(text, offset, index, importByNs)` in `docs.ts` (logic moved from `hoverProvider.ts`: identifier → `ns.sym` import hit → `findDefinitions(index, id.text, offset)`). VS Code provider and server call it. Server `onHover` becomes async and uses `collectImportSymbols` like `onCompletion`.
- **Signature Help**: `SignatureHelpResult` gains `documentationMarkdown?: boolean` and `parameters: { label; documentation?: string }[]`; `buildHelp` receives the symbol's `doc`. VS Code: `MarkdownString` when markdown, `ParameterInformation(label, MarkdownString)`; server: `MarkupContent { kind: markdown }`.
- **Completion**: `SymbolCompletionEntry.documentation?: string`; `completionProvider.ts` / server fill it from the first same-name symbol that has a `doc` (function preferred, as `asFunctionCall` today; imported entries via `importByNs`); `symbolCandidate` passes it through.

### 5. Diagnostics

`findFtldocParamIssues(index)` in `diagnostics.ts`, called from `validateFtl` when `options.ftldocParams !== false` (default true). `FtlDiagnostic.severity` adds `"information"`; `diagnosticsProvider.ts` maps it to `DiagnosticSeverity.Information`, reads `ftl-dev.ftldoc.validateParams` per validation, and adds `e.affectsConfiguration("ftl-dev.ftldoc.validateParams")` to the existing `onDidChangeConfiguration` condition (→ `refreshVisible()`); server maps the severity too. `findDeprecatedUsageIssues` collapses `\s+` → `" "` in the message.

### 6. TextMate (`#ftldoc-tag`)

Order inside `#ftldoc-tag` (after the nested `#comment` include, as today):
1. `@param` with optional `{type}` and `[name…]`/name captures (tag, type, name).
2. `@return(s)` with optional `{type}` capture.
3. Inline `\{(@(?:link|linkplain|linkcode|code|literal))\b` → tag capture (braces stay plain comment).
4. Known tag list anywhere (today's rule, extended with `example|note|remarks|todo|author|version`).
5. Generic `(?:^|(?<=<#--|\[#--))\s*(?:\*\s*)?(@[A-Za-z][\w-]*)` → tag capture (line start / after opener only).
Map every new scope in `package.json` `contributes.grammars[].tokenTypes` to `comment`; add them to `commentMute.test.ts` `ALLOWED_EXTRA`.

### 7. Order of work (개발)

Parser + tests (T1–T13) → renderer (T14–T22) → hover helper + server hover (T28) → signature help (T23–T25) → completion (T26–T27) → diagnostics (T29–T33) → grammar (T34) → full QA.

---

## QA

From `extension/`:

```
npm test                                   # grammar + unit, all ✓ (605 baseline + new)
cd ../server && npx tsc -p . && cd ../extension
FTL_DEV_FORBIDDEN_TERMS_FILE=<out-of-repo term list> npm run check:terms   # exit 0
grep -c -E -f <(grep -v '^#' <out-of-repo term list>) ../docs/plans/active/0038-ftldoc-javadoc-parity.md   # 0
```

Manual (문서 step, Extension Host, `tests/fixtures/ftldoc/demo.ftl` with the neutral `parseRequest` example added): Hover shows two summary lines, both parameter descriptions, Returns code block, `@processing` list, Note; Signature Help inside `parseRequest(|` shows per-parameter docs; Ctrl+Space shows docs on `parseRequest`; a stray `@param` shows a blue Information squiggle; toggling `ftl-dev.ftldoc.validateParams` to `false` in Settings clears that squiggle and setting it back to `true` restores it, both **without editing the document**; tags highlighted. LSP smoke via `server/out/server/src/cli.js --stdio` hover request returns the same Markdown.

---

## Results

Completed 2026-10-22. Manual smoke (Extension Host Hover / Signature Help / Ctrl+Space on `tests/fixtures/ftldoc/demo.ftl` `parseRequest`, `validateParams` toggle without editing, LSP stdio hover) is **pending user**: the VS Code download is blocked in the sandbox. Checklist rows were added to [`tests/fixtures/ftldoc/README.md`](../../../tests/fixtures/ftldoc/README.md).

QA (검증QA, fresh `out/`): `cd extension && npm test` exit 0 — **638 ✓, 0 fail** (605 baseline + 33 new); rename / workspaceSymbols / symbolKindVscode suites 0 fail; `cd server && npx tsc -p .` exit 0; `npm run check:terms` 0 hits in 222 files. Probe of a neutral multi-line sample: summary with hard break, both `@param` descriptions (multi-line continuation indented under the item), full `{…}` Returns fenced block, `**@processing**` ordered list, **Note**.

| AC | Result | Evidence |
|----|--------|----------|
| AC1 | Done | `ftldoc.test.ts` T1–T4 |
| AC2 | Done | T5–T7 |
| AC3 | Done | T8–T10 |
| AC4 | Done | T11–T13 |
| AC5 | Done | T14–T16 |
| AC6 | Done | T17, T18 |
| AC7 | Done | T19, T20, T21, T22 |
| AC8 | Done | T21 (`strictEqual` against `EXPECTED_T21`) + QA probe |
| AC9 | Done | `signatureHelp.test.ts` T23–T25; VS Code `MarkdownString`, server `MarkupContent` (tsc 0) |
| AC10 | Done | `catalog.test.ts` T26, T27; VS Code + server completion `documentation` |
| AC11 | Done | `ftldoc.test.ts` T28 (`symbolHoverAt`); `hoverProvider.ts` and server `onHover` both call it. Manual LSP stdio smoke pending user |
| AC12 | Done (manual toggle pending) | `diagnostics.test.ts` T29–T32; setting `ftl-dev.ftldoc.validateParams` + `onDidChangeConfiguration` → `refreshVisible()`; Information in VS Code and server |
| AC13 | Done | T33 |
| AC14 | Done | `tests/grammar/ftldoc-comment.ftl` (T34 lines appended); new scopes → `comment` in `tokenTypes`; `commentMute.test.ts` `ALLOWED_EXTRA` |
| AC15 | Done | T35: all prior tests green; only the planned `@ignore` assertion changed; `comment*.ftl` untouched |
| AC16 | Done | QA above |

### Deviations

- **Renderer split**: rendering lives in new `extension/src/ftldocMarkdown.ts`; `formatFtlDocMarkdown` is re-exported from `ftldoc.ts` (existing imports unchanged). Both files are listed in `server/tsconfig.json` `include`.
- **`symbols.ts` untouched**: the body offset for `nameOffset` is computed inside `leadingFtlDoc` (`ftldoc.ts`), so no change to symbol indexing was needed.
- **Opener-line summary trim**: text on the comment opener line (`<#-- Summary`) is treated as a trimmed head and only the following lines are dedented, so the opener line's single separator space does not cancel the common indent of the rest.
- **Multi-line `@deprecated`**: rendered as a **Deprecated** heading followed by the body block when it spans several lines; single-line keeps the existing one-line `**Deprecated**: text`.
- **Author / Version** render as one-liners (`**Author** — A`, `**Version** — 1`) when single-line, like See / Since.
- **Completion dedupe shared**: same-name symbol candidates are deduped (one entry per name; doc from the first documented symbol, a `#function` preferred) by one pure helper `symbolCompletionEntries` (`completion/helpers.ts`) used by both the VS Code provider and the server.
- **Server Hover full `ns.sym` lookup**: server Hover resolves `#import … as ns` symbols through `symbolHoverAt` + `collectImportSymbols` (previously name-only `findDefinitions`).

### Risks / known limits

- A line-start `@word` inside a summary or tag body always starts a new tag (D1). Authors needing a literal one write `{@literal @word}` or move it mid-line.
- Dedent counts tabs and spaces as one column each; mixed tab/space indentation may dedent unevenly or trip the D4 fenced-indent guard.
- Vim / Neovim syntax for the new tag shapes is a follow-up in `ftl-dev.vim` (non-goal here).
