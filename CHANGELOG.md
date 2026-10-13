# Changelog — ftl-dev.vim

User-facing notes for the **Vim / Neovim** FreeMarker runtime (`ftl-dev.vim`).

Versioning is **independent** of the VS Code extension. Canonical file: [`VERSION`](VERSION). Process (monorepo docs): https://github.com/DevNathan/ftl-dev/blob/main/docs/versioning-vim.md

## [Unreleased]

## [0.1.3] - 2026-10-13

### Fixed

- Directive openers (`<#assign`, …) no longer split colours mid-name (dropped HTML-base + `matchgroup`)
- `?builtin` uses dedicated `ftlBuiltin` highlighting distinct from identifiers

### Changed

- Explicit 256/`guifg` defaults for FTL groups (override with colorscheme or `termguicolors`)

## [0.1.2] - 2026-10-13

### Added

- Full Vader + Neovim lua test suite with coverage inventory (100% of listed units)

### Fixed

- Indent logic moved to `autoload/ftl_dev/indent.vim` for testable pure helpers

## [0.1.1] - 2026-10-13

### Fixed

- `indentkeys` no longer uses `[` / `<#` tokens (Vim 8.1 E518 unknown option)

## [0.1.0] - 2026-10-13

### Added

- Initial Vim runtime: `ftdetect`, `syntax`, `indent`, `ftplugin` for FreeMarker (`.ftl` / `.ftlh` / `.ftlx`)
- Nested FTL comments, angle/square directives, `${…}` interpolations
- Optional Neovim LSP helper (`lua/ftl_dev/lsp.lua`) — requires a separately built language server
