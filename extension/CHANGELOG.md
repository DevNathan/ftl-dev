# Changelog

All notable changes to the **ftl-dev** VS Code / Open VSX extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/) as described in [docs/versioning.md](../docs/versioning.md). Policy: [docs/decisions/0004-changelog.md](../docs/decisions/0004-changelog.md).

## [Unreleased]

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
