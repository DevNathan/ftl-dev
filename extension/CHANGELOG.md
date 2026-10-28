# Changelog

All notable changes to the **ftl-dev** VS Code / Open VSX extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/) as described in [docs/versioning.md](../docs/versioning.md). Policy: [docs/decisions/0004-changelog.md](../docs/decisions/0004-changelog.md).

## [Unreleased]

## [1.0.0] - 2026-10-28

First stable release. From here on the extension id, language id, file extensions, grammar scope name, settings keys, `.ftl-data-model.json` and icon theme id only change in a major version ([stability contract](../docs/versioning.md#stability-contract-from-100)).

### Added

- SQL highlighting in capture assignments (plan 0041): the body of `<#assign|local|global name>…</#…>` is highlighted as SQL when the name starts with `sql` (case-insensitive, e.g. `sqlInsert`, `SQL_LIST`) or when `<#-- @lang sql -->` sits directly above the opening tag. FTL inside the body (`${…}`, `<#if>`, comments) keeps its FTL highlighting; `@name` bind parameters get their own color; SQL strings/comments cannot run past the closing tag. Uses the editor's built-in SQL grammar (`source.sql`)
- ftldoc: a `<#-- @lang … -->` marker comment is not documentation and does not detach the doc comment above it

## [0.8.0] - 2026-10-23

### Added

- `#on` directive (FreeMarker 2.3.34+) inside `#switch`: keyword highlighting, completion and Hover docs, no "Unknown directive" error, auto-close / indent / linked-editing treat it like `#case`
- camelCase directive names (`#outputFormat`, `#noParse`, `#elseIf`, `#autoEsc`, `#noAutoEsc`, `#noEscape`, `#forEach`) are recognized: no more "Unknown directive" errors, keyword highlighting, Hover, auto-close / indent like the snake_case form
- Deprecated `#call`, `#comment`, `#foreach` are recognized with a deprecation warning instead of an "Unknown directive" error; the `#comment` body is ignored like `#noparse`
- 73 missing built-ins (checked against FreeMarker 2.3.35 sources) in completion, Hover and Signature Help: loop-variable built-ins (`?index`, `?counter`, `?has_next`, `?is_first`, `?is_last`, `?item_parity`, `?item_cycle`, …), the `?iso*` family, `?c_lower_case` / `?c_upper_case`, `?cn`, `?blank_to_null` / `?empty_to_null` / `?trim_to_null`, `?chunk`, `?drop_while` / `?take_while`, `?truncate_c` / `_w` / `_m` variants, `?no_esc`, `?eval_json`, `?url_path`, node navigation, and 2.3.35's `?dedent` / `?indent` / `?lines` / `?wrap`
- Special variable `.current_node`; camelCase built-in and special-variable names (`?upperCase`, `?isoUtcFZ`, `.dataModel`) resolve to their documentation
- `#switch` checks: error when `#on` and `#case` are mixed in one `#switch`; warning when a non-empty `#case` / `#default` falls through to the next branch without `#break` / `#return` / `#stop` (empty `#case` grouping is fine; a `<#-- falls through -->` comment marks it intentional)

### Changed

- `${` now auto-closes inside quoted FTL strings too (it is interpolation there, plan 0039)

## [0.7.0] - 2026-10-22

### Fixed

- No more false errors on valid `<#list seq>…<#items as x>` / `</#sep>` / `<#list>…<#else>` / `<#noparse>…</#noparse>` / `<#list 0..<n as i>`; `#list` without `as` and without `#items` is still reported (plan 0040)
- Semantic highlighting no longer paints string contents (e.g. hash keys like `"header"`), plain HTML text or `<#noparse>` bodies as variables just because they equal a local name; only FTL code (tags and `${…}` bodies) is scanned (plan 0039)
- `${…}` inside quoted FTL strings is highlighted like a JS template expression: `${` / `}` get the embedded-punctuation color and the body is highlighted as an expression (nested strings stay string-colored); `\${` stays an escape (plan 0039)
- FTL raw strings `r"…"` / `r'…'` are highlighted as strings without escapes or interpolation (plan 0039)

### Changed

- The VSIX no longer ships test-only assets (test HTML grammar, dev scripts)

## [0.6.0] - 2026-10-22

### Added

- ftldoc block tags span multiple lines: everything after a line-start `@tag` up to the next one belongs to it, and a description may start on the next line (`@param name` ⏎ indented text); applies to `@param`, `@return`/`@returns`, `@deprecated`, `@see`, `@since`, `@stop` and every other tag. Bodies are dedented; blank lines are paragraph breaks (plan 0038)
- ftldoc custom tags (e.g. `@processing`) render as `**@tag**` sections in source order; known `@note`, `@remarks`, `@example` (fenced `ftl` block, verbatim), `@todo`, `@author`, `@version` get headings (plan 0038)
- ftldoc JSDoc forms: `@param {type} name`, `@param [name]`, `@param [name=default]`, dotted `@param opts.key` (nested under `opts`), `@return {type} text`; a multi-line `@return {` … `}` shape renders as a code block (plan 0038)
- ftldoc inline tags `{@link t}`, `{@link t label}` / `{@link t|label}`, `{@linkplain …}`, `{@linkcode x}`, `{@code x}`, `{@literal x}` (http(s) targets become links; unknown `{@foo}` stays literal) (plan 0038)
- ftldoc in Signature Help (summary + Returns; per-parameter docs matched by name) and in completion item documentation for documented user symbols, incl. `ns.` imports; VS Code and LSP server (plan 0038)
- LSP server Hover shows the same ftldoc Markdown as VS Code (incl. `#local` scope and `#import … as ns` symbols) (plan 0038)
- `@param` validation diagnostics (Information): unknown `@param` name or duplicate `@param` on a `#function` / `#macro`; setting `ftl-dev.ftldoc.validateParams` (default `true`, re-validates open documents on change) (plan 0038)
- TextMate: any line-start `@tag`, `{type}` / `[name]` in `@param`, and inline `{@link}` / `{@code}` … highlighted inside FTL comments (plan 0038)

### Changed

- ftldoc line breaks are preserved as Markdown hard breaks; a list directly after a paragraph line still renders as a list (plan 0038)
- A leading `@ignore` is no longer special in any way: it is an ordinary (generic) tag, rendered as `**@ignore**` (plan 0038)
- A multi-line `@deprecated` message in the deprecated-use warning has its whitespace collapsed (`Deprecated: use a then b`) (plan 0038)

### Fixed

- ftldoc descriptions on continuation / next lines were dropped (e.g. `@param payload` ⏎ `raw request data` showed no description); unknown tags were dropped (plan 0038)
- ftldoc Returns was truncated to its first line (a `{ … }` shape showed only `{`) (plan 0038)
- Markdown `*` bullets in ftldoc prose were stripped; the `*` gutter is now removed only when every line has it. Indented second paragraphs no longer render as code blocks (plan 0038)
- `@param {type} name` / `@param [name]` were silently dropped (plan 0038)

## [0.5.0] - 2026-10-21

### Added

- Linked editing of paired FTL tag names: with the cursor on the name of an open or close tag, typing edits both (`<#function>` / `</#function>`, `<#if>` / `</#if>`, capture `<#assign x>` / `</#assign>`, `<@m>` / `</@m>`, dotted `<@ns.box>`, and square `[#if]` / `[/#if]`). Mid-block tags (`#else`, `#sep`, …), self-closed tags, HTML tags, FTL comments and `#noparse` bodies are not linked. Enabled by default via the `[freemarker]` default `editor.linkedEditing: true`; turn it off with `"[freemarker]": { "editor.linkedEditing": false }` (a plain global `editor.linkedEditing: false` does not override the language default). `Ctrl+Shift+F2 (macOS: Cmd+Shift+F2)` (Start Linked Editing) still works when it is off. The pair stays linked while the name is fully deleted (`<# …>` / `</#>`, `[#…]` / `[/#]`, empty `<@ …>` / `</@>`), so a new name can be typed into either tag (plan 0036). VS Code only — not in the LSP server or Vim / Neovim (plans 0035, 0036)

### Changed

- Self-close `/` policy is now default-allow with precise denies, superseding the 0.2.1 allow-list: `/` inside an open FTL tag inserts `>` / `]` (e.g. `<#assign name />`, `<@m arg />`, `<#include "x" />`). No close when the tag is already closed (forward scan, so no `//>` or `/> />`); for body-required directives (`#function`, `#macro`, `#if`, `#list`, mid-block `#else`/`#sep`/…, plus `#outputformat`, `#noparse`); when `/` follows an operand in an expression (division, e.g. `<#assign num = 3 /`, `<@box w=10 /`); for unquoted `#include`/`#import` paths (`<#include lib/`); or inside strings/parens/FTL comments. Flipped: `<@banner foo /` now closes (plan 0034)
- Build: `vscode-textmate` and `vscode-oniguruma` are explicit devDependencies (same resolved versions 7.0.4 / 1.7.0); npm is the only supported package manager — `pnpm-lock.yaml` / `yarn.lock` are git-ignored (plan 0033)
- Repo: `.gitattributes` enforces LF line endings (CRLF only for `*.ps1` / `*.cmd` / `*.bat`; binaries untouched) (plan 0033)

### Fixed

- `commentMute` unit test no longer depends on pnpm store paths (`node_modules/.pnpm/...`); it resolves `vscode-textmate` / `vscode-oniguruma` (and `onig.wasm`) by package name, so `npm ci && npm test` passes (plan 0033)
- Typing `>` right after an auto-inserted self-close `/>` (`/]` in square syntax) no longer produces `/>>`; the duplicate closer is swallowed (plan 0034)
- Self-close `/` no longer fires inside an unterminated FTL comment (`<#-- <#assign /`), and no longer self-closes empty-body block directives such as `<#if /`, `<#function /`, `<#else /` (plan 0034)

## [0.4.0] - 2026-10-20

### Added

- Clause-keyword Hover for `as` / `in` / `using` (same `paramDocumentation` one-liners as completions); small static value catalogs for locale / charset / `*_format` / `output_format` named-param value slots on `#ftl` / `#setting` (plan 0032a; closes 0030 AC10)
- Expanded builtin Signature Help for most arg-taking `?name(…)` entries in the catalog (incl. camelCase aliases e.g. `endsWith` → `ends_with`); still silent for zero-arg / uncataloged; not a full Apache / Java overload dump (plan 0032b)
- Optional `templates` map on workspace-folder `.ftl-data-model.json`: path prefix or simple `*` / `**` glob → extra allowlist roots for matching `.ftl` paths, merged with flat `roots` when `strictVariables` is on (plan 0032b / ADR 0002)
- LSP server Hover probe order matches VS Code (`builtin` → `directive` → `namedParam` → symbol); vim syntax highlights known `#ftl` / `#setting` / `#include` named-param LHS as `ftlNamedParam` (parity with TextMate); full VS Code → LanguageClient extraction CLOSED as deferred-with-trigger (ADR 0005 / plan 0032c)
- When `ftl-dev.strictVariables` is on, workspace-folder root `.ftl-data-model.json` (`{ "roots": string[] }` plus optional `templates`) merges with setting `ftl-dev.dataModel` into the undeclared-root allowlist; invalid/missing file contributes no roots (Output warning); no walk-up (plan 0031 / ADR 0002; `templates` in plan 0032b)
- Hover on known `#ftl` / `#setting` / `#include` named-param LHS (snake or camel) reuses the same `paramDocumentation` one-liners as completions (plan 0030; clause Hover in plan 0032a)
- Opt-in undeclared-root warnings via `ftl-dev.strictVariables` (default **off**) plus host allowlist `ftl-dev.dataModel` (`string[]`); ADR 0002 layer B MVP — roots only, no Java bean / type checking (plan 0029 / ADR 0002; project file merge in plan 0031)
- Signature Help for built-in calls `?name(…)` (e.g. `replace`, `substring`, `then`, `join`, and later catalog expand in plan 0032b); silence for uncataloged / zero-arg builtins; does not override `#function` / `#macro` help for non-`?` calls (plan 0028)
- Per-param one-liner `documentation` on named-param (and clause keyword) completions for `#ftl` / `#setting` / `#include`, plus warning diagnostics for unknown `name=` left-hand identifiers on those directives (plan 0027; closes 0026 AC13)
- Directive named-param camelCase aliases (e.g. `stripWhitespace`, `numberFormat`, `ignoreMissing`) in completion and TextMate `#directive-named-param`, plus `true` / `false` value completions after `=` for boolean-like `#ftl` / `#setting` / `#include` params (plan 0026)
- Directive named-param completion inside open `#ftl` / `#setting` / `#include` tags, plus clause keywords `as` / `in` / `using` where applicable; TextMate highlight of known `name=` params as `entity.other.attribute-name.freemarker` (plan 0024)
- Quoted-string `${…}` interpolations get distinct TextMate scopes (`meta.interpolation.freemarker`) for highlighting
- Workspace Symbol (Ctrl+T / Go to Symbol in Workspace): search declaration names from `indexFtl` across open FreeMarker buffers plus a capped workspace `findFiles` scan (`searchWorkspaceSymbols` + `FtlWorkspaceSymbolProvider`) (plan 0023)
- Rename Symbol (F2): same-file rename for `#assign`, `#macro`, `#function`, `#local`, and `#global` names; edit set matches Find All References (`renameSymbolAt` + `FtlRenameProvider`) (plan 0022)
- Layer-A diagnostics: error when `#macro` / `#function` definitions nest inside another macro or function body; error when `#local` is used outside a `#macro` or `#function` definition (angle and square short forms included; user-macro `<@…>` call bodies do not count as nested definitions) (plan 0015)

### Changed

- **Breaking:** ftldoc suppress tag renamed `@ignore` → `@nodoc` (case-insensitive). Leading `@nodoc` skips documentation attachment; `@ignore` is no longer special-cased (plan 0025)
- Performance: keep shared document index across keystrokes (no eager cache delete); outline/references/diagnostics reuse cache; semantic tokens reuse comment ranges and skip empty use-scans; comparison-operator listeners attach only when the setting is on
- Completions: refactor `buildCompletions` into **CompletionEngine** + pluggable **CompletionProviders** (directive, builtin, special, ns, general); behavior-preserving; public `completionContext` / `buildCompletions` API unchanged (plan 0020)
- Context Analyzer: consolidate cursor probing (`completionContext`, `builtinAt` / `directiveAt`, `identifierAt`) under `extension/src/context/`; `catalog`, `hoverTokens`, and `symbols` thin re-exports; behavior-preserving (plan 0021)

## [0.3.0] - 2026-10-19

### Added

- Completion for FreeMarker special variables (`.error`, `.now`, `.vars`, …); `.error` is offered only inside `#recover`

### Fixed

- FTL comments force Comment token type and exclude bracket-pair scopes (`[]` `{}` `()` and other code scopes stay muted); auto-close pairs disabled inside comments/strings

## [0.2.1] - 2026-10-19

### Fixed

- Self-close `/` → `>` allow-list only: empty tag body (`<#assign /`) or trailer after a **closed** string (`<#include "x" /`). Unquoted paths (`<#include lib/`), strings (`loadText("./`), macro args, and expression `/` stay manual — adversarial suite added

## [0.2.0] - 2026-10-19

### Added

- **ftldoc**: JavaDoc-like docs from a leading FTL comment (`<#-- … -->` / `[#-- … --]`) with whitespace-only between comment end and `#function` / `#macro` / `#assign` / `#local` / `#global`. Tags: free-text summary, `@param`, `@return` / `@returns`, `@deprecated`, `@see`, `@since`, `@stop` (FreeMarker `#stop`, not Java `@throws`). Leading `@ignore` (case-insensitive) skips documentation. Hover shows Markdown from the attached doc; `#local` docs and Go-to-definition resolve only inside the enclosing `#function` / `#macro` body
- **ftldoc** TextMate tag highlight inside FTL comments
- Warn on use of `@deprecated` ftldoc symbols (warning on identifier uses; not on the declaration name)

### Fixed

- An unclosed outer tag (e.g. `<#function test cache` without `>`) no longer swallows a nested tag’s closer — `</` / `>` / self-close `/` on an inner `<#assign>` no longer invents `</#function>` (same for `#macro` / `#list` / `#if` / HTML / square-bracket FTL)
- Typing `/` for division inside an open `#assign` / `#local` expression (e.g. `<#local x = startBit /`) no longer auto-inserts `>` as a self-closing tag
- Typing `.` (or other completion / signature triggers) inside an FTL comment no longer opens the suggest or parameter-hint popup

## [0.1.0] - 2026-10-15

### Changed

- Internal refactor for readability and editor performance; **behavior frozen** to the existing unit/grammar test suite (no intentional feature or diagnostic-message changes)
- Shared scan helpers (`scan.ts`), line-start maps (`lineMap.ts`), and document-version cache (`docCache.ts`) for index / imports across providers
- Diagnostics provider debounced (~200ms) with stale-version discard; `validateFtl` uses shared directive-head matching (no per-char `slice().match`)
- Indent increase/decrease regexes compiled once; `escapeRe` centralized; auto-close apply path deduplicated
- Semantic tokens use line maps and import-symbol maps; reference search skips FTL comments
- Thin VS Code adapters share `vscodeIo` / `vscodeRanges`; semantic tokens provider extracted; hover token helpers moved to `hoverTokens.ts`

### Fixed

- A FreeMarker comment inside a directive or interpolation (e.g. `<#assign x = [ …, <#-- c -->, … ] />`) no longer ends the tag early in TextMate, so highlighting below the comment is no longer lost (gray)
- Hash-literal comma diagnostics ignore FTL comments; `:` / `,` / quotes inside a comment between entries no longer cause a false `Missing comma between hash entries`
- `Unclosed FreeMarker comment` is no longer reported for `'` / `"` inside a closed comment (e.g. `<#-- don't -->`)

## [0.0.15] - 2026-10-13

### Fixed

- Symbol index / semantic tokens skip FTL comments in one place (no parallel “comment mute” via semantic `comment` tokens); TextMate remains the only visual mute

### Added

- Vim / Neovim via separate repo `ftl-dev.vim` (Pathogen/Vundle/vim-plug); optional language-server scaffold under `server/` (not npm-published)

## [0.0.14] - 2026-10-13

### Added

- Signature Help (parameter hints) for user `#function` calls (`${fn(…)}`) and `#macro` calls (`<@macro …>`), including `#import` namespaces; triggers on `(`, `,`, `=`
- Completing a `#function` symbol inserts `name()` with the caret between the parentheses
- Nested / multiline FTL comments via TextMate `comment.block` (mutes brackets and operators too); diagnostics for unclosed `<#--` / `[#--` and orphan `-->` / `--]`

### Fixed

- Comparison-operator decorations are fully disposed when the setting is off (avoids leftover `letterSpacing` / opacity types corrupting the editor)
- Warn on activate if multiple FreeMarker / ftl-dev extensions are installed (old `nathan.ftl-dev` alongside `nathan-0910.ftl-dev`)
- Enter after `<#if>` no longer inserts a second `</#if>` when the block is already closed below (body between caret and close)
- Close-tag / mid-block indent align also runs when autocomplete inserts a full tag ending in `>` / `]` (not only a single-character closer)
- `#recover` / `#else` / close-tag indent align on `>` still runs when other text follows on the same line (e.g. `  <#recover>|</#attempt>`)

## [0.0.13] - 2026-09-28

### Added

- Diagnostics for missing or trailing commas in FreeMarker hash literals (`{ "a": 1 "b": 2 }`, `{ "a": 1, }`)

### Changed

- Default `ftl-dev.comparisonOperatorPresentation` to `false` (decoration-based display can break the editor minimap)

## [0.0.12] - 2026-09-24

### Added

- Mid-block indent for `#else` / `#elseif` / `#recover`, including on-type / `>` reindent behavior
- Comparison-operator presentation (`lt` / `lte` / `gt` / `gte` → symbols via editor decorations; setting `ftl-dev.comparisonOperatorPresentation`)
- Keep a Changelog file shipped with the VSIX; versioning and tag-based publish docs

### Changed

- Publisher / extension id aligned to `nathan-0910.ftl-dev` (Open VSX namespace and Marketplace)
- Marketplace / extension README rewritten to match the project voice
- Publish workflow runs only on `v*` tags (not on branch pushes)

### Fixed

- HTML-style tag close and related indent edge cases for FTL directives

## [0.0.11] - 2026-09-22

### Added

- Initial FreeMarker (`.ftl`) language support for CodeOSS-family editors: TextMate grammar, language configuration, navigation, completions, hover, diagnostics, semantic tokens, outline/references, and FTL-aware indentation
- Apache-2.0 licensing with project NOTICE
