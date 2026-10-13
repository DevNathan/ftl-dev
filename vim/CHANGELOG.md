# Changelog — ftl-dev.vim

User-facing notes for the **Vim / Neovim** FreeMarker runtime (`ftl-dev.vim`).

Versioning is **independent** of the VS Code extension. Canonical file: [`VERSION`](VERSION). Process (monorepo docs): https://github.com/DevNathan/ftl-dev/blob/main/docs/versioning-vim.md

## [Unreleased]

## [0.1.1] - 2026-10-13

### Added

- Vim runtime: `ftdetect`, `syntax`, `indent`, `ftplugin` for FreeMarker (`.ftl` / `.ftlh` / `.ftlx`)
- Nested FTL comments, angle/square directives, `${…}` interpolations, distinct `?builtin` highlighting
- Explicit 256/`guifg` defaults for FTL highlight groups (`termguicolors` recommended)
- Optional Neovim LSP helper (`lua/ftl_dev/lsp.lua`) — requires a separately built language server
- Vader + Neovim lua test suite with coverage inventory (`bash test/run.sh`)

### Fixed

- `indentkeys` avoids `[` / `<#` tokens (Vim 8.1 E518)
- Indent helpers live in `autoload/ftl_dev/indent.vim`
- Directive openers no longer split colours mid-name (no HTML-base / `matchgroup` steal)
