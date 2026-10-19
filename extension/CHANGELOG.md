# Changelog

All notable changes to the **ftl-dev** VS Code / Open VSX extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/) as described in [docs/versioning.md](../docs/versioning.md). Policy: [docs/decisions/0004-changelog.md](../docs/decisions/0004-changelog.md).

## [Unreleased]

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
