# Changelog — ftl-dev.vim

User-facing notes for the **Vim / Neovim** FreeMarker runtime (`ftl-dev.vim`).

Versioning is **independent** of the VS Code extension. Canonical file: [`VERSION`](VERSION). Process (monorepo docs): https://github.com/DevNathan/ftl-dev/blob/main/docs/versioning-vim.md

## [Unreleased]

## [0.1.0] - 2026-10-13

### Added

- Initial Vim runtime: `ftdetect`, `syntax`, `indent`, `ftplugin` for FreeMarker (`.ftl` / `.ftlh` / `.ftlx`)
- Nested FTL comments, angle/square directives, `${…}` interpolations
- Optional Neovim LSP helper (`lua/ftl_dev/lsp.lua`) — requires a separately built language server
