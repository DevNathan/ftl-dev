# Changelog — ftl-dev.vim

User-facing notes for the **Vim / Neovim** FreeMarker runtime (`ftl-dev.vim`).

Versioning is **independent** of the VS Code extension. Canonical file: [`VERSION`](VERSION). Process (monorepo docs): https://github.com/DevNathan/ftl-dev/blob/main/docs/versioning-vim.md

## [Unreleased]

## [0.1.3] - 2026-10-13

### Fixed

- Layered highlight groups: `#assign` (`ftlDirKeyword`), vars (`ftlIdentifier`), `.method` (`ftlMethod`), `?builtin` (`ftlBuiltin`) — no longer one solid colour
- Builtin / identifier char classes: `[\w]` inside `[]` is not a word class; use `[a-zA-Z0-9_]` so `?string` highlights the full name
- Transparent directive / interpolation regions so only contained atoms paint
- Syntax smoke gate (`syntax_smoke.vim`) fails the suite on E866/E475 load errors

## [0.1.2] - 2026-10-13

### Fixed

- Builtin pattern uses literal `?` (Vim NFA: `\?` is a quantifier → E866/E475)

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
