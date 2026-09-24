# Changelog

All notable changes to the **ftl-dev** VS Code / Open VSX extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/) as described in [docs/versioning.md](../docs/versioning.md). Policy: [docs/decisions/0004-changelog.md](../docs/decisions/0004-changelog.md).

## [Unreleased]

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
