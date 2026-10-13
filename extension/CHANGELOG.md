# Changelog

All notable changes to the **ftl-dev** VS Code / Open VSX extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/) as described in [docs/versioning.md](../docs/versioning.md). Policy: [docs/decisions/0004-changelog.md](../docs/decisions/0004-changelog.md).

## [Unreleased]

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
